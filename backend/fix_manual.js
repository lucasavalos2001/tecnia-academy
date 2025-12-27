require('dotenv').config();
const { sequelize, User, Course, Enrollment, Transaction } = require('./models');

const arreglarCurso = async () => {
    try {
        console.log("🔌 Conectando a Base de Datos...");
        await sequelize.authenticate();
        console.log("✅ Conexión establecida.");

        // --- CONFIGURACIÓN (Si tu usuario o curso tienen otros IDs, cámbialos aquí) ---
        const ID_USUARIO = 1;  // <--- TU ID DE USUARIO (ADMIN)
        const ID_CURSO = 1;    // <--- EL ID DEL CURSO QUE PAGASTE
        // ---------------------------------------------------------------------------

        // 1. Verificar si existen Usuario y Curso
        const user = await User.findByPk(ID_USUARIO);
        const course = await Course.findByPk(ID_CURSO);

        if (!user) throw new Error(`❌ El Usuario ID ${ID_USUARIO} no existe.`);
        if (!course) throw new Error(`❌ El Curso ID ${ID_CURSO} no existe.`);

        console.log(`👤 Usuario: ${user.nombre_completo}`);
        console.log(`📚 Curso: ${course.titulo}`);

        // 2. Verificar Transacción (Para tu tranquilidad de que el pago existe)
        console.log("🔎 Buscando transacciones de este usuario...");
        const transacciones = await Transaction.findAll({ 
            where: { userId: ID_USUARIO, courseId: ID_CURSO } 
        });

        if (transacciones.length > 0) {
            console.log(`💰 Encontré ${transacciones.length} intento(s) de pago en el historial.`);
            transacciones.forEach(t => {
                console.log(`   - ID: ${t.id} | Estado: ${t.status} | Ref: ${t.external_reference}`);
                // Forzar estado PAGADO si estaba pendiente
                if (t.status !== 'paid') {
                    t.update({ status: 'paid' });
                    console.log("     (Estado actualizado a PAID manualmente)");
                }
            });
        } else {
            console.warn("⚠️ No encontré el registro del pago en la tabla Transactions (pero igual te daré el curso).");
        }

        // 3. LA INSCRIPCIÓN (EL ARREGLO DEFINITIVO)
        console.log("🚀 Creando inscripción en la tabla Enrollments...");
        
        // Verificar si ya existe para no duplicar
        const existe = await Enrollment.findOne({ where: { userId: ID_USUARIO, courseId: ID_CURSO } });
        
        if (existe) {
            console.log("✅ El usuario YA figura inscrito en la base de datos.");
        } else {
            // AQUÍ ES DONDE PROBAMOS TU NUEVO MODELO ENROLLMENT.JS
            await Enrollment.create({
                userId: ID_USUARIO,
                courseId: ID_CURSO,
                progreso_porcentaje: 0,
                lecciones_completadas: [],
                fecha_inscripcion: new Date()
            });
            console.log("🎉 ¡INSCRIPCIÓN CREADA EXITOSAMENTE!");
        }

    } catch (error) {
        console.error("\n❌ ERROR CRÍTICO:", error.message);
        if (error.original) console.error("   Detalle SQL:", error.original.detail || error.original.sqlMessage);
    } finally {
        await sequelize.close();
    }
};

arreglarCurso();