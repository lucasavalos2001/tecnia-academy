const { User, Course, Enrollment } = require('../models');
const { sequelize } = require('../config/db');

// 1. Dashboard: Estadísticas Globales
const getGlobalStats = async (req, res) => {
    try {
        const totalUsers = await User.count();
        const totalCourses = await Course.count();
        const totalEnrollments = await Enrollment.count();
        
        // Ingresos teóricos
        const [results] = await sequelize.query(`
            SELECT SUM(c.precio) as total_ingresos
            FROM enrollments e
            JOIN courses c ON e."courseId" = c.id
        `);
        
        const totalRevenue = results[0].total_ingresos || 0;

        res.json({ totalUsers, totalCourses, totalEnrollments, totalRevenue });
    } catch (error) {
        res.status(500).json({ message: "Error al obtener estadísticas" });
    }
};

// 2. Gestión de Usuarios
const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['contraseña_hash'] },
            order: [['id', 'ASC']]
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener usuarios" });
    }
};

const updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { rol } = req.body; 
        await User.update({ rol }, { where: { id: userId } });
        res.json({ message: `Rol actualizado a: ${rol}` });
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar rol" });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        await User.destroy({ where: { id: userId } });
        res.json({ message: "Usuario eliminado permanentemente." });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar usuario" });
    }
};

// 3. Gestión de Cursos (Moderación)

// Ver TODOS los cursos (Catálogo completo)
const getAllCoursesAdmin = async (req, res) => {
    try {
        const courses = await Course.findAll({
            include: [{ model: User, as: 'instructor', attributes: ['nombre_completo', 'email'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener cursos" });
    }
};

// 🟢 Ver SOLO los cursos PENDIENTES
const getPendingCourses = async (req, res) => {
    try {
        const courses = await Course.findAll({
            where: { estado: 'pendiente' },
            include: [{ model: User, as: 'instructor', attributes: ['nombre_completo', 'email'] }],
            order: [['updatedAt', 'ASC']]
        });
        res.json(courses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al obtener cursos pendientes" });
    }
};

// 🟢 REVISAR CURSO (Aprobar o Rechazar)
const reviewCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { decision } = req.body; // 'aprobar' o 'rechazar'

        const curso = await Course.findByPk(id);
        if (!curso) return res.status(404).json({ message: "Curso no encontrado" });

        if (decision === 'aprobar') {
            await curso.update({ estado: 'publicado' });
            return res.json({ message: "Curso publicado exitosamente." });
        } 
        
        if (decision === 'rechazado') {
            await curso.update({ estado: 'rechazado' });
            return res.json({ message: "Curso rechazado y devuelto al instructor." });
        }

        return res.status(400).json({ message: "Decisión no válida." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al procesar la revisión" });
    }
};

const deleteCourseAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;
        await Course.destroy({ where: { id: courseId } });
        res.json({ message: "Curso eliminado por el administrador." });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar curso" });
    }
};

// 4. Actividad
const getRecentEnrollments = async (req, res) => {
    try {
        const enrollments = await Enrollment.findAll({
            limit: 20,
            order: [['createdAt', 'DESC']],
            include: [
                { model: User, attributes: ['nombre_completo', 'email'] },
                { model: Course, as: 'curso', attributes: ['titulo', 'precio'] }
            ]
        });
        res.json(enrollments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al obtener actividad" });
    }
};

module.exports = { 
    getGlobalStats, 
    getAllUsers, updateUserRole, deleteUser, 
    getAllCoursesAdmin, deleteCourseAdmin,
    getPendingCourses, // 🟢
    reviewCourse,      // 🟢 (Antes era approveCourse, ahora maneja ambos)
    getRecentEnrollments 
};