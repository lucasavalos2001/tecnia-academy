const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

// =====================================================================
// 1. INICIAR PAGO (V22.0 - ROBUSTO Y DINÁMICO)
// =====================================================================
const initiatePayment = async (req, res) => {
    console.log("\n🚀 INICIANDO PAGO (V22.0)");

    try {
        // 1. Limpieza de Credenciales
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").replace(/[^a-zA-Z0-9]/g, "");
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").replace(/[^a-zA-Z0-9]/g, "");

        if (!PUBLIC_KEY || !PRIVATE_KEY) {
            console.error("❌ Faltan claves de Pagopar en .env");
            return res.status(500).json({ message: "Error de configuración interna." });
        }

        // 2. Validaciones
        if (!req.usuario) return res.status(401).json({ message: "Auth requerida" });
        
        const { courseId } = req.body;
        const curso = await Course.findByPk(courseId);
        if (!curso) return res.status(404).json({ message: "Curso no encontrado" });

        // 3. Preparación de Datos
        const monto = parseInt(curso.precio);
        const pedidoId = `ORDEN-${Date.now()}`; // ID único
        const usuario = req.usuario;

        // 4. Crear Transacción Local (Esencial para conciliar después)
        await Transaction.create({
            external_reference: pedidoId,
            amount: monto,
            status: 'pending',
            userId: usuario.id,
            courseId: curso.id,
            ip_address: req.ip || '127.0.0.1',
            payment_method: 'pagopar'
        });

        // 5. Generar Hash SHA1
        const hash = crypto.createHash('sha1')
            .update(PRIVATE_KEY + pedidoId + monto.toString())
            .digest('hex');

        // 6. Construir Objeto Orden (Más legible y con datos reales)
        // Usamos datos del usuario si existen, sino fallbacks para no bloquear la UI
        const compradorData = {
            "ruc": usuario.documento || "4444440-1",
            "email": usuario.email || "cliente@sinemail.com",
            "ciudad": 1, // Asunción por defecto
            "nombre": usuario.nombre_completo || "Cliente Tecnia",
            "telefono": usuario.telefono || "0981000000",
            "direccion": "Dirección Web",
            "documento": usuario.documento_numero || "4444440",
            "razon_social": usuario.nombre_completo || "Cliente Particular",
            "tipo_documento": "CI",
            "coordenadas": "",
            "direccion_referencia": ""
        };

        const orden = {
            "token": hash,
            "public_key": PUBLIC_KEY,
            "monto_total": monto,
            "tipo_pedido": "VENTA-COMERCIO",
            "compras_items": [{
                "ciudad": 1,
                "nombre": curso.titulo.substring(0, 40), // Recortar para evitar errores
                "cantidad": 1,
                "categoria": "909",
                "public_key": PUBLIC_KEY,
                "url_imagen": "https://tecniaacademy.com/logo.png",
                "descripcion": "Acceso al curso",
                "id_producto": courseId.toString(),
                "precio_total": monto,
                "vendedor_telefono": "0981000000",
                "vendedor_direccion": "Asuncion",
                "vendedor_direccion_referencia": "Centro",
                "vendedor_direccion_coordenadas": "-25.2637,-57.5759"
            }],
            "fecha_maxima_pago": new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            "id_pedido_comercio": pedidoId,
            "descripcion_resumen": `Pago curso: ${curso.titulo}`,
            "forma_pago": 9, // Habilita todos los medios
            "comprador": compradorData
        };

        // 7. Enviar a Pagopar
        const r = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', orden);

        if (r.data.respuesta) {
            console.log("✅ Pedido iniciado correctamente:", pedidoId);
            res.json({
                success: true,
                redirectUrl: `https://www.pagopar.com/pagos/${r.data.resultado[0].data}`,
                pedidoId
            });
        } else {
            console.error("❌ Rechazo de Pagopar:", r.data);
            res.status(400).json({ message: "Error al iniciar pago en Pagopar", detalle: r.data.resultado });
        }

    } catch (e) {
        console.error("❌ Error interno:", e.message);
        res.status(500).json({ msg: "Error interno del servidor" });
    }
};

// =====================================================================
// 2. WEBHOOK (V22.0 - ESTRATEGIA OPTIMIZADA)
// =====================================================================
const confirmPaymentWebhook = async (req, res) => {
    console.log("🔔 WEBHOOK RECIBIDO");

    // PASO 1: RESPUESTA INMEDIATA (Evita Timeouts de Pagopar)
    // Respondemos 'true' de inmediato. Pagopar recibe esto y se queda tranquilo.
    // Luego procesamos la lógica internamente.
    res.json({ respuesta: true });

    try {
        const { resultado } = req.body;
        // Detectar si la data viene dentro de un array (común en Pagopar) o directa
        const data = (resultado && resultado[0]) ? resultado[0] : req.body;

        if (!data || !data.hash_pedido) {
            return console.log("⚠️ Webhook sin hash válido. Ignorando.");
        }

        const hash_pedido = String(data.hash_pedido).trim();
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").replace(/[^a-zA-Z0-9]/g, "");
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").replace(/[^a-zA-Z0-9]/g, "");

        // PASO 2: CONSULTA DE SEGURIDAD (La clave para el Semáforo Verde)
        console.log(`🔎 Verificando estado real en Pagopar: [${hash_pedido}]`);

        const tokenConsulta = crypto.createHash('sha1')
            .update(`${PRIVATE_KEY}CONSULTA${PUBLIC_KEY}`)
            .digest('hex');

        // Llamada a la API de Pagopar para confirmar que no es un webhook falso
        const rVerify = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', {
            hash_pedido: hash_pedido,
            token: tokenConsulta,
            public_key: PUBLIC_KEY
        }, { headers: { 'Content-Type': 'application/json' } });

        if (rVerify.data.respuesta === true && rVerify.data.resultado) {
            const pedidoReal = rVerify.data.resultado[0];

            if (pedidoReal.pagado === true) {
                console.log(`✅ PAGO CONFIRMADO: ${pedidoReal.id_pedido_comercio}`);

                // PASO 3: LÓGICA DE NEGOCIO (Base de Datos)
                const idReferencia = pedidoReal.id_pedido_comercio;
                const transaccion = await Transaction.findOne({ where: { external_reference: idReferencia } });

                if (transaccion) {
                    // Actualizar estado a 'paid' si no lo estaba
                    if (transaccion.status !== 'paid') {
                        transaccion.status = 'paid';
                        transaccion.payment_method = 'pagopar';
                        await transaccion.save();
                        console.log("💰 Transacción actualizada a PAID.");

                        // INSCRIBIR ALUMNO (Evitando duplicados)
                        const enrollmentExistente = await Enrollment.findOne({
                            where: { userId: transaccion.userId, courseId: transaccion.courseId }
                        });

                        if (!enrollmentExistente) {
                            await Enrollment.create({
                                userId: transaccion.userId,
                                courseId: transaccion.courseId,
                                progreso_porcentaje: 0,
                                fecha_inscripcion: new Date(),
                                lecciones_completadas: []
                            });
                            console.log(`🎉 ALUMNO INSCRITO: Usuario ${transaccion.userId} en Curso ${transaccion.courseId}`);
                        } else {
                            console.log("ℹ️ El alumno ya estaba inscrito previamente.");
                        }
                    } else {
                        console.log("ℹ️ Esta transacción ya fue procesada antes.");
                    }
                } else {
                    console.error(`❌ ERROR CRÍTICO: Llegó un pago (ID: ${idReferencia}) pero no existe la transacción local.`);
                }
            } else {
                console.log("ℹ️ El pedido existe en Pagopar pero AÚN NO figura como pagado.");
            }
        } else {
            console.log("ℹ️ Pagopar no devolvió datos del pedido (Posible simulación o hash inválido).");
        }

    } catch (error) {
        // Solo logueamos el error, porque ya respondimos 'true' al inicio.
        console.error("❌ Error procesando lógica del Webhook:", error.message);
    }
};

module.exports = { initiatePayment, confirmPaymentWebhook };