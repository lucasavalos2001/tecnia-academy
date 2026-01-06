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
    getInstructorEarnings // <--- 🟢 IMPORTAMOS LA NUEVA FUNCIÓN
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
// 💰 GESTIÓN DE PAGOS (NUEVO)
// ==========================================
// Ruta para ver cuánto hay que pagarle a cada instructor este mes
router.get('/payouts', getInstructorEarnings);

module.exports = router;