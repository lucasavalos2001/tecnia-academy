const express = require('express');
const router = express.Router();
const { 
    createCourse, getInstructorCourses, updateCourse, deleteCourse,
    getCourseCurriculum, addModule, deleteModule, updateModule, addLesson, deleteLesson, updateLesson,
    getAllCourses, getCourseDetail, enrollInCourse, getMyCourses, markLessonAsComplete,
    getInstructorStats // <--- ✅ NUEVO IMPORT
} = require('../controllers/courseController');
const { verifyToken } = require('../middleware/authMiddleware');

// ==========================================
//  RUTAS PÚBLICAS
// ==========================================
router.get('/', getAllCourses);
router.get('/:id/detalle', getCourseDetail);

// ==========================================
//  RUTAS PROTEGIDAS (Requieren Login)
// ==========================================

// --- Estudiante ---
router.get('/mis-cursos', verifyToken, getMyCourses);
router.post('/:courseId/inscribirse', verifyToken, enrollInCourse);
router.post('/:courseId/lecciones/:lessonId/completar', verifyToken, markLessonAsComplete);

// --- Instructor (Gestión) ---
router.post('/', verifyToken, createCourse);
router.get('/instructor', verifyToken, getInstructorCourses);

// ✅ NUEVA RUTA: Estadísticas del Instructor
router.get('/instructor/stats', verifyToken, getInstructorStats);

// Gestión de Curso
router.get('/:id/curriculum', verifyToken, getCourseCurriculum);
router.put('/:id', verifyToken, updateCourse);
router.delete('/:id', verifyToken, deleteCourse);

// Gestión de Contenido (Módulos y Lecciones)
router.post('/:id/modules', verifyToken, addModule);
router.put('/modules/:id', verifyToken, updateModule);
router.delete('/modules/:id', verifyToken, deleteModule);

router.post('/modules/:moduleId/lessons', verifyToken, addLesson);
router.put('/lessons/:id', verifyToken, updateLesson);
router.delete('/lessons/:id', verifyToken, deleteLesson);

module.exports = router;