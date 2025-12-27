const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

// =========================================================
// 1. INICIAR PAGO (Tu versión corregida de sintaxis)
// =========================================================
const initiatePayment = async (req, res) => {
    console.log("\n🚀 INICIANDO PAGO (V-RESTAURADA)");

    try {
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").replace(/[^a-zA-Z0-9]/g, "");
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").replace(/[^a-zA-Z0-9]/g, "");

        if (!PUBLIC_KEY || !PRIVATE_KEY) throw new Error("Faltan claves");

        const { courseId } = req.body;
        if (!req.usuario) return res.status(401).json({message:"Auth requerida"});
        
        const curso = await Course.findByPk(courseId);
        if(!curso) return res.status(404).json({message:"Curso no encontrado"});
        
        const monto = parseInt(curso.precio);
        // CORRECCIÓN: Faltaban las comillas invertidas aquí
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
            "token": hash, 
            "public_key": PUBLIC_KEY, 
            "monto_total": monto, 
            "tipo_pedido": "VENTA-COMERCIO",
            "compras_items": [{
                "ciudad":1,
                "nombre":curso.titulo.substring(0,40),
                "cantidad":1,
                "categoria":"909",
                "public_key":PUBLIC_KEY,
                "url_imagen":"https://tecniaacademy.com/logo.png",
                "descripcion":"Curso",
                "id_producto":courseId.toString(),
                "precio_total":monto,
                "vendedor_telefono":"0981000000",
                "vendedor_direccion":"Asuncion",
                "vendedor_direccion_referencia":"Centro",
                "vendedor_direccion_coordenadas":"-25.2637,-57.5759"
            }],
            "fecha_maxima_pago": new Date(Date.now()+48*60*60*1000).toISOString(), 
            "id_pedido_comercio": pedidoId, 
            "descripcion_resumen": "Pago curso", 
            "forma_pago": 9,
            "comprador": {
                "ruc": req.usuario.documento || "4444440-1",
                "email": req.usuario.email || "cliente@prueba.com",
                "ciudad": 1,
                "nombre": req.usuario.nombre_completo || "Cliente",
                "telefono": req.usuario.telefono || "0981000000",
                "direccion": "Asuncion",
                "documento": req.usuario.documento_numero || "4444440",
                "razon_social": req.usuario.nombre_completo || "Cliente",
                "tipo_documento": "CI",
                "coordenadas": "",
                "direccion_referencia": ""
            }
        };

        const r = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', orden);
        
        if(r.data.respuesta) {
            // CORRECCIÓN: Faltaban comillas invertidas en el redirectUrl
            res.json({success:true, redirectUrl:`https://www.pagopar.com/pagos/${r.data.resultado[0].data}`, pedidoId});
        } else {
            res.status(400).json({message:"Error Pagopar:"+r.data.resultado});
        }

    } catch(e){
        console.error(e);
        res.status(500).json({msg:"Error"});
    }
};

// =========================================================
// 2. WEBHOOK (RESTAURADO PARA QUE PASE EL PASO 2)
// =========================================================
const confirmPaymentWebhook = async (req, res) => {
    console.log("🔔 WEBHOOK RECIBIDO");

    try {
        const { resultado, respuesta } = req.body;
        // Detectar si resultado viene en array o directo
        const data = (resultado && resultado[0]) ? resultado[0] : req.body;
        
        // --- LÓGICA DEL PASO 3 (CONSULTA) ---
        // Ejecutamos esto SIEMPRE para intentar activar el semáforo verde del Paso 3
        if (data && data.hash_pedido) {
            try {
                let hash_pedido = String(data.hash_pedido).trim();
                const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").replace(/[^a-zA-Z0-9]/g, "");
                const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").replace(/[^a-zA-Z0-9]/g, "");

                console.log(`🔎 Consultando hash (Paso 3): [${hash_pedido}]`);

                // Esta petición es la que Pagopar busca para poner el Paso 3 en Verde
                const tokenConsulta = crypto.createHash('sha1').update(`${PRIVATE_KEY}CONSULTA${PUBLIC_KEY}`).digest('hex');
                
                const r1 = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', { 
                    hash_pedido: hash_pedido, 
                    token: tokenConsulta, 
                    token_publico: PUBLIC_KEY,
                    public_key: PUBLIC_KEY 
                }, { headers: { 'Content-Type': 'application/json' } });

                if (r1.data.respuesta === true && r1.data.resultado) {
                    const pedidoReal = r1.data.resultado[0];
                    console.log("✅ API Pagopar respondio estado:", pedidoReal.pagado ? "PAGADO" : "PENDIENTE");

                    // LOGICA BASE DE DATOS (Solo si está pagado real)
                    if (pedidoReal.pagado) {
                        const transaccion = await Transaction.findOne({ where: { external_reference: pedidoReal.id_pedido_comercio } });
                        if (transaccion) {
                            if (transaccion.status !== 'paid') {
                                transaccion.status = 'paid';
                                await transaccion.save();
                                await Enrollment.findOrCreate({
                                    where: { userId: transaccion.userId, courseId: transaccion.courseId },
                                    defaults: { progreso_porcentaje: 0, fecha_inscripcion: new Date(), lecciones_completadas: [] }
                                });
                                console.log("💾 Transacción y Matrícula guardadas.");
                            }
                        }
                    }
                }
            } catch (innerError) {
                console.error("⚠️ Error en consulta Paso 3 (No crítico para Paso 2):", innerError.message);
            }
        }

        // --- LÓGICA DEL PASO 2 (EL ECO) ---
        // ESTA es la parte vital que rompi antes.
        // Si Pagopar manda "respuesta: true", es una simulación y DEBEMOS devolver el JSON.
        if (respuesta === true || respuesta === "true") {
            console.log("📤 Modo Simulador (Paso 2): Enviando ECO.");
            return res.json(resultado); // <--- ESTO ARREGLA EL PASO 2
        }

        console.log("📤 Webhook Normal: Enviando OK.");
        return res.json({ respuesta: true });

    } catch (error) { 
        console.error("⚠️ Error general:", error.message); 
        return res.json({ respuesta: true });
    }
};

module.exports = { initiatePayment, confirmPaymentWebhook };