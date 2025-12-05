const { Op } = require('sequelize'); 
const { Course, Module, Lesson, User, Enrollment } = require('../models');
const axios = require('axios');

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
// 🟢 FUNCIÓN AUXILIAR: RECALCULAR DURACIÓN TOTAL
// ==========================================
const recalculateCourseDuration = async (courseId) => {
    try {
        // 1. Obtener todas las lecciones del curso
        const curso = await Course.findByPk(courseId, {
            include: [{
                model: Module,
                as: 'modulos',
                include: [{ model: Lesson, as: 'lecciones' }]
            }]
        });

        if (!curso) return;

        let totalSeconds = 0;

        // 2. Recorrer módulos y lecciones para sumar segundos
        curso.modulos.forEach(mod => {
            if (mod.lecciones) {
                mod.lecciones.forEach(lec => {
                    // Solo sumamos si tiene una duración válida con formato "MM:SS" o "HH:MM:SS"
                    if (lec.duracion && lec.duracion.includes(':')) {
                        const parts = lec.duracion.split(':').map(Number);
                        
                        if (parts.length === 3) { // HH:MM:SS
                            totalSeconds += parts[0] * 3600 + parts[1] * 60 + parts[2];
                        } else if (parts.length === 2) { // MM:SS
                            totalSeconds += parts[0] * 60 + parts[1];
                        }
                    }
                });
            }
        });

        // 3. Convertir a formato legible (Ej: "10h 30m" o "45m")
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        let durationString = "";
        if (hours > 0) {
            durationString = `${hours}h ${minutes}m`;
        } else {
            durationString = `${minutes}m`;
        }
        
        // Si no hay videos aún, no sobrescribimos con "0m" para respetar la estimación manual del instructor,
        // a menos que totalSeconds sea mayor a 0.
        if (totalSeconds > 0) {
            await curso.update({ duracion: durationString });
            console.log(`Duración del curso ${curso.id} recalculada a: ${durationString}`);
        }

    } catch (error) {
        console.error("Error recalculando duración:", error);
    }
};

// ==========================================
//  ÁREA DEL INSTRUCTOR (GESTIÓN DE CURSOS)
// ==========================================

const createCourse = async (req, res) => {
    try {
        const instructorId = req.usuario.id;
        const { titulo, descripcion_larga, categoria, precio, duracion } = req.body;
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
            duracion: duracion || "0h", // Aquí guarda la estimación inicial
            estado: 'borrador', 
            instructorId, 
            imagen_url
        });

        res.status(201).json({ message: 'Curso creado (Borrador)', curso: nuevoCurso });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al crear el curso" });
    }
};

const updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const instructorId = req.usuario.id;
        const { titulo, descripcion_larga, categoria, precio, duracion, estado } = req.body;

        const curso = await Course.findOne({ where: { id, instructorId } });
        if (!curso) return res.status(404).json({ message: "Curso no encontrado" });

        let nueva_imagen_url = curso.imagen_url;
        if (req.file) {
            nueva_imagen_url = await uploadToBunny(req.file);
        }

        const updateData = {
            titulo, 
            descripcion_larga, 
            categoria, 
            precio,
            duracion, // Permite corrección manual si el instructor quiere
            imagen_url: nueva_imagen_url 
        };

        if (estado) {
            if (estado === 'pendiente' || estado === 'borrador') {
                updateData.estado = estado;
            }
        }

        await curso.update(updateData);

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
        const modulo = await Module.findByPk(id);
        if (modulo) {
            const courseId = modulo.courseId;
            await Module.destroy({ where: { id } });
            // Recalcular horas tras borrar módulo
            await recalculateCourseDuration(courseId);
        }
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

// 🟢 FUNCIÓN ACTUALIZADA: RECALCULA HORAS
const addLesson = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { titulo, url_video, contenido_texto, contenido_quiz, duracion } = req.body;
        
        const nuevaLeccion = await Lesson.create({ 
            titulo, 
            url_video, 
            contenido_texto, 
            contenido_quiz, 
            duracion, 
            moduleId 
        });

        // RECALCULAR CURSO
        const modulo = await Module.findByPk(moduleId);
        if (modulo) {
            await recalculateCourseDuration(modulo.courseId);
        }

        res.status(201).json(nuevaLeccion);
    } catch (error) { 
        console.error(error);
        res.status(500).json({ message: "Error al crear lección" }); 
    }
};

// 🟢 FUNCIÓN ACTUALIZADA: RECALCULA HORAS
const deleteLesson = async (req, res) => {
    try {
        const { id } = req.params;
        const leccion = await Lesson.findByPk(id, { include: [{ model: Module, as: 'modulo' }] });
        
        if (leccion) {
            const courseId = leccion.modulo.courseId;
            await Lesson.destroy({ where: { id } });
            
            // RECALCULAR CURSO
            await recalculateCourseDuration(courseId);
            return res.json({ message: "Lección eliminada" });
        }
        res.status(404).json({ message: "Lección no encontrada" });
    } catch (error) { res.status(500).json({ message: "Error al eliminar lección" }); }
};

// 🟢 FUNCIÓN ACTUALIZADA: RECALCULA HORAS
const updateLesson = async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, url_video, contenido_texto, contenido_quiz, duracion } = req.body;
        
        const leccion = await Lesson.findByPk(id, { include: [{ model: Module, as: 'modulo' }] });
        if (!leccion) return res.status(404).json({ message: "Lección no encontrada" });

        await leccion.update({ 
            titulo, 
            url_video, 
            contenido_texto, 
            contenido_quiz,
            duracion 
        });
        
        // RECALCULAR CURSO
        if (leccion.modulo) {
            await recalculateCourseDuration(leccion.modulo.courseId);
        }

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

// ==========================================
//  ÁREA DEL ADMINISTRADOR (APROBACIÓN)
// ==========================================

const getPendingCourses = async (req, res) => {
    try {
        const cursosPendientes = await Course.findAll({
            where: { estado: 'pendiente' },
            include: [{ model: User, as: 'instructor', attributes: ['nombre_completo', 'email'] }],
            order: [['updatedAt', 'ASC']] 
        });
        res.json(cursosPendientes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al obtener pendientes" });
    }
};

const reviewCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { decision } = req.body; 

        const curso = await Course.findByPk(id);
        if (!curso) return res.status(404).json({ message: "Curso no encontrado" });

        if (decision === 'aprobar') {
            curso.estado = 'publicado';
            await curso.save();
            return res.json({ message: `Curso '${curso.titulo}' publicado exitosamente.` });
        } 
        
        if (decision === 'rechazado') {
            curso.estado = 'rechazado';
            await curso.save();
            return res.json({ message: "Curso rechazado. Se devolvió al instructor." });
        }

        return res.status(400).json({ message: "Decisión inválida" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al procesar revisión" });
    }
};

module.exports = { 
    createCourse, getInstructorCourses, getInstructorStats, updateCourse, deleteCourse, 
    getCourseCurriculum, addModule, deleteModule, updateModule, addLesson, deleteLesson, updateLesson,
    getAllCourses, getCourseDetail, enrollInCourse, getMyCourses, markLessonAsComplete,
    getPendingCourses, reviewCourse
};