const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction } = require('../models');

const initiatePayment = async (req, res) => {
    console.log("\n🚀 INICIANDO PAGO (VERSIÓN 2.0 - VENTA-COMERCIO)");

    try {
        // 1. OBTENER CLAVES
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();

        if (!PUBLIC_KEY || !PRIVATE_KEY) throw new Error("Faltan claves en .env");

        // 2. OBTENER DATOS
        const { courseId } = req.body;
        const userId = req.usuario.id;

        const curso = await Course.findByPk(courseId);
        const usuario = await User.findByPk(userId);

        if (!curso || !usuario) return res.status(404).json({ message: "Curso/Usuario no encontrado" });

        // 3. PREPARAR VARIABLES
        const monto = parseInt(curso.precio);
        const montoString = monto.toString();
        const pedidoId = `ORDEN-${Date.now()}`; // ID único

        // 4. GENERAR HASH (SHA1: private + id + monto_string)
        const hash = crypto.createHash('sha1')
                           .update(PRIVATE_KEY + pedidoId + montoString)
                           .digest('hex');

        // 5. ARMAR JSON (ESTRUCTURA 2.0 EXACTA)
        const orden = {
            "token": hash,
            "public_key": PUBLIC_KEY,
            "monto_total": monto,
            "tipo_pedido": "VENTA-COMERCIO", // 👈 LA CLAVE DEL ÉXITO
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
            "forma_pago": 9, // Pre-selección (opcional)
            "comprador": {
                "ruc": usuario.documento ? `${usuario.documento}-1` : "4444440-1",
                "email": usuario.email,
                "ciudad": 1, // Asunción por defecto
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

        // 6. GUARDAR TRANSACCIÓN EN BD (Pendiente)
        await Transaction.create({
            external_reference: pedidoId,
            amount: monto,
            status: 'pending',
            userId: userId,
            courseId: courseId,
            ip_address: req.ip || '127.0.0.1'
        });

        // 7. ENVIAR A PAGOPAR
        console.log(`📤 Enviando pedido ${pedidoId} a Pagopar v2.0...`);
        const response = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', orden);

        if (response.data.respuesta === true) {
            // EN LA V2.0, NOS DEVUELVEN UN HASH EN "data", NO LA URL DIRECTA
            const hashPedido = response.data.resultado[0].data;
            const urlFinal = `https://www.pagopar.com/pagos/${hashPedido}`;

            console.log("✅ ¡LINK GENERADO!", urlFinal);
            
            res.json({ 
                success: true, 
                redirectUrl: urlFinal,
                pedidoId: pedidoId 
            });
        } else {
            console.error("❌ RECHAZADO:", response.data.resultado);
            res.status(400).json({ message: "Error Pagopar: " + response.data.resultado });
        }

    } catch (error) {
        console.error("🔥 ERROR:", error.message);
        if (error.response) console.error(JSON.stringify(error.response.data, null, 2));
        res.status(500).json({ message: "Error interno al procesar pago" });
    }
};

const confirmPaymentWebhook = async (req, res) => {
    // Tu webhook anterior estaba bien, lo dejamos simple para confirmar recepción
    console.log("Webhook recibido:", req.body);
    res.json({ respuesta: true });
};

module.exports = { initiatePayment, confirmPaymentWebhook };