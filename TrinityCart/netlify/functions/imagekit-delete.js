
//In netlify/functions/imagekit-delete.js


const ImageKit = require("imagekit");

// These are read from your Netlify environment variables
const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY;
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT;

// Define the CORS headers to be used in every response
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

exports.handler = async (event, context) => {
    // Handle the browser's preflight OPTIONS request first
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Preflight check successful' })
        };
    }

    // Only allow POST requests for the actual deletion
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
    }

    try {
        const { fileId } = JSON.parse(event.body);
        if (!fileId) {
            return { statusCode: 400, headers: corsHeaders, body: 'Missing fileId' };
        }

        const imagekit = new ImageKit({
            publicKey: IMAGEKIT_PUBLIC_KEY,
            privateKey: IMAGEKIT_PRIVATE_KEY,
            urlEndpoint: IMAGEKIT_URL_ENDPOINT
        });

        await imagekit.deleteFile(fileId);
        console.log(`Successfully deleted file from ImageKit: ${fileId}`);

        return {
            statusCode: 204, // 204 No Content is a good response for a successful deletion
            headers: corsHeaders,
            body: ''
        };

    } catch (error) {
        console.error("Error deleting file from ImageKit:", error);
        // If the file was already deleted, that's okay. Return a success.
        if (error.name === 'NotFoundError') {
            return { statusCode: 204, headers: corsHeaders, body: '' };
        }
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Could not delete file.' })
        };
    }
};
