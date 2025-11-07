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
    // Only allow POST requests for security
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { fileId } = JSON.parse(event.body);
        if (!fileId) {
            return { statusCode: 400, body: 'Missing fileId' };
        }

        console.log(`Attempting to delete file from ImageKit: ${fileId}`);
        await imagekit.deleteFile(fileId);
        console.log(`Successfully deleted file: ${fileId}`);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'File deleted successfully' })
        };
    } catch (error) {
        console.error("Error deleting file from ImageKit:", error);
        // Return a success even if the file doesn't exist on ImageKit,
        // so the Firestore deletion can still proceed.
        if (error.name === 'NotFoundError') {
            return { statusCode: 200, body: JSON.stringify({ message: 'File not found on ImageKit, proceeding.' }) };
        }
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Could not delete file.' })
        };
    }
};
