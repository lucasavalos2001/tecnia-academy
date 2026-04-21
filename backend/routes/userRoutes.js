const express = require('express');
const router = express.Router();
const multer = require('multer'); 
const { 
    getUserProfile, 
    getUserCertificates, 
    becomeInstructor, 
    updateUserProfile, 
    verifyCertificatePublic,
    updateBankDetails,
    updatePassword // 🟢 1. IMPORTAMOS LA NUEVA FUNCIÓN
} = require('../controllers/userController');

const { verifyToken } = require('../middleware/authMiddleware');

// Configurar Multer (Memoria)
const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// 🟢 RUTA PÚBLICA (ACCESO LIBRE)
// ==========================================
router.get('/verificar/:id', verifyCertificatePublic);


// ==========================================
// 🔒 RUTAS PROTEGIDAS (REQUIEREN LOGIN)
// ==========================================
router.get('/perfil', verifyToken, getUserProfile);
router.get('/certificados', verifyToken, getUserCertificates);
router.put('/convertirse-instructor', verifyToken, becomeInstructor);

// 🟢 NUEVA RUTA: SEGURIDAD (CAMBIO DE CONTRASEÑA)
// Esta es la ruta que el frontend está intentando llamar
router.put('/update-password', verifyToken, updatePassword); 

// 🟢 NUEVA RUTA: GUARDAR DATOS BANCARIOS
router.put('/datos-bancarios', verifyToken, updateBankDetails);

router.put('/actualizar', verifyToken, upload.single('foto'), updateUserProfile);

module.exports = router;