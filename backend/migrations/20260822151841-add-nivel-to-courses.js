'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('courses', 'nivel', {
      type: Sequelize.ENUM('principiante', 'intermedio', 'avanzado'),
      allowNull: false,
      defaultValue: 'principiante',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('courses', 'nivel');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_courses_nivel";');
  },
};
