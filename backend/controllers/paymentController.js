const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

const initiatePayment = async (req, res) => {
    try {
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();

        const { courseId } = req.body;
        const curso = await Course.findByPk(courseId);
        if (!curso) return res.status(404).json({ message: "Curso no encontrado" });

        const monto = parseInt(curso.precio);
        const pedidoId = `ORDEN-${Date.now()}`;

        // 1. REGISTRAR TRANSACCIÓN LOCAL
        const nuevaTransaccion = await Transaction.create({
            external_reference: pedidoId,
            amount: monto,
            status: 'pending',
            userId: req.usuario.id,
            courseId: courseId,
            ip_address: req.ip,
            payment_method: 'pagopar'
        });

        // 2. FIRMA DIGITAL
        const tokenFirma = crypto.createHash('sha1').update(PRIVATE_KEY + pedidoId + monto.toString()).digest('hex');

        // 3. OBJETO PLANO (ESTRUCTURA MÍNIMA REQUERIDA)
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
                    "url_imagen": "https://tecniaacademy.com/logo.png",
                    "descripcion": "Curso Online",
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
                "ruc": "44444401-7",
                "email": req.usuario.email,
                "ciudad": 1,
                "nombre": req.usuario.nombre_completo || "Usuario Tecnia",
                "telefono": "0981000000",
                "direccion": "Asuncion",
                "documento": "4444440",
                "razon_social": req.usuario.nombre_completo || "Usuario Tecnia",
                "tipo_documento": "RUC", // 👈 OBLIGATORIO EN MAYÚSCULAS
                "coordenadas": "",
                "direccion_referencia": ""
            }
        };

        const response = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', orden);

        if (response.data.respuesta) {
            const hashPagopar = response.data.resultado[0].data;
            nuevaTransaccion.external_reference = hashPagopar;
            await nuevaTransaccion.save();
            res.json({ success: true, redirectUrl: `https://www.pagopar.com/pagos/${hashPagopar}` });
        } else {
            await nuevaTransaccion.destroy();
            // Esto nos dirá exactamente qué campo falta si vuelve a fallar
            res.status(400).json({ message: "PagoPar dice: " + JSON.stringify(response.data.resultado) });
        }

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Error interno" });
    }
};

const confirmPaymentWebhook = async (req, res) => {
    try {
        const { resultado } = req.body;
        if (!resultado || !resultado[0]) return res.json({ error: "No data" });
        const hash_pedido = resultado[0].hash_pedido;
        res.json({ success: true });
        
        setTimeout(async () => {
            const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();
            const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
            const tokenConsulta = crypto.createHash('sha1').update(`${PRIVATE_KEY}CONSULTA`).digest('hex');
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
                }
            }
        }, 3000);
    } catch (e) { console.error(e); }
};

module.exports = { initiatePayment, confirmPaymentWebhook };