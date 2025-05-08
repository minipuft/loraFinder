// vite.client.config.ts
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import checker from 'vite-plugin-checker';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  console.log(`Building client for mode: ${mode}`);

  return {
    plugins: [
      tsconfigPaths({ projects: ['./tsconfig.client.json'] }), // Ensure paths are resolved before other plugins
      react(),
      {
        name: 'worker-loader',
        transform(code, id) {
          if (id.endsWith('.worker.ts')) {
            console.debug(`Transforming worker: ${id}`);
            return {
              code: `export default function WorkerWrapper() {
                        return new Worker(new URL('${id}', import.meta.url), { type: 'module' })
                      }`,
              map: null,
            };
          }
        },
      },
      checker({ typescript: true }), // Type checking
    ],
    build: {
      outDir: 'dist/client',
      rollupOptions: {
        input: './src/main.tsx', // Changed from src/client/main.tsx
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name][extname]',
          format: 'es',
        },
        external: ['fsevents', 'formidable'],
      },
      sourcemap: true,
      minify: 'terser',
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    worker: {
      format: 'es',
      rollupOptions: {
        output: {
          entryFileNames: 'workers/[name].[hash].js',
          chunkFileNames: 'workers/[name].[hash].js',
        },
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'axios'],
      exclude: [],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@client': path.resolve(__dirname, './src/client'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@server': path.resolve(__dirname, './src/server'),
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
    },
    root: process.cwd(),
    css: {
      modules: {
        localsConvention: 'camelCase',
        generateScopedName: '[name]__[local]__[hash:base64:5]',
      },
    },
  };
});
