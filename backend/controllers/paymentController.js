const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

// =========================================================
// 1. INICIAR PAGO (Sin cambios, esto ya funciona perfecto)
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
// 2. WEBHOOK ESTRATÉGICO (Delay + Multi-Token)
// =========================================================
const confirmPaymentWebhook = async (req, res) => {
    console.log("🔔 WEBHOOK RECIBIDO");

    try {
        const body = req.body;
        if (!body || !body.resultado || !body.resultado[0]) return res.json({ error: "No data" });

        const datosPago = body.resultado[0];
        const hash_pedido = datosPago.hash_pedido;
        
        // 1. RESPUESTA INMEDIATA (Asegura Paso 2 Verde)
        res.json(body.resultado); 

        // 2. LÓGICA DIFERIDA (Para el Paso 3)
        // Esperamos 3 segundos para dar tiempo a Pagopar a registrar todo en su BD
        setTimeout(async () => {
            console.log("⏳ Iniciando Consulta Paso 3 (tras espera)...");
            
            const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
            const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();
            
            // Función para probar llaves
            const probarConsulta = async (nombre, token) => {
                try {
                    const r = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', { 
                        hash_pedido: hash_pedido, token: token, token_publico: PUBLIC_KEY, public_key: PUBLIC_KEY 
                    }, { headers: { 'Content-Type': 'application/json' } });

                    if (r.data.respuesta === true) {
                        console.log(`✅ ¡Paso 3 ACTIVADO con ${nombre}!`);
                        return true;
                    } else {
                        console.log(`❌ Falló ${nombre}: ${r.data.resultado}`);
                        return false;
                    }
                } catch (e) { console.log(`❌ Error Red ${nombre}`); return false; }
            };

            // ESTRATEGIA A: Fórmula Estándar
            const t1 = crypto.createHash('sha1').update(`${PRIVATE_KEY}CONSULTA${PUBLIC_KEY}`).digest('hex');
            const exito = await probarConsulta("Fórmula Estándar", t1);

            // ESTRATEGIA B: Fórmula Alternativa (Si falla la A)
            if (!exito) {
                console.log("⚠️ Intentando Fórmula Alternativa...");
                const t2 = crypto.createHash('sha1').update(PRIVATE_KEY + hash_pedido).digest('hex');
                await probarConsulta("Fórmula Hash", t2);
            }

            // Actualizar BD Local
            const transaccion = await Transaction.findOne({ where: { external_reference: datosPago.numero_pedido } });
            if (transaccion && datosPago.pagado === true && transaccion.status !== 'paid') {
                transaccion.status = 'paid';
                await transaccion.save();
                await Enrollment.findOrCreate({ where: { userId: transaccion.userId, courseId: transaccion.courseId }, defaults: { progreso_porcentaje: 0, fecha_inscripcion: new Date(), lecciones_completadas: [] } });
            }

        }, 3000); // <--- 3 SEGUNDOS DE ESPERA

    } catch (error) {
        console.error("❌ Error Webhook:", error.message);
    }
};

module.exports = { initiatePayment, confirmPaymentWebhook };