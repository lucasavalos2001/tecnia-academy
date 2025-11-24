const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Course = sequelize.define('Course', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    titulo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    descripcion_larga: {
        type: DataTypes.TEXT, // TEXT permite descripciones muy largas
        allowNull: false,
    },
    categoria: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    precio: {
        type: DataTypes.DECIMAL(10, 2), // 10 dígitos, 2 decimales (ej: 120000.00)
        defaultValue: 0.00,
    },
    imagen_url: { 
        type: DataTypes.STRING,
        allowNull: true, // Puede estar vacío al principio
    },
    estado: {
        type: DataTypes.ENUM('borrador', 'publicado'),
        defaultValue: 'publicado',
    }
    // Nota: El campo 'instructorId' se creará automáticamente en el siguiente paso
}, {
    tableName: 'courses', // Así se llamará la tabla en Postgres
});

module.exports = Course;