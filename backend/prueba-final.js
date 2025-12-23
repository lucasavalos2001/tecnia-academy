const crypto = require('crypto');

// 1. TUS CLAVES NUEVAS (Las pegamos directo para evitar errores de .env)
const PUBLIC_KEY = '814822eba5ef4af770db24109860efa1';
const PRIVATE_KEY = 'f01932dc82c23efd613e7fa911215895';

// 2. DATOS FIJOS (Para que no haya error de cálculo)
const pedidoId = 'PRUEBA-SOPORTE-001';
const monto = 5000;

// 3. GENERAR HASH
// Fórmula: sha1(private + id + monto)
const cadena = PRIVATE_KEY + pedidoId + monto;
const hash = crypto.createHash('sha1').update(cadena).digest('hex');

console.log("\n🧪 GENERANDO COMANDO DE PRUEBA OFICIAL...");
console.log("---------------------------------------------------");
console.log("Copia y pega TODO lo de abajo en tu terminal (PowerShell o Git Bash):");
console.log("\n");

// Generamos el comando CURL
const curlCommand = `curl -X POST https://api.pagopar.com/api/pedidos/1.1/traer -H "Content-Type: application/json" -d '{"token": "${hash}", "public_key": "${PUBLIC_KEY}", "monto_total": ${monto}, "tipo_pedido": "VENTA-ONLINE", "compras_items": [{"nombre": "Prueba", "cantidad": 1, "categoria": "909", "public_key": "${PUBLIC_KEY}", "url_imagen": "https://via.placeholder.com/150", "descripcion": "Test", "id_producto": "1", "precio_total": ${monto}, "ciudad": 1}], "id_pedido_comercio": "${pedidoId}", "descripcion_resumen": "Prueba Soporte"}'`;

console.log(curlCommand);
console.log("\n---------------------------------------------------");
console.log(`Hash calculado: ${hash}`);
console.log(`Si esto falla con 'Token no corresponde', ENVÍA CAPTURA A PAGOPAR.`);