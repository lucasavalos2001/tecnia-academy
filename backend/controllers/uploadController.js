const axios = require('axios');
const crypto = require('crypto');

const prepareVideoUpload = async (req, res) => {
    try {
        const { title } = req.body;
        
        // 1. Limpieza ESTRICTA de credenciales (Vital)
        // .trim() elimina espacios invisibles que suelen colarse en el .env
        // String() asegura que se traten como texto
        const LIBRARY_ID = String(process.env.BUNNY_LIBRARY_ID || "").trim();
        const API_KEY = String(process.env.BUNNY_API_KEY || "").trim();

        if (!LIBRARY_ID || !API_KEY) {
            console.error("❌ Faltan claves en .env");
            return res.status(500).json({ message: "Error de configuración de Bunny.net" });
        }

        // 2. Crear el video en Bunny (Paso 1)
        // Aquí usamos la API Key porque hablamos de servidor a servidor
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

        // 3. Generar la Firma SHA256 (Paso 2)
        // Damos 24 horas (86400s) de validez para evitar problemas de hora
        const expirationTime = Math.floor(Date.now() / 1000) + 86400; 
        
        // Fórmula estricta: LibraryID + APIKey + Expiration + VideoID
        const signatureData = LIBRARY_ID + API_KEY + expirationTime + videoId;
        const signature = crypto.createHash('sha256').update(signatureData).digest('hex');

        // 4. Enviar datos al Frontend (SIN LA CLAVE MAESTRA)
        res.json({
            success: true,
            videoId: videoId,
            uploadUrl: `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${videoId}`,
            authHeader: signature,
            expiration: expirationTime,
            embedUrl: `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${videoId}` 
        });

    } catch (error) {
        console.error("Error Bunny:", error.response?.data || error.message);
        res.status(500).json({ message: "Error al iniciar carga en Bunny.net" });
    }
};

module.exports = { prepareVideoUpload };