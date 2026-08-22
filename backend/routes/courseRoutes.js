const express = require('express');
const router = express.Router();
const multer = require('multer'); 
const { 
    createCourse, getInstructorCourses, updateCourse, deleteCourse,
    getCourseCurriculum, addModule, deleteModule, updateModule, addLesson, deleteLesson, updateLesson,
    getAllCourses, getCourseDetail, getPreviewLesson, enrollInCourse, getMyCourses, markLessonAsComplete,
    getInstructorStats, getMyEarnings, getMyWishlist, toggleWishlist
} = require('../controllers/courseController');

// Importamos middleware
const { verifyToken, isInstructor } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
//  1. RUTAS PÚBLICAS
// ==========================================
router.get('/', getAllCourses);
router.get('/:id/detalle', getCourseDetail);
router.get('/lecciones/:lessonId/preview', getPreviewLesson);

// ==========================================
//  2. RUTAS PROTEGIDAS (ALUMNOS/INSTRUCTORES)
// ==========================================

// --- Estudiante ---
router.get('/mis-cursos', verifyToken, getMyCourses);
router.get('/favoritos', verifyToken, getMyWishlist);
router.post('/:courseId/favorito', verifyToken, toggleWishlist);
router.post('/:courseId/inscribirse', verifyToken, enrollInCourse);
router.post('/:courseId/lecciones/:lessonId/completar', verifyToken, markLessonAsComplete);

// --- Instructor ---
router.post('/', verifyToken, isInstructor, upload.single('imagen'), createCourse);
router.put('/:id', verifyToken, isInstructor, upload.single('imagen'), updateCourse);

router.get('/instructor', verifyToken, isInstructor, getInstructorCourses);
router.get('/instructor/stats', verifyToken, isInstructor, getInstructorStats);
router.get('/instructor/liquidacion', verifyToken, isInstructor, getMyEarnings);
router.delete('/:id', verifyToken, isInstructor, deleteCourse);

// Gestión de Contenido
router.get('/:id/curriculum', verifyToken, getCourseCurriculum);
router.post('/:id/modules', verifyToken, isInstructor, addModule);
router.put('/modules/:id', verifyToken, isInstructor, updateModule);
router.delete('/modules/:id', verifyToken, isInstructor, deleteModule);
router.post('/modules/:moduleId/lessons', verifyToken, isInstructor, addLesson);
router.put('/lessons/:id', verifyToken, isInstructor, updateLesson);
router.delete('/lessons/:id', verifyToken, isInstructor, deleteLesson);

module.exports = router;