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

        // IMPORTANTE: Pagopar espera el monto como entero para el token (Gs no tiene decimales)
        const monto = parseInt(curso.precio);
        const pedidoId = `ORDEN-${Date.now()}-${userId}`;

        // Limpieza de nombre (Evitar caracteres especiales que rompan el JSON)
        const nombreLimpio = (usuarioDB.nombre_completo || usuarioDB.nombre || "Estudiante")
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 45);

        // --- 1. GENERACIÓN DEL TOKEN (ORDEN ESTRICTO SEGÚN DOCS) ---
        // Formula: sha1(private_key + id_pedido + monto_total_como_string)
        const tokenFirma = crypto.createHash('sha1')
            .update(PRIVATE_KEY + pedidoId + monto.toString())
            .digest('hex');

        // --- 2. ESTRUCTURA PARA API v2.0 ---
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
                "vendedor_telefono": "",
                "vendedor_direccion": "Asunción",
                "vendedor_direccion_referencia": "",
                "vendedor_direccion_coordenadas": ""
            }],
            "fecha_maxima_pago": new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19), 
            "id_pedido_comercio": pedidoId,
            "descripcion_resumen": `Curso: ${curso.titulo}`,
            "forma_pago": 9,
            "comprador": {
                "ruc": usuarioDB.ruc || "",
                "email": usuarioDB.email.trim(),
                "ciudad": 1,
                "nombre": nombreLimpio,
                "telefono": usuarioDB.telefono || "0981000000",
                "direccion": "",
                "documento": usuarioDB.documento || "0",
                "razon_social": nombreLimpio,
                "tipo_documento": "CI", // Segun docs, siempre enviar CI por ahora
                "coordenadas": "",
                "direccion_referencia": ""
            }
        };

        // 3. REGISTRO EN TU DB
        const nuevaTransaccion = await Transaction.create({
            external_reference: pedidoId, 
            amount: monto,
            status: 'pending',
            userId: userId,
            courseId: courseId,
            ip_address: req.ip || "127.0.0.1",
            payment_method: 'pagopar'
        });

        // 4. ENVÍO A PAGOPAR
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
            console.error("❌ ERROR API PAGOPAR:", response.data.resultado);
            await nuevaTransaccion.destroy();
            res.status(400).json({ message: "Error en la pasarela", details: response.data.resultado });
        }

    } catch (error) {
        console.error("❌ ERROR GENERAL:", error.message);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

// =========================================================
// 2. WEBHOOK DE CONFIRMACIÓN (CORREGIDO SEGÚN STEP #3)
// =========================================================
const confirmPaymentWebhook = async (req, res) => {
    console.log("\n🔔 [NOTIFICACIÓN] WEBHOOK RECIBIDO");

    try {
        const { resultado, respuesta } = req.body;
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();

        if (!respuesta || !resultado || !resultado[0]) {
            return res.status(400).json({ error: "Estructura inválida" });
        }

        const datosPago = resultado[0];
        const hashPedido = datosPago.hash_pedido;
        const tokenRecibido = datosPago.token;

        // --- VALIDACIÓN DE SEGURIDAD (OBLIGATORIO) ---
        // Segun docs Step #3: sha1(private_key + hash_pedido)
        const tokenValidacion = crypto.createHash('sha1')
            .update(PRIVATE_KEY + hashPedido)
            .digest('hex');

        if (tokenRecibido !== tokenValidacion) {
            console.error("❌ TOKEN DE WEBHOOK NO COINCIDE");
            return res.status(401).send("No autorizado");
        }

        // Si la firma es correcta, respondemos OK a Pagopar inmediatamente
        // Esto evita que Pagopar nos siga llamando cada 10 minutos.
        res.json(resultado); 

        // Procesamiento en segundo plano
        if (datosPago.pagado === true) {
            const transaccion = await Transaction.findOne({ where: { external_reference: hashPedido } });
            
            if (transaccion && transaccion.status !== 'paid') {
                transaccion.status = 'paid';
                await transaccion.save();

                await Enrollment.findOrCreate({
                    where: { userId: transaccion.userId, courseId: transaccion.courseId },
                    defaults: { progreso_porcentaje: 0, fecha_inscripcion: new Date() }
                });
                console.log(`✅ Alumno ${transaccion.userId} inscrito con éxito.`);
            }
        }

    } catch (error) {
        console.error("❌ ERROR WEBHOOK:", error.message);
        if (!res.headersSent) res.status(500).send("Error");
    }
};

module.exports = { initiatePayment, confirmPaymentWebhook };