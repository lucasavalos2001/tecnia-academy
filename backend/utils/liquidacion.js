const { Op } = require('sequelize');

// Calcula cuánto le corresponde cobrar a UN instructor en un mes/año dado.
// La usan tanto el panel de admin (para todos los instructores) como el
// panel del instructor (para que cada uno vea su propio neto real).
const calcularLiquidacionInstructor = async ({ instructor, mes, anio, Course, Enrollment, Payout }) => {
    const startOfMonth = new Date(anio, mes - 1, 1);
    const endOfMonth = new Date(anio, mes, 0, 23, 59, 59);

    const courses = await Course.findAll({ where: { instructorId: instructor.id } });

    let detalleVentas = [];
    let totalBrutoInstructor = 0;

    for (const curso of courses) {
        const ventasCurso = await Enrollment.count({
            where: {
                courseId: curso.id,
                createdAt: { [Op.between]: [startOfMonth, endOfMonth] }
            }
        });

        if (ventasCurso > 0) {
            const ingresoCurso = ventasCurso * parseFloat(curso.precio);
            totalBrutoInstructor += ingresoCurso;
            detalleVentas.push({ titulo: curso.titulo, cantidad: ventasCurso, ingreso: ingresoCurso });
        }
    }

    // 💰 Comisión según condición fiscal (ver TermsInstructors.jsx):
    // con factura legal = 30% para la plataforma (70% para el instructor)
    // sin factura = 40% para la plataforma (60% para el instructor)
    const comisionPlataforma = instructor.tiene_factura ? 0.30 : 0.40;
    const totalPagar = totalBrutoInstructor * (1 - comisionPlataforma);

    const pagoRegistrado = await Payout.findOne({ where: { instructorId: instructor.id, mes, anio } });

    return {
        periodo: { mes, año: anio },
        estadisticas: {
            total_bruto: totalBrutoInstructor,
            porcentaje_comision: comisionPlataforma * 100,
            comision_retenida: totalBrutoInstructor * comisionPlataforma,
            total_a_pagar: totalPagar
        },
        detalle: detalleVentas,
        ya_pagado: !!pagoRegistrado,
        fecha_pago: pagoRegistrado ? pagoRegistrado.createdAt : null
    };
};

module.exports = { calcularLiquidacionInstructor };
