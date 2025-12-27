const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Enrollment = sequelize.define('Enrollment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    // 👇 ESTO ES LO QUE FALTABA PARA QUE FUNCIONE EL PAGO
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    courseId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    // 👆 FIN DE LO AGREGADO
    lecciones_completadas: {
        type: DataTypes.JSON, 
        defaultValue: [], 
    },
    progreso_porcentaje: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    fecha_inscripcion: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    }
}, {
    tableName: 'enrollments',
});

module.exports = Enrollment;