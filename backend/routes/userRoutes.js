const express = require('express');
const router = express.Router();
const { getUserProfile, getUserCertificates, becomeInstructor, updateUserProfile } = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

// Rutas protegidas
router.get('/perfil', verifyToken, getUserProfile);
router.get('/certificados', verifyToken, getUserCertificates);

// Cambiar roles y datos
router.put('/convertirse-instructor', verifyToken, becomeInstructor);
router.put('/actualizar', verifyToken, updateUserProfile); // ✅ Nueva ruta

module.exports = router;