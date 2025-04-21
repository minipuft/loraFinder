import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import checker from 'vite-plugin-checker';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  console.info(`Building server for mode: ${mode}`);

  return {
    plugins: [
      tsconfigPaths({ projects: ['./tsconfig.server.json'] }),
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
      checker({ typescript: true }),
    ],
    build: {
      outDir: 'dist/server',
      rollupOptions: {
        input: './src/entry-server.tsx', // Ensure this points to the correct SSR entry
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name][extname]',
          format: 'es',
        },
        external: [
          'express',
          'mongoose',
          'cors',
          'fsevents',
          'formidable',
          'dotenv',
          // Add other server-side dependencies as needed
        ],
      },
      sourcemap: true,
      minify: 'terser',
      ssr: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@client': path.resolve(__dirname, './src/client'),
        '@server': path.resolve(__dirname, './src/server'),
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'axios'],
      exclude: [],
    },
    server: {
      port: 3000, // Fixed port for server
    },
  };
});
