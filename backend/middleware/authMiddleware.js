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

module.exports = { verifyToken };