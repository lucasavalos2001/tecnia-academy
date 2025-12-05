const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const header = req.headers['authorization'];
    
    if (typeof header !== 'undefined') {
        const bearerToken = header.split(' ')[1];
        
        jwt.verify(bearerToken, process.env.JWT_SECRET, (err, authData) => {
            if (err) {
                return res.status(403).json({ message: "Token inválido o expirado" });
            }
            req.usuario = authData; // Guardamos los datos del usuario (id, rol)
            next();
        });
    } else {
        res.status(403).json({ message: "Acceso denegado, se requiere token" });
    }
};

// 🟢 NUEVO: Middleware para verificar si es Administrador
const isAdmin = (req, res, next) => {
    // req.usuario ya debe existir (gracias a verifyToken que se ejecuta antes)
    // Verificamos que el rol sea exactamente 'admin'
    if (req.usuario && req.usuario.rol === 'admin') {
        next(); // Tiene permiso, puede pasar
    } else {
        return res.status(403).json({ 
            message: "Acceso denegado. Se requieren permisos de administrador." 
        });
    }
};

// 🟢 Exportamos AMBAS funciones
module.exports = { verifyToken, isAdmin };