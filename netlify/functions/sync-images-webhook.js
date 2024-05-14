const axios = require('axios');

exports.handler = async (event, context) => {
  try {
    // Check if the request method is GET
    if (event.httpMethod === 'GET') {
      // Check if the 'challenge' parameter exists in the query string
      const challenge = event.queryStringParameters.challenge;
      if (challenge) {
        // Respond to the Dropbox webhook verification challenge
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/plain',
            'X-Content-Type-Options': 'nosniff',
          },
          body: challenge,
        };
      }
    }

    // Trigger the background function by making a request to its URL
    const backgroundFunctionUrl = 'https://jupiter.dog/.netlify/functions/sync-images-background';
    await axios.get(backgroundFunctionUrl);

    return {
      statusCode: 200,
      body: 'Function executed successfully',
    };
  } catch (error) {
    console.error('Error executing function:', error);
    return {
      statusCode: 500,
      body: 'Error executing function',
    };
  }
};