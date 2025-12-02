const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nombre_completo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    contraseña_hash: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    rol: {
        type: DataTypes.ENUM('student', 'instructor', 'admin', 'superadmin'),
        defaultValue: 'student',
    },
    biografia: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    email_contacto: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    foto_perfil: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    // ✅ NUEVOS CAMPOS PARA RECUPERACIÓN
    resetPasswordToken: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    resetPasswordExpires: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    fecha_registro: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    }
}, {
    tableName: 'users',
    timestamps: false,
});

module.exports = User;