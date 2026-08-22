'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Por las dudas ya exista algún duplicado viejo (creado antes de esta
    // migración), lo limpiamos primero: nos quedamos con la inscripción más
    // antigua de cada alumno/curso y borramos las repetidas. Si no hay
    // duplicados, esta consulta no borra nada.
    await queryInterface.sequelize.query(`
      DELETE FROM enrollments a USING enrollments b
      WHERE a.id > b.id
        AND a."userId" = b."userId"
        AND a."courseId" = b."courseId";
    `);

    await queryInterface.addConstraint('enrollments', {
      fields: ['userId', 'courseId'],
      type: 'unique',
      name: 'enrollments_user_course_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('enrollments', 'enrollments_user_course_unique');
  },
};
