const { Enrollment, Course, User } = require('../models');
const axios = require('axios'); // Necesario para Bunny

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

const getUserCertificates = async (req, res) => {
    try {
        const userId = req.usuario.id;
        const certificados = await Enrollment.findAll({
            where: { userId: userId, progreso_porcentaje: 100 },
            include: [{ 
                model: Course, 
                as: 'curso', 
                attributes: [
                    'id', 'titulo', 'imagen_url', 'updatedAt', 'duracion', 'nombre_instructor_certificado'
                ],
                include: [{
                    model: User,
                    as: 'instructor',
                    attributes: ['nombre_completo']
                }]
            }],
            order: [['updatedAt', 'DESC']]
        });
        res.json({ certificados });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ message: "Error al obtener certificados" }); 
    }
};

// 🟢 NUEVA FUNCIÓN: VERIFICACIÓN PÚBLICA (SIN LOGIN)
const verifyCertificatePublic = async (req, res) => {
    try {
        const { id } = req.params;

        // Buscamos la inscripción por su ID (que es el ID del certificado)
        const certificado = await Enrollment.findByPk(id, {
            include: [
                { 
                    model: User, 
                    as: 'usuario',
                    attributes: ['nombre_completo'] // Nombre del estudiante
                },
                { 
                    model: Course, 
                    as: 'curso',
                    attributes: ['titulo', 'duracion', 'nombre_instructor_certificado'],
                    include: [{ // Incluimos instructor por si no hay nombre personalizado
                        model: User,
                        as: 'instructor',
                        attributes: ['nombre_completo']
                    }]
                }
            ]
        });

        // Validaciones
        if (!certificado) {
            return res.status(404).json({ message: "Certificado no encontrado." });
        }

        if (certificado.progreso_porcentaje < 100) {
            return res.status(400).json({ message: "Este curso aún no ha sido completado al 100%." });
        }

        // Preparamos los datos para mostrar públicamente
        const nombreInstructor = certificado.curso.nombre_instructor_certificado 
                              || certificado.curso.instructor.nombre_completo 
                              || "Instructor Certificado";

        res.json({
            valido: true,
            id: certificado.id,
            estudiante: certificado.usuario.nombre_completo,
            curso: certificado.curso.titulo,
            fecha: certificado.updatedAt,
            duracion: certificado.curso.duracion,
            instructor: nombreInstructor
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al verificar certificado" });
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

        await User.update(
            { nombre_completo, biografia, email_contacto, foto_perfil: nueva_foto },
            { where: { id: userId } }
        );

        res.json({ message: "Perfil actualizado con éxito" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al actualizar el perfil" });
    }
};

module.exports = { 
    getUserProfile, 
    getUserCertificates, 
    becomeInstructor, 
    updateUserProfile, 
    verifyCertificatePublic // <--- No olvides exportarla
};