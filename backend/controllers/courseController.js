const { Op } = require('sequelize');
const { Course, Module, Lesson, User, Enrollment, Payout } = require('../models');
const { uploadToBunny } = require('../utils/bunny');
const { isValidPrice } = require('../utils/validators');
const { calcularLiquidacionInstructor } = require('../utils/liquidacion');

// ==========================================
// 🟢 FUNCIÓN AUXILIAR: RECALCULAR DURACIÓN TOTAL
// ==========================================
const recalculateCourseDuration = async (courseId) => {
    try {
        const curso = await Course.findByPk(courseId, {
            include: [{
                model: Module,
                as: 'modulos',
                include: [{ model: Lesson, as: 'lecciones' }]
            }]
        });

        if (!curso) return;

        let totalSeconds = 0;

        curso.modulos.forEach(mod => {
            if (mod.lecciones) {
                mod.lecciones.forEach(lec => {
                    if (lec.duracion && lec.duracion.includes(':')) {
                        const parts = lec.duracion.split(':').map(Number);
                        if (parts.length === 3) { 
                            totalSeconds += parts[0] * 3600 + parts[1] * 60 + parts[2];
                        } else if (parts.length === 2) { 
                            totalSeconds += parts[0] * 60 + parts[1];
                        }
                    }
                });
            }
        });

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        let durationString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        
        if (totalSeconds > 0) {
            await curso.update({ duracion: durationString });
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
        // 🟢 AHORA RECIBIMOS 'nombre_instructor_certificado'
        const { titulo, descripcion_larga, categoria, precio, duracion, nombre_instructor_certificado } = req.body;

        if (!titulo?.trim()) {
            return res.status(400).json({ message: "El curso necesita un título." });
        }
        if (!isValidPrice(precio)) {
            return res.status(400).json({ message: "El precio no es válido (debe ser 0 o un número positivo)." });
        }

        let imagen_url = null;

        if (req.file) {
            imagen_url = await uploadToBunny(req.file);
        } else {
            imagen_url = `https://placehold.co/600x400/00d4d4/ffffff?text=${categoria}`;
        }

        const nuevoCurso = await Course.create({
            titulo, descripcion_larga, categoria, precio, 
            duracion: duracion || "0h", 
            estado: 'borrador', 
            instructorId, 
            imagen_url,
            nombre_instructor_certificado // Guardamos el nombre personalizado
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
        // 🟢 AHORA RECIBIMOS 'nombre_instructor_certificado'
        const { titulo, descripcion_larga, categoria, precio, duracion, estado, nombre_instructor_certificado } = req.body;

        const curso = await Course.findOne({ where: { id, instructorId } });
        if (!curso) return res.status(404).json({ message: "Curso no encontrado" });

        if (precio !== undefined && !isValidPrice(precio)) {
            return res.status(400).json({ message: "El precio no es válido (debe ser 0 o un número positivo)." });
        }

        let nueva_imagen_url = curso.imagen_url;
        if (req.file) {
            nueva_imagen_url = await uploadToBunny(req.file);
        }

        const updateData = {
            titulo, descripcion_larga, categoria, precio,
            duracion, imagen_url: nueva_imagen_url,
            nombre_instructor_certificado // Actualizamos el nombre personalizado
        };

        if (estado && (estado === 'pendiente' || estado === 'borrador')) {
            updateData.estado = estado;
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
    } catch (error) { res.status(500).json({ message: "Error al obtener cursos" }); }
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
                id: curso.id, titulo: curso.titulo, alumnos: cantidadAlumnos, ingresos: ingresosCurso.toFixed(2)
            });
        });

        res.json({ totalCursos: cursos.length, totalEstudiantes, totalIngresos: totalIngresos.toFixed(2), desglose });
    } catch (error) { res.status(500).json({ message: "Error al obtener estadísticas" }); }
};

// 🟢 Liquidación real del instructor (neto, con la comisión ya descontada),
// para que no dependa de preguntarle al admin cuánto le toca cobrar.
const getMyEarnings = async (req, res) => {
    try {
        const currentDate = new Date();
        const mes = req.query.month ? parseInt(req.query.month) : currentDate.getMonth() + 1;
        const anio = req.query.year ? parseInt(req.query.year) : currentDate.getFullYear();

        const instructor = await User.findByPk(req.usuario.id, {
            attributes: ['id', 'tiene_factura']
        });
        if (!instructor) return res.status(404).json({ message: "Usuario no encontrado" });

        const liquidacion = await calcularLiquidacionInstructor({ instructor, mes, anio, Course, Enrollment, Payout });
        res.json(liquidacion);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al calcular tu liquidación" });
    }
};

const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const instructorId = req.usuario.id;

        const curso = await Course.findOne({ where: { id, instructorId } });
        if (!curso) return res.status(404).json({ message: "Curso no encontrado" });

        const alumnosInscritos = await Enrollment.count({ where: { courseId: id } });
        if (alumnosInscritos > 0) {
            return res.status(400).json({
                message: `No se puede eliminar: el curso tiene ${alumnosInscritos} alumno(s) inscrito(s). Solo un superadministrador puede forzar esta eliminación.`
            });
        }

        await curso.destroy();
        res.json({ message: "Curso eliminado con éxito" });
    } catch (error) { res.status(500).json({ message: "Error al eliminar" }); }
};

// ==========================================
//  GESTIÓN DE CONTENIDO (MÓDULOS Y LECCIONES)
// ==========================================

// 🛡️ [SEGURIDAD CRÍTICA] ESTE ES EL ENDPOINT QUE ENTREGA LOS VIDEOS
const getCourseCurriculum = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.usuario.id; // ID del usuario que hace la petición
        const userRole = req.usuario.rol;

        // 1. Buscar el curso y su contenido completo
        const curso = await Course.findByPk(id, {
            include: [{
                model: Module,
                as: 'modulos',
                include: [{ model: Lesson, as: 'lecciones' }]
            }],
            order: [['modulos', 'orden', 'ASC'], ['modulos', 'lecciones', 'orden', 'ASC']]
        });

        if (!curso) return res.status(404).json({ message: "Curso no encontrado" });

        // 2. [EL GUARDIA] Verificar permisos
        // A. ¿Es el Instructor dueño del curso? -> Pasa
        // B. ¿Es Administrador? -> Pasa
        const esInstructor = curso.instructorId === userId;
        const esAdmin = userRole === 'admin' || userRole === 'superadmin';

        if (esInstructor || esAdmin) {
            return res.json(curso);
        }

        // 3. [EL GUARDIA] Verificar Inscripción (Pago)
        // Si no es dueño ni admin, TIENE que estar inscrito.
        const inscripcion = await Enrollment.findOne({
            where: {
                userId: userId,
                courseId: id
            }
        });

        if (!inscripcion) {
            // ⛔ ALTO AHÍ: No pagó. Devolvemos error 403 (Prohibido)
            return res.status(403).json({ message: "Acceso denegado. Debes inscribirte para ver el contenido." });
        }

        // 4. Si hay inscripción, pase usted.
        res.json(curso);

    } catch (error) {
        console.error(error);
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

const addLesson = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { titulo, url_video, contenido_texto, contenido_quiz, duracion, enlace_recurso } = req.body;
        
        const nuevaLeccion = await Lesson.create({ 
            titulo, 
            url_video, 
            contenido_texto, 
            contenido_quiz, 
            duracion, 
            enlace_recurso, 
            moduleId 
        });

        const modulo = await Module.findByPk(moduleId);
        if (modulo) await recalculateCourseDuration(modulo.courseId);

        res.status(201).json(nuevaLeccion);
    } catch (error) { 
        console.error(error);
        res.status(500).json({ message: "Error al crear lección" }); 
    }
};

const deleteLesson = async (req, res) => {
    try {
        const { id } = req.params;
        const leccion = await Lesson.findByPk(id, { include: [{ model: Module, as: 'modulo' }] });
        
        if (leccion) {
            const courseId = leccion.modulo.courseId;
            await Lesson.destroy({ where: { id } });
            await recalculateCourseDuration(courseId);
            return res.json({ message: "Lección eliminada" });
        }
        res.status(404).json({ message: "Lección no encontrada" });
    } catch (error) { res.status(500).json({ message: "Error al eliminar lección" }); }
};

const updateLesson = async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, url_video, contenido_texto, contenido_quiz, duracion, enlace_recurso } = req.body;
        
        const leccion = await Lesson.findByPk(id, { include: [{ model: Module, as: 'modulo' }] });
        if (!leccion) return res.status(404).json({ message: "Lección no encontrada" });

        await leccion.update({ 
            titulo, 
            url_video, 
            contenido_texto, 
            contenido_quiz, 
            duracion,
            enlace_recurso 
        });
        
        if (leccion.modulo) await recalculateCourseDuration(leccion.modulo.courseId);

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
    } catch (error) { res.status(500).json({ message: "Error al obtener cursos" }); }
};

// 🛡️ [SEGURIDAD] PÁGINA DE VENTAS PÚBLICA (SIN VIDEOS)
const getCourseDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const curso = await Course.findByPk(id, {
            include: [
                { model: User, as: 'instructor', attributes: ['nombre_completo', 'biografia', 'foto_perfil'] },
                { 
                    model: Module, 
                    as: 'modulos', 
                    include: [{ 
                        model: Lesson, 
                        as: 'lecciones',
                        attributes: ['id', 'titulo', 'duracion', 'orden', 'contenido_texto'] 
                    }] 
                }
            ],
            order: [['modulos', 'orden', 'ASC'], ['modulos', 'lecciones', 'orden', 'ASC']]
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

        const curso = await Course.findByPk(courseId);
        if (!curso) return res.status(404).json({ message: "Curso no encontrado" });

        // Esta ruta es solo para inscripción directa a cursos GRATUITOS.
        // Los cursos pagos deben pasar por /pagos/iniciar (Pagopar).
        if (parseFloat(curso.precio) > 0) {
            return res.status(400).json({ message: "Este curso es pago. Iniciá el pago desde la página del curso." });
        }

        const existe = await Enrollment.findOne({ where: { userId, courseId } });
        if (existe) return res.status(400).json({ message: "Ya estás inscrito." });
        await Enrollment.create({ userId, courseId });
        res.status(201).json({ message: "Inscripción exitosa" });
    } catch (error) { res.status(500).json({ message: "Error al inscribirse" }); }
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
    } catch (error) { res.status(500).json({ message: "Error al obtener mis cursos" }); }
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
    } catch (error) { res.status(500).json({ message: "Error al actualizar progreso" }); }
};

module.exports = {
    createCourse, getInstructorCourses, getInstructorStats, getMyEarnings, updateCourse, deleteCourse,
    getCourseCurriculum, addModule, deleteModule, updateModule, addLesson, deleteLesson, updateLesson,
    getAllCourses, getCourseDetail, enrollInCourse, getMyCourses, markLessonAsComplete
};