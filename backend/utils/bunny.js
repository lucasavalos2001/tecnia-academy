const axios = require('axios');

// --- HELPER COMPARTIDO: SUBIR ARCHIVO A BUNNY STORAGE ---
const uploadToBunny = async (file, prefix = '') => {
    try {
        const STORAGE_NAME = process.env.BUNNY_STORAGE_NAME;
        const ACCESS_KEY = process.env.BUNNY_STORAGE_PASSWORD;
        const PULL_ZONE = process.env.BUNNY_PULL_ZONE;
        const REGION = process.env.BUNNY_STORAGE_REGION ? `${process.env.BUNNY_STORAGE_REGION}.` : '';

        const filename = `${prefix}${Date.now()}_${file.originalname.replace(/\s+/g, '-')}`;
        const bunnyUrl = `https://${REGION}storage.bunnycdn.com/${STORAGE_NAME}/${filename}`;

        await axios.put(bunnyUrl, file.buffer, {
            headers: {
                AccessKey: ACCESS_KEY,
                'Content-Type': file.mimetype
            }
        });

        return `${PULL_ZONE}/${filename}`;

    } catch (error) {
        console.error("Error interno subiendo a Bunny:", error.message);
        throw new Error("Falló la subida de imagen");
    }
};

module.exports = { uploadToBunny };
