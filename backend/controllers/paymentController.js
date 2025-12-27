const crypto = require('crypto');
const axios = require('axios');
const { Course, User, Transaction } = require('../models'); // Asegúrate que la ruta a models sea correcta

const initiatePayment = async (req, res) => {
    console.log("\n🚀 INICIANDO PAGO PAGOPAR (V2 MEJORADA)");

    try {
        // 1. OBTENER Y LIMPIAR LLAVES DEL ENV
        // El .replace elimina espacios accidentales que causan errores de autenticación
        const PUBLIC_KEY = (process.env.PAGOPAR_PUBLIC_KEY || "").trim();
        const PRIVATE_KEY = (process.env.PAGOPAR_PRIVATE_KEY || "").trim();

        if (!PUBLIC_KEY || !PRIVATE_KEY) {
            console.error("❌ ERROR: Faltan las claves de Pagopar en el .env");
            return res.status(500).json({ message: "Error de configuración del servidor" });
        }

        // 2. VALIDAR USUARIO Y CURSO
        if (!req.usuario) return res.status(401).json({ message: "Usuario no autenticado" });

        const { courseId } = req.body;
        const curso = await Course.findByPk(courseId);
        
        if (!curso) return res.status(404).json({ message: "Curso no encontrado" });

        // 3. PREPARAR DATOS DEL PEDIDO
        const monto = parseInt(curso.precio);
        const pedidoId = `ORDEN-${Date.now()}`; // ID único basado en el tiempo

        // 4. CREAR TRANSACCIÓN LOCAL (VITAL: Sin esto, tu servidor no reconoce el pago después)
        console.log(`📝 Creando transacción pendiente: ${pedidoId}`);
        await Transaction.create({
            external_reference: pedidoId,
            amount: monto,
            status: 'pending',
            userId: req.usuario.id,
            courseId: curso.id,
            ip_address: req.ip || '127.0.0.1',
            payment_method: 'pagopar'
        });

        // 5. GENERAR EL HASH DE SEGURIDAD (SHA1)
        // Fórmula: PRIVATE_KEY + ID_PEDIDO + MONTO
        const tokenString = `${PRIVATE_KEY}${pedidoId}${monto}`;
        const hash = crypto.createHash('sha1').update(tokenString).digest('hex');

        // 6. CONSTRUIR EL OBJETO JSON PARA PAGOPAR
        // ⚠️ IMPORTANTE: Enviamos datos del comprador para evitar el error "Complete todos los datos"
        const compradorData = {
            ruc: req.usuario.documento || "4444440-1",
            email: req.usuario.email || "cliente@prueba.com",
            ciudad: 1, // 1 = Asunción (Genérico)
            nombre: req.usuario.nombre_completo || "Cliente Tecnia",
            telefono: req.usuario.telefono || "0981000000",
            direccion: "Dirección Real 123",
            documento: req.usuario.documento_numero || "4444440", // Cédula genérica si no tiene
            razon_social: req.usuario.nombre_completo || "Cliente Particular",
            tipo_documento: "CI"
        };

        const orden = {
            token: hash,
            public_key: PUBLIC_KEY,
            monto_total: monto,
            tipo_pedido: "VENTA-COMERCIO",
            compras_items: [{
                ciudad: 1,
                nombre: curso.titulo.substring(0, 50), // Pagopar limita el largo del nombre
                cantidad: 1,
                categoria: "909",
                public_key: PUBLIC_KEY,
                url_imagen: "https://tecniaacademy.com/assets/logo-curso.png", // URL genérica válida
                descripcion: `Acceso al curso: ${curso.titulo}`,
                id_producto: curso.id.toString(),
                precio_total: monto,
                vendedor_telefono: "0981000000",
                vendedor_direccion: "Oficina Central",
                vendedor_direccion_referencia: "Centro",
                vendedor_direccion_coordenadas: "-25.2637,-57.5759"
            }],
            fecha_maxima_pago: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 2 días
            id_pedido_comercio: pedidoId,
            descripcion_resumen: `Pago por curso: ${curso.titulo}`,
            forma_pago: 9, // 9 = Todos los medios disponibles
            comprador: compradorData
        };

        // 7. ENVIAR A PAGOPAR
        // Detectar si estamos en Prod o Staging basado en la URL que quieras usar
        // Para Staging (Pruebas) usa: https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion
        const urlPagopar = 'https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion';

        const respuesta = await axios.post(urlPagopar, orden, { 
            headers: { 'Content-Type': 'application/json' } 
        });

        // 8. RESPONDER AL FRONTEND
        if (respuesta.data && respuesta.data.respuesta === true) {
            console.log("✅ Pedido creado en Pagopar con éxito.");
            return res.json({
                success: true,
                pedidoId,
                // Construimos la URL de redirección
                redirectUrl: `https://www.pagopar.com/pagos/${respuesta.data.resultado[0].data}`
            });
        } else {
            console.error("❌ Error en respuesta de Pagopar:", respuesta.data);
            return res.status(400).json({ message: "Pagopar rechazó la solicitud", detalle: respuesta.data });
        }

    } catch (error) {
        console.error("❌ Error interno iniciando pago:", error.message);
        if (error.response) console.error("   Detalle API:", error.response.data);
        res.status(500).json({ message: "Error al iniciar el pago" });
    }
};

module.exports = { initiatePayment };