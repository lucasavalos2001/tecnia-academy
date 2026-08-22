const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Reseña y calificación (1 a 5) que un alumno deja en un curso al que está inscrito.
const Review = sequelize.define('Review', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    calificacion: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 5 },
    },
    comentario: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'reviews',
    indexes: [
        { unique: true, fields: ['userId', 'courseId'] }
    ]
});

module.exports = Review;
