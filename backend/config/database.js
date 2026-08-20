// Configuración para sequelize-cli (migraciones). Separada de config/db.js
// (que es la conexión real que usa la app), porque sequelize-cli espera
// este formato específico de archivo.
require('dotenv').config();

const shared = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  dialect: 'postgres',
  logging: false,
};

module.exports = {
  development: shared,
  test: shared,
  production: shared,
};
