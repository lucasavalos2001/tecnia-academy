const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Lesson = sequelize.define('Lesson', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    titulo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    // video, texto, quiz (o mixto)
    tipo_contenido: {
        type: DataTypes.ENUM('video', 'quiz', 'mixto'), 
        defaultValue: 'video',
    },
    url_video: { 
        type: DataTypes.STRING,
        allowNull: true,
    },
    contenido_texto: { 
        type: DataTypes.TEXT,
        allowNull: true,
    },
    // ✅ NUEVO CAMPO: AQUÍ GUARDAMOS LAS PREGUNTAS
    // Estructura: [{ pregunta: "...", opciones: ["A", "B"], correcta: 0 }]
    contenido_quiz: {
        type: DataTypes.JSON, 
        allowNull: true,
    },
    orden: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    }
}, {
    tableName: 'lessons',
});

module.exports = Lesson;