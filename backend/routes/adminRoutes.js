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
    // ✅ IMPORTACIONES CORRECTAS:
    getPendingCourses,
    reviewCourse // Usamos esta porque maneja aprobar Y rechazar
} = require('../controllers/adminController');

// Importamos el middleware centralizado (más seguro y limpio)
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// ==========================================
// 🔒 SEGURIDAD GLOBAL
// ==========================================
// Aplicamos la seguridad a TODAS las rutas de este archivo.
// Así no tienes que repetirlo en cada línea.
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
// ✅ SOLICITUDES Y APROBACIÓN (LO NUEVO)
// ==========================================

// 1. Ver cursos pendientes
// Ruta final: /api/admin/pending
router.get('/pending', getPendingCourses);

// 2. Revisar curso (Aprobar o Rechazar)
// Ruta final: /api/admin/review/:id
router.post('/review/:id', reviewCourse);

module.exports = router;