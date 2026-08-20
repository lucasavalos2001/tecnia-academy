'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payouts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      instructorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      mes: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      anio: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      monto_bruto: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      monto_pagado: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      porcentaje_comision: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
      },
      pagado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
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

    // Un instructor no puede quedar liquidado dos veces por el mismo período.
    await queryInterface.addConstraint('payouts', {
      fields: ['instructorId', 'mes', 'anio'],
      type: 'unique',
      name: 'payouts_instructor_periodo_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payouts');
  },
};
