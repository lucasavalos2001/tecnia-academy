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
    tipo_contenido: {
        type: DataTypes.ENUM('video', 'texto', 'quiz'),
        defaultValue: 'video',
    },
    url_video: { // Aquí guardaremos el link de YouTube/Vimeo
        type: DataTypes.STRING,
        allowNull: true,
    },
    contenido_texto: { // Por si es una lección escrita
        type: DataTypes.TEXT,
        allowNull: true,
    },
    orden: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    }
    // moduleId se agrega automáticamente
}, {
    tableName: 'lessons',
});

module.exports = Lesson;