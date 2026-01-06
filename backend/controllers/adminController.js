const { User, Course, Enrollment } = require('../models');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize'); 

// 1. Dashboard: Estadísticas Globales
const getGlobalStats = async (req, res) => {
    try {
        const totalUsers = await User.count();
        const totalCourses = await Course.count();
        const totalEnrollments = await Enrollment.count();
        
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

const reviewCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { decision } = req.body; 

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

// 🟢 5. FUNCIÓN CORREGIDA: CALCULAR PAGOS CON FILTRO Y DETALLE
const getInstructorEarnings = async (req, res) => {
    try {
        // 1. Obtener mes y año de los Query Params (o usar fecha actual)
        // Ejemplo: /payouts?month=1&year=2024 (Enero 2024)
        // Nota: Los meses en JS van de 0 a 11 (0=Enero)
        const currentData = new Date();
        
        let month = req.query.month ? parseInt(req.query.month) - 1 : currentData.getMonth();
        let year = req.query.year ? parseInt(req.query.year) : currentData.getFullYear();

        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

        // 2. Obtener todos los instructores
        const instructors = await User.findAll({
            where: { rol: 'instructor' },
            attributes: ['id', 'nombre_completo', 'email', 'banco_nombre', 'numero_cuenta', 'titular_cuenta', 'cedula_identidad', 'alias_bancario']
        });

        const report = [];

        for (const instructor of instructors) {
            // Buscar cursos de este instructor
            const courses = await Course.findAll({ where: { instructorId: instructor.id } });
            
            if (courses.length === 0) continue; 

            // Variable para acumular el detalle de ventas por curso
            let detalleVentas = [];
            let totalBrutoInstructor = 0;

            // Recorremos cada curso para ver cuánto vendió individualmente
            for (const curso of courses) {
                const ventasCurso = await Enrollment.count({
                    where: {
                        courseId: curso.id,
                        createdAt: { [Op.between]: [startOfMonth, endOfMonth] }
                    }
                });

                if (ventasCurso > 0) {
                    const ingresoCurso = ventasCurso * parseFloat(curso.precio);
                    totalBrutoInstructor += ingresoCurso;
                    
                    detalleVentas.push({
                        titulo: curso.titulo,
                        cantidad: ventasCurso,
                        ingreso: ingresoCurso
                    });
                }
            }

            // Lógica de Comisión: 70% Instructor / 30% Plataforma
            const comisionPlataforma = 0.30; 
            const totalPagar = totalBrutoInstructor * (1 - comisionPlataforma);

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
                periodo: {
                    mes: month + 1, // Para mostrar 1=Enero en el frontend
                    año: year
                },
                estadisticas: {
                    total_bruto: totalBrutoInstructor,
                    comision_retenida: totalBrutoInstructor * comisionPlataforma,
                    total_a_pagar: totalPagar
                },
                detalle: detalleVentas // <--- Aquí va la lista detallada
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
    getInstructorEarnings 
};