const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models'); // Asegúrate que esta ruta es correcta (../models)

/**
 * Registra un nuevo usuario en la base de datos (rol 'student' por defecto).
 */
const registerUser = async (req, res) => {
    try {
        const { nombre_completo, email, contraseña } = req.body;
        
        // 1. Verificar si el usuario ya existe
        const usuarioExistente = await User.findOne({ where: { email } });
        if (usuarioExistente) {
            return res.status(400).json({ message: "El correo ya está registrado." });
        }

        // 2. Hashear la contraseña
        const salt = await bcrypt.genSalt(10);
        const contraseña_hash = await bcrypt.hash(contraseña, salt);

        // 3. Crear el nuevo usuario en PostgreSQL
        const nuevoUsuario = await User.create({ 
            nombre_completo, 
            email, 
            contraseña_hash,
            rol: 'student' // Por defecto
        });

        res.status(201).json({ message: "Usuario registrado con éxito" });
    } catch (error) {
        console.error("Error en registerUser:", error);
        res.status(500).json({ message: "Error en el servidor al registrar" });
    }
};

/**
 * Inicia sesión de un usuario y devuelve un token JWT.
 */
const loginUser = async (req, res) => {
    try {
        const { email, contraseña } = req.body;
        const user = await User.findOne({ where: { email } });
        
        if (!user) return res.status(400).json({ message: "Credenciales inválidas" });

        const isMatch = await bcrypt.compare(contraseña, user.contraseña_hash);
        if (!isMatch) return res.status(400).json({ message: "Credenciales inválidas" });
        
        // Crear el payload con el rol, esencial para el frontend
        const payload = { 
            id: user.id, 
            rol: user.rol, 
            nombre: user.nombre_completo 
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
        
        res.json({ 
            message: "Login exitoso", 
            token, 
            user: { 
                id: user.id, 
                nombre_completo: user.nombre_completo, 
                rol: user.rol 
            } 
        });
    } catch (error) {
        console.error("Error en loginUser:", error);
        res.status(500).json({ message: "Error en el servidor al iniciar sesión" });
    }
};

module.exports = { registerUser, loginUser };