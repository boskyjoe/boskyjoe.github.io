// In api/imagekit-auth.js

const ImageKit = require("imagekit");

// These will be read from Vercel's environment variables
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
export default function handler(request, response) {
    try {
        // Generate the authentication parameters
        const authenticationParameters = imagekit.getAuthenticationParameters();
        // Send the successful JSON response
        response.status(200).json(authenticationParameters);
    } catch (error) {
        console.error("Error generating ImageKit auth params:", error);
        response.status(500).json({ message: "Could not generate authentication parameters." });
    }
}
