const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

// --- 1. INICIAR PAGO ---
const initiatePayment = async (req, res) => {
    console.log("\n🚀 INICIANDO PAGO (VERSIÓN 2.3 - FORM DATA FIX)");

    try {
        // CORRECCIÓN DE SEGURIDAD: Limpiamos comillas y espacios de las claves
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").replace(/['"]/g, "").trim();
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").replace(/['"]/g, "").trim();

        if (!PUBLIC_KEY || !PRIVATE_KEY) throw new Error("Faltan claves en .env");

        const { courseId } = req.body;
        // Asumimos que el middleware de auth ya validó al usuario
        const userId = req.usuario.id;

        const curso = await Course.findByPk(courseId);
        const usuario = await User.findByPk(userId);

        if (!curso || !usuario) return res.status(404).json({ message: "Curso/Usuario no encontrado" });

        const monto = parseInt(curso.precio);
        const montoString = monto.toString();
        const pedidoId = `ORDEN-${Date.now()}`; 

        // Guardamos la transacción localmente primero
        await Transaction.create({
            external_reference: pedidoId,
            amount: monto,
            status: 'pending',
            userId: userId,
            courseId: courseId,
            ip_address: req.ip || '127.0.0.1'
        });

        // Generamos el Hash de inicio (SHA1)
        const hash = crypto.createHash('sha1')
            .update(PRIVATE_KEY + pedidoId + montoString)
            .digest('hex');

        // Objeto para la API 2.0 (Esta sí acepta JSON)
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
                    "precio_total": monto,
                    "vendedor_telefono": "",
                    "vendedor_direccion": "",
                    "vendedor_direccion_referencia": "",
                    "vendedor_direccion_coordenadas": ""
                }
            ],
            "fecha_maxima_pago": new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            "id_pedido_comercio": pedidoId,
            "descripcion_resumen": `Pago curso: ${curso.titulo}`,
            "forma_pago": 9,
            "comprador": {
                "ruc": usuario.documento ? `${usuario.documento}-1` : "4444440-1",
                "email": usuario.email,
                "ciudad": 1,
                "nombre": usuario.nombre_completo || "Cliente",
                "telefono": usuario.telefono || "0981000000",
                "direccion": "Online",
                "documento": usuario.documento || "4444440",
                "coordenadas": "",
                "razon_social": usuario.nombre_completo || "Cliente",
                "tipo_documento": "CI",
                "direccion_referencia": ""
            }
        };

        console.log(`📤 Enviando pedido ${pedidoId}...`);
        const response = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', orden);

        if (response.data.respuesta === true) {
            const hashPedido = response.data.resultado[0].data;
            const urlFinal = `https://www.pagopar.com/pagos/${hashPedido}`;
            res.json({ success: true, redirectUrl: urlFinal, pedidoId: pedidoId });
        } else {
            console.error("❌ RECHAZADO:", response.data.resultado);
            res.status(400).json({ message: "Error Pagopar: " + response.data.resultado });
        }

    } catch (error) {
        console.error("🔥 ERROR:", error.message);
        res.status(500).json({ message: "Error interno" });
    }
};

// --- 2. WEBHOOK (Confirmación y Entrega) ---
const confirmPaymentWebhook = async (req, res) => {
    console.log("🔔 WEBHOOK RECIBIDO");

    try {
        const { resultado } = req.body;
        const data = (resultado && resultado[0]) ? resultado[0] : req.body;
        
        if (req.body.resultado) console.log("🧪 Intento de simulación recibido.");
        if (!data) return res.json({ respuesta: true });

        const { hash_pedido, pagado } = data;

        // Limpieza de claves (por seguridad)
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").replace(/['"]/g, "").trim();
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").replace(/['"]/g, "").trim();

        // console.log(`🔑 Claves limpias - Public: ${PUBLIC_KEY.length}, Private: ${PRIVATE_KEY.length}`);

        const tokenConsulta = crypto.createHash('sha1')
            .update(`${PRIVATE_KEY}CONSULTA${PUBLIC_KEY}`)
            .digest('hex');

        console.log("🔎 Consultando a Pagopar (Paso 3)... hash:", hash_pedido);

        // --- CORRECCIÓN CRÍTICA: CAMBIO A URLSearchParams ---
        // La API v1.1 es legacy y requiere formato x-www-form-urlencoded
        const params = new URLSearchParams();
        params.append('hash_pedido', hash_pedido);
        params.append('token', tokenConsulta);
        params.append('token_publico', PUBLIC_KEY);

        const verificacion = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (verificacion.data.respuesta === true) {
            console.log("✅ Paso 3 Exitoso: Conexión autorizada.");
            const pedidoReal = verificacion.data.resultado[0];

            if (pedidoReal.pagado) {
                console.log("💰 PAGO CONFIRMADO REAL.");
                const idReferencia = pedidoReal.id_pedido_comercio;
                const transaccion = await Transaction.findOne({ where: { external_reference: idReferencia } });

                if (transaccion) {
                    if (transaccion.status !== 'paid') {
                        transaccion.status = 'paid';
                        transaccion.payment_method = 'pagopar'; 
                        await transaccion.save();
                    }
                    
                    const enrollmentExistente = await Enrollment.findOne({
                        where: { userId: transaccion.userId, courseId: transaccion.courseId }
                    });

                    if (!enrollmentExistente) {
                        await Enrollment.create({
                            userId: transaccion.userId,
                            courseId: transaccion.courseId,
                            status: 'active',
                            progress: 0,
                            enrolledAt: new Date()
                        });
                        console.log(`🎉 Estudiante inscrito.`);
                    }
                }
            }
        } else {
            console.error("❌ ERROR EN PASO 3 (Consulta rechazada):", verificacion.data.resultado);
        }

    } catch (error) {
        console.error("⚠️ Error webhook:", error.message);
    }

    // --- BLOQUE PARA SIMULADOR (Paso 2) ---
    if (req.body.resultado) {
        console.log("🧪 Modo Simulación: Devolviendo eco.");
        return res.json(req.body.resultado);
    }

    res.json({ respuesta: true });
};

module.exports = { initiatePayment, confirmPaymentWebhook };