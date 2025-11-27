const axios = require('axios');
const crypto = require('crypto');

const prepareVideoUpload = async (req, res) => {
    try {
        const { title } = req.body;
        
        // Forzamos conversión a String para evitar errores de firma
        const LIBRARY_ID = String(process.env.BUNNY_LIBRARY_ID);
        const API_KEY = String(process.env.BUNNY_API_KEY);

        if (!LIBRARY_ID || !API_KEY) {
            return res.status(500).json({ message: "Falta configuración de Bunny.net en el servidor" });
        }

        // 1. Crear el video en Bunny (Paso 1: Create Video Object)
        const createRes = await axios.post(
            `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos`,
            { title: title },
            { 
                headers: { 
                    AccessKey: API_KEY,
                    'Content-Type': 'application/json'
                } 
            }
        );

        const videoId = createRes.data.guid;

        // 2. Generar la Firma SHA256 para autorización (Direct Upload)
        // Fórmula oficial: LibraryID + APIKey + Expiration + VideoID
        const expirationTime = Math.floor(Date.now() / 1000) + 3600; // Valido por 1 hora
        const signatureData = LIBRARY_ID + API_KEY + expirationTime + videoId;
        const signature = crypto.createHash('sha256').update(signatureData).digest('hex');

        // 3. Devolver datos al frontend
        res.json({
            success: true,
            videoId: videoId,
            // URL directa para subir el archivo (PUT)
            uploadUrl: `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${videoId}`,
            // Cabeceras de seguridad que el frontend debe enviar
            authHeader: signature,
            expiration: expirationTime,
            // URL para guardar en la base de datos (Reproductor)
            embedUrl: `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${videoId}` 
        });

    } catch (error) {
        console.error("Error Bunny:", error.response?.data || error.message);
        res.status(500).json({ message: "Error al iniciar carga en Bunny.net" });
    }
};

module.exports = { prepareVideoUpload };