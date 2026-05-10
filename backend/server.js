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
app.set('trust proxy', 1);

// 🛡️ 1. SEGURIDAD: HELMET
app.use(helmet());

// 🛡️ 2. SEGURIDAD: RATE LIMITING
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 500, 
    message: "Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde."
});
app.use(limiter);

// 🛡️ 3. SEGURIDAD: CORS (Configuración Reforzada)
const whitelist = [
    'https://tecniaacademy.com', 
    'https://www.tecniaacademy.com', 
    'http://localhost:5173'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || whitelist.indexOf(origin) !== -1) { 
            callback(null, true);
        } else {
            console.log("🚫 CORS Bloqueado para:", origin); 
            callback(new Error('Bloqueado por CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // 👈 Importante para persistencia de sesiones seguras
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// --- MIDDLEWARES DE PARSEO (Deben ir antes de las rutas y mantenimiento) ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// 🔒 4. MIDDLEWARE DE MANTENIMIENTO
// ============================================================
// Solo aplicamos mantenimiento si NO es una petición de pre-vuelo (OPTIONS)
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        return next();
    }
    maintenanceMiddleware(req, res, next);
});

// --- DEFINICIÓN DE RUTAS ---
app.use('/api/auth', authRoutes);
app.use('/api/cursos', courseRoutes);
app.use('/api/usuario', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/pagos', paymentRoutes); 

app.get('/', (req, res) => {
    res.send('API Segura de Tecnia Academy funcionando 🛡️');
});

app.use((req, res) => {
    res.status(404).json({ message: "Ruta no encontrada" });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectDB();
        await syncDB(); 
        
        app.listen(PORT, () => {
            console.log(`✅ Servidor funcionando en puerto ${PORT}`);
        });
    } catch (error) {
        console.error("❌ Error fatal al iniciar el servidor:", error);
        process.exit(1);
    }
};

startServer();