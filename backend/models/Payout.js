const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Registro histórico de liquidaciones ya pagadas a instructores.
// Un instructor solo puede tener un registro por (mes, año) — ver migración
// create-payouts (constraint único), así se evita pagarle dos veces el mismo período.
const Payout = sequelize.define('Payout', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    mes: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    anio: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    monto_bruto: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    monto_pagado: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    porcentaje_comision: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
    },
}, {
    tableName: 'payouts',
});

module.exports = Payout;
