const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'postgres',
        logging: false, 
        port: process.env.DB_PORT || 5432,
    }
);

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('¡Conexión exitosa a PostgreSQL establecida!');
    } catch (error) {
        console.error('Falló la conexión a PostgreSQL:', error.message);
        // No salimos del proceso para permitir ver el error en consola
    }
};

module.exports = { sequelize, connectDB };