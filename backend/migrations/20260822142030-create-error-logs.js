'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('error_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      origen: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      mensaje: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      detalle: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      resuelto: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('error_logs');
  },
};
