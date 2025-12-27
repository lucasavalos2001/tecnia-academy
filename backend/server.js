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

const app = express();

// 🚀 CONFIGURACIÓN CRÍTICA PARA NGINX / DIGITAL OCEAN
// Soluciona el error "ValidationError: The 'X-Forwarded-For' header..."
// Le dice a Express que confíe en el proxy reverso (Nginx)
app.set('trust proxy', 1);

// 🛡️ 1. SEGURIDAD: HELMET
app.use(helmet());

// 🛡️ 2. SEGURIDAD: RATE LIMITING
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 300, 
    message: "Demasiadas peticiones desde esta IP, por favor intenta de nuevo en 15 minutos."
});
app.use(limiter);

// 🛡️ 3. SEGURIDAD: CORS
const whitelist = ['https://tecniaacademy.com', 'https://www.tecniaacademy.com', 'http://localhost:5173'];
const corsOptions = {
    origin: function (origin, callback) {
        // !origin permite peticiones sin origen (como Postman o Webhooks de Pagopar)
        if (whitelist.indexOf(origin) !== -1 || !origin) { 
            callback(null, true);
        } else {
            console.log("🚫 CORS Bloqueado para:", origin); // Log útil para depurar
            callback(new Error('Bloqueado por CORS'));
        }
    },
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// --- MIDDLEWARES ESTÁNDAR (CORREGIDO) ---
app.use(express.json());
// 👇 ESTA LÍNEA ES VITAL: Permite recibir datos tipo formulario (x-www-form-urlencoded)
// Pagopar a veces envía los webhooks en este formato.
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/cursos', courseRoutes);
app.use('/api/usuario', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/pagos', paymentRoutes);

app.get('/', (req, res) => {
    res.send('API Segura de Tecnia Academy funcionando 🛡️');
});

const PORT = process.env.PORT || 3000;

// 🚀 INICIO ROBUSTO DEL SERVIDOR
// Esperamos a que la BD esté lista antes de recibir peticiones
const startServer = async () => {
    try {
        await connectDB(); // 1. Conectar
        await syncDB();    // 2. Crear tablas (Aquí se creará Transactions)
        
        // 3. Solo ahora arrancamos el servidor
        app.listen(PORT, () => {
            console.log(`✅ Servidor seguro y BD sincronizada. Escuchando en puerto ${PORT}`);
        });
    } catch (error) {
        console.error("❌ Error fatal al iniciar el servidor:", error);
    }
};

startServer();