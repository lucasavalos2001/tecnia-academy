const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

// =========================================================
// 1. INICIAR PAGO (MODIFICADO: DATOS REALES + GENÉRICOS)
// =========================================================
const initiatePayment = async (req, res) => {
    console.log("\n🚀 INICIANDO PAGO (Estrategia Udemy)");
    try {
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();

        if (!PUBLIC_KEY || !PRIVATE_KEY) throw new Error("Faltan claves de Pagopar");

        const { courseId } = req.body;
        
        // Verificamos que el usuario esté logueado
        if (!req.usuario) return res.status(401).json({message:"Auth requerida"});
        
        const curso = await Course.findByPk(courseId);
        if(!curso) return res.status(404).json({message:"Curso no encontrado"});
        
        const monto = parseInt(curso.precio);
        const pedidoId = `ORDEN-${Date.now()}`; 

        // 🟢 DATOS DEL COMPRADOR (ESTRATEGIA UDEMY)
        // 1. Usamos el Nombre y Email REALES de tu base de datos.
        // 2. Usamos RUC y Teléfono GENÉRICOS para no trabar la venta.
        const compradorData = {
            nombre: req.usuario.nombre_completo || "Estudiante",
            email: req.usuario.email, // ¡CRUCIAL! Aquí llegará el recibo.
            ruc: "44444401-7",        // RUC Genérico "Sin Nombre" / Consumidor Final
            documento: "4444440",     // Parte numérica del RUC
            telefono: "0981000000",   // Teléfono genérico
            ciudad: 1,                // Asunción (Default)
            direccion: "Paraguay"     // Dirección genérica
        };

        console.log(`👤 Comprador: ${compradorData.nombre} (${compradorData.email})`);

        // 1. CREAMOS LA TRANSACCIÓN
        const nuevaTransaccion = await Transaction.create({
            external_reference: pedidoId, 
            amount: monto, 
            status: 'pending', 
            userId: req.usuario.id, 
            courseId: courseId, 
            ip_address: req.ip, 
            payment_method: 'pagopar'
        });

        // Token SHA1
        const tokenFirma = crypto.createHash('sha1').update(PRIVATE_KEY + pedidoId + monto.toString()).digest('hex');

        // Construimos el objeto para Pagopar
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
                    "vendedor_direccion_referencia": "Centro",
                    "vendedor_direccion_coordenadas": "-25.2637,-57.5759"
                }
            ],
            "fecha_maxima_pago": new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), 
            "id_pedido_comercio": pedidoId, 
            "descripcion_resumen": `Pago por curso: ${curso.titulo}`, 
            "forma_pago": 9,
            "comprador": {
                "ruc": compradorData.ruc,
                "email": compradorData.email,          // ✅ REAL
                "ciudad": compradorData.ciudad,
                "nombre": compradorData.nombre,        // ✅ REAL
                "telefono": compradorData.telefono,
                "direccion": compradorData.direccion,
                "documento": compradorData.documento,
                "razon_social": compradorData.nombre,  // Usamos el nombre como Razón Social
                "tipo_documento": "RUC",
                "coordenadas": "",
                "direccion_referencia": ""
            }
        };

        const r = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', orden);
        
        if(r.data.respuesta) {
            const hashRealPagopar = r.data.resultado[0].data; 
            
            // Actualizamos Hash
            nuevaTransaccion.external_reference = hashRealPagopar;
            await nuevaTransaccion.save();
            
            console.log(`✅ Hash obtenido: ${hashRealPagopar}`);
            res.json({success:true, redirectUrl:`https://www.pagopar.com/pagos/${hashRealPagopar}`, pedidoId});
        } else {
            await nuevaTransaccion.destroy();
            res.status(400).json({message:"Error Pagopar:"+r.data.resultado});
        }

    } catch(e){ 
        console.error("❌ Error en initiatePayment:", e); 
        res.status(500).json({msg:"Error al iniciar pago"}); 
    }
};

// =========================================================
// 2. WEBHOOK + CONSULTA (IGUAL QUE ANTES, FUNCIONA PERFECTO)
// =========================================================
const confirmPaymentWebhook = async (req, res) => {
    console.log("\n🔔 WEBHOOK RECIBIDO");

    try {
        const body = req.body;
        if (!body || !body.resultado || !body.resultado[0]) return res.json({ error: "No data" });

        const datosPago = body.resultado[0];
        const hash_pedido = datosPago.hash_pedido; 
        
        res.json(body.resultado);
        console.log("✅ Webhook respondido. Iniciando verificación...");

        setTimeout(async () => {
            const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
            const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();

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
                    // BUSCAMOS POR HASH
                    const transaccion = await Transaction.findOne({ where: { external_reference: hash_pedido } });
                    
                    if (!transaccion) {
                        console.error(`😱 Transacción no encontrada para hash: ${hash_pedido}`);
                        return;
                    }

                    console.log(`🔎 Transacción encontrada (ID: ${transaccion.id}). Estado: ${transaccion.status}`);

                    const pagadoEnPagopar = consulta.data.resultado[0].pagado === true;

                    if (pagadoEnPagopar && transaccion.status !== 'paid') {
                        transaccion.status = 'paid';
                        await transaccion.save();

                        await Enrollment.findOrCreate({ 
                            where: { userId: transaccion.userId, courseId: transaccion.courseId }, 
                            defaults: { 
                                progreso_porcentaje: 0, 
                                fecha_inscripcion: new Date(), 
                                lecciones_completadas: [] 
                            } 
                        });
                        console.log("🎓 ¡INSCRIPCIÓN COMPLETADA EXITOSAMENTE!");

                    } else if (transaccion.status === 'paid') {
                        console.log("ℹ️ Ya estaba pagado.");
                    }
                } else {
                    console.log("❌ Error consultando Pagopar:", consulta.data.resultado);
                }
            } catch (err) {
                console.log("❌ Error de red en verificación:", err.message);
            }
        }, 2000);

    } catch (error) {
        console.error("❌ Error Webhook General:", error.message);
    }
};

module.exports = { initiatePayment, confirmPaymentWebhook };