const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); 
const nodemailer = require('nodemailer');
const { Op } = require('sequelize');

// Configuración Email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- REGISTRO ---
const registerUser = async (req, res) => {
    const { nombre_completo, email, password } = req.body;
    console.log("📝 Intento de registro:", email); // LOG

    try {
        // Validación básica
        if (!password || !email) {
            return res.status(400).json({ message: 'Faltan datos obligatorios' });
        }

        const existeUsuario = await User.findOne({ where: { email } });
        if (existeUsuario) {
            return res.status(400).json({ message: 'El correo ya está registrado' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Crear usuario
        await User.create({
            nombre_completo,
            email,
            contraseña_hash: hashedPassword
        });

        console.log("✅ Usuario registrado con éxito:", email);
        res.status(201).json({ message: 'Usuario registrado con éxito' });

    } catch (error) {
        console.error("❌ Error en registro:", error); // LOG DETALLADO
        res.status(500).json({ message: 'Error en el servidor al registrar', error: error.message });
    }
};

// --- LOGIN (AQUÍ ESTABA EL ERROR 500) ---
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    console.log("🔑 Intento de Login:", email); // LOG

    try {
        // 1. Buscar usuario
        const usuario = await User.findOne({ where: { email } });
        
        if (!usuario) {
            console.log("❌ Usuario no encontrado en BD");
            return res.status(400).json({ message: 'Credenciales inválidas (Usuario no existe)' });
        }

        // 🔍 DIAGNÓSTICO: Ver si el usuario tiene contraseña
        console.log("Usuario encontrado:", usuario.nombre_completo);
        console.log("Hash en BD:", usuario.contraseña_hash ? "Existe (Oculto)" : "UNDEFINED (ERROR)");

        // 2. Validar que el hash exista ANTES de comparar (Evita el crash 500)
        if (!usuario.contraseña_hash) {
            console.error("🚨 EL USUARIO TIENE LA CONTRASEÑA CORRUPTA (NULL)");
            return res.status(500).json({ message: 'Error crítico: Usuario corrupto en BD. Contacta soporte.' });
        }

        // 3. Comparar contraseña
        const isMatch = await bcrypt.compare(password, usuario.contraseña_hash);
        if (!isMatch) {
            console.log("❌ Contraseña incorrecta");
            return res.status(400).json({ message: 'Credenciales inválidas (Contraseña mal)' });
        }

        // 4. Generar Token
        if (!process.env.JWT_SECRET) {
            console.error("🚨 FALTA JWT_SECRET EN .ENV");
            return res.status(500).json({ message: 'Error de configuración del servidor' });
        }

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
        console.error("🔴 CRASH EN LOGIN:", error); // ESTO NOS DIRÁ EL ERROR REAL
        res.status(500).json({ message: 'Error interno en el servidor', error: error.message });
    }
};

// --- RECUPERACIÓN DE CONTRASEÑA ---
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ message: "No existe un usuario con ese correo." });

        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; 
        await user.save();

        const resetUrl = `https://tecniaacademy.com/reset-password/${token}`;

        const mailOptions = {
            from: '"Soporte Tecnia Academy" <tecniaacademy@gmail.com>',
            to: user.email,
            subject: 'Restablecer tu contraseña',
            text: `Hola,\n\nHaz clic aquí para cambiar tu contraseña:\n${resetUrl}\n\nSi no fuiste tú, ignora este correo.`
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: "Correo enviado." });

    } catch (error) {
        console.error("❌ Error enviando correo:", error);
        res.status(500).json({ message: "Error al enviar correo." });
    }
};

const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    try {
        const user = await User.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { [Op.gt]: Date.now() }
            }
        });
        if (!user) return res.status(400).json({ message: "Enlace inválido o expirado." });

        const salt = await bcrypt.genSalt(10);
        user.contraseña_hash = await bcrypt.hash(password, salt);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        res.json({ message: "Contraseña actualizada." });
    } catch (error) {
        console.error("Error reset password:", error);
        res.status(500).json({ message: "Error al restablecer." });
    }
};

module.exports = { registerUser, loginUser, forgotPassword, resetPassword };