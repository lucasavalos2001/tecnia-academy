// Validaciones simples y reutilizables para los datos que llegan del frontend.
// El objetivo no es una librería completa de validación, sino cubrir los
// casos concretos que hoy no se revisan en absoluto (precio negativo, rol
// inventado, contraseñas débiles, etc.).

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES_VALIDOS = ['student', 'instructor', 'admin', 'superadmin'];

const isValidEmail = (email) => typeof email === 'string' && EMAIL_REGEX.test(email.trim());

// Mínimo 8 caracteres, con al menos una letra y un número.
const isStrongPassword = (password) => {
    if (typeof password !== 'string' || password.length < 8) return false;
    return /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
};

const isValidRole = (rol) => ROLES_VALIDOS.includes(rol);

// Precio: número finito, no negativo, y con un tope razonable para evitar
// errores de tipeo (ej: agregar un cero de más).
const isValidPrice = (precio) => {
    const num = parseFloat(precio);
    return Number.isFinite(num) && num >= 0 && num <= 50000000;
};

module.exports = { isValidEmail, isStrongPassword, isValidRole, isValidPrice };
