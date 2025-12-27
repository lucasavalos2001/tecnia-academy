const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

// --- 1. INICIAR PAGO (Funcionalidad de creación de pedido) ---
const initiatePayment = async (req, res) => {
    console.log("\n🚀 INICIANDO PAGO");
    try {
        // Limpieza de claves
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").replace(/[^a-zA-Z0-9]/g, "");
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").replace(/[^a-zA-Z0-9]/g, "");

        if (!PUBLIC_KEY || !PRIVATE_KEY) throw new Error("Faltan claves de Pagopar en .env");

        const { courseId } = req.body;
        if (!req.usuario) return res.status(401).json({ message: "Auth requerida" });
        
        const curso = await Course.findByPk(courseId);
        if (!curso) return res.status(404).json({ message: "Curso no encontrado" });
        
        const monto = parseInt(curso.precio);
        const pedidoId = `ORDEN-${Date.now()}`;

        // Crear transacción pendiente en BD
        await Transaction.create({
            external_reference: pedidoId,
            amount: monto,
            status: 'pending',
            userId: req.usuario.id,
            courseId: courseId,
            ip_address: req.ip,
            payment_method: 'pagopar'
        });

        // Generar Hash (Sha1 de PrivateKey + IdPedido + Monto)
        const hash = crypto.createHash('sha1').update(PRIVATE_KEY + pedidoId + monto.toString()).digest('hex');

        const orden = {
            "token": hash,
            "public_key": PUBLIC_KEY,
            "monto_total": monto,
            "tipo_pedido": "VENTA-COMERCIO",
            "compras_items": [{
                "ciudad": 1,
                "nombre": curso.titulo.substring(0, 40),
                "cantidad": 1,
                "categoria": "909",
                "public_key": PUBLIC_KEY,
                "url_imagen": "https://tecniaacademy.com/logo.png",
                "descripcion": "Curso Online",
                "id_producto": courseId.toString(),
                "precio_total": monto,
                "vendedor_telefono": "0981000000",
                "vendedor_direccion": "Asuncion",
                "vendedor_direccion_referencia": "Centro",
                "vendedor_direccion_coordenadas": "-25.2637,-57.5759"
            }],
            "fecha_maxima_pago": new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            "id_pedido_comercio": pedidoId,
            "descripcion_resumen": "Pago curso",
            "forma_pago": 9,
            "comprador": {
                "ruc": "4444440-1",
                "email": req.usuario.email || "cliente@prueba.com",
                "ciudad": 1,
                "nombre": "Cliente",
                "telefono": "0981000000",
                "direccion": "Asuncion",
                "documento": "4444440",
                "razon_social": "Cliente",
                "tipo_documento": "CI",
                "coordenadas": "",
                "direccion_referencia": ""
            }
        };

        const r = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', orden);

        if (r.data.respuesta) {
            res.json({ success: true, redirectUrl: `https://www.pagopar.com/pagos/${r.data.resultado[0].data}`, pedidoId });
        } else {
            res.status(400).json({ message: "Error Pagopar: " + r.data.resultado });
        }

    } catch (e) {
        console.error(e);
        res.status(500).json({ msg: "Error iniciando pago" });
    }
};

// --- 2. WEBHOOK (ESTA ES LA PARTE QUE SOLUCIONA EL SEMÁFORO) ---
const confirmPaymentWebhook = async (req, res) => {
    console.log("🔔 WEBHOOK RECIBIDO DE PAGOPAR");

    try {
        const { resultado, hash_pedido } = req.body;
        
        // Determinar el hash correcto (Pagopar a veces lo manda directo o dentro de resultado)
        let hashRecibido = hash_pedido;
        if (!hashRecibido && resultado && resultado[0] && resultado[0].hash_pedido) {
            hashRecibido = resultado[0].hash_pedido;
        }

        if (!hashRecibido) {
            console.log("❌ No llegó hash en el webhook.");
            return res.json({ respuesta: true });
        }

        // Limpiar hash y claves
        const finalHash = String(hashRecibido).trim().replace(/\s/g, "");
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").replace(/[^a-zA-Z0-9]/g, "");

        console.log(`🔎 (PASO 3) Ejecutando consulta de validación para hash: ${finalHash}`);

        // [IMAGEN MENTAL: Servidor llamando a Pagopar para validar]
        // --- AQUÍ ESTÁ LA SOLUCIÓN AL PASO 3 ---
        // Hacemos la petición a /traer. Esto dispara el check verde en Pagopar.
        let pedidoReal = null;
        try {
            const consulta = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', {
                hash_pedido: finalHash,
                token_publica: PUBLIC_KEY // IMPORTANTE: Es 'token_publica', no 'token_publico'
            }, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (consulta.data.respuesta === true) {
                console.log("✅ Pagopar confirmó: Pedido encontrado.");
                pedidoReal = consulta.data.resultado[0];
            } else {
                console.log("⚠️ Pagopar respondió pero no validó el pedido.");
            }
        } catch (apiError) {
            console.error("⚠️ Error conectando con API Pagopar (Paso 3):", apiError.message);
            // No detenemos el flujo, seguimos por si ya tenemos datos locales, 
            // pero el "Paso 3" en el panel de Pagopar depende de que el 'try' de arriba funcione.
        }

        // --- ACTUALIZACIÓN DE BASE DE DATOS ---
        // Solo inscribimos si Pagopar dice "pagado: true"
        if (pedidoReal && pedidoReal.pagado === true) {
            const idReferencia = pedidoReal.id_pedido_comercio;
            console.log(`💰 Pago confirmado para orden: ${idReferencia}`);

            const transaccion = await Transaction.findOne({ where: { external_reference: idReferencia } });
            
            if (transaccion) {
                // 1. Actualizar Transacción
                if (transaccion.status !== 'paid') {
                    transaccion.status = 'paid';
                    transaccion.payment_method = 'pagopar';
                    await transaccion.save();
                }

                // 2. Inscribir Estudiante
                const exist = await Enrollment.findOne({ where: { userId: transaccion.userId, courseId: transaccion.courseId } });
                if (!exist) {
                    await Enrollment.create({
                        userId: transaccion.userId,
                        courseId: transaccion.courseId,
                        progreso_porcentaje: 0,
                        fecha_inscripcion: new Date(),
                        lecciones_completadas: []
                    });
                    console.log("🎓 ALUMNO INSCRITO EXITOSAMENTE.");
                }
            }
        }

        // --- RESPUESTA AL SERVIDOR DE PAGOPAR ---
        // Pagopar espera un JSON 200 OK.
        // Si estamos en modo simulación (Paso 2), devolvemos el body recibido para que ellos validen el eco.
        if (req.body.resultado) {
            return res.json(req.body);
        }

        return res.json({ respuesta: true });

    } catch (error) {
        console.error("🔥 Error crítico en webhook:", error);
        // Respondemos true para que Pagopar no siga reintentando infinitamente si es un error nuestro
        return res.json({ respuesta: true });
    }
};

module.exports = { initiatePayment, confirmPaymentWebhook };