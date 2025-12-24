const { sequelize } = require('../config/db');
const User = require('./User.js');
const Course = require('./Course.js');
const Module = require('./Module.js');
const Lesson = require('./Lesson.js');
const Enrollment = require('./Enrollment.js');
const Transaction = require('./Transaction.js');

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

// --- 💰 Relaciones de Transacciones (Pagopar/Pagos) ---
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'usuario' });
User.hasMany(Transaction, { foreignKey: 'userId' });

Transaction.belongsTo(Course, { foreignKey: 'courseId', as: 'curso' });
Course.hasMany(Transaction, { foreignKey: 'courseId' });

const syncDB = async () => {
    try {
        // ⚠️ CAMBIO CRÍTICO PARA EL SERVIDOR ⚠️
        // Usamos force: true UNA VEZ para limpiar los datos corruptos (usuario 4 no encontrado).
        // Esto borrará las tablas y las creará de cero, arreglando el error de arranque.
        await sequelize.sync({ alter: true }); 
        console.log("✅ Base de Datos Sincronizada (RESET COMPLETO - LIMPIEZA).");
    } catch (error) {
        console.error("❌ Error al sincronizar modelos:", error);
    }
}

module.exports = { sequelize, syncDB, User, Course, Module, Lesson, Enrollment, Transaction };