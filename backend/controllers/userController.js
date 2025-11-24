const { Enrollment, Course, User } = require('../models');

// Obtener perfil del usuario
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.usuario.id, {
            attributes: { exclude: ['contraseña_hash'] }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener perfil" });
    }
};

// Obtener certificados
const getUserCertificates = async (req, res) => {
    try {
        const userId = req.usuario.id;
        const certificados = await Enrollment.findAll({
            where: { 
                userId: userId, 
                progreso_porcentaje: 100 
            },
            include: [{
                model: Course,
                as: 'curso',
                attributes: ['id', 'titulo', 'imagen_url', 'updatedAt']
            }],
            order: [['updatedAt', 'DESC']]
        });

        res.json({ certificados });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al obtener certificados" });
    }
};

// Convertirse en Instructor
const becomeInstructor = async (req, res) => {
    try {
        const userId = req.usuario.id;
        await User.update({ rol: 'instructor' }, { where: { id: userId } });
        res.json({ message: "¡Felicidades! Ahora eres instructor. Por favor inicia sesión nuevamente." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al actualizar perfil" });
    }
};

// ✅ NUEVA FUNCIÓN: Actualizar Perfil (Nombre y Bio)
// ✅ FUNCIÓN ACTUALIZADA
const updateUserProfile = async (req, res) => {
    try {
        const userId = req.usuario.id;
        // Ahora recibimos también email_contacto
        const { nombre_completo, biografia, email_contacto } = req.body;

        await User.update(
            { nombre_completo, biografia, email_contacto },
            { where: { id: userId } }
        );

        res.json({ message: "Perfil actualizado con éxito" });
    } catch (error) {
        console.error("Error al actualizar perfil:", error);
        res.status(500).json({ message: "Error al actualizar el perfil" });
    }
};

module.exports = { getUserProfile, getUserCertificates, becomeInstructor, updateUserProfile };