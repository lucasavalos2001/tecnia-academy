const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

// =========================================================
// 1. INICIAR PAGO (CORREGIDO: VALIDACIÓN DE DOCUMENTO)
// =========================================================
const initiatePayment = async (req, res) => {
    console.log("\n🚀 INICIANDO PAGO (Estrategia de Seguridad de Documento)");
    try {
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();

        if (!PUBLIC_KEY || !PRIVATE_KEY) throw new Error("Faltan claves de Pagopar");

        const { courseId } = req.body;
        
        if (!req.usuario) return res.status(401).json({ message: "Auth requerida" });
        
        // 1. Buscamos el curso
        const curso = await Course.findByPk(courseId);
        if(!curso) return res.status(404).json({ message: "Curso no encontrado" });

        // 2. Buscamos los datos REALES del usuario por si tiene cédula cargada
        const usuarioFull = await User.findByPk(req.usuario.id);
        
        const monto = parseInt(curso.precio);
        const pedidoId = `ORDEN-${Date.now()}`; 

        // 🟢 LÓGICA DE DOCUMENTACIÓN PARA PAGOPAR
        // Si el usuario tiene cédula en su perfil, la usamos. 
        // Si no, usamos el RUC genérico de Consumidor Final (44444401-7).
        const tieneCedula = usuarioFull.cedula_identidad && usuarioFull.cedula_identidad.length > 5;
        
        const compradorData = {
            nombre: usuarioFull.nombre_completo || "Estudiante",
            email: usuarioFull.email,
            ruc: tieneCedula ? usuarioFull.cedula_identidad : "44444401-7",
            documento: tieneCedula ? usuarioFull.cedula_identidad.split('-')[0] : "4444440",
            tipo_documento: tieneCedula ? "CI" : "RUC", // 👈 AQUÍ ESTABA EL ERROR
            telefono: usuarioFull.telefono || "0981000000",
            ciudad: 1, 
            direccion: "Paraguay"
        };

        console.log(`👤 Comprador: ${compradorData.nombre} | Doc: ${compradorData.ruc} (${compradorData.tipo_documento})`);

        // 1. CREAMOS LA TRANSACCIÓN EN NUESTRA BD
        const nuevaTransaccion = await Transaction.create({
            external_reference: pedidoId, 
            amount: monto, 
            status: 'pending', 
            userId: usuarioFull.id, 
            courseId: courseId, 
            ip_address: req.ip, 
            payment_method: 'pagopar'
        });

        // Token SHA1 para la firma
        const tokenFirma = crypto.createHash('sha1').update(PRIVATE_KEY + pedidoId + monto.toString()).digest('hex');

        // Construimos el objeto para Pagopar con el campo tipo_documento corregido
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
                    "url_imagen": curso.imagen_url || "https://tecniaacademy.com/logo.png",
                    "descripcion": "Curso Online Profesional",
                    "id_producto": courseId.toString(),
                    "precio_total": monto,
                    "vendedor_telefono": "0981000000",
                    "vendedor_direccion": "Asuncion",
                    "vendedor_direccion_referencia": "Minga Guazú",
                    "vendedor_direccion_coordenadas": "-25.2637,-57.5759"
                }
            ],
            "fecha_maxima_pago": new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), 
            "id_pedido_comercio": pedidoId, 
            "descripcion_resumen": `Inscripción al curso: ${curso.titulo}`, 
            "forma_pago": 9,
            "comprador": {
                "ruc": compradorData.ruc,
                "email": compradorData.email,
                "ciudad": compradorData.ciudad,
                "nombre": compradorData.nombre,
                "telefono": compradorData.telefono,
                "direccion": compradorData.direccion,
                "documento": compradorData.documento,
                "razon_social": compradorData.nombre,
                "tipo_documento": compradorData.tipo_documento, // CI o RUC
                "coordenadas": "",
                "direccion_referencia": ""
            }
        };

        const r = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', orden);
        
        if(r.data.respuesta) {
            const hashRealPagopar = r.data.resultado[0].data; 
            
            // Actualizamos la referencia con el Hash de Pagopar
            nuevaTransaccion.external_reference = hashRealPagopar;
            await nuevaTransaccion.save();
            
            console.log(`✅ Éxito: Hash ${hashRealPagopar} generado.`);
            res.json({ success: true, redirectUrl: `https://www.pagopar.com/pagos/${hashRealPagopar}`, pedidoId });
        } else {
            console.error("❌ Respuesta negativa de Pagopar:", r.data.resultado);
            await nuevaTransaccion.destroy();
            res.status(400).json({ message: "Error Pagopar: " + r.data.resultado });
        }

    } catch(e){ 
        console.error("❌ Error en initiatePayment:", e.message); 
        res.status(500).json({ msg: "Error al iniciar proceso de pago" }); 
    }
};

// =========================================================
// 2. WEBHOOK (CONFIRMACIÓN AUTOMÁTICA)
// =========================================================
const confirmPaymentWebhook = async (req, res) => {
    console.log("\n🔔 WEBHOOK DE PAGO RECIBIDO");

    try {
        const body = req.body;
        if (!body || !body.resultado || !body.resultado[0]) return res.json({ error: "No data" });

        const datosPago = body.resultado[0];
        const hash_pedido = datosPago.hash_pedido; 
        
        // Respondemos a Pagopar inmediatamente
        res.json(body.resultado);

        // Verificamos por seguridad después de 2 segundos
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

                const consulta = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', payload);

                if (consulta.data.respuesta === true) {
                    const transaccion = await Transaction.findOne({ where: { external_reference: hash_pedido } });
                    
                    if (!transaccion) return console.error(`Hash no encontrado: ${hash_pedido}`);

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
                        console.log("🎓 INSCRIPCIÓN AUTOMÁTICA REALIZADA");
                    }
                }
            } catch (err) {
                console.log("❌ Error en verificación post-pago:", err.message);
            }
        }, 2000);

    } catch (error) {
        console.error("❌ Error Webhook General:", error.message);
    }
};

module.exports = { initiatePayment, confirmPaymentWebhook };