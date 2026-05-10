const { SystemSetting } = require('../models');
const jwt = require('jsonwebtoken');

const maintenanceMiddleware = async (req, res, next) => {
    try {
        // 1. Consultar estado del mantenimiento en la DB
        const setting = await SystemSetting.findOne({ where: { key: 'maintenance_mode' } });
        const isMaintenanceOn = setting && setting.value === 'true';

        // Si está apagado, dejar pasar a todo el mundo sin más vueltas
        if (!isMaintenanceOn) {
            return next();
        }

        // ============================================================
        // 🚨 MANTENIMIENTO ENCENDIDO - EXCEPCIONES CRÍTICAS
        // ============================================================

        // A. Permitir acceso a Login, Auth, Admin y WEBHOOK DE PAGOPAR
        if (
            req.path.includes('/login') || 
            req.path.includes('/auth') || 
            req.path.includes('/admin/maintenance') ||
            req.path.includes('/pagos/confirmar') // 👈 Vital para inscripciones automáticas
        ) {
            return next();
        }

        // B. Verificar si es ADMINISTRADOR para darle "llave maestra"
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            const parts = authHeader.split(' ');
            if (parts.length === 2) {
                const token = parts[1];
                try {
                    // Verificamos el token con el secreto del servidor
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    
                    if (decoded.rol === 'admin' || decoded.rol === 'superadmin') {
                        return next(); 
                    }
                } catch (err) {
                    // Log detallado para que veas el error real en tu consola de DigitalOcean
                    console.error("🚨 [Mantenimiento] Fallo de token:", err.name, "-", err.message);
                }
            }
        }

        // C. BLOQUEAR RESTO (Estudiantes e Instructores)
        return res.status(503).json({ 
            message: "⚠️ El sistema está en mantenimiento programado. Volvemos en breve.",
            maintenance: true 
        });

    } catch (error) {
        console.error("❌ Error crítico en maintenanceMiddleware:", error);
        next(); // Dejamos pasar si hay error de DB para evitar caída total
    }
};

module.exports = maintenanceMiddleware;