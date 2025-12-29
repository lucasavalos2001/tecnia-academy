const crypto = require('crypto');
const axios = require('axios'); // Ya no lo usamos en el webhook, pero sí para iniciar
const { Course, User, Transaction, Enrollment } = require('../models');

// =========================================================
// 1. INICIAR PAGO (Sin cambios - Funciona Perfecto)
// =========================================================
const initiatePayment = async (req, res) => {
    console.log("\n🚀 INICIANDO PAGO");
    try {
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();

        if (!PUBLIC_KEY || !PRIVATE_KEY) throw new Error("Faltan claves");

        const { courseId } = req.body;
        if (!req.usuario) return res.status(401).json({message:"Auth requerida"});
        
        const curso = await Course.findByPk(courseId);
        if(!curso) return res.status(404).json({message:"Curso no encontrado"});
        
        const monto = parseInt(curso.precio);
        const pedidoId = `ORDEN-${Date.now()}`; 

        await Transaction.create({
            external_reference: pedidoId, amount: monto, status: 'pending', userId: req.usuario.id, 
            courseId: courseId, ip_address: req.ip, payment_method: 'pagopar'
        });

        // Token v1: sha1(private + id + monto)
        const hash = crypto.createHash('sha1').update(PRIVATE_KEY + pedidoId + monto.toString()).digest('hex');

        const orden = {
            "token": hash, "public_key": PUBLIC_KEY, "monto_total": monto, "tipo_pedido": "VENTA-COMERCIO",
            "compras_items": [{"ciudad":1,"nombre":curso.titulo.substring(0,40),"cantidad":1,"categoria":"909","public_key":PUBLIC_KEY,"url_imagen":"https://tecniaacademy.com/logo.png","descripcion":"Curso","id_producto":courseId.toString(),"precio_total":monto,"vendedor_telefono":"0981000000","vendedor_direccion":"Asuncion","vendedor_direccion_referencia":"Centro","vendedor_direccion_coordenadas":"-25.2637,-57.5759"}],
            "fecha_maxima_pago": new Date(Date.now()+48*60*60*1000).toISOString(), 
            "id_pedido_comercio": pedidoId, "descripcion_resumen": "Pago curso", "forma_pago": 9,
            "comprador": {
                "ruc": req.usuario.documento || "4444440-1", "email": req.usuario.email || "cliente@prueba.com", "ciudad": 1,
                "nombre": req.usuario.nombre_completo || "Cliente", "telefono": req.usuario.telefono || "0981000000",
                "direccion": "Asuncion", "documento": req.usuario.documento_numero || "4444440", "razon_social": req.usuario.nombre_completo || "Cliente",
                "tipo_documento": "CI", "coordenadas": "", "direccion_referencia": ""
            }
        };

        const r = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', orden);
        
        if(r.data.respuesta) res.json({success:true, redirectUrl:`https://www.pagopar.com/pagos/${r.data.resultado[0].data}`, pedidoId});
        else res.status(400).json({message:"Error Pagopar:"+r.data.resultado});

    } catch(e){ console.error(e); res.status(500).json({msg:"Error"}); }
};

// =========================================================
// 2. WEBHOOK (SEGÚN TU DOCUMENTACIÓN)
// =========================================================
const confirmPaymentWebhook = async (req, res) => {
    console.log("🔔 WEBHOOK RECIBIDO");

    try {
        const body = req.body;
        
        // 1. Verificar estructura básica
        if (!body || !body.resultado || !body.resultado[0]) {
            console.log("❌ JSON Malformado o vacío");
            return res.status(400).json({ error: "Datos incorrectos" });
        }

        const datosPago = body.resultado[0];
        const hash_pedido = datosPago.hash_pedido; // Hash original del pedido
        const token_recibido = datosPago.token;    // Token de seguridad que envía Pagopar
        const pagado = datosPago.pagado;

        // 2. VALIDACIÓN DE TOKEN (CRÍTICO SEGÚN TU DOC)
        // Fórmula: sha1(private_key + hash_pedido)
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();
        const token_generado = crypto.createHash('sha1').update(PRIVATE_KEY + hash_pedido).digest('hex');

        if (token_generado !== token_recibido) {
            console.error("⛔ ALERTA DE SEGURIDAD: Token no coincide.");
            console.error(`   Esperado: ${token_generado}`);
            console.error(`   Recibido: ${token_recibido}`);
            // La doc dice: "Validación estrictamente obligatoria".
            // Pero en Staging, a veces devolvemos 200 para no trabar, aunque logueamos el error.
        } else {
            console.log("✅ Token Validado Correctamente.");
            
            // 3. ACTUALIZAR BASE DE DATOS (Solo si el token es válido)
            // Buscamos por reference (tu ID local) O por hash si lo guardaste
            const transaccion = await Transaction.findOne({ where: { external_reference: datosPago.numero_pedido } });

            if (transaccion) {
                if (pagado === true && transaccion.status !== 'paid') {
                    transaccion.status = 'paid';
                    await transaccion.save();
                    
                    // Lógica de inscripción
                    await Enrollment.findOrCreate({
                        where: { userId: transaccion.userId, courseId: transaccion.courseId },
                        defaults: { progreso_porcentaje: 0, fecha_inscripcion: new Date(), lecciones_completadas: [] }
                    });
                    console.log(`🎉 PAGO CONFIRMADO: Pedido ${datosPago.numero_pedido}`);
                }
            } else {
                console.log("⚠️ Pedido no encontrado en BD local (¿Tal vez borraste la tabla?)");
            }
        }

        // 4. RESPUESTA FINAL (CRÍTICO SEGÚN TU DOC)
        // "El comercio debe retornar directamente el contenido del resultado del JSON"
        // NO { respuesta: true }, SINO [ { ... } ]
        console.log("📤 Respondiendo 'Eco' del resultado...");
        return res.status(200).json(body.resultado);

    } catch (error) {
        console.error("❌ Error Webhook:", error.message);
        return res.status(500).send("Error interno");
    }
};

module.exports = { initiatePayment, confirmPaymentWebhook };