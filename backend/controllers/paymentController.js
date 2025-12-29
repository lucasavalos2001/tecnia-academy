const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

// =========================================================
// 1. INICIAR PAGO (Funciona perfecto)
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

        // Token creación: sha1(private + id + monto)
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
// 2. WEBHOOK + CONSULTA (MEJORADO CON DIAGNÓSTICO)
// =========================================================
const confirmPaymentWebhook = async (req, res) => {
    console.log("\n🔔 WEBHOOK RECIBIDO");

    try {
        const body = req.body;
        if (!body || !body.resultado || !body.resultado[0]) return res.json({ error: "No data" });

        const datosPago = body.resultado[0];
        const hash_pedido = datosPago.hash_pedido;
        
        // A) CUMPLIR PASO 2: Responder Eco inmediatamente
        res.json(body.resultado);
        console.log("✅ Paso 2: Respuesta enviada.");

        // B) CUMPLIR PASO 3: Consultar y Habilitar Curso
        setTimeout(async () => {
            console.log("⏳ Ejecutando Paso 3 (Consulta)...");
            
            const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
            const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();

            // Fórmula: sha1(private + "CONSULTA")
            const tokenConsulta = crypto.createHash('sha1').update(`${PRIVATE_KEY}CONSULTA`).digest('hex');

            try {
                const payload = {
                    hash_pedido: hash_pedido,
                    token: tokenConsulta,
                    token_publico: PUBLIC_KEY
                };

                const consulta = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', payload, {
                    headers: { 'Content-Type': 'application/json' }
                });

                if (consulta.data.respuesta === true) {
                    console.log("🎉 PASO 3 EXITOSO: Pagopar confirmó el estado.");
                    
                    // 🕵️‍♂️ BÚSQUEDA DIAGNÓSTICA (Aquí detectamos si la BD se borró)
                    const transaccion = await Transaction.findOne({ where: { external_reference: datosPago.numero_pedido } });
                    
                    if (!transaccion) {
                        console.error("😱 ERROR GRAVE: El webhook llegó, pero la transacción NO EXISTE en la BD local.");
                        console.error(`   Buscaba ID Pedido: ${datosPago.numero_pedido}`);
                        console.error("   Causa probable: Se reinició la BD con 'force: true' y se borró el pedido pendiente.");
                        return; // Salimos para no causar crash
                    }

                    console.log(`🔎 Transacción encontrada (ID: ${transaccion.id}). Estado actual: ${transaccion.status}`);

                    // LÓGICA DE ACTUALIZACIÓN
                    const pagadoEnPagopar = consulta.data.resultado[0].pagado === true;

                    if (pagadoEnPagopar && transaccion.status !== 'paid') {
                        // 1. Marcar como pagado
                        transaccion.status = 'paid';
                        await transaccion.save();

                        // 2. Crear Inscripción
                        await Enrollment.findOrCreate({ 
                            where: { userId: transaccion.userId, courseId: transaccion.courseId }, 
                            defaults: { 
                                progreso_porcentaje: 0, 
                                fecha_inscripcion: new Date(), 
                                lecciones_completadas: [] 
                            } 
                        });
                        console.log("💾 ¡BD ACTUALIZADA Y CURSO HABILITADO! 🎓");

                    } else if (transaccion.status === 'paid') {
                        console.log("ℹ️ El pedido ya estaba pagado. No se hizo nada nuevo.");
                    } else {
                        console.log("⚠️ El pedido existe pero Pagopar dice que NO está pagado aún.");
                    }

                } else {
                    console.log("❌ Error en Paso 3 (Respuesta False):", consulta.data.resultado);
                }
            } catch (err) {
                console.log("❌ Error Red Paso 3:", err.message);
                if(err.response) console.log(err.response.data);
            }
        }, 2000);

    } catch (error) {
        console.error("❌ Error Webhook:", error.message);
    }
};

module.exports = { initiatePayment, confirmPaymentWebhook };