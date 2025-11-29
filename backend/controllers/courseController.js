const { Op } = require('sequelize'); 
const { Course, Module, Lesson, User, Enrollment } = require('../models');
const axios = require('axios'); // Necesario para subir imágenes a Bunny

// --- FUNCIÓN AUXILIAR: SUBIR IMAGEN A BUNNY STORAGE ---
const uploadToBunny = async (file) => {
    try {
        const STORAGE_NAME = process.env.BUNNY_STORAGE_NAME;
        const ACCESS_KEY = process.env.BUNNY_STORAGE_PASSWORD;
        const PULL_ZONE = process.env.BUNNY_PULL_ZONE; 
        const REGION = process.env.BUNNY_STORAGE_REGION ? `${process.env.BUNNY_STORAGE_REGION}.` : ''; 

        const filename = `${Date.now()}_${file.originalname.replace(/\s+/g, '-')}`;
        const bunnyUrl = `https://${REGION}storage.bunnycdn.com/${STORAGE_NAME}/${filename}`;

        await axios.put(bunnyUrl, file.buffer, {
            headers: { 
                AccessKey: ACCESS_KEY,
                'Content-Type': file.mimetype 
            }
        });

        return `${PULL_ZONE}/${filename}`;

    } catch (error) {
        console.error("Error interno subiendo a Bunny:", error.message);
        throw new Error("Falló la subida de imagen");
    }
};

// ==========================================
//  ÁREA DEL INSTRUCTOR (GESTIÓN DE CURSOS)
// ==========================================

const createCourse = async (req, res) => {
    try {
        const instructorId = req.usuario.id;
        const { titulo, descripcion_larga, categoria, precio } = req.body;
        let imagen_url = null;

        if (req.file) {
            imagen_url = await uploadToBunny(req.file);
        } else {
            imagen_url = `https://placehold.co/600x400/00d4d4/ffffff?text=${categoria}`;
        }

        const nuevoCurso = await Course.create({
            titulo, 
            descripcion_larga, 
            categoria, 
            precio, 
            instructorId, 
            imagen_url
        });

        res.status(201).json({ message: 'Curso creado con éxito', curso: nuevoCurso });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al crear el curso" });
    }
};

const updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const instructorId = req.usuario.id;
        const { titulo, descripcion_larga, categoria, precio } = req.body;

        const curso = await Course.findOne({ where: { id, instructorId } });
        if (!curso) return res.status(404).json({ message: "Curso no encontrado" });

        let nueva_imagen_url = curso.imagen_url;
        if (req.file) {
            nueva_imagen_url = await uploadToBunny(req.file);
        }

        await curso.update({ 
            titulo, 
            descripcion_larga, 
            categoria, 
            precio, 
            imagen_url: nueva_imagen_url 
        });

        res.json({ message: "Curso actualizado", curso });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al actualizar" });
    }
};

const getInstructorCourses = async (req, res) => {
    try {
        const instructorId = req.usuario.id;
        const cursos = await Course.findAll({ where: { instructorId } });
        res.json({ cursos });
    } catch (error) {
        res.status(500).json({ message: "Error al obtener cursos" });
    }
};

const getInstructorStats = async (req, res) => {
    try {
        const instructorId = req.usuario.id;
        const cursos = await Course.findAll({
            where: { instructorId },
            include: [{ model: Enrollment }]
        });

        let totalEstudiantes = 0;
        let totalIngresos = 0;
        const desglose = [];

        cursos.forEach(curso => {
            const cantidadAlumnos = curso.Enrollments ? curso.Enrollments.length : 0;
            const ingresosCurso = cantidadAlumnos * parseFloat(curso.precio || 0);
            totalEstudiantes += cantidadAlumnos;
            totalIngresos += ingresosCurso;

            desglose.push({
                id: curso.id,
                titulo: curso.titulo,
                alumnos: cantidadAlumnos,
                ingresos: ingresosCurso.toFixed(2)
            });
        });

        res.json({ totalCursos: cursos.length, totalEstudiantes, totalIngresos: totalIngresos.toFixed(2), desglose });
    } catch (error) {
        res.status(500).json({ message: "Error al obtener estadísticas" });
    }
};

const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const instructorId = req.usuario.id;
        const resultado = await Course.destroy({ where: { id, instructorId } });
        if (!resultado) return res.status(404).json({ message: "Curso no encontrado" });
        res.json({ message: "Curso eliminado con éxito" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar" });
    }
};

// ==========================================
//  GESTIÓN DE CONTENIDO (MÓDULOS Y LECCIONES)
// ==========================================

const getCourseCurriculum = async (req, res) => {
    try {
        const { id } = req.params;
        const curso = await Course.findByPk(id, {
            include: [{
                model: Module,
                as: 'modulos',
                include: [{ model: Lesson, as: 'lecciones' }]
            }],
            order: [['modulos', 'orden', 'ASC'], ['modulos', 'lecciones', 'orden', 'ASC']]
        });
        if (!curso) return res.status(404).json({ message: "Curso no encontrado" });
        res.json(curso);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener temario" });
    }
};

const addModule = async (req, res) => {
    try {
        const { id } = req.params; 
        const { titulo } = req.body;
        const nuevoModulo = await Module.create({ titulo, courseId: id });
        res.status(201).json(nuevoModulo);
    } catch (error) { res.status(500).json({ message: "Error al crear módulo" }); }
};

const deleteModule = async (req, res) => {
    try {
        const { id } = req.params;
        await Module.destroy({ where: { id } });
        res.json({ message: "Módulo eliminado" });
    } catch (error) { res.status(500).json({ message: "Error al eliminar módulo" }); }
};

const updateModule = async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo } = req.body;
        await Module.update({ titulo }, { where: { id } });
        res.json({ message: "Módulo actualizado" });
    } catch (error) { res.status(500).json({ message: "Error al actualizar módulo" }); }
};

// ✅ [ACTUALIZADO] Función addLesson con soporte para Quizzes
const addLesson = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { titulo, url_video, contenido_texto, contenido_quiz } = req.body;
        
        const nuevaLeccion = await Lesson.create({ 
            titulo, 
            url_video, 
            contenido_texto, 
            contenido_quiz, // Guardamos el quiz
            moduleId 
        });
        res.status(201).json(nuevaLeccion);
    } catch (error) { 
        console.error(error);
        res.status(500).json({ message: "Error al crear lección" }); 
    }
};

const deleteLesson = async (req, res) => {
    try {
        const { id } = req.params;
        await Lesson.destroy({ where: { id } });
        res.json({ message: "Lección eliminada" });
    } catch (error) { res.status(500).json({ message: "Error al eliminar lección" }); }
};

// ✅ [ACTUALIZADO] Función updateLesson con soporte para Quizzes
const updateLesson = async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, url_video, contenido_texto, contenido_quiz } = req.body;
        
        await Lesson.update({ 
            titulo, 
            url_video, 
            contenido_texto, 
            contenido_quiz // Actualizamos el quiz
        }, { where: { id } });
        
        res.json({ message: "Lección actualizada" });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ message: "Error al actualizar lección" }); 
    }
};

// ==========================================
//  ÁREA DEL ESTUDIANTE
// ==========================================

const getAllCourses = async (req, res) => {
    try {
        const { search } = req.query;
        let whereCondition = { estado: 'publicado' };

        if (search) {
            whereCondition = {
                ...whereCondition,
                [Op.or]: [
                    { titulo: { [Op.iLike]: `%${search}%` } },
                    { categoria: { [Op.iLike]: `%${search}%` } },
                    { descripcion_larga: { [Op.iLike]: `%${search}%` } }
                ]
            };
        }

        const cursos = await Course.findAll({
            where: whereCondition,
            include: [{ model: User, as: 'instructor', attributes: ['nombre_completo'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json({ cursos });
    } catch (error) {
        res.status(500).json({ message: "Error al obtener cursos" });
    }
};

const getCourseDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const curso = await Course.findByPk(id, {
            include: [
                { model: User, as: 'instructor', attributes: ['nombre_completo', 'biografia', 'foto_perfil'] },
                { model: Module, as: 'modulos', include: ['lecciones'] }
            ]
        });
        if (!curso) return res.status(404).json({ message: "Curso no encontrado" });
        res.json(curso);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener detalle" });
    }
};

const enrollInCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.usuario.id;
        const existe = await Enrollment.findOne({ where: { userId, courseId } });
        if (existe) return res.status(400).json({ message: "Ya estás inscrito." });
        await Enrollment.create({ userId, courseId });
        res.status(201).json({ message: "Inscripción exitosa" });
    } catch (error) {
        res.status(500).json({ message: "Error al inscribirse" });
    }
};

const getMyCourses = async (req, res) => {
    try {
        const userId = req.usuario.id;
        const inscripciones = await Enrollment.findAll({
            where: { userId },
            include: [{ 
                model: Course, as: 'curso',
                include: [{ model: User, as: 'instructor', attributes: ['nombre_completo'] }]
            }]
        });
        res.json({ cursos: inscripciones });
    } catch (error) {
        res.status(500).json({ message: "Error al obtener mis cursos" });
    }
};

const markLessonAsComplete = async (req, res) => {
    try {
        const { courseId, lessonId } = req.params;
        const userId = req.usuario.id;

        const inscripcion = await Enrollment.findOne({ where: { userId, courseId } });
        if (!inscripcion) return res.status(404).json({ message: "No inscrito" });

        let lecciones = inscripcion.lecciones_completadas || [];
        const lessonIdInt = parseInt(lessonId);

        if (!lecciones.includes(lessonIdInt)) {
            lecciones.push(lessonIdInt);
            const totalLecciones = await Lesson.count({ include: [{ model: Module, as: 'modulo', where: { courseId } }] });
            const nuevoProgreso = totalLecciones > 0 ? Math.round((lecciones.length / totalLecciones) * 100) : 0;

            await Enrollment.update(
                { lecciones_completadas: lecciones, progreso_porcentaje: nuevoProgreso },
                { where: { id: inscripcion.id } }
            );
            return res.json({ message: "Progreso actualizado", progreso: nuevoProgreso, lecciones_completadas: lecciones });
        }
        res.json({ message: "Lección ya completada" });
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar progreso" });
    }
};

module.exports = { 
    createCourse, getInstructorCourses, getInstructorStats, updateCourse, deleteCourse, 
    getCourseCurriculum, addModule, deleteModule, updateModule, addLesson, deleteLesson, updateLesson,
    getAllCourses, getCourseDetail, enrollInCourse, getMyCourses, markLessonAsComplete
};