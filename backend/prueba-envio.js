const crypto = require('crypto');
const axios = require('axios');

// TUS CLAVES NUEVAS (Las del panel)
const PUBLIC_KEY = '814822eba5ef4af770db24109860efa1';
const PRIVATE_KEY = 'f01932dc82c23efd613e7fa911215895';

async function intentoDefinitivo() {
    console.log("⚔️ INICIANDO INTENTO DEFINITIVO (AJUSTADO A DOCS)...");

    // 1. PREPARAR DATOS
    const pedidoId = `ORDEN-${Math.floor(Math.random() * 10000)}`;
    const monto = 5000;
    
    // IMPORTANTE: La documentación dice strval(floatval($monto))
    // En JS nos aseguramos que sea string sin decimales innecesarios
    const montoString = monto.toString(); 

    // 2. GENERAR HASH (Según documentación: private + id + monto_string)
    const hash = crypto.createHash('sha1')
                       .update(PRIVATE_KEY + pedidoId + montoString)
                       .digest('hex');

    // 3. ARMÁR EL JSON EXACTO A LA DOCUMENTACIÓN
    const orden = {
        "token": hash,
        "public_key": PUBLIC_KEY,
        "monto_total": monto, // Se envía como número en el JSON
        "tipo_pedido": "VENTA-COMERCIO", // 👈 CORRECCIÓN: Antes decía VENTA-ONLINE
        "compras_items": [
            {
                "ciudad": 1, // La doc dice enviar 1 si no es courier
                "nombre": "Curso Prueba",
                "cantidad": 1,
                "categoria": "909", // La doc dice enviar 909
                "public_key": PUBLIC_KEY,
                "url_imagen": "",
                "descripcion": "Curso de prueba",
                "id_producto": "1",
                "precio_total": monto,
                "vendedor_telefono": "",
                "vendedor_direccion": "",
                "vendedor_direccion_referencia": "",
                "vendedor_direccion_coordenadas": ""
            }
        ],
        "fecha_maxima_pago": new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Formato fecha
        "id_pedido_comercio": pedidoId,
        "descripcion_resumen": "Prueba Final",
        "forma_pago": 9 // Opcional, probamos pre-seleccionando Tarjeta
    };

    // 4. DATOS DEL COMPRADOR (La documentación dice que si falta alguno puede fallar)
    orden.comprador = {
        "ruc": "4444440-1",
        "email": "test@pagopar.com",
        "ciudad": 1,
        "nombre": "Cliente Test",
        "telefono": "0981000000",
        "direccion": "Direccion Test",
        "documento": "4444440",
        "coordenadas": "",
        "razon_social": "Cliente Test",
        "tipo_documento": "CI",
        "direccion_referencia": ""
    };

    try {
        console.log(`📤 Enviando Pedido ID: ${pedidoId}`);
        const response = await axios.post('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', orden); // 👈 URL DE LA DOCUMENTACIÓN 2.0

        if (response.data.respuesta === true) {
            console.log("\n✅ ¡FUNCIONÓ! ¡AL FIN!");
            console.log("🔗 URL de Pago:", response.data.resultado.url || "Revisar objeto completo");
            console.log("JSON Respuesta:", JSON.stringify(response.data, null, 2));
        } else {
            console.log("\n❌ PAGOPAR DICE:", response.data.resultado);
        }

    } catch (error) {
        if (error.response) {
            console.log("\n❌ ERROR RESPUESTA:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.log("\n🔥 ERROR RED:", error.message);
        }
    }
}

intentoDefinitivo();