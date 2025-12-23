const { sequelize } = require('../config/db');
const User = require('./User.js');
const Course = require('./Course.js');
const Module = require('./Module.js');
const Lesson = require('./Lesson.js');
const Enrollment = require('./Enrollment.js');
const Transaction = require('./Transaction.js'); // <--- 1. NUEVO: Importamos Transacción

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

// --- 💰 Relaciones de Transacciones (Pagopar/Pagos) --- <--- 2. NUEVO: Relaciones
// Una transacción la hace un usuario
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'usuario' });
User.hasMany(Transaction, { foreignKey: 'userId' });

// Una transacción paga por un curso
Transaction.belongsTo(Course, { foreignKey: 'courseId', as: 'curso' });
Course.hasMany(Transaction, { foreignKey: 'courseId' });


const syncDB = async () => {
    try {
        await sequelize.sync({ alter: true }); // Esto creará la tabla Transactions automáticamente
        console.log("✅ Base de Datos Sincronizada Completa (Incluyendo Pagos).");
    } catch (error) {
        console.error("❌ Error al sincronizar modelos:", error);
    }
}

// <--- 3. NUEVO: Agregamos Transaction al export
module.exports = { sequelize, syncDB, User, Course, Module, Lesson, Enrollment, Transaction };