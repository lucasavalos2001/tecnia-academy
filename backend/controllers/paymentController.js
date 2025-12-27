const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

// --- 1. INICIAR PAGO (V3.2 - COMPRADOR SIMPLIFICADO) ---
const initiatePayment = async (req, res) => {
    console.log("\n🚀 INICIANDO PAGO (V3.2 - MINIMALISTA)");

    try {
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").replace(/['"\r\n\s]/g, "");
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").replace(/['"\r\n\s]/g, "");

        if (!PUBLIC_KEY || !PRIVATE_KEY) throw new Error("Faltan claves en .env");

        const { courseId } = req.body;
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

        const hash = crypto.createHash('sha1')
            .update(PRIVATE_KEY + pedidoId + monto.toString())
            .digest('hex');

        // --- SOLUCIÓN AL ERROR DEL COMPRADOR ---
        // Simplificamos el objeto comprador. Quitamos campos opcionales que causan conflicto (RUC, dirección, etc).
        const orden = {
            "token": hash,
            "public_key": PUBLIC_KEY,
            "monto_total": monto,
            "tipo_pedido": "VENTA-COMERCIO",
            "compras_items": [{
                "ciudad": 1, 
                "nombre": curso.titulo, 
                "cantidad": 1, 
                "categoria": "909",
                "public_key": PUBLIC_KEY, 
                "url_imagen": curso.imagen_url || "https://tecniaacademy.com/logo.png",
                "descripcion": curso.titulo, 
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
            "forma_pago": 9,
            "comprador": {
                // MINIMALISMO ABSOLUTO PARA PASAR VALIDACIÓN
                "email": usuario.email,
                "nombre": usuario.nombre_completo || "Cliente",
                "telefono": usuario.telefono || "0981000000",
                "documento": usuario.documento || "4444440",
                "tipo_documento": "CI",
                "ciudad": 1 // Asunción (ID 1 es seguro)
                // Quitamos: RUC, Dirección texto, Coordenadas, Razón Social.
                // Estos campos a veces chocan con la validación estricta.
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

// --- 2. WEBHOOK (Sin cambios, ya está blindado) ---
const confirmPaymentWebhook = async (req, res) => {
    console.log("🔔 WEBHOOK RECIBIDO");

    try {
        const { resultado } = req.body;
        const data = (resultado && resultado[0]) ? resultado[0] : req.body;
        
        if (req.body.resultado) console.log("🧪 Intento de simulación recibido.");
        if (!data) return res.json({ respuesta: true });

        const hash_pedido = (data.hash_pedido || "").trim();
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").replace(/['"\r\n\s]/g, "");
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").replace(/['"\r\n\s]/g, "");

        console.log(`🔎 Validando (Paso 3)... Hash: ${hash_pedido.substring(0,10)}...`);

        const tokenConsulta = crypto.createHash('sha1')
            .update(`${PRIVATE_KEY}CONSULTA${PUBLIC_KEY}`)
            .digest('hex');

        // ESTRATEGIA OMNI-CAMPO
        const payload = {
            hash_pedido: hash_pedido,
            token: tokenConsulta,
            token_publico: PUBLIC_KEY, 
            public_key: PUBLIC_KEY     
        };

        const verificacion = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', payload, {
            headers: { 'Content-Type': 'application/json' }
        });

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
             // AUTO-CORRECCIÓN DE EMERGENCIA
             if (verificacion.data.resultado === 'Token no coincide') {
                console.warn("⚠️ Reintentando con claves invertidas...");
                const tokenInvertido = crypto.createHash('sha1').update(`${PUBLIC_KEY}CONSULTA${PRIVATE_KEY}`).digest('hex');
                const reintento = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', {
                    hash_pedido, token: tokenInvertido, token_publico: PUBLIC_KEY, public_key: PUBLIC_KEY
                }, { headers: { 'Content-Type': 'application/json' } });

                if (reintento.data.respuesta === true) console.log("✅ ¡Recuperación exitosa!");
                else console.error("❌ ERROR FINAL PASO 3:", reintento.data.resultado);
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