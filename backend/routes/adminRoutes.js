const express = require('express');
const router = express.Router();
const { 
    getGlobalStats, 
    getAllUsers, 
    updateUserRole, 
    deleteUser,
    getAllCoursesAdmin,
    deleteCourseAdmin,
    getRecentEnrollments,
    getPendingCourses,
    reviewCourse,
    getInstructorEarnings,
    // 🟢 NUEVAS FUNCIONES DE MANTENIMIENTO
    getMaintenanceStatus,
    toggleMaintenance
} = require('../controllers/adminController');

// Importamos el middleware centralizado
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// ==========================================
// 🔒 SEGURIDAD GLOBAL
// ==========================================
// Aplicamos la seguridad a TODAS las rutas de este archivo.
router.use(verifyToken, isAdmin);

// ==========================================
// 📊 RUTAS DEL DASHBOARD
// ==========================================
router.get('/stats', getGlobalStats);
router.get('/activity', getRecentEnrollments);

// ==========================================
// 👥 GESTIÓN DE USUARIOS
// ==========================================
router.get('/users', getAllUsers);
router.put('/users/:userId/role', updateUserRole);
router.delete('/users/:userId', deleteUser);

// ==========================================
// 📚 GESTIÓN DE CURSOS
// ==========================================
router.get('/courses', getAllCoursesAdmin); // Catálogo completo
router.delete('/courses/:courseId', deleteCourseAdmin); // Borrar curso

// ==========================================
// ✅ SOLICITUDES Y APROBACIÓN
// ==========================================
router.get('/pending', getPendingCourses);
router.post('/review/:id', reviewCourse);

// ==========================================
// 💰 GESTIÓN DE PAGOS
// ==========================================
router.get('/payouts', getInstructorEarnings);

// ==========================================
// 🛡️ MODO MANTENIMIENTO (NUEVO)
// ==========================================
// 1. Ver si está activo
router.get('/maintenance/status', getMaintenanceStatus);
// 2. Encender / Apagar
router.post('/maintenance/toggle', toggleMaintenance);

module.exports = router;