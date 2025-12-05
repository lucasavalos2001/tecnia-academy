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
        type: DataTypes.TEXT, 
        allowNull: false,
    },
    categoria: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    precio: {
        type: DataTypes.DECIMAL(10, 2), 
        defaultValue: 0.00,
    },
    imagen_url: { 
        type: DataTypes.STRING,
        allowNull: true, 
    },
    
    // 🟢 CORREGIDO: Cambiado de INTEGER a STRING
    // Esto es vital para que soporte formatos como "5h 30m" o "10:00"
    duracion: {
        type: DataTypes.STRING, 
        allowNull: true,        // Permitimos null para flexibilidad
        defaultValue: "0m",     // Valor por defecto en texto
    },

    // 🟢 Estados para el flujo de aprobación
    estado: {
        type: DataTypes.ENUM('borrador', 'pendiente', 'publicado', 'rechazado'),
        defaultValue: 'borrador', 
    }
    
    // Nota: 'instructorId' se crea automáticamente por la relación en index.js
}, {
    tableName: 'courses', 
});

module.exports = Course;