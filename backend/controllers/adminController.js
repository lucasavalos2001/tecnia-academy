const { User, Course, Enrollment } = require('../models');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize'); // 🟢 Necesario para filtros de fecha

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

// Ver SOLO los cursos PENDIENTES
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

// REVISAR CURSO (Aprobar o Rechazar)
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

// 🟢 5. NUEVA FUNCIÓN: CALCULAR PAGOS A INSTRUCTORES
const getInstructorEarnings = async (req, res) => {
    try {
        // Obtenemos el mes y año actual (o los que vengan por query)
        const date = new Date();
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        // 1. Obtener todos los instructores
        const instructors = await User.findAll({
            where: { rol: 'instructor' },
            attributes: ['id', 'nombre_completo', 'email', 'banco_nombre', 'numero_cuenta', 'titular_cuenta', 'cedula_identidad', 'alias_bancario']
        });

        const report = [];

        // 2. Calcular ganancias para cada instructor
        for (const instructor of instructors) {
            // Buscar cursos de este instructor
            const courses = await Course.findAll({ where: { instructorId: instructor.id } });
            const courseIds = courses.map(c => c.id);

            if (courseIds.length === 0) continue; // Si no tiene cursos, saltar

            // Contar inscripciones de ESTE MES para esos cursos
            const enrollments = await Enrollment.findAll({
                where: {
                    courseId: courseIds,
                    createdAt: {
                        [Op.between]: [startOfMonth, endOfMonth]
                    }
                },
                include: [{ model: Course, as: 'curso', attributes: ['precio'] }]
            });

            // Calcular total bruto
            const totalBruto = enrollments.reduce((sum, e) => sum + parseFloat(e.curso.precio), 0);
            
            // Lógica de Comisión: 70% Instructor / 30% Plataforma (Ejemplo)
            const comisionPlataforma = 0.30; 
            const totalPagar = totalBruto * (1 - comisionPlataforma);

            report.push({
                instructor: {
                    id: instructor.id,
                    nombre: instructor.nombre_completo,
                    banco: instructor.banco_nombre,
                    cuenta: instructor.numero_cuenta,
                    titular: instructor.titular_cuenta,
                    ci: instructor.cedula_identidad,
                    alias: instructor.alias_bancario
                },
                estadisticas: {
                    alumnos_mes: enrollments.length,
                    cursos_activos: courses.length,
                    total_bruto: totalBruto,
                    comision_retenida: totalBruto * comisionPlataforma,
                    total_a_pagar: totalPagar
                }
            });
        }

        res.json(report);

    } catch (error) {
        console.error("Error calculando pagos:", error);
        res.status(500).json({ message: "Error al calcular pagos a instructores" });
    }
};

module.exports = { 
    getGlobalStats, 
    getAllUsers, updateUserRole, deleteUser, 
    getAllCoursesAdmin, deleteCourseAdmin,
    getPendingCourses, 
    reviewCourse, 
    getRecentEnrollments,
    getInstructorEarnings // <--- ¡Exportada!
};