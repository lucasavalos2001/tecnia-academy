const express = require('express');
const router = express.Router();
const { 
    getGlobalStats, 
    getAllUsers, 
    updateUserRole, 
    deleteUser,
    resetUserPassword, // 🟢 NUEVA FUNCIÓN AGREGADA
    getAllCoursesAdmin,
    deleteCourseAdmin,
    getRecentEnrollments,
    getPendingCourses,
    reviewCourse,
    getInstructorEarnings,
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

// ==========================================
// 👥 GESTIÓN DE USUARIOS
// ==========================================
router.get('/users', getAllUsers);
router.put('/users/:userId/role', updateUserRole);
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

// ==========================================
// 🛡️ MODO MANTENIMIENTO
// ==========================================
router.get('/maintenance/status', getMaintenanceStatus);
router.post('/maintenance/toggle', toggleMaintenance);

module.exports = router;