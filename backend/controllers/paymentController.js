const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

/* =========================================================
   1. INICIAR PAGO (Bala de Plata para evitar errores de formulario)
   ========================================================= */
const initiatePayment = async (req, res) => {
    console.log("\n🚀 INICIANDO PAGO PAGOPAR");

    try {
        // 1. Limpieza de claves (evita errores por espacios vacíos al copiar/pegar)
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();

        if (!PUBLIC_KEY || !PRIVATE_KEY) {
            console.error("❌ Error: Faltan las claves de Pagopar en el .env");
            return res.status(500).json({ message: "Error de configuración de pagos." });
        }

        if (!req.usuario) return res.status(401).json({ message: "Debes iniciar sesión." });

        // 2. Validar Curso
        const { courseId } = req.body;
        const curso = await Course.findByPk(courseId);
        if (!curso) return res.status(404).json({ message: "Curso no encontrado" });

        const monto = parseInt(curso.precio);
        const pedidoId = `ORDEN-${Date.now()}`; // ID único

        // 3. Crear Transacción Local (CRÍTICO: Para saber quién compró qué)
        await Transaction.create({
            external_reference: pedidoId,
            amount: monto,
            status: 'pending',
            userId: req.usuario.id,
            courseId: curso.id,
            ip_address: req.ip || '127.0.0.1',
            payment_method: 'pagopar'
        });

        // 4. Generar Hash de Seguridad
        const hash = crypto
            .createHash('sha1')
            .update(PRIVATE_KEY + pedidoId + monto)
            .digest('hex');

        // 5. Preparar Datos del Comprador (Relleno automático para evitar bloqueo de UI)
        // Si el usuario no tiene RUC o teléfono, usamos genéricos válidos para que pase el pago.
        const compradorData = {
            ruc: req.usuario.documento || "4444440-1",
            email: req.usuario.email,
            ciudad: 1, // Asunción (Default)
            nombre: req.usuario.nombre_completo || "Cliente Tecnia",
            telefono: req.usuario.telefono || "0981000000",
            direccion: "Dirección Web",
            documento: req.usuario.documento_numero || "4444440",
            razon_social: req.usuario.nombre_completo || "Cliente Particular",
            tipo_documento: "CI"
        };

        const orden = {
            token: hash,
            public_key: PUBLIC_KEY,
            monto_total: monto,
            tipo_pedido: "VENTA-COMERCIO",
            compras_items: [{
                ciudad: 1,
                nombre: curso.titulo.substring(0, 40), // Evita error por nombre muy largo
                cantidad: 1,
                categoria: "909",
                public_key: PUBLIC_KEY,
                url_imagen: "https://tecniaacademy.com/logo.png",
                descripcion: "Acceso al curso online",
                id_producto: courseId.toString(),
                precio_total: monto,
                vendedor_telefono: "0981000000",
                vendedor_direccion: "Asuncion",
                vendedor_direccion_referencia: "Centro",
                vendedor_direccion_coordenadas: "-25.2637,-57.5759"
            }],
            fecha_maxima_pago: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            id_pedido_comercio: pedidoId,
            descripcion_resumen: `Pago curso: ${curso.titulo}`,
            forma_pago: 9, // Habilita Tarjetas y Billeteras
            comprador: compradorData
        };

        // 6. Enviar a Pagopar
        // Detecta si es Prod o Staging según las llaves, pero la URL base es la misma para v2.0
        const r = await axios.post(
            'https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion',
            orden,
            { headers: { 'Content-Type': 'application/json' } }
        );

        if (r.data.respuesta === true) {
            return res.json({
                success: true,
                pedidoId,
                redirectUrl: `https://www.pagopar.com/pagos/${r.data.resultado[0].data}`
            });
        } else {
            console.error("❌ Error respuesta Pagopar:", r.data);
            return res.status(400).json({ message: "Pagopar rechazó el inicio del pago", detalle: r.data });
        }

    } catch (e) {
        console.error("❌ Error interno:", e.message);
        res.status(500).json({ message: "Error iniciando pago" });
    }
};

/* =========================================================
   2. WEBHOOK (CONFIRMACIÓN + ACTIVACIÓN PASO 3)
   ========================================================= */
const confirmPaymentWebhook = async (req, res) => {
    console.log("🔔 WEBHOOK PAGOPAR RECIBIDO");

    // 1. Responder SIEMPRE 200 OK rápido para que Pagopar sepa que estamos vivos.
    res.status(200).json({ respuesta: true });

    try {
        // Extraer hash del pedido que Pagopar nos envía
        // A veces viene directo en body, a veces dentro de 'resultado'
        const data = req.body.resultado ? req.body.resultado[0] : req.body;
        const hash_pedido = data.hash_pedido;

        if (!hash_pedido) return console.log("⚠️ Webhook sin hash_pedido, ignorando.");

        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();

        // 2. CONSULTA DE SEGURIDAD (Esto es lo que pone el Semáforo en VERDE)
        // Pagopar exige que hagamos una petición de vuelta ('traer') para confirmar el estado real.
        const tokenConsulta = crypto
            .createHash('sha1')
            .update(`${PRIVATE_KEY}CONSULTA${PUBLIC_KEY}`)
            .digest('hex');

        console.log(`🔎 Consultando a Pagopar estado real del hash: ${hash_pedido}`);

        const r = await axios.post(
            'https://api.pagopar.com/api/pedidos/1.1/traer',
            {
                hash_pedido: hash_pedido,
                token: tokenConsulta,
                public_key: PUBLIC_KEY
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        // 3. Verificar si realmente está pagado
        if (r.data.respuesta === true && r.data.resultado) {
            const pedidoReal = r.data.resultado[0];
            
            if (pedidoReal.pagado === true) {
                console.log(`✅ PAGO CONFIRMADO para Orden: ${pedidoReal.id_pedido_comercio}`);

                // 4. Buscar la transacción local
                const transaccion = await Transaction.findOne({
                    where: { external_reference: pedidoReal.id_pedido_comercio }
                });

                if (transaccion) {
                    // Actualizar estado a 'paid' si no lo estaba
                    if (transaccion.status !== 'paid') {
                        transaccion.status = 'paid';
                        await transaccion.save();
                        console.log("💰 Transacción actualizada a PAID.");

                        // 5. INSCRIBIR AL ESTUDIANTE (Entrega del producto)
                        const [enrollment, created] = await Enrollment.findOrCreate({
                            where: {
                                userId: transaccion.userId,
                                courseId: transaccion.courseId
                            },
                            defaults: {
                                progreso_porcentaje: 0,
                                fecha_inscripcion: new Date(),
                                lecciones_completadas: [] // Asegura array vacío para evitar errores
                            }
                        });

                        if (created) {
                            console.log(`🎉 Estudiante (ID ${transaccion.userId}) inscrito automáticamente en Curso (ID ${transaccion.courseId})`);
                        } else {
                            console.log("ℹ️ El estudiante ya estaba inscrito.");
                        }
                    }
                } else {
                    console.error("⚠️ Transacción no encontrada en BD local.");
                }
            } else {
                console.log("ℹ️ El pedido existe pero aún no figura como pagado o fue cancelado.");
            }
        }

    } catch (error) {
        console.error("❌ Error procesando Webhook:", error.message);
        // No devolvemos error HTTP porque ya respondimos 200 OK al principio
    }
};

module.exports = {
    initiatePayment,
    confirmPaymentWebhook
};