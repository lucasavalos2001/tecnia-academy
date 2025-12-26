const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

// --- 1. INICIAR PAGO ---
const initiatePayment = async (req, res) => {
    console.log("\n🚀 INICIANDO PAGO (VERSIÓN 2.1 - TRIM FIX)");

    try {
        // CORRECCIÓN DE SEGURIDAD: Usamos .trim() para limpiar espacios vacíos accidentales
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();

        if (!PUBLIC_KEY || !PRIVATE_KEY) throw new Error("Faltan claves en .env");

        const { courseId } = req.body;
        // Asumimos que el middleware de auth ha puesto el usuario en req.usuario
        const userId = req.usuario.id;

        const curso = await Course.findByPk(courseId);
        const usuario = await User.findByPk(userId);

        if (!curso || !usuario) return res.status(404).json({ message: "Curso/Usuario no encontrado" });

        const monto = parseInt(curso.precio);
        const montoString = monto.toString();
        // ID único para identificar esta orden en Pagopar y en nuestra BD
        const pedidoId = `ORDEN-${Date.now()}`; 

        // 1. Guardar transacción PENDIENTE en nuestra BD antes de ir a Pagopar
        await Transaction.create({
            external_reference: pedidoId,
            amount: monto,
            status: 'pending',
            userId: userId,
            courseId: courseId,
            ip_address: req.ip || '127.0.0.1'
        });

        // 2. Generar Hash para Pagopar (con claves limpias)
        const hash = crypto.createHash('sha1')
            .update(PRIVATE_KEY + pedidoId + montoString)
            .digest('hex');

        // 3. Preparar objeto para Pagopar
        const orden = {
            "token": hash,
            "public_key": PUBLIC_KEY,
            "monto_total": monto,
            "tipo_pedido": "VENTA-COMERCIO",
            "compras_items": [
                {
                    "ciudad": 1,
                    "nombre": curso.titulo,
                    "cantidad": 1,
                    "categoria": "909",
                    "public_key": PUBLIC_KEY,
                    "url_imagen": curso.imagen_url || "",
                    "descripcion": curso.titulo,
                    "id_producto": courseId.toString(),
                    "precio_total": monto,
                    "vendedor_telefono": "",
                    "vendedor_direccion": "",
                    "vendedor_direccion_referencia": "",
                    "vendedor_direccion_coordenadas": ""
                }
            ],
            "fecha_maxima_pago": new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            "id_pedido_comercio": pedidoId,
            "descripcion_resumen": `Pago curso: ${curso.titulo}`,
            "forma_pago": 9,
            "comprador": {
                "ruc": usuario.documento ? `${usuario.documento}-1` : "4444440-1",
                "email": usuario.email,
                "ciudad": 1,
                "nombre": usuario.nombre_completo || "Cliente",
                "telefono": usuario.telefono || "0981000000",
                "direccion": "Online",
                "documento": usuario.documento || "4444440",
                "coordenadas": "",
                "razon_social": usuario.nombre_completo || "Cliente",
                "tipo_documento": "CI",
                "direccion_referencia": ""
            }
        };

        console.log(`📤 Enviando pedido ${pedidoId} a Pagopar v2.0...`);
        const response = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', orden);

        if (response.data.respuesta === true) {
            const hashPedido = response.data.resultado[0].data;
            const urlFinal = `https://www.pagopar.com/pagos/${hashPedido}`;
            
            console.log("✅ ¡LINK GENERADO!", urlFinal);
            
            res.json({ 
                success: true, 
                redirectUrl: urlFinal,
                pedidoId: pedidoId 
            });
        } else {
            console.error("❌ RECHAZADO:", response.data.resultado);
            res.status(400).json({ message: "Error Pagopar: " + response.data.resultado });
        }

    } catch (error) {
        console.error("🔥 ERROR:", error.message);
        if (error.response) console.error(JSON.stringify(error.response.data, null, 2));
        res.status(500).json({ message: "Error interno al procesar pago" });
    }
};

// --- 2. WEBHOOK (Confirmación y Entrega del Curso) ---
const confirmPaymentWebhook = async (req, res) => {
    console.log("🔔 WEBHOOK RECIBIDO DE PAGOPAR");

    try {
        const { resultado } = req.body;
        // Normalizar datos (Pagopar a veces envía array, a veces objeto)
        const data = (resultado && resultado[0]) ? resultado[0] : req.body;
        
        // Si hay un resultado de prueba (Simulador), lo procesamos pero preparamos la respuesta eco
        if (req.body.resultado) {
             console.log("🧪 Intento de simulación recibido.");
        }

        // Si no hay datos, salimos para no romper el servidor
        if (!data) return res.json({ respuesta: true });

        const { hash_pedido, pagado } = data;

        // --- CORRECCIÓN CRÍTICA: TRIM() ---
        // Aquí estaba el error: si .env tiene espacios, el hash de consulta fallaba.
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();

        // Generamos el Hash para consultar el estado (Paso 3)
        const tokenConsulta = crypto.createHash('sha1')
            .update(`${PRIVATE_KEY}CONSULTA${PUBLIC_KEY}`)
            .digest('hex');

        console.log("🔎 Consultando a Pagopar (Paso 3)... hash:", hash_pedido);

        // Hacemos la consulta a Pagopar
        const verificacion = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', {
            hash_pedido: hash_pedido,
            token: tokenConsulta,
            token_publico: PUBLIC_KEY
        });

        // --- B. PROCESAR PAGO SI ES VÁLIDO ---
        if (verificacion.data.respuesta === true) {
            console.log("✅ Paso 3 Exitoso: Conexión autorizada por Pagopar.");
            const pedidoReal = verificacion.data.resultado[0];

            if (pedidoReal.pagado) {
                console.log("💰 PAGO CONFIRMADO REAL. Procesando entrega...");

                // 'id_pedido_comercio' es nuestro 'external_reference'
                const idReferencia = pedidoReal.id_pedido_comercio;

                // 1. Buscar la transacción en nuestra BD
                const transaccion = await Transaction.findOne({ 
                    where: { external_reference: idReferencia } 
                });

                if (transaccion) {
                    // 2. Actualizar estado a 'paid'
                    if (transaccion.status !== 'paid') {
                        transaccion.status = 'paid';
                        transaccion.payment_method = 'pagopar'; 
                        await transaccion.save();
                        console.log("💰 Transacción actualizada a PAID en BD.");
                    }

                    // 3. 🎓 INSCRIBIR AL ESTUDIANTE (Crear Enrollment)
                    const enrollmentExistente = await Enrollment.findOne({
                        where: { 
                            userId: transaccion.userId, 
                            courseId: transaccion.courseId 
                        }
                    });

                    if (!enrollmentExistente) {
                        await Enrollment.create({
                            userId: transaccion.userId,
                            courseId: transaccion.courseId,
                            status: 'active',
                            progress: 0,
                            enrolledAt: new Date()
                        });
                        console.log(`🎉 Estudiante ${transaccion.userId} inscrito con éxito en curso ${transaccion.courseId}`);
                    } else {
                        console.log("ℹ️ El estudiante ya estaba inscrito en este curso.");
                    }

                } else {
                    console.log("ℹ️ No se encontró transacción local (Posible prueba de simulador).");
                }
            } 
        } else {
            // Si entra aquí, falló el Paso 3 (Hash inválido o Auth Error)
            console.error("❌ ERROR EN PASO 3 (Consulta rechazada):", verificacion.data.resultado);
        }

    } catch (error) {
        console.error("⚠️ Error procesando webhook:", error.message);
        if (error.response) console.error("Detalle Error API:", error.response.data);
    }

    // --- 🚨 BLOQUE CRÍTICO PARA PASAR LA VALIDACIÓN (Paso 2) ---
    // Si Pagopar nos envía "resultado" (Simulador), devolvemos el eco.
    if (req.body.resultado) {
        console.log("🧪 Modo Simulación detectado: Devolviendo eco a Pagopar.");
        return res.json(req.body.resultado);
    }

    // Respuesta normal para producción
    res.json({ respuesta: true });
};

module.exports = { initiatePayment, confirmPaymentWebhook };