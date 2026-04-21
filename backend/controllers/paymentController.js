const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

// =========================================================
// 1. INICIAR PAGO (BLINDADO PARA PAGOPAR 2.0)
// =========================================================
const initiatePayment = async (req, res) => {
    console.log("\n🚀 INICIANDO PAGO - Verificación de Protocolo PagoPar");
    try {
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();

        if (!PUBLIC_KEY || !PRIVATE_KEY) throw new Error("Faltan credenciales API en .env");

        const { courseId } = req.body;
        if (!req.usuario) return res.status(401).json({ message: "Sesión expirada" });

        const curso = await Course.findByPk(courseId);
        if (!curso) return res.status(404).json({ message: "Curso no encontrado" });

        // Buscamos datos frescos del usuario para asegurar campos fiscales
        const usuarioFull = await User.findByPk(req.usuario.id);
        const monto = parseInt(curso.precio);
        const pedidoId = `ORDEN-${Date.now()}`;

        // 🟢 PROTOCOLO DE IDENTIDAD FISCAL (Requerido por PagoPar)
        const tieneDocReal = usuarioFull.cedula_identidad && usuarioFull.cedula_identidad.length > 4;
        
        const comprador = {
            ruc: tieneDocReal ? usuarioFull.cedula_identidad : "44444401-7",
            documento: tieneDocReal ? usuarioFull.cedula_identidad.split('-')[0] : "4444440",
            tipo_documento: tieneDocReal ? "CI" : "RUC", // PagoPar diferencia CI de RUC
            nombre: usuarioFull.nombre_completo || "Estudiante Tecnia",
            email: usuarioFull.email,
            telefono: usuarioFull.telefono || "0981000000",
            razon_social: usuarioFull.nombre_completo || "Consumidor Final",
            ciudad: 1, // Default Asunción
            direccion: "Paraguay"
        };

        // 1. REGISTRAR TRANSACCIÓN LOCAL
        const nuevaTransaccion = await Transaction.create({
            external_reference: pedidoId,
            amount: monto,
            status: 'pending',
            userId: usuarioFull.id,
            courseId: courseId,
            ip_address: req.ip,
            payment_method: 'pagopar'
        });

        // 2. FIRMA DIGITAL (SHA1)
        const tokenFirma = crypto.createHash('sha1').update(PRIVATE_KEY + pedidoId + monto.toString()).digest('hex');

        // 3. OBJETO DE PEDIDO (Estructura Estricta PagoPar 2.0)
        const orden = {
            "token": tokenFirma,
            "public_key": PUBLIC_KEY,
            "monto_total": monto,
            "tipo_pedido": "VENTA-COMERCIO",
            "compras_items": [
                {
                    "ciudad": 1,
                    "nombre": curso.titulo.substring(0, 40),
                    "cantidad": 1,
                    "categoria": "909",
                    "public_key": PUBLIC_KEY,
                    "url_imagen": curso.imagen_url || "https://tecniaacademy.com/logo.png",
                    "descripcion": "Acceso a plataforma Tecnia Academy",
                    "id_producto": courseId.toString(),
                    "precio_total": monto,
                    "vendedor_telefono": "0981000000",
                    "vendedor_direccion": "Asunción",
                    "vendedor_direccion_referencia": "Sede Central",
                    "vendedor_direccion_coordenadas": "-25.2637,-57.5759"
                }
            ],
            "fecha_maxima_pago": new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            "id_pedido_comercio": pedidoId,
            "descripcion_resumen": `Curso: ${curso.titulo}`,
            "forma_pago": 9,
            "comprador": {
                "ruc": comprador.ruc,
                "email": comprador.email,
                "ciudad": comprador.ciudad,
                "nombre": comprador.nombre,
                "telefono": comprador.telefono,
                "direccion": comprador.direccion,
                "documento": comprador.documento,
                "razon_social": comprador.razon_social,
                "tipo_documento": comprador.tipo_documento, // CI o RUC
                "coordenadas": "",
                "direccion_referencia": ""
            }
        };

        const response = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', orden);

        if (response.data.respuesta) {
            const hashPagopar = response.data.resultado[0].data;
            nuevaTransaccion.external_reference = hashPagopar;
            await nuevaTransaccion.save();
            
            console.log(`✅ PagoPar OK. Hash: ${hashPagopar}`);
            res.json({ success: true, redirectUrl: `https://www.pagopar.com/pagos/${hashPagopar}` });
        } else {
            console.error("❌ Error API PagoPar:", response.data.resultado);
            await nuevaTransaccion.destroy();
            res.status(400).json({ message: "PagoPar dice: " + response.data.resultado });
        }

    } catch (error) {
        console.error("❌ Error Crítico PaymentController:", error.message);
        res.status(500).json({ message: "Error interno al procesar el pago" });
    }
};

// =========================================================
// 2. WEBHOOK (PROCESAMIENTO DE ÉXITO)
// =========================================================
const confirmPaymentWebhook = async (req, res) => {
    try {
        const { resultado } = req.body;
        if (!resultado || !resultado[0]) return res.json({ error: "Sin datos" });

        const hash_pedido = resultado[0].hash_pedido;
        res.json({ success: true }); // Respuesta inmediata a PagoPar

        // Verificación de seguridad asíncrona
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
                        console.log(`🎓 Alumno ${tx.userId} inscrito automáticamente.`);
                    }
                }
            } catch (err) { console.error("Error en Verificación Webhook:", err.message); }
        }, 3000);

    } catch (err) { console.error("Error Webhook General:", err.message); }
};

module.exports = { initiatePayment, confirmPaymentWebhook };