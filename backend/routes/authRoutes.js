const express = require('express');
const rateLimit = require('express-rate-limit');
const { registerUser, loginUser } = require('../controllers/authController');

const router = express.Router();

// 🛡️ Freno específico contra fuerza bruta: solo cuenta los intentos FALLIDOS
// (skipSuccessfulRequests), así un usuario real no se ve afectado por loguearse
// varias veces seguidas, pero alguien probando contraseñas al azar sí se frena.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 8,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Demasiados intentos de inicio de sesión. Esperá unos minutos e intentá de nuevo." }
});

// Rutas de Autenticación
router.post('/registro', registerUser);
router.post('/login', loginLimiter, loginUser);

module.exports = router;