require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); // 🛡️ NUEVO
const rateLimit = require('express-rate-limit'); // 🛡️ NUEVO
const { connectDB } = require('./config/db');
const { syncDB } = require('./models');

// Importación de rutas
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

// 🛡️ 1. SEGURIDAD: HELMET (Protege cabeceras HTTP)
app.use(helmet());

// 🛡️ 2. SEGURIDAD: RATE LIMITING (Evita ataques de fuerza bruta)
// Permite máximo 100 peticiones por 15 minutos por IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 300, // Límite generoso para usuarios normales
  message: "Demasiadas peticiones desde esta IP, por favor intenta de nuevo en 15 minutos."
});
app.use(limiter);

// 🛡️ 3. SEGURIDAD: CORS (Solo permite a tu dominio y localhost)
// Esto evita que otros sitios web intenten usar tu API
const whitelist = ['https://tecniaacademy.com', 'https://www.tecniaacademy.com', 'http://localhost:5173'];
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) { // !origin permite Postman/Server-to-Server
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por CORS'));
    }
  },
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Middlewares estándar
app.use(express.json());

// Conexión a DB
connectDB();
syncDB();

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/cursos', courseRoutes);
app.use('/api/usuario', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/', (req, res) => {
    res.send('API Segura de Tecnia Academy funcionando 🛡️');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor seguro escuchando en puerto ${PORT}`);
});