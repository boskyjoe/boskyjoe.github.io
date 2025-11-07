// In netlify/functions/imagekit-auth.js

const ImageKit = require("imagekit");

const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY;
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT;

const imagekit = new ImageKit({
    publicKey: IMAGEKIT_PUBLIC_KEY,
    privateKey: IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT
});

exports.handler = async (event, context) => {
    try {
        const authenticationParameters = imagekit.getAuthenticationParameters();

        // ✅ THIS IS THE FIX
        // We are explicitly adding the required CORS headers to the response.
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*", // Allow requests from any origin
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
            },
            body: JSON.stringify(authenticationParameters),
        };

    } catch (error) {
        console.error("Error generating ImageKit authentication parameters:", error);
        
        // Also add CORS headers to error responses
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({ message: "Could not generate authentication parameters." }),
        };
    }
};
