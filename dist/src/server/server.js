// src/server/server.tsx
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import express from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { connectDB } from './utils/db';
import { checkRedisHealth } from './utils/cache';
import foldersRouter from './api/folders.js';
import imageRouter from './api/image.js';
import imagesRouter from './api/images.js';
import uploadRouter from './api/upload.js';
import searchRouter from './api/search.js';
import imageParamsRouter from './api/image/[...params].js';
import getCurrentDirectoryRouter from './api/getCurrentDirectory.js';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const isProduction = process.env.NODE_ENV === 'production';
const host = process.env.HOST || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
async function createApp() {
    const app = express();
    app.use(cors());
    app.use(express.json());
    // Register API routes
    app.use('/api/folders', foldersRouter);
    app.use('/api/image', imageRouter);
    app.use('/api/images', imagesRouter);
    app.use('/api/upload', uploadRouter);
    app.use('/api/search', searchRouter);
    app.use('/api/image', imageParamsRouter);
    app.use('/api/getCurrentDirectory', getCurrentDirectoryRouter);
    let vite;
    if (!isProduction) {
        // Development mode: Integrate Vite middleware
        vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'custom',
        });
        app.use(vite.middlewares);
    }
    else {
        // Production mode: Serve static assets
        app.use(express.static(path.resolve(__dirname, '../../dist/client'), {
            index: false,
        }));
    }
    // SSR handling
    app.use('*', async (req, res, next) => {
        const url = req.originalUrl;
        try {
            let template;
            let render;
            if (!isProduction && vite) {
                // Development mode: Use Vite's HTML transforms
                template = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf-8');
                template = await vite.transformIndexHtml(url, template);
                render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render;
            }
            else {
                // Production mode: Try to find index.html in dist/client, then fall back to root
                let indexPath = path.resolve(__dirname, '../dist/client/index.html');
                if (!fs.existsSync(indexPath)) {
                    indexPath = path.resolve(__dirname, '../../index.html');
                }
                if (!fs.existsSync(indexPath)) {
                    throw new Error('index.html not found');
                }
                template = fs.readFileSync(indexPath, 'utf-8');
                render = async () => (await import('../entry-server.js')).render();
            }
            const { html: appHtml } = await render(url);
            const html = template.replace(`<!--ssr-outlet-->`, appHtml);
            res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
        }
        catch (e) {
            if (!isProduction && vite) {
                vite.ssrFixStacktrace(e);
            }
            console.error('SSR Error:', e);
            if (e.message === 'index.html not found') {
                res.status(500).send('Server configuration error: index.html not found');
            }
            else {
                next(e);
            }
        }
    });
    // Start the server
    app.listen(port, () => {
        console.log(`Server running at http://${host}:${port}`);
        console.info(`Server running at http://${host}:${port}`);
    });
    // Connect to databases
    await connectDB();
    await checkRedisHealth();
}
createApp().catch((err) => {
    console.error('Failed to start server:', { error: err });
    process.exit(1);
});
//# sourceMappingURL=server.js.map