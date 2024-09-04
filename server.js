// Import required modules
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Determine if the environment is development or production
const dev = process.env.NODE_ENV !== 'production';
// Initialize Next.js app
const app = next({ dev });
// Get the request handler from Next.js
const handle = app.getRequestHandler();

// Import PORT and HOST constants from utils
const { PORT, HOST } = require('./utils/constants');

// Prepare the Next.js app and start the server
app.prepare().then(() => {
  // Create an HTTP server
  createServer((req, res) => {
    // Parse the request URL
    const parsedUrl = parse(req.url, true);
    // Let Next.js handle the request
    handle(req, res, parsedUrl);
  }).listen(PORT, HOST, (err) => {
    // If there's an error starting the server, throw it
    if (err) throw err;
    // Log a message when the server is ready
    console.log(`> Ready on http://${HOST}:${PORT}`);
  });
});