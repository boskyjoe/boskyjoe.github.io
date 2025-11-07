// In netlify/functions/imagekit-auth.js

const ImageKit = require("imagekit");

const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY;
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT;

// Define the CORS headers that we will use in every response
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS" // Allow these methods
};

exports.handler = async (event, context) => {
    // --- Step 1: Handle the browser's preflight OPTIONS request ---
    // This is a check the browser sends before the actual GET request.
    // We must respond to it with a 200 OK and the correct headers.
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Preflight check successful' })
        };
    }

    // --- Step 2: Handle the actual GET request for the token ---
    if (event.httpMethod === 'GET') {
        try {
            // Check if keys are loaded correctly from environment variables
            if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) {
                throw new Error("Server configuration error: Missing ImageKit environment variables.");
            }

            const imagekit = new ImageKit({
                publicKey: IMAGEKIT_PUBLIC_KEY,
                privateKey: IMAGEKIT_PRIVATE_KEY,
                urlEndpoint: IMAGEKIT_URL_ENDPOINT
            });

            const authenticationParameters = imagekit.getAuthenticationParameters();

            // Return the token with the CORS headers included
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify(authenticationParameters),
            };

        } catch (error) {
            console.error("Error generating ImageKit authentication parameters:", error);
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ message: error.message || "Could not generate authentication parameters." }),
            };
        }
    }

    // --- Step 3: Handle any other unexpected request methods ---
    return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Method Not Allowed' })
    };
};
