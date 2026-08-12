const { User } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { Op } = require('sequelize');

// ➡️ CONFIGURACIÓN FINAL CON SENDGRID (PUERTO DESBLOQUEADO) 🚀
const transporter = nodemailer.createTransport({
    host: "smtp.sendgrid.net",
    port: 2525,                   // ⬅️ ¡CAMBIO CLAVE! El puerto 2525 no lo bloquea Digital Ocean
    secure: false,                // false es correcto para el puerto 2525 (Usa STARTTLS)
    auth: {
        user: 'apikey',           // Usuario fijo de SendGrid
        pass: process.env.SENDGRID_API_KEY 
    }
});

// --- REGISTRO (CORRECCIÓN: Robustez de Contraseña) ---
const registerUser = async (req, res) => {
    // Captura ambas opciones de contraseña para robustez
    const { nombre_completo, email, password, contraseña } = req.body;
    const passwordFinal = password || contraseña; // Usa la variable que sí llegó
    
    console.log("📝 Intento de registro:", email);

    try {
        // Validación básica
        if (!passwordFinal || !email) {
            return res.status(400).json({ message: 'Faltan datos obligatorios (email o contraseña)' });
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

// --- RECUPERACIÓN DE CONTRASEÑA (CORRECCIÓN: Manejo de errores específico) ---
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
        res.json({ message: "Correo enviado. Revisa tu bandeja de entrada." });

    } catch (error) {
        console.error("❌ Error enviando correo:", error);
        // Devolver un error específico para diagnosticar el fallo en el servidor
        if (error.code === 'EAUTH') {
             res.status(500).json({ message: "Error: Credenciales de correo inválidas. Verifica EMAIL_PASS y Contraseña de Aplicación." });
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
             res.status(500).json({ message: "Error: No se pudo conectar al servidor de correo. Verifica la conexión a internet/VPN." });
        } else {
             res.status(500).json({ message: "Error al enviar correo." });
        }
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