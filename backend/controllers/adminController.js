const { User, Course, Enrollment, Transaction, SystemSetting, Payout, ErrorLog } = require('../models');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs'); // 🟢 IMPORTANTE: Para el reseteo de claves
const { isValidRole, isStrongPassword } = require('../utils/validators');

// 1. Dashboard: Estadísticas Globales
const getGlobalStats = async (req, res) => {
    try {
        const totalUsers = await User.count();
        const totalCourses = await Course.count();
        const totalEnrollments = await Enrollment.count();
        const totalInstructors = await User.count({ where: { rol: 'instructor' } });

        const [results] = await sequelize.query(`
            SELECT SUM(c.precio) as total_ingresos
            FROM enrollments e
            JOIN courses c ON e."courseId" = c.id
        `);

        const totalRevenue = results[0]?.total_ingresos || 0;

        // 🟢 Top 5 cursos más vendidos
        const [cursosMasVendidos] = await sequelize.query(`
            SELECT c.id, c.titulo, COUNT(e.id) as ventas, SUM(c.precio) as ingresos
            FROM courses c
            JOIN enrollments e ON e."courseId" = c.id
            GROUP BY c.id, c.titulo
            ORDER BY ventas DESC
            LIMIT 5
        `);

        // 🟢 Ingresos de los últimos 6 meses
        const [ingresosPorMes] = await sequelize.query(`
            SELECT
                TO_CHAR(e."createdAt", 'YYYY-MM') as mes,
                COUNT(e.id) as ventas,
                SUM(c.precio) as ingresos
            FROM enrollments e
            JOIN courses c ON e."courseId" = c.id
            WHERE e."createdAt" >= NOW() - INTERVAL '6 months'
            GROUP BY mes
            ORDER BY mes ASC
        `);

        res.json({
            totalUsers, totalCourses, totalEnrollments, totalRevenue, totalInstructors,
            cursosMasVendidos, ingresosPorMes
        });
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

// 🟢 NUEVA FUNCIÓN: Reseteo de contraseña por Superadmin
const resetUserPassword = async (req, res) => {
    try {
        const { userId } = req.params;
        const { newPassword } = req.body; // El admin envía la clave provisoria

        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({ message: "La contraseña provisoria debe tener al menos 8 caracteres, con letras y números." });
        }

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

        // Hashear la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await user.update({ contraseña_hash: hashedPassword });

        res.json({ 
            message: `Contraseña de ${user.nombre_completo} reseteada con éxito.`,
            provisoria: newPassword 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al resetear la contraseña" });
    }
};

const updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { rol } = req.body;

        if (!isValidRole(rol)) {
            return res.status(400).json({ message: "Rol no válido." });
        }

        await User.update({ rol }, { where: { id: userId } });
        res.json({ message: `Rol actualizado a: ${rol}` });
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar rol" });
    }
};

// 💰 Marca si un instructor presentó factura legal, para calcular su comisión correcta
const updateInstructorFactura = async (req, res) => {
    try {
        const { userId } = req.params;
        const { tiene_factura } = req.body;

        const [affected] = await User.update(
            { tiene_factura: !!tiene_factura },
            { where: { id: userId, rol: 'instructor' } }
        );

        if (!affected) return res.status(404).json({ message: "Instructor no encontrado" });

        res.json({ message: tiene_factura ? "Marcado como instructor PRO (con factura)." : "Marcado como instructor Básico (sin factura)." });
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar la condición fiscal" });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const cursosCreados = await Course.count({ where: { instructorId: userId } });
        if (cursosCreados > 0) {
            return res.status(400).json({
                message: `No se puede eliminar: el usuario tiene ${cursosCreados} curso(s) creado(s). Reasigná o eliminá esos cursos primero.`
            });
        }

        await Enrollment.destroy({ where: { userId } });
        await Transaction.destroy({ where: { userId } });
        await User.destroy({ where: { id: userId } });

        res.json({ message: "Usuario eliminado permanentemente." });
    } catch (error) {
        console.error(error);
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
        res.status(500).json({ message: "Error al procesar la revisión" });
    }
};

const deleteCourseAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;
        const esSuperadmin = req.usuario.rol === 'superadmin';

        const curso = await Course.findByPk(courseId);
        if (!curso) return res.status(404).json({ message: "Curso no encontrado" });

        const alumnosInscritos = await Enrollment.count({ where: { courseId } });

        if (alumnosInscritos > 0 && !esSuperadmin) {
            return res.status(400).json({
                message: `No se puede eliminar: el curso tiene ${alumnosInscritos} alumno(s) inscrito(s). Solo un superadministrador puede forzar esta eliminación.`
            });
        }

        if (alumnosInscritos > 0 && esSuperadmin) {
            await Enrollment.destroy({ where: { courseId } });
            await Transaction.destroy({ where: { courseId } });
        }

        await curso.destroy();
        res.json({ message: "Curso eliminado por el administrador." });
    } catch (error) {
        console.error(error);
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
        res.status(500).json({ message: "Error al obtener actividad" });
    }
};

// 4.b Transacciones (para ver pagos fallidos y poder reembolsar)
const getAllTransactions = async (req, res) => {
    try {
        const transacciones = await Transaction.findAll({
            order: [['createdAt', 'DESC']],
            limit: 100,
            include: [
                { model: User, as: 'usuario', attributes: ['nombre_completo', 'email'] },
                { model: Course, as: 'curso', attributes: ['titulo'] }
            ]
        });

        // 🛡️ Red de seguridad: si algún pago quedó marcado "paid" sin que se haya
        // creado la inscripción correspondiente (ej: por una falla puntual del
        // webhook), lo marcamos acá para que el admin lo vea y lo pueda arreglar.
        const resultado = await Promise.all(transacciones.map(async (tx) => {
            let sin_inscripcion = false;
            if (tx.status === 'paid') {
                const inscripcion = await Enrollment.findOne({ where: { userId: tx.userId, courseId: tx.courseId } });
                sin_inscripcion = !inscripcion;
            }
            return { ...tx.toJSON(), sin_inscripcion };
        }));

        res.json(resultado);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener transacciones" });
    }
};

// 4.c Errores del servidor (para no depender de mirar la consola a mano)
const getErrorLogs = async (req, res) => {
    try {
        const errores = await ErrorLog.findAll({
            where: { resuelto: false },
            order: [['createdAt', 'DESC']],
            limit: 100
        });
        res.json(errores);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener el registro de errores" });
    }
};

const markErrorResolved = async (req, res) => {
    try {
        const { id } = req.params;
        await ErrorLog.update({ resuelto: true }, { where: { id } });
        res.json({ message: "Error marcado como resuelto." });
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar" });
    }
};

// Arregla manualmente el caso donde un pago quedó confirmado pero, por algún
// fallo puntual, nunca se creó la inscripción del alumno al curso.
const fixMissingEnrollment = async (req, res) => {
    try {
        const { id } = req.params;
        const transaccion = await Transaction.findByPk(id);

        if (!transaccion) return res.status(404).json({ message: "Transacción no encontrada" });
        if (transaccion.status !== 'paid') {
            return res.status(400).json({ message: "Esta transacción no está marcada como pagada." });
        }

        const [inscripcion, creada] = await Enrollment.findOrCreate({
            where: { userId: transaccion.userId, courseId: transaccion.courseId },
            defaults: { progreso_porcentaje: 0, fecha_inscripcion: new Date(), lecciones_completadas: [] }
        });

        res.json({ message: creada ? "Inscripción creada correctamente." : "El alumno ya estaba inscrito." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al crear la inscripción" });
    }
};

// Reembolsa una transacción pagada: la marca como 'refunded' y le quita el
// acceso al curso al alumno (borra su inscripción).
const refundTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const transaccion = await Transaction.findByPk(id);

        if (!transaccion) return res.status(404).json({ message: "Transacción no encontrada" });
        if (transaccion.status !== 'paid') {
            return res.status(400).json({ message: "Solo se pueden reembolsar transacciones que estén pagadas." });
        }

        transaccion.status = 'refunded';
        await transaccion.save();

        await Enrollment.destroy({ where: { userId: transaccion.userId, courseId: transaccion.courseId } });

        res.json({ message: "Transacción reembolsada. Se le quitó el acceso al curso al alumno." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al procesar el reembolso" });
    }
};

// 5. Calcular Pagos (Liquidación a Instructores en Paraguay)
const getInstructorEarnings = async (req, res) => {
    try {
        const currentData = new Date();
        let month = req.query.month ? parseInt(req.query.month) - 1 : currentData.getMonth();
        let year = req.query.year ? parseInt(req.query.year) : currentData.getFullYear();

        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

        const instructors = await User.findAll({
            where: { rol: 'instructor' },
            attributes: ['id', 'nombre_completo', 'email', 'banco_nombre', 'numero_cuenta', 'titular_cuenta', 'cedula_identidad', 'alias_bancario', 'tiene_factura']
        });

        // Liquidaciones ya marcadas como pagadas para este período específico
        const pagosDelPeriodo = await Payout.findAll({ where: { mes: month + 1, anio: year } });
        const pagosPorInstructor = {};
        pagosDelPeriodo.forEach(p => { pagosPorInstructor[p.instructorId] = p; });

        const report = [];

        for (const instructor of instructors) {
            const courses = await Course.findAll({ where: { instructorId: instructor.id } });
            if (courses.length === 0) continue; 

            let detalleVentas = [];
            let totalBrutoInstructor = 0;

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

            // 💰 Comisión según condición fiscal (definida en TermsInstructors.jsx):
            // con factura legal = 30% para la plataforma (70% para el instructor)
            // sin factura = 40% para la plataforma (60% para el instructor)
            const comisionPlataforma = instructor.tiene_factura ? 0.30 : 0.40;
            const totalPagar = totalBrutoInstructor * (1 - comisionPlataforma);
            const pagoRegistrado = pagosPorInstructor[instructor.id] || null;

            report.push({
                instructor: {
                    id: instructor.id,
                    nombre: instructor.nombre_completo,
                    banco: instructor.banco_nombre,
                    cuenta: instructor.numero_cuenta,
                    titular: instructor.titular_cuenta,
                    ci: instructor.cedula_identidad,
                    alias: instructor.alias_bancario,
                    tiene_factura: instructor.tiene_factura
                },
                periodo: { mes: month + 1, año: year },
                estadisticas: {
                    total_bruto: totalBrutoInstructor,
                    porcentaje_comision: comisionPlataforma * 100,
                    comision_retenida: totalBrutoInstructor * comisionPlataforma,
                    total_a_pagar: totalPagar
                },
                detalle: detalleVentas,
                ya_pagado: !!pagoRegistrado,
                fecha_pago: pagoRegistrado ? pagoRegistrado.createdAt : null
            });
        }
        res.json(report);
    } catch (error) {
        res.status(500).json({ message: "Error al calcular pagos" });
    }
};

// Marca la liquidación de un instructor para un período (mes/año) como ya pagada.
// Queda registrado el monto y el porcentaje usados en ese momento, para que
// quede un historial fijo aunque después cambien las ventas o la comisión.
const markPayoutAsPaid = async (req, res) => {
    try {
        const { instructorId, mes, anio, monto_bruto, monto_pagado, porcentaje_comision } = req.body;

        if (!instructorId || !mes || !anio || monto_pagado === undefined) {
            return res.status(400).json({ message: "Faltan datos para registrar el pago." });
        }

        const yaExiste = await Payout.findOne({ where: { instructorId, mes, anio } });
        if (yaExiste) {
            return res.status(400).json({
                message: `Este período ya estaba marcado como pagado el ${new Date(yaExiste.createdAt).toLocaleDateString('es-PY')}.`
            });
        }

        await Payout.create({
            instructorId,
            mes,
            anio,
            monto_bruto,
            monto_pagado,
            porcentaje_comision,
            pagado_por: req.usuario.id
        });

        res.status(201).json({ message: "Liquidación marcada como pagada." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al registrar el pago." });
    }
};

// 6. CONTROL DE MANTENIMIENTO
const getMaintenanceStatus = async (req, res) => {
    try {
        const setting = await SystemSetting.findOne({ where: { key: 'maintenance_mode' } });
        const isEnabled = setting ? setting.value === 'true' : false;
        res.json({ enabled: isEnabled });
    } catch (error) {
        res.status(500).json({ message: "Error verificando mantenimiento" });
    }
};

const toggleMaintenance = async (req, res) => {
    try {
        const { enabled } = req.body; 
        const [setting, created] = await SystemSetting.findOrCreate({
            where: { key: 'maintenance_mode' },
            defaults: { value: enabled ? 'true' : 'false' }
        });

        if (!created) {
            await setting.update({ value: enabled ? 'true' : 'false' });
        }

        res.json({ 
            message: `Modo Mantenimiento ${enabled ? 'ACTIVADO 🔒' : 'DESACTIVADO ✅'}`,
            enabled: enabled
        });
    } catch (error) {
        res.status(500).json({ message: "Error cambiando modo mantenimiento" });
    }
};

module.exports = {
    getGlobalStats,
    getAllUsers,
    updateUserRole,
    updateInstructorFactura,
    deleteUser,
    resetUserPassword, // 🟢 NUEVA EXPORTACIÓN
    getAllCoursesAdmin,
    deleteCourseAdmin,
    getPendingCourses,
    reviewCourse,
    getRecentEnrollments,
    getAllTransactions,
    refundTransaction,
    fixMissingEnrollment,
    getErrorLogs,
    markErrorResolved,
    getInstructorEarnings,
    markPayoutAsPaid,
    getMaintenanceStatus,
    toggleMaintenance 
};