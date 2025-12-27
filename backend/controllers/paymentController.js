const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

// --- 1. INICIAR PAGO (Blindado) ---
const initiatePayment = async (req, res) => {
    console.log("\n🚀 INICIANDO PAGO (V3.0 - OMNI-CAMPO)");

    try {
        // Limpieza agresiva: Asegura que no haya basura invisible en las claves
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").replace(/['"\r\n\s]/g, "");
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").replace(/['"\r\n\s]/g, "");

        if (!PUBLIC_KEY || !PRIVATE_KEY) throw new Error("Faltan claves en .env");

        const { courseId } = req.body;
        
        // Validación de usuario
        if (!req.usuario || !req.usuario.id) return res.status(401).json({ message: "Usuario no autenticado" });
        const userId = req.usuario.id;

        const curso = await Course.findByPk(courseId);
        const usuario = await User.findByPk(userId);

        if (!curso || !usuario) return res.status(404).json({ message: "Curso/Usuario no encontrado" });

        const monto = parseInt(curso.precio);
        const pedidoId = `ORDEN-${Date.now()}`; 

        await Transaction.create({
            external_reference: pedidoId,
            amount: monto,
            status: 'pending',
            userId: userId,
            courseId: courseId,
            ip_address: req.ip || '127.0.0.1'
        });

        // Hash para API 2.0 (Initiate Transaction)
        const hash = crypto.createHash('sha1')
            .update(PRIVATE_KEY + pedidoId + monto.toString())
            .digest('hex');

        const orden = {
            "token": hash,
            "public_key": PUBLIC_KEY,
            "monto_total": monto,
            "tipo_pedido": "VENTA-COMERCIO",
            "compras_items": [{
                "ciudad": 1, "nombre": curso.titulo, "cantidad": 1, "categoria": "909",
                "public_key": PUBLIC_KEY, "url_imagen": curso.imagen_url || "",
                "descripcion": curso.titulo, "id_producto": courseId.toString(), "precio_total": monto
            }],
            "fecha_maxima_pago": new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            "id_pedido_comercio": pedidoId,
            "descripcion_resumen": `Pago curso: ${curso.titulo}`,
            "forma_pago": 9,
            "comprador": {
                "ruc": usuario.documento ? `${usuario.documento}-1` : "4444440-1",
                "email": usuario.email, "ciudad": 1, "nombre": usuario.nombre_completo || "Cliente",
                "telefono": usuario.telefono || "0981000000", "direccion": "Online",
                "documento": usuario.documento || "4444440", "razon_social": usuario.nombre_completo || "Cliente", "tipo_documento": "CI"
            }
        };

        const response = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', orden);

        if (response.data.respuesta === true) {
            const hashPedido = response.data.resultado[0].data;
            res.json({ success: true, redirectUrl: `https://www.pagopar.com/pagos/${hashPedido}`, pedidoId });
        } else {
            console.error("❌ Error API Inicio:", response.data.resultado);
            res.status(400).json({ message: "Error Pagopar: " + response.data.resultado });
        }

    } catch (error) {
        console.error("🔥 ERROR INIT:", error.message);
        res.status(500).json({ message: "Error interno" });
    }
};

// --- 2. WEBHOOK (Aquí está la magia V3.0) ---
const confirmPaymentWebhook = async (req, res) => {
    console.log("🔔 WEBHOOK RECIBIDO");

    try {
        const { resultado } = req.body;
        const data = (resultado && resultado[0]) ? resultado[0] : req.body;
        
        // Responder rápido al simulador paso 2
        if (req.body.resultado) console.log("🧪 Intento de simulación recibido.");
        if (!data) return res.json({ respuesta: true });

        // A. LIMPIEZA DE DATOS (Vital: a veces el hash trae espacios)
        const hash_pedido = (data.hash_pedido || "").trim();

        // B. CARGA DE CLAVES
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").replace(/['"\r\n\s]/g, "");
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").replace(/['"\r\n\s]/g, "");

        // Debug seguro: Solo longitudes para confirmar carga correcta
        console.log(`🔎 Validando (Paso 3)... Claves cargadas: Public(${PUBLIC_KEY.length}), Private(${PRIVATE_KEY.length})`);

        // C. GENERAR TOKEN DE CONSULTA
        // Fórmula estándar: sha1(PRIVATE_KEY + "CONSULTA" + PUBLIC_KEY)
        const tokenConsulta = crypto.createHash('sha1')
            .update(`${PRIVATE_KEY}CONSULTA${PUBLIC_KEY}`)
            .digest('hex');

        // D. ESTRATEGIA OMNI-CAMPO (El Secreto)
        // Enviamos la clave pública en TODOS los campos posibles para que la API 1.1 no falle.
        const payload = {
            hash_pedido: hash_pedido,
            token: tokenConsulta,
            token_publico: PUBLIC_KEY, // Nombre antiguo
            public_key: PUBLIC_KEY     // Nombre nuevo
        };

        // E. PETICIÓN (JSON Estricto)
        const verificacion = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        // F. VERIFICACIÓN
        if (verificacion.data.respuesta === true) {
            console.log("✅ ¡PASO 3 VERDE! Token aceptado.");
            const pedidoReal = verificacion.data.resultado[0];

            if (pedidoReal.pagado) {
                console.log("💰 PAGO CONFIRMADO REAL.");
                const idReferencia = pedidoReal.id_pedido_comercio;
                
                const transaccion = await Transaction.findOne({ where: { external_reference: idReferencia } });

                if (transaccion && transaccion.status !== 'paid') {
                    transaccion.status = 'paid';
                    transaccion.payment_method = 'pagopar'; 
                    await transaccion.save();

                    const enrollmentExistente = await Enrollment.findOne({
                        where: { userId: transaccion.userId, courseId: transaccion.courseId }
                    });

                    if (!enrollmentExistente) {
                        await Enrollment.create({
                            userId: transaccion.userId, courseId: transaccion.courseId,
                            status: 'active', progress: 0, enrolledAt: new Date()
                        });
                        console.log(`🎉 Estudiante inscrito.`);
                    }
                }
            }
        } else {
            // G. AUTO-CORRECCIÓN DE EMERGENCIA (Si falla, prueba invertir claves)
            if (verificacion.data.resultado === 'Token no coincide') {
                console.warn("⚠️ Token estándar rechazado. Intentando inversión de claves...");
                
                const tokenInvertido = crypto.createHash('sha1')
                    .update(`${PUBLIC_KEY}CONSULTA${PRIVATE_KEY}`)
                    .digest('hex');
                
                // Reenviamos con token invertido y TAMBIÉN ambos campos de nombre
                const reintento = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', {
                    hash_pedido, token: tokenInvertido, token_publico: PUBLIC_KEY, public_key: PUBLIC_KEY
                }, { headers: { 'Content-Type': 'application/json' } });

                if (reintento.data.respuesta === true) {
                    console.log("✅ ¡Recuperación exitosa con claves invertidas!");
                } else {
                    console.error("❌ ERROR FINAL PASO 3:", reintento.data.resultado);
                }
            } else {
                console.error("❌ ERROR PAGOPAR:", verificacion.data.resultado);
            }
        }

    } catch (error) {
        console.error("⚠️ Error webhook:", error.message);
    }

    if (req.body.resultado) return res.json(req.body.resultado);
    res.json({ respuesta: true });
};

module.exports = { initiatePayment, confirmPaymentWebhook };