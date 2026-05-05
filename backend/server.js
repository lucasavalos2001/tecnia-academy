require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./config/db');
const { syncDB } = require('./models');

// Importación de rutas
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Middleware de mantenimiento
const maintenanceMiddleware = require('./middleware/maintenanceMiddleware');

const app = express();

// 🚀 CONFIGURACIÓN PARA PROXY (DigitalOcean / Nginx)
// Necesario para que el rate limit y helmet detecten la IP real del cliente
app.set('trust proxy', 1);

// 🛡️ 1. SEGURIDAD: HELMET
app.use(helmet());

// 🛡️ 2. SEGURIDAD: RATE LIMITING
// Aumentamos a 500 para evitar que ráfagas de validación de Pagopar bloqueen el servidor
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 500, 
    message: "Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde."
});
app.use(limiter);

// 🛡️ 3. SEGURIDAD: CORS (Configuración Crítica)
const whitelist = [
    'https://tecniaacademy.com', 
    'https://www.tecniaacademy.com', 
    'http://localhost:5173'
];

const corsOptions = {
    origin: function (origin, callback) {
        /**
         * IMPORTANTE PARA PARAGUAY / PAGOPAR:
         * Las peticiones de servidor a servidor (Webhooks) a veces NO envían el encabezado 'origin'.
         * Si bloqueamos las peticiones sin origen (!origin), Pagopar nunca podrá avisarnos del pago.
         */
        if (!origin || whitelist.indexOf(origin) !== -1) { 
            callback(null, true);
        } else {
            console.log("🚫 CORS Bloqueado para:", origin); 
            callback(new Error('Bloqueado por CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// --- MIDDLEWARES DE PARSEO ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// 🔒 4. MIDDLEWARE DE MANTENIMIENTO
// ============================================================
// Se aplica a todas las rutas. 
// RECUERDA: Dentro de tu archivo maintenanceMiddleware.js debes
// poner: if (req.path === '/api/pagos/confirmar') return next();
app.use(maintenanceMiddleware);

// --- DEFINICIÓN DE RUTAS ---
app.use('/api/auth', authRoutes);
app.use('/api/cursos', courseRoutes);
app.use('/api/usuario', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/pagos', paymentRoutes); // Aquí está /confirmar

app.get('/', (req, res) => {
    res.send('API Segura de Tecnia Academy funcionando 🛡️');
});

// Manejo de errores global para rutas no encontradas
app.use((req, res) => {
    res.status(404).json({ message: "Ruta no encontrada" });
});

const PORT = process.env.PORT || 3000;

// 🚀 INICIO DEL SERVIDOR
const startServer = async () => {
    try {
        await connectDB(); // Conexión a Postgres/MySQL
        await syncDB();    // Sincronización de modelos Sequelize
        
        app.listen(PORT, () => {
            console.log(`✅ Servidor funcionando en puerto ${PORT}`);
            console.log(`🌍 Whitelist activa: ${whitelist.join(', ')}`);
        });
    } catch (error) {
        console.error("❌ Error fatal al iniciar el servidor:", error);
        process.exit(1); // Cerrar si hay error crítico
    }
};

startServer();