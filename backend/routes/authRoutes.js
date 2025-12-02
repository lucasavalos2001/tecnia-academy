const express = require('express');
const { registerUser, loginUser, forgotPassword, resetPassword } = require('../controllers/authController');

const router = express.Router();

// Rutas de Autenticación
router.post('/registro', registerUser);
router.post('/login', loginUser);

// ✅ Rutas de Recuperación
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

module.exports = router;