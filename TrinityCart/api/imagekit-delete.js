
//In api/imagekit-delete.js


const ImageKit = require("imagekit");

const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY;
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT;

export default async function handler(request, response) {
    // Set CORS headers for all responses
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
        response.status(405).json({ message: 'Method Not Allowed' });
        return;
    }

    try {
        // ✅ THE FIX: Manually parse the request body.
        // Vercel provides the raw body in `request.body`. If it's not already an object,
        // we parse it ourselves. This is safer than relying on automatic parsing.
        let body;
        if (typeof request.body === 'string') {
            body = JSON.parse(request.body);
        } else {
            body = request.body; // Assume it's already an object
        }
        
        const { fileId } = body;

        if (!fileId) {
            console.error("Handler received request but 'fileId' was missing in the body.", body);
            return response.status(400).json({ message: 'Bad Request: Missing fileId in request body.' });
        }

        const imagekit = new ImageKit({
            publicKey: IMAGEKIT_PUBLIC_KEY,
            privateKey: IMAGEKIT_PRIVATE_KEY,
            urlEndpoint: IMAGEKIT_URL_ENDPOINT
        });

        await imagekit.deleteFile(fileId);
        console.log(`Successfully deleted file from ImageKit: ${fileId}`);

        response.status(204).end();

    } catch (error) {
        console.error("Error in imagekit-delete function:", error);
        
        if (error.name === 'NotFoundError') {
            return response.status(204).end(); // File already gone, consider it a success
        }

        response.status(500).json({ message: 'Internal Server Error: Could not process file deletion.' });
    }
}
