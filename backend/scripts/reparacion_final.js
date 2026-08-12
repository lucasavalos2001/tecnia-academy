require('dotenv').config();
const { sequelize, Transaction, Enrollment } = require('../models');

const repararSistema = async () => {
    try {
        console.log("🔌 Conectando a Base de Datos...");
        await sequelize.authenticate();
        console.log("✅ Conexión establecida.");

        // PASO 1: REPARAR LA TABLA FALTANTE
        console.log("🛠️ Detecté que falta la tabla 'transactions'. Creándola ahora...");
        
        // force: true borraría la tabla si existiera y la crea de cero. 
        // Como no existe, simplemente la crea perfecta.
        await Transaction.sync({ force: true }); 
        console.log("✅ ¡Tabla 'transactions' creada exitosamente!");

        // PASO 2: INSCRIBIRTE A LA FUERZA
        console.log("🎁 Inscribiendo al Usuario 1 en el Curso 1...");

        // Usamos try/catch aquí por si ya lograste inscribirte antes y no duplicar
        try {
            await Enrollment.create({
                userId: 1,      // Tu ID de Usuario
                courseId: 1,    // El ID del Curso
                progreso_porcentaje: 0,
                lecciones_completadas: [],
                fecha_inscripcion: new Date()
            });
            console.log("🎉 ¡INSCRIPCIÓN COMPLETADA! Ve a 'Mis Cursos' ahora.");
        } catch (error) {
            console.log("ℹ️ Aviso de inscripción:", error.message); 
            // Si el error es "duplicate key", significa que YA estás inscrito.
            // Si es otro error, lo veremos.
        }

    } catch (error) {
        console.error("\n❌ Error durante la reparación:", error);
    } finally {
        await sequelize.close();
    }
};

repararSistema();