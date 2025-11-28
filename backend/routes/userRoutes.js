const express = require('express');
const router = express.Router();
const multer = require('multer'); // <--- Importar Multer
const { getUserProfile, getUserCertificates, becomeInstructor, updateUserProfile } = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

// Configurar Multer (Memoria)
const upload = multer({ storage: multer.memoryStorage() });

// Rutas protegidas
router.get('/perfil', verifyToken, getUserProfile);
router.get('/certificados', verifyToken, getUserCertificates);
router.put('/convertirse-instructor', verifyToken, becomeInstructor);

// ✅ AHORA ACEPTA ARCHIVOS ('foto')
router.put('/actualizar', verifyToken, upload.single('foto'), updateUserProfile);

module.exports = router;