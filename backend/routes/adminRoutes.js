const express = require('express');
const router = express.Router();
const {
    getGlobalStats,
    getAllUsers,
    updateUserRole,
    updateInstructorFactura,
    deleteUser,
    resetUserPassword, // 🟢 NUEVA FUNCIÓN AGREGADA
    getAllCoursesAdmin,
    deleteCourseAdmin,
    getRecentEnrollments,
    getPendingCourses,
    reviewCourse,
    getAllTransactions,
    refundTransaction,
    fixMissingEnrollment,
    getInstructorEarnings,
    markPayoutAsPaid,
    getMaintenanceStatus,
    toggleMaintenance
} = require('../controllers/adminController');

// Importamos el middleware centralizado
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// ==========================================
// 🔒 SEGURIDAD GLOBAL
// ==========================================
// Aplicamos la seguridad a TODAS las rutas de este archivo.
// Solo usuarios con token válido y rol 'admin' o 'superadmin' pueden entrar.
router.use(verifyToken, isAdmin);

// ==========================================
// 📊 RUTAS DEL DASHBOARD (MÉTRICAS)
// ==========================================
router.get('/stats', getGlobalStats);
router.get('/activity', getRecentEnrollments);
router.get('/transactions', getAllTransactions);
router.post('/transactions/:id/refund', refundTransaction);
router.post('/transactions/:id/fix-enrollment', fixMissingEnrollment);

// ==========================================
// 👥 GESTIÓN DE USUARIOS
// ==========================================
router.get('/users', getAllUsers);
router.put('/users/:userId/role', updateUserRole);
router.put('/users/:userId/factura', updateInstructorFactura);
router.delete('/users/:userId', deleteUser);

// 🟢 RUTA DE SOPORTE: Reseteo manual de contraseña
// Esta ruta es la que usaremos cuando el alumno escriba al WhatsApp.
router.post('/users/:userId/reset-password', resetUserPassword);

// ==========================================
// 📚 GESTIÓN DE CURSOS
// ==========================================
router.get('/courses', getAllCoursesAdmin); // Catálogo completo
router.delete('/courses/:courseId', deleteCourseAdmin); // Borrar curso

// ==========================================
// ✅ SOLICITUDES Y APROBACIÓN (INSTRUCTORES)
// ==========================================
router.get('/pending', getPendingCourses);
router.post('/review/:id', reviewCourse);

// ==========================================
// 💰 GESTIÓN DE PAGOS (LIQUIDACIONES EN PY)
// ==========================================
router.get('/payouts', getInstructorEarnings);
router.post('/payouts/mark-paid', markPayoutAsPaid);

// ==========================================
// 🛡️ MODO MANTENIMIENTO
// ==========================================
router.get('/maintenance/status', getMaintenanceStatus);
router.post('/maintenance/toggle', toggleMaintenance);

module.exports = router;