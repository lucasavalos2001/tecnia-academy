const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SystemSetting = sequelize.define('SystemSetting', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    key: { // Ej: 'maintenance_mode'
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    value: { // Ej: 'true' o 'false'
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'system_settings',
    timestamps: false,
});

module.exports = SystemSetting;