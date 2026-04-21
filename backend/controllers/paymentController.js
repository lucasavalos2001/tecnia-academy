const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

// =========================================================
// 1. INICIAR PAGO (CÓDIGO ORIGINAL COMPLETO + FIX DE PERFIL)
// =========================================================
const initiatePayment = async (req, res) => {
    console.log("\n🚀 [SISTEMA] INICIANDO PROCESO DE PAGO - ESTRATEGIA DE RESTAURACIÓN");
    
    try {
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();

        if (!PUBLIC_KEY || !PRIVATE_KEY) {
            console.error("❌ ERROR CRÍTICO: Faltan llaves de Pagopar en el archivo .env del servidor.");
            return res.status(500).json({ message: "Error de configuración de pasarela en el servidor." });
        }

        const { courseId } = req.body;
        
        // 1. Verificación de Autenticación Robusta
        // Tras el cambio en Perfil/Security, nos aseguramos de capturar bien el ID
        const userId = req.usuario?.id;
        if (!userId) {
            console.error("❌ ERROR: No se detectó ID de usuario en el token.");
            return res.status(401).json({ message: "Tu sesión ha expirado. Por favor, vuelve a ingresar." });
        }
        
        // 2. Buscamos datos frescos del usuario directamente en la DB
        // Esto soluciona el problema si el perfil cambió los nombres de los campos
        const usuarioDB = await User.findByPk(userId);
        if (!usuarioDB) {
            console.error(`❌ ERROR: Usuario ID ${userId} no existe en la base de datos.`);
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        // 3. Buscamos el curso
        const curso = await Course.findByPk(courseId);
        if (!curso) {
            console.error(`❌ ERROR: Curso ID ${courseId} no encontrado.`);
            return res.status(404).json({ message: "El curso solicitado no existe." });
        }
        
        const monto = parseInt(curso.precio);
        const pedidoId = `ORDEN-${Date.now()}-${userId}`;

        // 🟢 FIX DE CONEXIÓN: Mapeo de datos tras cambios en Perfil
        // PagoPar 2.0 rechaza si 'nombre' o 'razon_social' vienen vacíos o con caracteres inválidos.
        const nombreParaFactura = (usuarioDB.nombre_completo || usuarioDB.nombre || "Estudiante")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Quitamos acentos para evitar errores de API
            .substring(0, 45);

        const compradorData = {
            nombre: nombreParaFactura,
            email: usuarioDB.email.trim(),
            ruc: "44444401-7",        // Consumidor Final Genérico
            documento: "4444440",     
            telefono: usuarioDB.telefono || "0981000000",   
            ciudad: 1,                
            direccion: "Paraguay",
            tipo_documento: "RUC"
        };

        console.log(`👤 Procesando pago para: ${compradorData.nombre} | Email: ${compradorData.email}`);

        // 4. REGISTRAMOS LA TRANSACCIÓN LOCAL (ESTADO PENDIENTE)
        const nuevaTransaccion = await Transaction.create({
            external_reference: pedidoId, 
            amount: monto, 
            status: 'pending', 
            userId: userId, 
            courseId: courseId, 
            ip_address: req.ip || "127.0.0.1", 
            payment_method: 'pagopar'
        });

        // 5. GENERACIÓN DE FIRMA DIGITAL SHA1 (ORDEN ESTRICTO)
        const tokenFirma = crypto.createHash('sha1')
            .update(PRIVATE_KEY + pedidoId + monto.toString())
            .digest('hex');

        // 6. ESTRUCTURA DE OBJETO PARA API PAGOPAR v2.0
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
                    "descripcion": "Acceso completo a Tecnia Academy",
                    "id_producto": courseId.toString(),
                    "precio_total": monto,
                    "vendedor_telefono": "0981000000",
                    "vendedor_direccion": "Asuncion",
                    "vendedor_direccion_referencia": "",
                    "vendedor_direccion_coordenadas": ""
                }
            ],
            "fecha_maxima_pago": new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), 
            "id_pedido_comercio": pedidoId, 
            "descripcion_resumen": `Pago por: ${curso.titulo}`, 
            "forma_pago": 9,
            "comprador": {
                "ruc": compradorData.ruc,
                "email": compradorData.email,
                "ciudad": compradorData.ciudad,
                "nombre": compradorData.nombre,
                "telefono": compradorData.telefono,
                "direccion": compradorData.direccion,
                "documento": compradorData.documento,
                "razon_social": compradorData.nombre, // Obligatorio en API 2.0
                "tipo_documento": compradorData.tipo_documento,
                "coordenadas": "",
                "direccion_referencia": ""
            }
        };

        // 7. ENVÍO DE PETICIÓN A PAGOPAR
        const response = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', orden);
        
        if (response.data.respuesta) {
            const hashRealPagopar = response.data.resultado[0].data; 
            
            // Actualizamos la transacción local con el hash de seguimiento de Pagopar
            nuevaTransaccion.external_reference = hashRealPagopar;
            await nuevaTransaccion.save();
            
            console.log(`✅ ÉXITO: Hash generado [${hashRealPagopar}]. Redirigiendo...`);
            res.json({
                success: true, 
                redirectUrl: `https://www.pagopar.com/pagos/${hashRealPagopar}`, 
                pedidoId
            });
        } else {
            console.error("❌ ERROR DE VALIDACIÓN EN PAGOPAR:", response.data.resultado);
            await nuevaTransaccion.destroy(); // Limpiamos la DB si falló la pasarela
            res.status(400).json({ 
                message: "Error de validación en la pasarela de pagos.",
                details: response.data.resultado 
            });
        }

    } catch (error) {
        console.error("❌ ERROR GENERAL EN EL CONTROLADOR DE PAGOS:", error.message);
        res.status(500).json({ message: "No se pudo procesar el pago. Inténtelo más tarde." });
    }
};

// =========================================================
// 2. WEBHOOK DE CONFIRMACIÓN (NOTIFICACIÓN IPN)
// =========================================================
const confirmPaymentWebhook = async (req, res) => {
    console.log("\n🔔 [NOTIFICACIÓN] WEBHOOK DE PAGOPAR RECIBIDO");

    try {
        const body = req.body;
        if (!body || !body.resultado || !body.resultado[0]) {
            return res.status(400).json({ error: "Estructura de notificación inválida." });
        }

        const datosPago = body.resultado[0];
        const hash_pedido = datosPago.hash_pedido; 
        
        // Respondemos a Pagopar OK inmediatamente para que no reintente el envío
        res.json({ status: "ok", message: "Notificación procesada" });

        // Verificación asíncrona de seguridad (Polling invertido)
        setTimeout(async () => {
            console.log(`🔎 Verificando autenticidad del pago para hash: ${hash_pedido}...`);
            
            const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
            const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();
            const tokenConsulta = crypto.createHash('sha1').update(`${PRIVATE_KEY}CONSULTA`).digest('hex');

            try {
                const check = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', {
                    hash_pedido: hash_pedido,
                    token: tokenConsulta,
                    token_publico: PUBLIC_KEY
                });

                if (check.data.respuesta === true) {
                    const transaccion = await Transaction.findOne({ where: { external_reference: hash_pedido } });
                    
                    if (!transaccion) {
                        console.error(`😱 ALERTA: Se recibió un pago para un Hash desconocido: ${hash_pedido}`);
                        return;
                    }

                    const pagadoReal = check.data.resultado[0].pagado === true;

                    if (pagadoReal && transaccion.status !== 'paid') {
                        // Actualizar estado de la transacción
                        transaccion.status = 'paid';
                        await transaccion.save();

                        // Inscribir al alumno en el curso automáticamente
                        await Enrollment.findOrCreate({ 
                            where: { userId: transaccion.userId, courseId: transaccion.courseId }, 
                            defaults: { 
                                progreso_porcentaje: 0, 
                                fecha_inscripcion: new Date(), 
                                lecciones_completadas: [] 
                            } 
                        });
                        console.log(`🎓 [INSCRIPCIÓN] Alumno ${transaccion.userId} matriculado en curso ${transaccion.courseId}`);
                    }
                }
            } catch (err) {
                console.error("❌ Error verificando el estado en la API de Pagopar:", err.message);
            }
        }, 3000);

    } catch (error) {
        console.error("❌ Error en el procesamiento del Webhook:", error.message);
        res.status(500).send("Internal Error");
    }
};

module.exports = { initiatePayment, confirmPaymentWebhook };