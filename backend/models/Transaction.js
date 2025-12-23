const { sequelize } = require('../config/db'); // Importamos la conexión
const { DataTypes } = require('sequelize');   // Importamos los tipos de datos

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
    }
});

module.exports = Transaction;