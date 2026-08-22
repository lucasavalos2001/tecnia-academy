const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Registro de errores importantes del servidor (ej: fallas de pago), para que
// queden visibles en el panel de admin en vez de perderse en la consola.
const ErrorLog = sequelize.define('ErrorLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    origen: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    mensaje: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    detalle: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    resuelto: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
}, {
    tableName: 'error_logs',
});

module.exports = ErrorLog;
