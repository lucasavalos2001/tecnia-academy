const { Enrollment, Course, User } = require('../models');
const axios = require('axios'); 
const bcrypt = require('bcryptjs'); // 🟢 IMPORTANTE: Para validar y cifrar contraseñas

// --- HELPER: SUBIR A BUNNY ---
const uploadToBunny = async (file) => {
    try {
        const STORAGE_NAME = process.env.BUNNY_STORAGE_NAME;
        const ACCESS_KEY = process.env.BUNNY_STORAGE_PASSWORD;
        const PULL_ZONE = process.env.BUNNY_PULL_ZONE;
        const REGION = process.env.BUNNY_STORAGE_REGION ? `${process.env.BUNNY_STORAGE_REGION}.` : ''; 

        const filename = `avatar_${Date.now()}_${file.originalname.replace(/\s+/g, '-')}`;
        const bunnyUrl = `https://${REGION}storage.bunnycdn.com/${STORAGE_NAME}/${filename}`;

        await axios.put(bunnyUrl, file.buffer, {
            headers: { AccessKey: ACCESS_KEY, 'Content-Type': file.mimetype }
        });

        return `${PULL_ZONE}/${filename}`;
    } catch (error) {
        console.error("Error subiendo a Bunny:", error);
        return null;
    }
};

const getUserProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.usuario.id, { attributes: { exclude: ['contraseña_hash'] } });
        res.json(user);
    } catch (error) { res.status(500).json({ message: "Error al obtener perfil" }); }
};

// 🟢 NUEVA FUNCIÓN: CAMBIAR CONTRASEÑA (SEGURIDAD PRO)
const updatePassword = async (req, res) => {
    try {
        const userId = req.usuario.id;
        const { currentPassword, newPassword } = req.body;

        // 1. Buscar al usuario incluyendo el hash de la clave
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

        // 2. Validar que la "Contraseña Actual" sea correcta
        const isMatch = await bcrypt.compare(currentPassword, user.contraseña_hash);
        if (!isMatch) {
            return res.status(401).json({ message: "La contraseña actual es incorrecta." });
        }

        // 3. Validar longitud de la nueva clave
        if (newPassword.length < 6) {
            return res.status(400).json({ message: "La nueva contraseña debe tener al menos 6 caracteres." });
        }

        // 4. Cifrar la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 5. Actualizar en la base de datos
        await user.update({ contraseña_hash: hashedPassword });

        res.json({ message: "Contraseña actualizada con éxito. La seguridad de tu cuenta ha mejorado." });

    } catch (error) {
        console.error("Error al cambiar contraseña:", error);
        res.status(500).json({ message: "Error interno al procesar el cambio de contraseña." });
    }
};

const getUserCertificates = async (req, res) => {
    try {
        const userId = req.usuario.id;
        const certificados = await Enrollment.findAll({
            where: { userId: userId, progreso_porcentaje: 100 },
            include: [{ 
                model: Course, 
                as: 'curso', 
                attributes: ['id', 'titulo', 'imagen_url', 'updatedAt', 'duracion', 'nombre_instructor_certificado'],
                include: [{ model: User, as: 'instructor', attributes: ['nombre_completo'] }]
            }],
            order: [['updatedAt', 'DESC']]
        });
        res.json({ certificados });
    } catch (error) { 
        res.status(500).json({ message: "Error al obtener certificados" }); 
    }
};

const verifyCertificatePublic = async (req, res) => {
    try {
        const { id } = req.params;
        const certificado = await Enrollment.findByPk(id, {
            include: [
                { model: User, attributes: ['nombre_completo'] },
                { 
                    model: Course, as: 'curso', 
                    attributes: ['titulo', 'duracion', 'nombre_instructor_certificado'],
                    include: [{ model: User, as: 'instructor', attributes: ['nombre_completo'] }]
                }
            ]
        });

        if (!certificado || certificado.progreso_porcentaje < 100) {
            return res.status(404).json({ message: "Certificado no válido o inexistente." });
        }

        const nombreInstructor = certificado.curso.nombre_instructor_certificado 
                              || certificado.curso.instructor.nombre_completo;

        res.json({
            valido: true,
            id: certificado.id,
            estudiante: certificado.User?.nombre_completo || "Estudiante",
            curso: certificado.curso.titulo,
            fecha: certificado.updatedAt,
            duracion: certificado.curso.duracion,
            instructor: nombreInstructor
        });
    } catch (error) {
        res.status(500).json({ message: "Error al verificar certificado." });
    }
};

const becomeInstructor = async (req, res) => {
    try {
        await User.update({ rol: 'instructor' }, { where: { id: req.usuario.id } });
        res.json({ message: "¡Felicidades! Ahora eres instructor." });
    } catch (error) { res.status(500).json({ message: "Error al actualizar" }); }
};

const updateUserProfile = async (req, res) => {
    try {
        const userId = req.usuario.id;
        const { nombre_completo, biografia, email_contacto } = req.body;
        
        const user = await User.findByPk(userId);
        let nueva_foto = user.foto_perfil;

        if (req.file) {
            const url = await uploadToBunny(req.file);
            if (url) nueva_foto = url;
        }

        await user.update({ nombre_completo, biografia, email_contacto, foto_perfil: nueva_foto });
        res.json({ message: "Perfil actualizado con éxito" });
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar el perfil" });
    }
};

const updateBankDetails = async (req, res) => {
    try {
        const userId = req.usuario.id;
        const { banco_nombre, numero_cuenta, titular_cuenta, cedula_identidad, alias_bancario } = req.body;

        await User.update(
            { banco_nombre, numero_cuenta, titular_cuenta, cedula_identidad, alias_bancario },
            { where: { id: userId } }
        );
        res.json({ message: "Datos bancarios guardados correctamente." });
    } catch (error) {
        res.status(500).json({ message: "Error al guardar los datos bancarios." });
    }
};

module.exports = { 
    getUserProfile, 
    getUserCertificates, 
    becomeInstructor, 
    updateUserProfile, 
    verifyCertificatePublic,
    updateBankDetails,
    updatePassword // 🟢 EXPORTACIÓN AGREGADA
};