'use strict';

/**
 * Migración base (no hace nada).
 *
 * Marca el punto en el que el proyecto pasó de `sequelize.sync({ alter: true })`
 * (que reescribía la estructura de las tablas solo, en cada arranque del
 * servidor) a un sistema de migraciones controladas.
 *
 * El esquema de la base de datos hasta esta fecha ya existe (fue creado por
 * ese mismo sync automático mientras estuvo activo), así que esta migración
 * no crea ni modifica nada — solo queda registrada como punto de partida.
 * De acá en adelante, cualquier cambio de estructura (nueva columna, nueva
 * tabla, etc.) debe hacerse agregando una migración nueva con
 * `npx sequelize-cli migration:generate --name descripcion`.
 */
module.exports = {
  up: async () => {},
  down: async () => {},
};
