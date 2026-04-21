const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction, Enrollment } = require('../models');

const initiatePayment = async (req, res) => {
    try {
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();

        const { courseId } = req.body;
        
        const curso = await Course.findByPk(courseId);
        if(!curso) return res.status(404).json({message:"Curso no encontrado"});
        
        const monto = parseInt(curso.precio);
        const pedidoId = `ORDEN-${Date.now()}`; 

        // 🟢 RESTAURACIÓN DE LÓGICA ORIGINAL
        // Usamos los datos del usuario que vienen de la sesión (AuthContext/verifyToken)
        const compradorData = {
            nombre: req.usuario.nombre_completo || "Estudiante",
            email: req.usuario.email,
            ruc: "44444401-7",        
            documento: "4444440",     
            telefono: "0981000000",   
            ciudad: 1,                
            direccion: "Paraguay"     
        };

        const nuevaTransaccion = await Transaction.create({
            external_reference: pedidoId, 
            amount: monto, 
            status: 'pending', 
            userId: req.usuario.id, 
            courseId: courseId, 
            ip_address: req.ip, 
            payment_method: 'pagopar'
        });

        const tokenFirma = crypto.createHash('sha1').update(PRIVATE_KEY + pedidoId + monto.toString()).digest('hex');

        const orden = {
            "token": tokenFirma, 
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
                    "url_imagen": "https://tecniaacademy.com/logo.png",
                    "descripcion": "Curso Online",
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
            "descripcion_resumen": `Pago curso: ${curso.titulo}`, 
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
                "tipo_documento": "RUC", // Volvemos al valor fijo que te funcionaba
                "coordenadas": "",
                "direccion_referencia": ""
            }
        };

        const r = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', orden);
        
        if(r.data.respuesta) {
            const hashRealPagopar = r.data.resultado[0].data; 
            nuevaTransaccion.external_reference = hashRealPagopar;
            await nuevaTransaccion.save();
            res.json({success:true, redirectUrl:`https://www.pagopar.com/pagos/${hashRealPagopar}`});
        } else {
            await nuevaTransaccion.destroy();
            res.status(400).json({message: "PagoPar dice: " + r.data.resultado});
        }

    } catch(e){ 
        res.status(500).json({message:"Error al iniciar pago"}); 
    }
};

const confirmPaymentWebhook = async (req, res) => {
    try {
        const body = req.body;
        if (!body || !body.resultado || !body.resultado[0]) return res.json({ error: "No data" });
        const hash_pedido = body.resultado[0].hash_pedido; 
        res.json(body.resultado);

        setTimeout(async () => {
            const PUBLIC_KEY = process.env.PAGOPAR_PUBLIC_KEY;
            const PRIVATE_KEY = process.env.PAGOPAR_PRIVATE_KEY;
            const tokenConsulta = crypto.createHash('sha1').update(`${PRIVATE_KEY}CONSULTA`).digest('hex');
            const consulta = await axios.post('https://api.pagopar.com/api/pedidos/1.1/traer', {
                hash_pedido: hash_pedido,
                token: tokenConsulta,
                token_publico: PUBLIC_KEY
            });

            if (consulta.data.respuesta === true && consulta.data.resultado[0].pagado === true) {
                const transaccion = await Transaction.findOne({ where: { external_reference: hash_pedido } });
                if (transaccion && transaccion.status !== 'paid') {
                    transaccion.status = 'paid';
                    await transaccion.save();
                    await Enrollment.findOrCreate({ 
                        where: { userId: transaccion.userId, courseId: transaccion.courseId }, 
                        defaults: { progreso_porcentaje: 0, fecha_inscripcion: new Date(), lecciones_completadas: [] } 
                    });
                }
            }
        }, 2000);
    } catch (error) { console.error(error); }
};

module.exports = { initiatePayment, confirmPaymentWebhook };