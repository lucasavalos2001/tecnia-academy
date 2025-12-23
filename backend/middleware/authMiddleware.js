const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const header = req.headers['authorization'];
    
    if (typeof header !== 'undefined') {
        const bearerToken = header.split(' ')[1];
        
        jwt.verify(bearerToken, process.env.JWT_SECRET, (err, authData) => {
            if (err) {
                return res.status(403).json({ message: "Token inválido o expirado" });
            }
            
            // 🔍 RAYOS X: Vamos a ver qué tiene el token por dentro
            console.log("🎟️ TOKEN DECODIFICADO:", authData);
            
            // VERIFICACIÓN CRÍTICA:
            // Si authData no tiene .id, el pago fallará.
            if (!authData.id) {
                console.error("⚠️ ALERTA: El token no tiene campo 'id'. El pago fallará.");
            }

            req.usuario = authData; 
            next();
        });
    } else {
        res.status(403).json({ message: "Acceso denegado, se requiere token" });
    }
};

const isAdmin = (req, res, next) => {
    if (req.usuario && req.usuario.rol === 'admin') {
        next(); 
    } else {
        return res.status(403).json({ 
            message: "Acceso denegado. Se requieren permisos de administrador." 
        });
    }
};

module.exports = { verifyToken, isAdmin };