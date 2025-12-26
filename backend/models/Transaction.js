const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

const Transaction = sequelize.define("Transaction", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    external_reference: { 
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    amount: {
        type: DataTypes.DECIMAL(10, 0), 
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('pending', 'paid', 'failed', 'cancelled'),
        defaultValue: 'pending'
    },
    payment_method: { 
        type: DataTypes.STRING,
        allowNull: true
    },
    ip_address: { 
        type: DataTypes.STRING,
        allowNull: true
    },
    // ✅ AGREGAMOS EXPLÍCITAMENTE LAS CLAVES FORÁNEAS
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    courseId: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: 'transactions', // Minúsculas para evitar problemas en Postgres
    timestamps: true
});

module.exports = Transaction;