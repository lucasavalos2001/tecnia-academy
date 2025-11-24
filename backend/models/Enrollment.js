const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Enrollment = sequelize.define('Enrollment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    // Guardaremos las IDs de las lecciones completadas como un Array de números
    // PostgreSQL soporta JSON nativo, lo cual es perfecto para esto.
    lecciones_completadas: {
        type: DataTypes.JSON, 
        defaultValue: [], // Empieza vacío []
    },
    progreso_porcentaje: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    fecha_inscripcion: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    }
    // userId y courseId se agregan automáticamente en las relaciones
}, {
    tableName: 'enrollments',
});

module.exports = Enrollment;