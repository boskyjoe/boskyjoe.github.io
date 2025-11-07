// In netlify/functions/imagekit-auth.js

const ImageKit = require("imagekit");

// These values will be set as environment variables in Netlify for security
const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY;
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT;

// Initialize ImageKit on the server side
const imagekit = new ImageKit({
    publicKey: IMAGEKIT_PUBLIC_KEY,
    privateKey: IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT
});

// This is the main serverless function handler
exports.handler = async (event, context) => {
    try {
        // Generate the authentication parameters
        const authenticationParameters = imagekit.getAuthenticationParameters();

        // Return the parameters as a JSON response
        return {
            statusCode: 200,
            body: JSON.stringify(authenticationParameters),
        };
    } catch (error) {
        console.error("Error generating ImageKit authentication parameters:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Could not generate authentication parameters." }),
        };
    }
};
