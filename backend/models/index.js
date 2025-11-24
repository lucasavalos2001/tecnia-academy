const { sequelize } = require('../config/db');
const User = require('./User.js');
const Course = require('./Course.js');
const Module = require('./Module.js');
const Lesson = require('./Lesson.js');
const Enrollment = require('./Enrollment.js'); // <--- Nuevo

// --- Relaciones de Instructor (Creación) ---
User.hasMany(Course, { foreignKey: 'instructorId', as: 'cursos_creados' });
Course.belongsTo(User, { foreignKey: 'instructorId', as: 'instructor' });

// --- Relaciones de Contenido ---
Course.hasMany(Module, { foreignKey: 'courseId', as: 'modulos', onDelete: 'CASCADE' });
Module.belongsTo(Course, { foreignKey: 'courseId', as: 'curso' });

Module.hasMany(Lesson, { foreignKey: 'moduleId', as: 'lecciones', onDelete: 'CASCADE' });
Lesson.belongsTo(Module, { foreignKey: 'moduleId', as: 'modulo' });

// --- Relaciones de Estudiante (Inscripción/Muchos a Muchos) ---
User.hasMany(Enrollment, { foreignKey: 'userId' });
Enrollment.belongsTo(User, { foreignKey: 'userId' });

Course.hasMany(Enrollment, { foreignKey: 'courseId' });
Enrollment.belongsTo(Course, { foreignKey: 'courseId', as: 'curso' });

const syncDB = async () => {
    try {
        await sequelize.sync({ alter: true }); // Actualiza la BD con la nueva tabla
        console.log("✅ Base de Datos Sincronizada Completa.");
    } catch (error) {
        console.error("❌ Error al sincronizar modelos:", error);
    }
}

module.exports = { sequelize, syncDB, User, Course, Module, Lesson, Enrollment };