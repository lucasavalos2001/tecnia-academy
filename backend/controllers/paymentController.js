const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

// --- 1. INICIAR PAGO (V21.0 - SIN CAMBIOS) ---
const initiatePayment = async (req, res) => {
    console.log("\n🚀 INICIANDO PAGO (V21.0)");
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
            external_reference: pedidoId, 
            amount: monto, 
            status: 'pending', 
            userId: req.usuario.id, 
            courseId: courseId, 
            ip_address: req.ip, 
            payment_method: 'pagopar'
        });

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

// --- 2. WEBHOOK (V21.0 - LÓGICA SECUENCIAL INEVITABLE) ---
const confirmPaymentWebhook = async (req, res) => {
    console.log("🔔 WEBHOOK RECIBIDO");

    try {
        const { resultado, respuesta } = req.body;
        const data = (resultado && resultado[0]) ? resultado[0] : req.body;
        
        // Validación básica de entrada
        if (!data || !data.hash_pedido) return res.json({ respuesta: true });

        // ---------------------------------------------------------
        // PASO A: PROCESAR EL PAGO (SIEMPRE PRIMERO)
        // No importa si es simulación o real, intentamos validar.
        // ---------------------------------------------------------
        let hash_pedido = String(data.hash_pedido).trim().replace(/\s/g, "");
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").replace(/[^a-zA-Z0-9]/g, "");
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").replace(/[^a-zA-Z0-9]/g, "");

        console.log(`🔎 Consultando estado para hash: [${hash_pedido}]`);

        const tokenConsulta = crypto.createHash('sha1').update(`${PRIVATE_KEY}CONSULTA${PUBLIC_KEY}`).digest('hex');
        let pedidoReal = null;

        try {
            // Enviamos TODOS los parámetros posibles para que la API no tenga excusas
            const payload = { 
                hash_pedido: hash_pedido, 
                token: tokenConsulta, 
                token_publico: PUBLIC_KEY,
                public_key: PUBLIC_KEY 
            };

            const r1 = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', payload, { 
                headers: { 'Content-Type': 'application/json' } 
            });
            
            if (r1.data.respuesta === true) {
                pedidoReal = r1.data.resultado[0];
                console.log("✅ API Pagopar confirmó: ESTADO PAGADO.");
            } else {
                // Solo advertencia, no error, porque puede ser un hash de prueba falso
                console.log("ℹ️ API Pagopar no encontró el pedido (Normal si el hash es inventado).");
            }
        } catch (e) {
            console.error("❌ Error de red al consultar API:", e.message);
        }

        // ---------------------------------------------------------
        // PASO B: INSCRIBIR (SI LA API DIJO "PAGADO")
        // Aquí es donde recuperas tu curso de 1.000 Gs
        // ---------------------------------------------------------
        if (pedidoReal && pedidoReal.pagado) {
             const idReferencia = pedidoReal.id_pedido_comercio;
             const transaccion = await Transaction.findOne({ where: { external_reference: idReferencia } });
             
             if (transaccion) {
                 // 1. Guardar Pago
                 if (transaccion.status !== 'paid') { 
                    transaccion.status = 'paid'; 
                    transaccion.payment_method = 'pagopar'; 
                    await transaccion.save(); 
                    console.log("💾 BD: Transacción marcada como PAID.");
                 }
                 
                 // 2. Inscribir Alumno
                 const enrollmentExistente = await Enrollment.findOne({where:{userId:transaccion.userId, courseId:transaccion.courseId}});
                 if(!enrollmentExistente) {
                     // USANDO TUS CAMPOS DE ENROLLMENT.JS
                     await Enrollment.create({
                        userId:transaccion.userId, 
                        courseId:transaccion.courseId, 
                        progreso_porcentaje: 0, 
                        fecha_inscripcion: new Date(),
                        lecciones_completadas: []
                    });
                     console.log("🎉 ¡INSCRIPCIÓN ÉXITOSA!");
                 } else {
                     console.log("ℹ️ El alumno ya estaba inscrito.");
                 }
             } else {
                 console.error("❌ ERROR: No se encontró la transacción local con ID " + idReferencia);
             }
        }

        // ---------------------------------------------------------
        // PASO C: RESPONDER A PAGOPAR (AL FINAL)
        // ---------------------------------------------------------
        
        // Si detectamos la bandera 'respuesta: true', es el TEST DE ECO (Paso 2).
        if (resultado && (respuesta === true || respuesta === "true")) {
            console.log("📤 Modo Simulador detectado: Enviando ECO.");
            return res.json(resultado); 
        }

        // Si no, es una notificación normal, respondemos OK (Paso 3).
        console.log("📤 Modo Notificación: Enviando OK.");
        return res.json({ respuesta: true });

    } catch (error) { 
        console.error("⚠️ Error general:", error.message); 
        // Siempre responder true para no bloquear reintentos futuros
        return res.json({ respuesta: true });
    }
};

module.exports = { initiatePayment, confirmPaymentWebhook };