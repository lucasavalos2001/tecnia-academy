const { ErrorLog } = require('../models');

// Guarda un error importante en la base de datos para que quede visible en
// el panel de admin, además de loguearlo en consola como ya se hacía.
// Nunca debe romper el flujo que la llama: si falla el guardado, solo se
// avisa por consola y se sigue.
const logError = async (origen, error, detalle = null) => {
    console.error(`❌ [${origen}]`, error?.message || error);
    try {
        await ErrorLog.create({
            origen,
            mensaje: error?.message || String(error),
            detalle: detalle ? JSON.stringify(detalle) : (error?.stack || null),
        });
    } catch (logErr) {
        console.error('⚠️ No se pudo guardar el error en la base de datos:', logErr.message);
    }
};

module.exports = { logError };
