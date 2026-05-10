const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    // 1. Verificación de existencia del Header
    if (!authHeader) {
        return res.status(403).json({ message: "Acceso denegado, se requiere token" });
    }

    // 2. Extraer el token (Soporta: "Bearer <token>" o solo "<token>")
    const parts = authHeader.split(' ');
    const token = parts.length === 2 ? parts[1] : parts[0];

    // 3. Verificación del JWT
    jwt.verify(token, process.env.JWT_SECRET, (err, authData) => {
        if (err) {
            // Log clave para debuguear en DigitalOcean: nos dirá si es 'invalid signature' o 'jwt expired'
            console.error("🚨 [Auth] Error de validación:", err.name, "|", err.message);
            
            return res.status(403).json({ 
                message: "Token inválido o expirado",
                error_detail: err.name // Esto ayuda al frontend a saber si debe forzar un logout
            });
        }
        
        // 4. Verificación de integridad del Payload
        if (!authData || !authData.id) {
            console.error("⚠️ [Auth] El token decodificado no contiene un ID de usuario.");
            return res.status(403).json({ message: "Token corrupto: Falta información de usuario" });
        }

        // 5. Inyectar datos en la petición para los siguientes controladores
        req.usuario = authData; 
        next();
    });
};

const isAdmin = (req, res, next) => {
    // Permitimos tanto 'admin' como 'superadmin' para no bloquear gestiones críticas
    if (req.usuario && (req.usuario.rol === 'admin' || req.usuario.rol === 'superadmin')) {
        next(); 
    } else {
        return res.status(403).json({ 
            message: "Acceso denegado. Se requieren permisos de administrador." 
        });
    }
};

module.exports = { verifyToken, isAdmin };