const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

// =========================================================
// 1. INICIAR PAGO (CORREGIDO PARA API 2.0)
// =========================================================
const initiatePayment = async (req, res) => {
    console.log("\n🚀 [SISTEMA] INICIANDO PROCESO DE PAGO");
    
    try {
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();

        if (!PUBLIC_KEY || !PRIVATE_KEY) {
            return res.status(500).json({ message: "Llaves de pasarela no configuradas." });
        }

        const { courseId } = req.body;
        const userId = req.usuario?.id;

        if (!userId) return res.status(401).json({ message: "Sesión expirada." });

        const usuarioDB = await User.findByPk(userId);
        const curso = await Course.findByPk(courseId);

        if (!usuarioDB || !curso) return res.status(404).json({ message: "Datos no encontrados." });

        const monto = parseInt(curso.precio);
        const pedidoId = `ORDEN-${Date.now()}-${userId}`;

        // Limpieza robusta de nombre
        const nombreLimpio = (usuarioDB.nombre_completo || usuarioDB.nombre || "Estudiante")
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 45);

        // --- 1. GENERACIÓN DEL TOKEN ---
        const tokenFirma = crypto.createHash('sha1')
            .update(PRIVATE_KEY + pedidoId + monto.toString())
            .digest('hex');

        // --- 2. AJUSTE DE FECHA (Formato YYYY-MM-DD HH:mm:ss requerido por Pagopar) ---
        const fechaActual = new Date();
        fechaActual.setHours(fechaActual.getHours() + 48); // 48 horas de validez
        const fechaMaxima = fechaActual.toISOString().slice(0, 19).replace('T', ' ');

        const orden = {
            "token": tokenFirma,
            "public_key": PUBLIC_KEY,
            "monto_total": monto,
            "tipo_pedido": "VENTA-COMERCIO",
            "compras_items": [{
                "ciudad": 1,
                "nombre": curso.titulo.substring(0, 40),
                "cantidad": 1,
                "categoria": "909",
                "public_key": PUBLIC_KEY,
                "url_imagen": curso.imagen_url || "https://tecniaacademy.com/logo.png",
                "descripcion": "Acceso a plataforma educativa",
                "id_producto": courseId.toString(),
                "precio_total": monto,
                "vendedor_telefono": "0981000000",
                "vendedor_direccion": "Asunción",
                "vendedor_direccion_referencia": "",
                "vendedor_direccion_coordenadas": ""
            }],
            "fecha_maxima_pago": fechaMaxima, 
            "id_pedido_comercio": pedidoId,
            "descripcion_resumen": `Curso: ${curso.titulo}`,
            "forma_pago": 9,
            "comprador": {
                "ruc": usuarioDB.ruc || "44444401-7",
                "email": usuarioDB.email.trim(),
                "ciudad": 1,
                "nombre": nombreLimpio,
                "telefono": usuarioDB.telefono || "0981000000",
                "direccion": "Paraguay",
                "documento": usuarioDB.documento || "4444440",
                "razon_social": nombreLimpio,
                "tipo_documento": "CI", 
                "coordenadas": "",
                "direccion_referencia": ""
            }
        };

        const nuevaTransaccion = await Transaction.create({
            external_reference: pedidoId, 
            amount: monto,
            status: 'pending',
            userId: userId,
            courseId: courseId,
            ip_address: req.ip || "127.0.0.1",
            payment_method: 'pagopar'
        });

        const response = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', orden);

        if (response.data.respuesta) {
            const hashReal = response.data.resultado[0].data;
            nuevaTransaccion.external_reference = hashReal;
            await nuevaTransaccion.save();

            res.json({
                success: true,
                redirectUrl: `https://www.pagopar.com/pagos/${hashReal}`
            });
        } else {
            console.error("❌ ERROR API PAGOPAR:", JSON.stringify(response.data.resultado));
            await nuevaTransaccion.destroy();
            res.status(400).json({ 
                message: "Error en la pasarela", 
                details: response.data.resultado 
            });
        }

    } catch (error) {
        console.error("❌ ERROR GENERAL CONTROLADOR:", error.message);
        res.status(500).json({ message: "Error interno del servidor al procesar pago." });
    }
};

// =========================================================
// 2. WEBHOOK DE CONFIRMACIÓN
// =========================================================
const confirmPaymentWebhook = async (req, res) => {
    try {
        const { resultado, respuesta } = req.body;
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();

        if (!respuesta || !resultado || !resultado[0]) {
            return res.status(400).json({ error: "Estructura inválida" });
        }

        const datosPago = resultado[0];
        const hashPedido = datosPago.hash_pedido;
        const tokenRecibido = datosPago.token;

        const tokenValidacion = crypto.createHash('sha1')
            .update(PRIVATE_KEY + hashPedido)
            .digest('hex');

        if (tokenRecibido !== tokenValidacion) {
            console.error("❌ WEBHOOK: TOKEN INVÁLIDO");
            return res.status(401).send("No autorizado");
        }

        // RESPUESTA INMEDIATA A PAGOPAR
        res.json(resultado); 

        if (datosPago.pagado === true) {
            const transaccion = await Transaction.findOne({ where: { external_reference: hashPedido } });
            
            if (transaccion && transaccion.status !== 'paid') {
                transaccion.status = 'paid';
                await transaccion.save();

                await Enrollment.findOrCreate({
                    where: { userId: transaccion.userId, courseId: transaccion.courseId },
                    defaults: { 
                        progreso_porcentaje: 0, 
                        fecha_inscripcion: new Date(),
                        lecciones_completadas: []
                    }
                });
                console.log(`🎓 Alumno ${transaccion.userId} inscrito con éxito.`);
            }
        }
    } catch (error) {
        console.error("❌ ERROR WEBHOOK:", error.message);
        if (!res.headersSent) res.status(500).send("Error");
    }
};

module.exports = { initiatePayment, confirmPaymentWebhook };