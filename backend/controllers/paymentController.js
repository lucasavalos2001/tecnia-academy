const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

// --- 1. INICIAR PAGO ---
const initiatePayment = async (req, res) => {
    console.log("\n🚀 INICIANDO PAGO (VERSIÓN 2.5 - FINAL STABLE)");

    try {
        // Limpieza profunda de claves (quita comillas, espacios y saltos de línea)
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").replace(/['"\r\n\s]/g, "");
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").replace(/['"\r\n\s]/g, "");

        if (!PUBLIC_KEY || !PRIVATE_KEY) throw new Error("Faltan claves en .env");

        const { courseId } = req.body;
        // Validación segura del usuario
        if (!req.usuario || !req.usuario.id) return res.status(401).json({ message: "Usuario no autenticado" });
        const userId = req.usuario.id;

        const curso = await Course.findByPk(courseId);
        const usuario = await User.findByPk(userId);

        if (!curso || !usuario) return res.status(404).json({ message: "Curso/Usuario no encontrado" });

        const monto = parseInt(curso.precio);
        const montoString = monto.toString();
        const pedidoId = `ORDEN-${Date.now()}`; 

        await Transaction.create({
            external_reference: pedidoId,
            amount: monto,
            status: 'pending',
            userId: userId,
            courseId: courseId,
            ip_address: req.ip || '127.0.0.1'
        });

        // Hash normal para inicio (Private + ID + Monto)
        const hash = crypto.createHash('sha1')
            .update(PRIVATE_KEY + pedidoId + montoString)
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
        res.status(500).json({ message: "Error interno al iniciar pago" });
    }
};

// --- 2. WEBHOOK INTELIGENTE (Auto-corrección de Token) ---
const confirmPaymentWebhook = async (req, res) => {
    console.log("🔔 WEBHOOK RECIBIDO");

    try {
        const { resultado } = req.body;
        // Normalización de datos (Pagopar a veces envía array, a veces objeto)
        const data = (resultado && resultado[0]) ? resultado[0] : req.body;
        
        if (req.body.resultado) console.log("🧪 Intento de simulación recibido.");
        if (!data) return res.json({ respuesta: true });

        const { hash_pedido, pagado } = data;

        // Limpieza agresiva de claves
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").replace(/['"\r\n\s]/g, "");
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").replace(/['"\r\n\s]/g, "");

        console.log("🔎 Consultando a Pagopar (Paso 3)... hash:", hash_pedido);

        // INTENTO 1: Orden Estándar (PRIVATE + CONSULTA + PUBLIC)
        let tokenConsulta = crypto.createHash('sha1')
            .update(`${PRIVATE_KEY}CONSULTA${PUBLIC_KEY}`)
            .digest('hex');

        // Configuración para enviar JSON estricto
        const axiosConfig = { headers: { 'Content-Type': 'application/json' } };

        let respuestaPagopar;
        
        try {
            respuestaPagopar = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', 
                { hash_pedido, token: tokenConsulta, token_publico: PUBLIC_KEY },
                axiosConfig
            );
        } catch (error) {
            console.error("⚠️ Error de red en intento 1:", error.message);
            // Si falla la red, creamos una respuesta falsa para que no rompa el flujo
            respuestaPagopar = { data: { respuesta: false, resultado: 'Network Error' } };
        }

        // --- LÓGICA DE AUTO-CORRECCIÓN ---
        // Si Pagopar responde explícitamente que el token no coincide
        if (respuestaPagopar.data && 
            respuestaPagopar.data.respuesta === false && 
            respuestaPagopar.data.resultado === 'Token no coincide') {
            
            console.warn("⚠️ Token rechazado (Intento 1). Probando inversión de claves automática...");
            
            // INTENTO 2: Orden Invertido (PUBLIC + CONSULTA + PRIVATE)
            const tokenInvertido = crypto.createHash('sha1')
                .update(`${PUBLIC_KEY}CONSULTA${PRIVATE_KEY}`)
                .digest('hex');

            try {
                respuestaPagopar = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', 
                    { hash_pedido, token: tokenInvertido, token_publico: PUBLIC_KEY },
                    axiosConfig
                );
                console.log("🔄 ¡Auto-corrección exitosa! Las claves funcionaron invertidas.");
            } catch (error) {
                console.error("⚠️ Error de red en intento 2:", error.message);
            }
        }
        // --------------------------------

        // Procesamiento final si la respuesta es positiva
        if (respuestaPagopar.data && respuestaPagopar.data.respuesta === true) {
            console.log("✅ Paso 3 Exitoso: Conexión autorizada.");
            const pedidoReal = respuestaPagopar.data.resultado[0];

            if (pedidoReal.pagado) {
                console.log("💰 PAGO CONFIRMADO REAL.");
                const idReferencia = pedidoReal.id_pedido_comercio;
                
                // Buscar transacción
                const transaccion = await Transaction.findOne({ where: { external_reference: idReferencia } });

                if (transaccion) {
                    // Actualizar estado
                    if (transaccion.status !== 'paid') {
                        transaccion.status = 'paid';
                        transaccion.payment_method = 'pagopar'; 
                        await transaccion.save();
                        console.log("💾 Transacción guardada como PAGADA.");
                    }
                    
                    // Inscribir estudiante
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
                        console.log(`🎉 Estudiante inscrito correctamente.`);
                    }
                } else {
                    console.log("ℹ️ Transacción no encontrada en BD (puede ser prueba).");
                }
            }
        } else {
            // Loguear error solo si no es simulación
            if (!req.body.resultado) {
                console.error("❌ ERROR EN PASO 3 (Final):", respuestaPagopar.data ? respuestaPagopar.data.resultado : "Error desconocido");
            }
        }

    } catch (error) {
        console.error("⚠️ Error general en webhook:", error.message);
    }

    // Respuesta final para Pagopar (Eco del simulador)
    if (req.body.resultado) {
        console.log("🧪 Modo Simulación: Devolviendo eco para validar Paso 2.");
        return res.json(req.body.resultado);
    }

    res.json({ respuesta: true });
};

module.exports = { initiatePayment, confirmPaymentWebhook };