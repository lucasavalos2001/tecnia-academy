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
    
    // Duración en texto (Ej: "5h 30m")
    duracion: {
        type: DataTypes.STRING, 
        allowNull: true,       
        defaultValue: "0m",    
    },

    // 🟢 NUEVO CAMPO: NOMBRE PERSONALIZADO PARA EL CERTIFICADO
    // Si se deja vacío, usaremos el nombre de la cuenta del instructor.
    // Si se llena (ej: "Ing. Juan Pérez & Arq. Ana Gómez"), usaremos este.
    nombre_instructor_certificado: {
        type: DataTypes.STRING,
        allowNull: true,
    },

    // Estados para el flujo de aprobación
    estado: {
        type: DataTypes.ENUM('borrador', 'pendiente', 'publicado', 'rechazado'),
        defaultValue: 'borrador', 
    }
}, {
    tableName: 'courses', 
});

module.exports = Course;