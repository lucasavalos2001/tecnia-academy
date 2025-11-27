require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const { syncDB } = require('./models');

// Importación de rutas
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes'); // <--- ✅ NUEVO: Rutas de Admin
const uploadRoutes = require('./routes/uploadRoutes'); // <--- NUEVO

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Conexión a DB y Sincronización
connectDB();
syncDB();

// Rutas
app.use('/api/auth', authRoutes);     // Login y Registro
app.use('/api/cursos', courseRoutes); // Cursos y Lecciones
app.use('/api/usuario', userRoutes);  // Perfil y Certificados
app.use('/api/admin', adminRoutes);   // <--- ✅ NUEVO: Panel de Control Total
app.use('/api/upload', uploadRoutes); // <--- NUEVO

// Ruta de prueba básica
app.get('/', (req, res) => {
    res.send('API de Tecnia Academy funcionando 🚀');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});