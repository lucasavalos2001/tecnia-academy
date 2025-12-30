const express = require('express');
const router = express.Router();
const multer = require('multer'); 
// 🟢 IMPORTAMOS LA NUEVA FUNCIÓN 'verifyCertificatePublic'
const { getUserProfile, getUserCertificates, becomeInstructor, updateUserProfile, verifyCertificatePublic } = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

// Configurar Multer (Memoria)
const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// 🟢 RUTA PÚBLICA (ACCESO LIBRE)
// ==========================================
// Permite verificar la autenticidad de un certificado sin iniciar sesión
router.get('/verificar/:id', verifyCertificatePublic);


// ==========================================
// 🔒 RUTAS PROTEGIDAS (REQUIEREN LOGIN)
// ==========================================
router.get('/perfil', verifyToken, getUserProfile);
router.get('/certificados', verifyToken, getUserCertificates);
router.put('/convertirse-instructor', verifyToken, becomeInstructor);

router.put('/actualizar', verifyToken, upload.single('foto'), updateUserProfile);

module.exports = router;