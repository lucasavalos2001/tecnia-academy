const { sequelize } = require('../config/db');
const User = require('./User.js');
const Course = require('./Course.js');
const Module = require('./Module.js');
const Lesson = require('./Lesson.js');
const Enrollment = require('./Enrollment.js');
const Transaction = require('./Transaction.js');
const SystemSetting = require('./SystemSetting.js'); // 🟢 1. IMPORTAR NUEVO MODELO
const Payout = require('./Payout.js');
const ErrorLog = require('./ErrorLog.js');

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

// --- 🧾 Relaciones de Liquidaciones (historial de pagos a instructores) ---
Payout.belongsTo(User, { foreignKey: 'instructorId', as: 'instructor' });
User.hasMany(Payout, { foreignKey: 'instructorId' });

Payout.belongsTo(User, { foreignKey: 'pagado_por', as: 'pagadoPor' });

const syncDB = async () => {
    try {
        // 🛡️ La estructura de las tablas ya NO se ajusta sola en cada arranque
        // (antes: sequelize.sync({ alter: true })). Los cambios de estructura
        // ahora se hacen con migraciones controladas (ver backend/migrations/
        // y `npx sequelize-cli db:migrate`), para no arriesgar los datos reales
        // con un ajuste automático sin revisión.

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
module.exports = { sequelize, syncDB, User, Course, Module, Lesson, Enrollment, Transaction, SystemSetting, Payout, ErrorLog };