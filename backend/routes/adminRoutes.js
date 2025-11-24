const express = require('express');
const router = express.Router();
const { 
    getGlobalStats, 
    getAllUsers, 
    updateUserRole, 
    deleteUser,
    getAllCoursesAdmin,
    deleteCourseAdmin,
    getRecentEnrollments
} = require('../controllers/adminController');
const { verifyToken } = require('../middleware/authMiddleware');

// Middleware de seguridad (Solo Admins)
const verifyAdmin = (req, res, next) => {
    const { rol } = req.usuario;
    if (rol !== 'admin' && rol !== 'superadmin') {
        return res.status(403).json({ message: "Acceso denegado. Solo Administradores." });
    }
    next();
};

// --- Rutas del Dashboard ---
router.get('/stats', verifyToken, verifyAdmin, getGlobalStats);

// --- Gestión de Usuarios ---
router.get('/users', verifyToken, verifyAdmin, getAllUsers);
router.put('/users/:userId/role', verifyToken, verifyAdmin, updateUserRole);
router.delete('/users/:userId', verifyToken, verifyAdmin, deleteUser);

// --- Gestión de Cursos (Moderación) ---
router.get('/courses', verifyToken, verifyAdmin, getAllCoursesAdmin);
router.delete('/courses/:courseId', verifyToken, verifyAdmin, deleteCourseAdmin);

// --- Actividad Reciente ---
router.get('/activity', verifyToken, verifyAdmin, getRecentEnrollments);

module.exports = router;