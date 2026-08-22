const { User } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { isValidEmail, isStrongPassword } = require('../utils/validators');

// --- REGISTRO (CORRECCIÓN: Robustez de Contraseña) ---
const registerUser = async (req, res) => {
    // Captura ambas opciones de contraseña para robustez
    const { nombre_completo, email, password, contraseña } = req.body;
    const passwordFinal = password || contraseña; // Usa la variable que sí llegó
    
    console.log("📝 Intento de registro:", email);

    try {
        // Validación básica
        if (!passwordFinal || !email || !nombre_completo?.trim()) {
            return res.status(400).json({ message: 'Faltan datos obligatorios (nombre, email o contraseña)' });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ message: 'El email no tiene un formato válido.' });
        }

        if (!isStrongPassword(passwordFinal)) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres, con letras y números.' });
        }

        const existeUsuario = await User.findOne({ where: { email } });
        if (existeUsuario) {
            return res.status(400).json({ message: 'El correo ya está registrado' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(passwordFinal, salt); // Usamos passwordFinal
        
        // Crear usuario
        await User.create({
            nombre_completo,
            email,
            contraseña_hash: hashedPassword
        });

        console.log("✅ Usuario registrado con éxito:", email);
        res.status(201).json({ message: 'Usuario registrado con éxito' });

    } catch (error) {
        console.error("❌ Error en registro:", error);
        res.status(500).json({ message: 'Error en el servidor al registrar', error: error.message });
    }
};

// --- LOGIN (CORRECCIÓN: Robustez de Contraseña) ---
const loginUser = async (req, res) => {
    // Manejo de contraseña dual en login también por si acaso
    const { email, password, contraseña } = req.body;
    const passwordFinal = password || contraseña;
    
    console.log("🔑 Intento de Login:", email);

    try {
        // 1. Buscar usuario
        const usuario = await User.findOne({ where: { email } });
        
        if (!usuario) {
            console.log("❌ Usuario no encontrado en BD");
            return res.status(400).json({ message: 'Credenciales inválidas (Usuario no existe)' });
        }

        // 2. Validar que el hash exista ANTES de comparar
        if (!usuario.contraseña_hash) {
            console.error("🚨 EL USUARIO TIENE LA CONTRASEÑA CORRUPTA (NULL)");
            return res.status(500).json({ message: 'Error crítico: Usuario corrupto en BD. Contacta soporte.' });
        }

        // 3. Comparar contraseña (usando passwordFinal)
        const isMatch = await bcrypt.compare(passwordFinal, usuario.contraseña_hash);
        if (!isMatch) {
            console.log("❌ Contraseña incorrecta");
            return res.status(400).json({ message: 'Credenciales inválidas (Contraseña mal)' });
        }

        // 4. Generar Token
        if (!process.env.JWT_SECRET) {
            console.error("🚨 FALTA JWT_SECRET EN .ENV");
            return res.status(500).json({ message: 'Error de configuración del servidor' });
        }

        // Se usa usuario.rol al firmar el token, por eso se incluye
        const token = jwt.sign(
            { id: usuario.id, rol: usuario.rol, nombre_completo: usuario.nombre_completo },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log("✅ Login exitoso, enviando token.");
        res.json({
            token,
            user: {
                id: usuario.id,
                nombre_completo: usuario.nombre_completo,
                email: usuario.email,
                rol: usuario.rol,
                foto_perfil: usuario.foto_perfil
            }
        });

    } catch (error) {
        console.error("🔴 CRASH EN LOGIN:", error);
        res.status(500).json({ message: 'Error interno en el servidor', error: error.message });
    }
};

// La recuperación de contraseña por email se reemplazó por un contacto directo
// vía WhatsApp (ver frontend/src/pages/ForgotPassword.jsx) más el reseteo manual
// que ya tenía el admin en el panel (adminController.js -> resetUserPassword).

module.exports = { registerUser, loginUser };