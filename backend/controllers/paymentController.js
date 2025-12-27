const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

// --- 1. INICIAR PAGO (V6.0 - NO TOCAR, YA FUNCIONA PERFECTO) ---
const initiatePayment = async (req, res) => {
    console.log("\n🚀 INICIANDO PAGO (V6.0 - PEDIDO BLINDADO)");

    try {
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").replace(/[^a-zA-Z0-9]/g, "");
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").replace(/[^a-zA-Z0-9]/g, "");

        if (!PUBLIC_KEY || !PRIVATE_KEY) throw new Error("Faltan claves en .env");

        const { courseId } = req.body;
        // Si no hay usuario, retornamos error pero no rompemos el servidor
        if (!req.usuario || !req.usuario.id) return res.status(401).json({ message: "Usuario no autenticado" });
        
        const curso = await Course.findByPk(courseId);
        if (!curso) return res.status(404).json({ message: "Curso no encontrado" });

        const monto = parseInt(curso.precio);
        const pedidoId = `ORDEN-${Date.now()}`; 

        await Transaction.create({
            external_reference: pedidoId, amount: monto, status: 'pending',
            userId: req.usuario.id, courseId: courseId, ip_address: req.ip || '127.0.0.1'
        });

        // Hash V2.0 (Private + ID + Monto) -> ESTO FUNCIONA
        const hash = crypto.createHash('sha1').update(PRIVATE_KEY + pedidoId + monto.toString()).digest('hex');

        const orden = {
            "token": hash,
            "public_key": PUBLIC_KEY,
            "monto_total": monto,
            "tipo_pedido": "VENTA-COMERCIO",
            "compras_items": [{
                "ciudad": 1, "nombre": curso.titulo.substring(0,40), "cantidad": 1, "categoria": "909",
                "public_key": PUBLIC_KEY, "url_imagen": "https://tecniaacademy.com/logo.png",
                "descripcion": "Curso Online", "id_producto": courseId.toString(), "precio_total": monto,
                "vendedor_telefono": "0981000000", "vendedor_direccion": "Asuncion",
                "vendedor_direccion_referencia": "Centro", "vendedor_direccion_coordenadas": "-25.2637,-57.5759"
            }],
            "fecha_maxima_pago": new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            "id_pedido_comercio": pedidoId, "descripcion_resumen": `Pago curso`, "forma_pago": 9,
            "comprador": {
                "ruc": "4444440-1", "email": "cliente@prueba.com", "ciudad": 1, 
                "nombre": "Cliente Prueba", "telefono": "0981000000", "direccion": "Asuncion",
                "documento": "4444440", "razon_social": "Cliente Prueba", "tipo_documento": "CI",
                "coordenadas": "", "direccion_referencia": ""
            }
        };

        const response = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', orden);

        if (response.data.respuesta === true) {
            const hashPedido = response.data.resultado[0].data;
            console.log("✅ PEDIDO CREADO EXITOSAMENTE. Hash:", hashPedido);
            res.json({ success: true, redirectUrl: `https://www.pagopar.com/pagos/${hashPedido}`, pedidoId });
        } else {
            console.error("❌ Error API Inicio:", response.data.resultado);
            res.status(400).json({ message: "Error Pagopar: " + response.data.resultado });
        }
    } catch (e) { console.error("🔥 ERROR INIT:", e.message); res.status(500).json({msg:"Error"}); }
};

// --- 2. WEBHOOK (V6.0 - STRICT LEGACY MODE) ---
const confirmPaymentWebhook = async (req, res) => {
    console.log("🔔 WEBHOOK RECIBIDO");

    try {
        const { resultado } = req.body;
        const data = (resultado && resultado[0]) ? resultado[0] : req.body;
        
        if (req.body.resultado) console.log("🧪 Intento de simulación recibido.");
        if (!data) return res.json({ respuesta: true });

        // Limpiamos el hash entrante
        let hash_pedido = String(data.hash_pedido || "").trim().replace(/\s/g, "");

        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").replace(/[^a-zA-Z0-9]/g, "");
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").replace(/[^a-zA-Z0-9]/g, "");

        console.log(`🔎 Validando Hash: [${hash_pedido}]`);

        // Generamos Token de Consulta: sha1(Privada + 'CONSULTA' + Publica)
        const tokenConsulta = crypto.createHash('sha1')
            .update(`${PRIVATE_KEY}CONSULTA${PUBLIC_KEY}`)
            .digest('hex');

        // --- CORRECCIÓN FINAL AQUÍ ---
        // Enviamos SOLAMENTE lo que pide la API 1.1. Nada más.
        // Quitamos 'public_key' extra para no confundir al servidor legacy.
        const payload = {
            hash_pedido: hash_pedido,
            token: tokenConsulta,
            token_publico: PUBLIC_KEY
        };

        const verificacion = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (verificacion.data.respuesta === true) {
            console.log("✅ ¡PASO 3 VERDE! TOKEN ACEPTADO.");
            const pedidoReal = verificacion.data.resultado[0];
            if (pedidoReal.pagado) {
                const idReferencia = pedidoReal.id_pedido_comercio;
                const transaccion = await Transaction.findOne({ where: { external_reference: idReferencia } });
                if (transaccion && transaccion.status !== 'paid') {
                    transaccion.status = 'paid'; 
                    transaccion.payment_method = 'pagopar';
                    await transaccion.save();
                    const exist = await Enrollment.findOne({where:{userId:transaccion.userId, courseId:transaccion.courseId}});
                    if(!exist) await Enrollment.create({userId:transaccion.userId, courseId:transaccion.courseId, status:'active', progress:0, enrolledAt: new Date()});
                }
            }
        } else {
            console.error("❌ RESPUESTA PAGOPAR:", verificacion.data);
            
            // Si falla, intentamos la única alternativa matemática posible para la V1.1
            // A veces usan hash_pedido en lugar de public_key en la firma (Casos raros)
            if (JSON.stringify(verificacion.data).includes("Token no coincide")) {
                console.warn("⚠️ Probando inversión de firma...");
                const tokenInv = crypto.createHash('sha1').update(`${PUBLIC_KEY}CONSULTA${PRIVATE_KEY}`).digest('hex');
                
                const reintento = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', 
                    { hash_pedido, token: tokenInv, token_publico: PUBLIC_KEY },
                    { headers: { 'Content-Type': 'application/json' } }
                );
                
                if (reintento.data.respuesta === true) console.log("✅ ¡Recuperado con inversión!");
                else console.error("❌ ERROR FINAL:", reintento.data);
            }
        }

    } catch (error) { console.error("⚠️ Error webhook:", error.message); }

    if (req.body.resultado) return res.json(req.body.resultado);
    res.json({ respuesta: true });
};

module.exports = { initiatePayment, confirmPaymentWebhook };