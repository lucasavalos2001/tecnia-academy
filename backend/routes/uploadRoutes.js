const express = require('express');
const router = express.Router();
const { prepareVideoUpload } = require('../controllers/uploadController');
const { verifyToken } = require('../middleware/authMiddleware');

// Ruta para pedir permiso de subida (Solo instructores logueados)
router.post('/video/presign', verifyToken, prepareVideoUpload);

module.exports = router;