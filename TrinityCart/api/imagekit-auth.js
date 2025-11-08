// In api/imagekit-auth.js

const ImageKit = require("imagekit");

// These values are read from Vercel's environment variables
const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY;
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT;

// This is the Vercel-compatible serverless function handler
export default function handler(request, response) {
    // ✅ STEP 1: Set the CORS headers on every response.
    // This is the "permission slip" the browser needs.
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // ✅ STEP 2: Handle the browser's preflight OPTIONS request.
    // If the browser is just checking for permission, we send back a successful
    // response immediately and stop further execution.
    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    // ✅ STEP 3: Handle the actual GET request for the token.
    try {
        // Check if the environment variables were loaded correctly
        if (!IMAGEKIT_PRIVATE_KEY) {
            throw new Error("Server configuration error: Missing ImageKit private key environment variable.");
        }

        const imagekit = new ImageKit({
            publicKey: IMAGEKIT_PUBLIC_KEY,
            privateKey: IMAGEKIT_PRIVATE_KEY,
            urlEndpoint: IMAGEKIT_URL_ENDPOINT
        });
        
        const authenticationParameters = imagekit.getAuthenticationParameters();
        
        // Send the successful JSON response with the token
        response.status(200).json(authenticationParameters);

    } catch (error) {
        console.error("Error generating ImageKit auth params:", error);
        // Send a server error response if something went wrong
        response.status(500).json({ message: error.message || "Could not generate authentication parameters." });
    }
}
