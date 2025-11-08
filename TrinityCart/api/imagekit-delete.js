
//In api/imagekit-delete.js


const ImageKit = require("imagekit");

// These values are read from your Vercel environment variables
const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY;
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT;

// Initialize ImageKit on the server side
const imagekit = new ImageKit({
    publicKey: IMAGEKIT_PUBLIC_KEY,
    privateKey: IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT
});

// This is the Vercel-compatible serverless function handler
export default async function handler(request, response) {
    // Set the CORS headers on the response object immediately
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle the browser's preflight OPTIONS request
    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    // Only allow POST requests for the actual deletion
    if (request.method !== 'POST') {
        response.status(405).json({ message: 'Method Not Allowed' });
        return;
    }

    try {
        // Vercel automatically parses the JSON body, so we can access it directly
        const { fileId } = request.body;

        if (!fileId) {
            return response.status(400).json({ message: 'Missing fileId' });
        }

        console.log(`Attempting to delete file from ImageKit: ${fileId}`);
        await imagekit.deleteFile(fileId);
        console.log(`Successfully deleted file: ${fileId}`);

        // Send a 204 No Content response for a successful deletion
        response.status(204).end();

    } catch (error) {
        console.error("Error deleting file from ImageKit:", error);
        
        // If the file was already deleted on ImageKit, that's not a failure.
        // We can consider it a success and still proceed.
        if (error.name === 'NotFoundError') {
            return response.status(204).end();
        }

        // For any other errors, send a server error response
        response.status(500).json({ message: 'Could not delete file.' });
    }
}
