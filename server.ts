import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import foldersRouter from './src/api/folders.js';
import getCurrentDirectoryRouter from './src/api/getCurrentDirectory.js';
import imageRouter from './src/api/image.js';
import imageParamsRouter from './src/api/image/[...params].js';
import imagesRouter from './src/api/images.js';
import searchRouter from './src/api/search.js';
import uploadRouter from './src/api/upload.js';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const host = process.env.VITE_HOST || 'localhost';

async function startServer() {
  console.log('Starting server...');
  console.log('__dirname:', __dirname);
  console.log('Current working directory:', process.cwd());

  try {
    console.log('Starting server...');
    console.log('__dirname:', __dirname);
    console.log('Current working directory:', process.cwd());

    const app = express();
    const port = process.env.VITE_PORT || 3001;

    // API routes
    app.use('/api', foldersRouter);
    app.use('/api', imageRouter);
    app.use('/api', imagesRouter);
    app.use('/api', imageParamsRouter);
    app.use('/api', searchRouter);
    app.use('/api', uploadRouter);
    app.use('/api', getCurrentDirectoryRouter);

    // Serve static files
    app.use(express.static('public'));

    // Create Vite server
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: process.env.VITE_HOST,
        port: parseInt(process.env.VITE_PORT || '3001', 10),
      },
      appType: 'custom',
    });

    // Use vite's connect instance as middleware
    app.use(vite.middlewares);

    // For all other routes, let Vite handle it
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;

      try {
        // 1. Read index.html
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');

        // 2. Apply Vite HTML transforms
        template = await vite.transformIndexHtml(url, template);

        // 3. Stream-render the app using renderToPipeableStream
        const [head, tail] = template.split('<!--ssr-outlet-->');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        res.write(head);

        const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');
        const stream = render(url, {
          onShellReady() {
            stream.pipe(res, { end: false });
          },
          onAllReady() {
            res.write(tail);
            res.end();
          },
          onError(err: unknown) {
            console.error('SSR error:', err);
          },
        });
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });

    app.listen(port, () => {
      console.log(`Server running at http://${host}:${port}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
  }
}

startServer();
