const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Nativo de Node
const nodemailer = require('nodemailer');
const { Op } = require('sequelize');

// Configuración del transporte de correo
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const registerUser = async (req, res) => {
    const { nombre_completo, email, password } = req.body;
    try {
        const existeUsuario = await User.findOne({ where: { email } });
        if (existeUsuario) {
            return res.status(400).json({ message: 'El correo ya está registrado' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const nuevoUsuario = await User.create({
            nombre_completo,
            email,
            contraseña_hash: hashedPassword
        });
        res.status(201).json({ message: 'Usuario registrado con éxito' });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const usuario = await User.findOne({ where: { email } });
        if (!usuario) {
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }
        const isMatch = await bcrypt.compare(password, usuario.contraseña_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }
        const token = jwt.sign(
            { id: usuario.id, rol: usuario.rol, nombre_completo: usuario.nombre_completo },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
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
        res.status(500).json({ message: 'Error en el servidor', error });
    }
};

// ✅ 1. SOLICITAR RECUPERACIÓN (Olvide contraseña)
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: "No existe un usuario con ese correo." });
        }

        // Generar token
        const token = crypto.randomBytes(20).toString('hex');
        
        // Guardar token y expiración (1 hora)
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
        await user.save();

        // Crear link de reset (Apunta al Frontend)
        // Nota: Usa tu dominio real si está en prod
        const resetUrl = `https://tecniaacademy.com/reset-password/${token}`;

        const mailOptions = {
            from: '"Soporte Tecnia Academy" <tecniaacademy@gmail.com>',
            to: user.email,
            subject: 'Restablecer tu contraseña - Tecnia Academy',
            text: `Hola ${user.nombre_completo},\n\nRecibimos una solicitud para restablecer tu contraseña.\n\nHaz clic en el siguiente enlace para cambiarla:\n\n${resetUrl}\n\nSi no solicitaste esto, ignora este correo.\n\nSaludos,\nEquipo Tecnia.`
        };

        await transporter.sendMail(mailOptions);

        res.json({ message: "Correo de recuperación enviado." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al enviar correo." });
    }
};

// ✅ 2. RESTABLECER CONTRASEÑA (Reset Password)
const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        // Buscar usuario con ese token y que no haya expirado
        const user = await User.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { [Op.gt]: Date.now() } // gt = greater than (mayor que ahora)
            }
        });

        if (!user) {
            return res.status(400).json({ message: "El enlace es inválido o ha expirado." });
        }

        // Encriptar nueva contraseña
        const salt = await bcrypt.genSalt(10);
        user.contraseña_hash = await bcrypt.hash(password, salt);
        
        // Limpiar token
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        
        await user.save();

        res.json({ message: "Contraseña actualizada con éxito. Ahora puedes iniciar sesión." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al restablecer contraseña." });
    }
};

module.exports = { registerUser, loginUser, forgotPassword, resetPassword };