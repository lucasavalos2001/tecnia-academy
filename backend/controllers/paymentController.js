const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

// =========================================================
// 1. INICIAR PAGO (CÓDIGO ORIGINAL BLINDADO)
// =========================================================
const initiatePayment = async (req, res) => {
    console.log("\n🚀 INICIANDO PAGO - RESTAURACIÓN DE SISTEMA");
    try {
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();

        if (!PUBLIC_KEY || !PRIVATE_KEY) throw new Error("Faltan credenciales en el .env");

        const { courseId } = req.body;
        
        // 1. Buscamos el curso
        const curso = await Course.findByPk(courseId);
        if (!curso) return res.status(404).json({ message: "Curso no encontrado" });

        // 2. BUSQUEDA DIRECTA DE USUARIO (Para evitar errores del nuevo flujo de perfil)
        const usuarioFull = await User.findByPk(req.usuario.id);
        if (!usuarioFull) return res.status(401).json({ message: "Usuario no encontrado" });

        const monto = parseInt(curso.precio);
        const pedidoId = `ORDEN-${Date.now()}`;

        // 🟢 DATOS DEL COMPRADOR (Lógica Original Robusta)
        const compradorData = {
            // Limpiamos el nombre de acentos para evitar errores de codificación en la API
            nombre: usuarioFull.nombre_completo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 40),
            email: usuarioFull.email.trim(),
            ruc: "44444401-7",        // Consumidor Final Genérico PY
            documento: "4444440",     
            telefono: "0981000000",   
            ciudad: 1,                
            direccion: "Paraguay",
            tipo_documento: "RUC"
        };

        // 3. REGISTRO DE TRANSACCIÓN LOCAL
        const nuevaTransaccion = await Transaction.create({
            external_reference: pedidoId,
            amount: monto,
            status: 'pending',
            userId: usuarioFull.id,
            courseId: courseId,
            ip_address: req.ip || "127.0.0.1",
            payment_method: 'pagopar'
        });

        // 4. FIRMA ELECTRÓNICA SHA1
        const tokenFirma = crypto.createHash('sha1').update(PRIVATE_KEY + pedidoId + monto.toString()).digest('hex');

        // 5. OBJETO DE PEDIDO PARA PAGOPAR v2.0
        const orden = {
            "token": tokenFirma,
            "public_key": PUBLIC_KEY,
            "monto_total": monto,
            "tipo_pedido": "VENTA-COMERCIO",
            "compras_items": [
                {
                    "ciudad": 1,
                    "nombre": curso.titulo.substring(0, 45),
                    "cantidad": 1,
                    "categoria": "909",
                    "public_key": PUBLIC_KEY,
                    "url_imagen": "https://tecniaacademy.com/logo.png",
                    "descripcion": "Acceso a Curso Online",
                    "id_producto": courseId.toString(),
                    "precio_total": monto,
                    "vendedor_telefono": "0981000000",
                    "vendedor_direccion": "Asuncion",
                    "vendedor_direccion_referencia": "",
                    "vendedor_direccion_coordenadas": ""
                }
            ],
            "fecha_maxima_pago": new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            "id_pedido_comercio": pedidoId,
            "descripcion_resumen": `Pago curso ${curso.titulo}`,
            "forma_pago": 9,
            "comprador": {
                "ruc": compradorData.ruc,
                "email": compradorData.email,
                "ciudad": compradorData.ciudad,
                "nombre": compradorData.nombre,
                "telefono": compradorData.telefono,
                "direccion": compradorData.direccion,
                "documento": compradorData.documento,
                "razon_social": compradorData.nombre,
                "tipo_documento": compradorData.tipo_documento,
                "coordenadas": "",
                "direccion_referencia": ""
            }
        };

        const response = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', orden);

        if (response.data.respuesta) {
            const hashPagopar = response.data.resultado[0].data;
            nuevaTransaccion.external_reference = hashPagopar;
            await nuevaTransaccion.save();
            
            console.log(`✅ PagoPar OK - Hash: ${hashPagopar}`);
            res.json({ success: true, redirectUrl: `https://www.pagopar.com/pagos/${hashPagopar}` });
        } else {
            console.error("❌ Error de validación PagoPar:", response.data.resultado);
            await nuevaTransaccion.destroy();
            res.status(400).json({ message: "Error de validación en la pasarela" });
        }

    } catch (error) {
        console.error("❌ Error Crítico:", error.message);
        res.status(500).json({ message: "Error interno en el servidor de pagos" });
    }
};

// =========================================================
// 2. CONFIRMACIÓN (WEBHOOK)
// =========================================================
const confirmPaymentWebhook = async (req, res) => {
    try {
        const { resultado } = req.body;
        if (!resultado || !resultado[0]) return res.status(400).send("No data");

        const hash_pedido = resultado[0].hash_pedido;
        res.json({ success: true });

        setTimeout(async () => {
            const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();
            const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
            const tokenConsulta = crypto.createHash('sha1').update(`${PRIVATE_KEY}CONSULTA`).digest('hex');

            try {
                const check = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', {
                    hash_pedido: hash_pedido,
                    token: tokenConsulta,
                    token_publico: PUBLIC_KEY
                });

                if (check.data.respuesta && check.data.resultado[0].pagado) {
                    const tx = await Transaction.findOne({ where: { external_reference: hash_pedido } });
                    if (tx && tx.status !== 'paid') {
                        tx.status = 'paid';
                        await tx.save();

                        await Enrollment.findOrCreate({
                            where: { userId: tx.userId, courseId: tx.courseId },
                            defaults: { progreso_porcentaje: 0, fecha_inscripcion: new Date(), lecciones_completadas: [] }
                        });
                        console.log("🎓 Inscripción completada automáticamente.");
                    }
                }
            } catch (err) { console.error("Error Webhook:", err.message); }
        }, 3000);
    } catch (e) { console.error(e); }
};

module.exports = { initiatePayment, confirmPaymentWebhook };