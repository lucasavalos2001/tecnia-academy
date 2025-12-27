const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

// --- 1. INICIAR PAGO (Sin cambios, funciona bien) ---
const initiatePayment = async (req, res) => {
    // ... (Mantén tu código de iniciar pago igual que antes)
    console.log("\n🚀 INICIANDO PAGO");
    try {
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();

        if (!PUBLIC_KEY || !PRIVATE_KEY) throw new Error("Faltan claves en .env");

        const { courseId } = req.body;
        const userId = req.usuario ? req.usuario.id : null;
        if (!userId) return res.status(401).json({ message: "Usuario no autenticado" });

        const curso = await Course.findByPk(courseId);
        const usuario = await User.findByPk(userId);

        if (!curso || !usuario) return res.status(404).json({ message: "Curso o Usuario no encontrado" });

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

        const orden = {
            "token": hash,
            "public_key": PUBLIC_KEY,
            "monto_total": monto,
            "tipo_pedido": "VENTA-COMERCIO",
            "compras_items": [
                {
                    "ciudad": 1,
                    "nombre": curso.titulo,
                    "cantidad": 1,
                    "categoria": "909",
                    "public_key": PUBLIC_KEY,
                    "url_imagen": curso.imagen_url || "",
                    "descripcion": curso.titulo,
                    "id_producto": courseId.toString(),
                    "precio_total": monto
                }
            ],
            "fecha_maxima_pago": new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            "id_pedido_comercio": pedidoId,
            "descripcion_resumen": `Curso: ${curso.titulo}`,
            "forma_pago": 9,
            "comprador": {
                "ruc": usuario.documento ? `${usuario.documento}-1` : "4444440-1",
                "email": usuario.email,
                "ciudad": 1,
                "nombre": usuario.nombre_completo || "Cliente",
                "telefono": usuario.telefono || "0981000000",
                "direccion": "Online",
                "documento": usuario.documento || "4444440",
                "tipo_documento": "CI"
            }
        };

        const response = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', orden);

        if (response.data.respuesta === true) {
            res.json({ 
                success: true, 
                redirectUrl: `https://www.pagopar.com/pagos/${response.data.resultado[0].data}`,
                pedidoId: pedidoId 
            });
        } else {
            console.error("❌ Error Pagopar Init:", response.data.resultado);
            res.status(400).json({ message: "Error al iniciar pago en Pagopar" });
        }
    } catch (error) {
        console.error("🔥 Error Initiate:", error.message);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// --- 2. WEBHOOK CORREGIDO PARA EL SIMULADOR ---
const confirmPaymentWebhook = async (req, res) => {
    console.log("🔔 WEBHOOK RECIBIDO");
    
    // Imprimimos qué llega para depurar
    if (req.body) console.log("📦 Keys recibidas:", Object.keys(req.body));

    // ==========================================================
    // 🚨 CORRECCIÓN CRÍTICA PARA EL SIMULADOR (PASO 3)
    // ==========================================================
    if (req.body && req.body.resultado) {
        console.log("🧪 Simulador detectado. Enviando SOLO el Array (sin envolturas).");
        
        // Pagopar espera [ { ... } ]
        // Tu error anterior era enviar { respuesta: true, resultado: [ ... ] }
        // Aquí devolvemos directo el array:
        return res.json(req.body.resultado);
    }
    // ==========================================================


    // --- LÓGICA DE PRODUCCIÓN (Pagos Reales) ---
    // Si no hay 'resultado' en la raíz, asumimos que es una notificación real de Pagopar
    // (A veces Pagopar envía diferente en producción o la estructura varía ligeramente)
    
    try {
        let data = req.body;
        // Normalización defensiva
        if (data.resultado && Array.isArray(data.resultado)) data = data.resultado[0];
        else if (data.resultado) data = data.resultado;

        // Si es un ping vacío, respondemos true y salimos
        if (!data || !data.hash_pedido) return res.json({ respuesta: true });

        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();

        // Validación de Seguridad
        const tokenString = `${PRIVATE_KEY}CONSULTA${PUBLIC_KEY}`;
        const tokenConsulta = crypto.createHash('sha1').update(tokenString).digest('hex');

        const validacion = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', {
            hash_pedido: data.hash_pedido,
            token: tokenConsulta,
            token_publico: PUBLIC_KEY
        });

        if (validacion.data.respuesta === true && validacion.data.resultado[0].pagado) {
            const pedido = validacion.data.resultado[0];
            console.log(`✅ Pago REAL confirmado: ${pedido.id_pedido_comercio}`);

            const transaccion = await Transaction.findOne({ where: { external_reference: pedido.id_pedido_comercio } });
            
            if (transaccion && transaccion.status !== 'paid') {
                transaccion.status = 'paid';
                transaccion.payment_method = 'pagopar';
                await transaccion.save();

                const existe = await Enrollment.findOne({ where: { userId: transaccion.userId, courseId: transaccion.courseId }});
                if (!existe) {
                    await Enrollment.create({
                        userId: transaccion.userId,
                        courseId: transaccion.courseId,
                        status: 'active',
                        progress: 0,
                        enrolledAt: new Date()
                    });
                    console.log("🎓 Estudiante inscrito.");
                }
            }
        }
    } catch (error) {
        console.error("⚠️ Error lógica negocio:", error.message);
    }

    // Respuesta final genérica para producción
    res.json({ respuesta: true });
};

module.exports = { initiatePayment, confirmPaymentWebhook };