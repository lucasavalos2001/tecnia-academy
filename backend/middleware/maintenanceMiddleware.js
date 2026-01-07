const { SystemSetting } = require('../models');
const jwt = require('jsonwebtoken');

const maintenanceMiddleware = async (req, res, next) => {
    try {
        // 1. Consultar si el Mantenimiento está ACTIVO en la Base de Datos
        const setting = await SystemSetting.findOne({ where: { key: 'maintenance_mode' } });
        const isMaintenanceOn = setting && setting.value === 'true';

        // Si el mantenimiento está APAGADO, dejar pasar a todo el mundo
        if (!isMaintenanceOn) {
            return next();
        }

        // ============================================================
        // 🚨 MANTENIMIENTO ENCENDIDO - FILTRO DE SEGURIDAD
        // ============================================================

        // A. Permitir siempre el acceso al Login y a la ruta de desactivar mantenimiento
        // IMPORTANTE: Agregamos '/api/auth' para permitir validación de sesión
        if (req.path.includes('/login') || 
            req.path.includes('/auth') || 
            req.path.includes('/admin/maintenance')) {
            return next();
        }

        // B. Verificar si quien intenta entrar es ADMINISTRADOR (admin O superadmin)
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            try {
                // Verificamos el token manualmente aquí
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                
                // 🟢 CORRECCIÓN: Permitimos 'admin' Y 'superadmin'
                if (decoded.rol === 'admin' || decoded.rol === 'superadmin') {
                    return next(); 
                }
            } catch (err) {
                // Si el token está vencido o es inválido, se bloquea abajo
            }
        }

        // C. BLOQUEAR A TODOS LOS DEMÁS (Estudiantes, Instructores, Públicos)
        return res.status(503).json({ 
            message: "⚠️ El sistema está en mantenimiento programado. Volvemos en breve.",
            maintenance: true // Bandera para que el Frontend sepa mostrar la pantalla de espera
        });

    } catch (error) {
        console.error("Error en middleware de mantenimiento:", error);
        // Si falla la base de datos, dejamos pasar por seguridad para no tumbar el sitio accidentalmente
        next(); 
    }
};

module.exports = maintenanceMiddleware;