const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Cursos que un alumno guardó para decidir más adelante.
const Wishlist = sequelize.define('Wishlist', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
}, {
    tableName: 'wishlists',
    indexes: [
        { unique: true, fields: ['userId', 'courseId'] }
    ]
});

module.exports = Wishlist;
