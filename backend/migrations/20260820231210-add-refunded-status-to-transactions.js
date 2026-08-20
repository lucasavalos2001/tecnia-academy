'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Postgres no permite agregar un valor a un ENUM dentro de una transacción
    // en versiones viejas, así que lo hacemos con una consulta directa.
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_transactions_status" ADD VALUE IF NOT EXISTS 'refunded';`
    );
  },

  async down() {
    // Postgres no permite quitar un valor de un ENUM de forma simple;
    // esta migración no se revierte automáticamente.
  },
};
