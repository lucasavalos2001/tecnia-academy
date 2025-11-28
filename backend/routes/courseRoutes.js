const express = require('express');
const router = express.Router();
const multer = require('multer'); // Necesario para recibir archivos
const { 
    createCourse, getInstructorCourses, updateCourse, deleteCourse,
    getCourseCurriculum, addModule, deleteModule, updateModule, addLesson, deleteLesson, updateLesson,
    getAllCourses, getCourseDetail, enrollInCourse, getMyCourses, markLessonAsComplete,
    getInstructorStats
} = require('../controllers/courseController');
const { verifyToken } = require('../middleware/authMiddleware');

// --- CONFIGURACIÓN DE MULTER ---
// Guardamos la imagen en memoria RAM temporalmente antes de enviarla a Bunny
const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
//  RUTAS PÚBLICAS
// ==========================================
router.get('/', getAllCourses);
router.get('/:id/detalle', getCourseDetail);

// ==========================================
//  RUTAS PROTEGIDAS
// ==========================================

// --- Estudiante ---
router.get('/mis-cursos', verifyToken, getMyCourses);
router.post('/:courseId/inscribirse', verifyToken, enrollInCourse);
router.post('/:courseId/lecciones/:lessonId/completar', verifyToken, markLessonAsComplete);

// --- Instructor ---
// ✅ AQUÍ ESTÁ EL CAMBIO: Agregamos 'upload.single' para recibir la imagen
router.post('/', verifyToken, upload.single('imagen'), createCourse);
router.put('/:id', verifyToken, upload.single('imagen'), updateCourse); // También para editar

router.get('/instructor', verifyToken, getInstructorCourses);
router.get('/instructor/stats', verifyToken, getInstructorStats);
router.delete('/:id', verifyToken, deleteCourse);

// Gestión de Contenido
router.get('/:id/curriculum', verifyToken, getCourseCurriculum);
router.post('/:id/modules', verifyToken, addModule);
router.put('/modules/:id', verifyToken, updateModule);
router.delete('/modules/:id', verifyToken, deleteModule);
router.post('/modules/:moduleId/lessons', verifyToken, addLesson);
router.put('/lessons/:id', verifyToken, updateLesson);
router.delete('/lessons/:id', verifyToken, deleteLesson);

module.exports = router;
