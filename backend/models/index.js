const { sequelize } = require('../config/db');
const User = require('./User.js');
const Course = require('./Course.js');
const Module = require('./Module.js');
const Lesson = require('./Lesson.js');
const Enrollment = require('./Enrollment.js');
const Transaction = require('./Transaction.js');
const SystemSetting = require('./SystemSetting.js'); // 🟢 1. IMPORTAR NUEVO MODELO

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
        // 🛡️ MODO PRODUCCIÓN SEGURO: alter: true
        await sequelize.sync({ alter: true }); 
        console.log("✅ Base de Datos Sincronizada (DATOS SEGUROS - NO SE BORRÓ NADA).");

        // 🟢 2. INICIALIZAR MODO MANTENIMIENTO
        // Verificamos si ya existe la configuración, si no, la creamos apagada ('false')
        const maintenance = await SystemSetting.findOne({ where: { key: 'maintenance_mode' } });
        if (!maintenance) {
            await SystemSetting.create({
                key: 'maintenance_mode',
                value: 'false', // Por defecto el sitio está ABIERTO
                description: 'Controla el acceso al sitio (true=mantenimiento, false=activo)'
            });
            console.log("⚙️ Configuración de sistema inicializada: Mantenimiento OFF");
        }

    } catch (error) {
        console.error("❌ Error al sincronizar modelos:", error);
    }
}

// 🟢 3. EXPORTAR SystemSetting
module.exports = { sequelize, syncDB, User, Course, Module, Lesson, Enrollment, Transaction, SystemSetting };