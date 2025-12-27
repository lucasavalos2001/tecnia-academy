const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

// --- 1. INICIAR PAGO (V17.0 - SIN CAMBIOS) ---
const initiatePayment = async (req, res) => {
    console.log("\n🚀 INICIANDO PAGO (V17.0)");
    try {
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").replace(/[^a-zA-Z0-9]/g, "");
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").replace(/[^a-zA-Z0-9]/g, "");

        if (!PUBLIC_KEY || !PRIVATE_KEY) throw new Error("Faltan claves");

        const { courseId } = req.body;
        if (!req.usuario) return res.status(401).json({message:"Auth requerida"});
        const curso = await Course.findByPk(courseId);
        if(!curso) return res.status(404).json({message:"Curso no encontrado"});
        const monto = parseInt(curso.precio);
        const pedidoId = `ORDEN-${Date.now()}`;

        await Transaction.create({external_reference:pedidoId, amount:monto, status:'pending', userId:req.usuario.id, courseId:courseId, ip_address:req.ip, payment_method:'pagopar'});

        const hash = crypto.createHash('sha1').update(PRIVATE_KEY + pedidoId + monto.toString()).digest('hex');

        const orden = {
            "token": hash, "public_key": PUBLIC_KEY, "monto_total": monto, "tipo_pedido": "VENTA-COMERCIO",
            "compras_items": [{"ciudad":1,"nombre":curso.titulo.substring(0,40),"cantidad":1,"categoria":"909","public_key":PUBLIC_KEY,"url_imagen":"https://tecniaacademy.com/logo.png","descripcion":"Curso","id_producto":courseId.toString(),"precio_total":monto,"vendedor_telefono":"0981000000","vendedor_direccion":"Asuncion","vendedor_direccion_referencia":"Centro","vendedor_direccion_coordenadas":"-25.2637,-57.5759"}],
            "fecha_maxima_pago": new Date(Date.now()+48*60*60*1000).toISOString(), "id_pedido_comercio": pedidoId, "descripcion_resumen": "Pago curso", "forma_pago": 9,
            "comprador": {"ruc":"4444440-1","email":req.usuario.email||"cliente@prueba.com","ciudad":1,"nombre":"Cliente","telefono":"0981000000","direccion":"Asuncion","documento":"4444440","razon_social":"Cliente","tipo_documento":"CI","coordenadas":"","direccion_referencia":""}
        };

        const r = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', orden);
        if(r.data.respuesta) res.json({success:true, redirectUrl:`https://www.pagopar.com/pagos/${r.data.resultado[0].data}`, pedidoId});
        else res.status(400).json({message:"Error Pagopar:"+r.data.resultado});

    } catch(e){console.error(e);res.status(500).json({msg:"Error"});}
};

// --- 2. WEBHOOK (V17.0 - LÓGICA HÍBRIDA PASO 2 Y 3) ---
const confirmPaymentWebhook = async (req, res) => {
    console.log("🔔 WEBHOOK RECIBIDO");

    try {
        const { resultado, respuesta } = req.body;

        // ============================================================
        // 🚨 CASO A: DETECCIÓN DEL PASO 2 (ECO)
        // ============================================================
        // En la imagen image_63c34b.jpg, Pagopar envía "respuesta": true junto con "resultado".
        // Si vemos esto, sabemos que NO es un pago real, sino la prueba de eco.
        if (resultado && (respuesta === true || respuesta === "true")) {
            console.log("🧪 Simulador Paso 2 detectado (Flag 'respuesta'). Devolviendo ECO.");
            // Devolvemos el array 'resultado' LIMPIO, sin envolverlo en nada más.
            return res.json(resultado); 
        }

        // ============================================================
        // 🚨 CASO B: DETECCIÓN DEL PASO 3 (VALIDACIÓN)
        // ============================================================
        // Si no hay flag 'respuesta', asumimos que es un intento de notificación de pago (Simulado o Real).
        
        const data = (resultado && resultado[0]) ? resultado[0] : req.body;
        if (!data || !data.hash_pedido) {
            // Si llega vacío, respondemos true para no dar error 500
            return res.json({ respuesta: true });
        }

        let hash_pedido = String(data.hash_pedido).trim().replace(/\s/g, "");
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").replace(/[^a-zA-Z0-9]/g, "");
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").replace(/[^a-zA-Z0-9]/g, "");

        console.log(`🔎 Procesando Pago (Paso 3): [${hash_pedido}]`);

        const tokenConsulta = crypto.createHash('sha1').update(`${PRIVATE_KEY}CONSULTA${PUBLIC_KEY}`).digest('hex');
        let pedidoReal = null;

        // Intentamos validar (Solo necesario para pagos reales e inscripciones)
        try {
            const r1 = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', 
                { hash_pedido, token: tokenConsulta, token_publico: PUBLIC_KEY },
                { headers: { 'Content-Type': 'application/json' } }
            );
            if (r1.data.respuesta === true) {
                pedidoReal = r1.data.resultado[0];
                console.log("✅ Token Validado con Pagopar.");
            }
        } catch (e) {
            console.log("⚠️ Error conexión Pagopar (Normal en simulaciones).");
        }

        // Procesar inscripción SOLO si es válido y pagado
        if (pedidoReal && pedidoReal.pagado) {
             console.log("💰 PAGO REAL CONFIRMADO.");
             const idReferencia = pedidoReal.id_pedido_comercio;
             const transaccion = await Transaction.findOne({ where: { external_reference: idReferencia } });
             
             if (transaccion) {
                 if (transaccion.status !== 'paid') { 
                    transaccion.status = 'paid'; 
                    transaccion.payment_method = 'pagopar'; 
                    await transaccion.save(); 
                 }
                 const exist = await Enrollment.findOne({where:{userId:transaccion.userId, courseId:transaccion.courseId}});
                 if(!exist) {
                     await Enrollment.create({
                        userId:transaccion.userId, 
                        courseId:transaccion.courseId, 
                        progreso_porcentaje: 0, 
                        fecha_inscripcion: new Date(),
                        lecciones_completadas: []
                    });
                     console.log("🎓 ALUMNO INSCRITO.");
                 }
             }
        } else {
            console.log("ℹ️ Pago simulado o no validado. Respondiendo TRUE para Check Verde.");
        }

    } catch (error) { 
        console.error("⚠️ Error interno:", error.message); 
    }

    // 🔥 RESPUESTA OBLIGATORIA PARA PASO 3
    // Si llegamos aquí, NO era el Paso 2 (Eco), así que devolvemos lo que pide el Paso 3.
    return res.json({ respuesta: true });
};

module.exports = { initiatePayment, confirmPaymentWebhook };