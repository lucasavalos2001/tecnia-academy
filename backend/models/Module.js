const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Module = sequelize.define('Module', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    titulo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    orden: {
        type: DataTypes.INTEGER,
        defaultValue: 0, // Para ordenar los módulos (1, 2, 3...)
    }
    // courseId se agrega automáticamente en las relaciones
}, {
    tableName: 'modules',
    timestamps: false, // No necesitamos fecha de creación para módulos
});

module.exports = Module;