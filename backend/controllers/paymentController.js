const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

// =========================================================
// 1. INICIAR PAGO (Tu versión que ya funciona)
// =========================================================
const initiatePayment = async (req, res) => {
    console.log("\n🚀 INICIANDO PAGO");
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

        await Transaction.create({
            external_reference: pedidoId, amount: monto, status: 'pending', userId: req.usuario.id, 
            courseId: courseId, ip_address: req.ip, payment_method: 'pagopar'
        });

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
        
        if(r.data.respuesta) {
            res.json({success:true, redirectUrl:`https://www.pagopar.com/pagos/${r.data.resultado[0].data}`, pedidoId});
        } else {
            res.status(400).json({message:"Error Pagopar:"+r.data.resultado});
        }

    } catch(e){ console.error(e); res.status(500).json({msg:"Error"}); }
};

// =========================================================
// 2. WEBHOOK (ESTRATEGIA BLINDADA PASO 2 Y 3)
// =========================================================
const confirmPaymentWebhook = async (req, res) => {
    console.log("🔔 WEBHOOK RECIBIDO");

    // Variables de respuesta para asegurar el Paso 2
    let resultadoPaso2 = { respuesta: true };

    try {
        const { resultado, respuesta } = req.body;
        const data = (resultado && resultado[0]) ? resultado[0] : req.body;

        // Si es simulador, preparamos la respuesta EXACTA que pide Pagopar para el Paso 2
        if (respuesta === true || respuesta === "true") {
            console.log("📝 Detectado modo Simulador (Preparando Eco)");
            resultadoPaso2 = resultado; 
        }

        // =====================================================
        // INTENTO DEL PASO 3 (AISLADO EN SU PROPIO TRY-CATCH)
        // =====================================================
        if (data && data.hash_pedido) {
            try {
                console.log(`🔎 Ejecutando Paso 3 para hash: [${data.hash_pedido}]`);
                
                const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").replace(/[^a-zA-Z0-9]/g, "");
                const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").replace(/[^a-zA-Z0-9]/g, "");
                
                // Generar Token de Consulta
                const tokenConsulta = crypto.createHash('sha1').update(`${PRIVATE_KEY}CONSULTA${PUBLIC_KEY}`).digest('hex');

                // Hacer la petición a Pagopar (ESTO ACTIVA EL VERDE)
                // Usamos validateStatus para que axios no lance error si Pagopar responde 404/400
                const r1 = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', { 
                    hash_pedido: data.hash_pedido, 
                    token: tokenConsulta, 
                    token_publico: PUBLIC_KEY,
                    public_key: PUBLIC_KEY 
                }, { 
                    headers: { 'Content-Type': 'application/json' },
                    validateStatus: function (status) { return status < 500; } // No lanzar error en 400s
                });

                console.log("📨 Respuesta Pagopar (Paso 3):", r1.data.respuesta);

                // Lógica de inscripción (Solo si fue exitoso)
                if (r1.data.respuesta === true && r1.data.resultado && r1.data.resultado[0].pagado) {
                    const pedidoReal = r1.data.resultado[0];
                    const transaccion = await Transaction.findOne({ where: { external_reference: pedidoReal.id_pedido_comercio } });
                    
                    if (transaccion && transaccion.status !== 'paid') {
                        transaccion.status = 'paid';
                        await transaccion.save();
                        await Enrollment.findOrCreate({
                            where: { userId: transaccion.userId, courseId: transaccion.courseId },
                            defaults: { progreso_porcentaje: 0, fecha_inscripcion: new Date(), lecciones_completadas: [] }
                        });
                        console.log("✅ Curso habilitado exitosamente.");
                    }
                }

            } catch (errorPaso3) {
                // Si el Paso 3 falla (ej: hash falso del simulador), LO IGNORAMOS para no romper el Paso 2
                console.log("⚠️ Error en Paso 3 (No crítico):", errorPaso3.message);
            }
        }
        // =====================================================

    } catch (errorGeneral) {
        console.error("❌ Error en Webhook:", errorGeneral.message);
    }

    // =====================================================
    // RESPUESTA FINAL (OBLIGATORIO PARA PASO 2)
    // =====================================================
    // Respondemos SIEMPRE al final, pase lo que pase arriba.
    console.log("📤 Enviando respuesta a Pagopar (Paso 2 ok)");
    return res.json(resultadoPaso2);
};

module.exports = { initiatePayment, confirmPaymentWebhook };