const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

// =========================================================
// 1. INICIAR PAGO (CÓDIGO ORIGINAL COMPLETO)
// =========================================================
const initiatePayment = async (req, res) => {
    console.log("\n🚀 INICIANDO PROCESO DE PAGO - PAGOPAR");
    
    try {
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();

        if (!PUBLIC_KEY || !PRIVATE_KEY) {
            console.error("❌ Error: Faltan llaves de Pagopar en el archivo .env");
            return res.status(500).json({ message: "Error de configuración en el servidor" });
        }

        const { courseId } = req.body;
        
        // Verificamos autenticación (Esto cambió con el nuevo flujo de usuario)
        if (!req.usuario || !req.usuario.id) {
            console.error("❌ Error: Usuario no autenticado en la petición");
            return res.status(401).json({ message: "Sesión no válida o expirada" });
        }
        
        // Buscamos el curso con todos sus datos
        const curso = await Course.findByPk(courseId);
        if (!curso) {
            console.error(`❌ Error: Curso ID ${courseId} no encontrado`);
            return res.status(404).json({ message: "El curso ya no está disponible" });
        }
        
        const monto = parseInt(curso.precio);
        const pedidoId = `ORDEN-${Date.now()}-${req.usuario.id}`;

        // 🟢 DATOS DEL COMPRADOR (Lógica original de Tecnia)
        const compradorData = {
            nombre: req.usuario.nombre_completo || "Estudiante Tecnia",
            email: req.usuario.email,
            ruc: "44444401-7",        // Valor por defecto funcional
            documento: "4444440",     // Valor por defecto funcional
            telefono: "0981000000",   
            ciudad: 1,                
            direccion: "Paraguay",
            tipo_documento: "RUC"
        };

        console.log(`👤 Comprador detectado: ${compradorData.nombre} (${compradorData.email})`);

        // REGISTRAMOS LA TRANSACCIÓN EN NUESTRA DB ANTES DE IR A PAGOPAR
        const nuevaTransaccion = await Transaction.create({
            external_reference: pedidoId, 
            amount: monto, 
            status: 'pending', 
            userId: req.usuario.id, 
            courseId: courseId, 
            ip_address: req.ip || "127.0.0.1", 
            payment_method: 'pagopar'
        });

        // Generación del Token SHA1 (Crítico: El orden no debe variar)
        const cadenaADigerir = PRIVATE_KEY + pedidoId + monto.toString();
        const tokenFirma = crypto.createHash('sha1').update(cadenaADigerir).digest('hex');

        // Construcción del objeto JSON para la API de Pagopar v2.0
        const orden = {
            "token": tokenFirma, 
            "public_key": PUBLIC_KEY, 
            "monto_total": monto, 
            "tipo_pedido": "VENTA-COMERCIO",
            "compras_items": [
                {
                    "ciudad": 1,
                    "nombre": curso.titulo.substring(0, 45),
                    "cantidad": 1,
                    "categoria": "909",
                    "public_key": PUBLIC_KEY,
                    "url_imagen": curso.imagen_url || "https://tecniaacademy.com/logo.png",
                    "descripcion": "Acceso de por vida al curso",
                    "id_producto": courseId.toString(),
                    "precio_total": monto,
                    "vendedor_telefono": "0981000000",
                    "vendedor_direccion": "Asuncion",
                    "vendedor_direccion_referencia": "Centro",
                    "vendedor_direccion_coordenadas": ""
                }
            ],
            "fecha_maxima_pago": new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), 
            "id_pedido_comercio": pedidoId, 
            "descripcion_resumen": `Inscripción: ${curso.titulo}`, 
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
                "tipo_documento": compradorData.tipo_documento,
                "coordenadas": "",
                "direccion_referencia": ""
            }
        };

        // LLAMADA A PAGOPAR
        const response = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', orden);
        
        if (response.data.respuesta) {
            const hashRealPagopar = response.data.resultado[0].data; 
            
            // Actualizamos nuestra transacción con el hash real de Pagopar
            nuevaTransaccion.external_reference = hashRealPagopar;
            await nuevaTransaccion.save();
            
            console.log(`✅ Éxito: Pago iniciado. Hash Pagopar: ${hashRealPagopar}`);
            res.json({
                success: true, 
                redirectUrl: `https://www.pagopar.com/pagos/${hashRealPagopar}`, 
                pedidoId
            });
        } else {
            console.error("❌ PagoPar rechazó la petición:", response.data.resultado);
            await nuevaTransaccion.destroy();
            res.status(400).json({ 
                message: "Error de validación en la pasarela", 
                details: response.data.resultado 
            });
        }

    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN INITIATEPAYMENT:", error.message);
        res.status(500).json({ message: "No se pudo procesar el pago en este momento" });
    }
};

// =========================================================
// 2. CONFIRMACIÓN (WEBHOOK + POLLING)
// =========================================================
const confirmPaymentWebhook = async (req, res) => {
    console.log("\n🔔 RECIBIENDO NOTIFICACIÓN DE PAGO (WEBHOOK)");

    try {
        const body = req.body;
        if (!body || !body.resultado || !body.resultado[0]) {
            return res.status(400).json({ error: "Datos de webhook inválidos" });
        }

        const datosPago = body.resultado[0];
        const hash_pedido = datosPago.hash_pedido; 
        
        // Respondemos a Pagopar de inmediato para evitar reintentos
        res.json({ status: "recibido" });

        // Proceso de verificación en segundo plano
        setTimeout(async () => {
            console.log(`🔎 Verificando estado final para hash: ${hash_pedido}`);
            
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
                    
                    if (!transaccion) {
                        console.error(`😱 Error: Hash ${hash_pedido} no existe en nuestra base de datos.`);
                        return;
                    }

                    const estaPagado = consulta.data.resultado[0].pagado === true;

                    if (estaPagado && transaccion.status !== 'paid') {
                        // Marcamos como pagado
                        transaccion.status = 'paid';
                        await transaccion.save();

                        // Creamos la inscripción del alumno
                        await Enrollment.findOrCreate({ 
                            where: { userId: transaccion.userId, courseId: transaccion.courseId }, 
                            defaults: { 
                                progreso_porcentaje: 0, 
                                fecha_inscripcion: new Date(), 
                                lecciones_completadas: [] 
                            } 
                        });
                        console.log(`🎓 ¡INSCRIPCIÓN EXITOSA! Usuario: ${transaccion.userId}, Curso: ${transaccion.courseId}`);
                    }
                }
            } catch (err) {
                console.error("❌ Error en la consulta de verificación:", err.message);
            }
        }, 2500);

    } catch (error) {
        console.error("❌ Error general en Webhook:", error.message);
        res.status(500).send("Error");
    }
};

module.exports = { initiatePayment, confirmPaymentWebhook };