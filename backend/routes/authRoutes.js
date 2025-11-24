const express = require('express');
// Importa las funciones del controlador
const { registerUser, loginUser } = require('../controllers/authController'); 

// 1. Crear la instancia del router de Express
const router = express.Router(); 

// 2. Definir los endpoints
router.post('/registro', registerUser); 
router.post('/login', loginUser);

// 3. Exportar el router (la función que Express espera)
module.exports = router;