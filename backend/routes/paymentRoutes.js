const express = require('express');
const router = express.Router();
const { initiatePayment, confirmPaymentWebhook } = require('../controllers/paymentController');

// 👇 IMPORTACIÓN LIMPIA:
// Al usar las llaves { }, extraemos directamente la función del archivo authMiddleware.
// Ya no necesitamos los if/else porque sabemos exactamente qué estamos importando.
const { verifyToken } = require('../middleware/authMiddleware');

// --- RUTAS ---

// RUTA 1: Iniciar Pago
// 1. verifyToken: Revisa que el usuario esté logueado y extrae su ID.
// 2. initiatePayment: Crea el Hash y habla con Pagopar.
router.post('/iniciar', verifyToken, initiatePayment);

// RUTA 2: Webhook
// Pagopar nos llama aquí para confirmar. No necesita verifyToken.
router.post('/confirmar', confirmPaymentWebhook);

module.exports = router;