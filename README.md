# MediaFlow

MediaFlow is a web application for managing and viewing image files, with a focus on displaying preview images for LORA (Low-Rank Adaptation) FLUX and related models. Built with Vite, Express, and React with Server-Side Rendering (SSR), it provides a robust platform for image management and viewing.

## Features

- 🖼️ Advanced image management and viewing capabilities
- 📁 Hierarchical folder navigation and management
- 🔍 Full-text search across all images and folders
- 🎨 Responsive masonry grid layout
- 🔄 Real-time image processing with Sharp
- 📱 Mobile-friendly responsive design
- ⚡ Fast image loading with lazy loading, caching, and SSR
- 🎯 Cursor-based pagination for efficient data loading (Verify specific implementation if needed)
- 🔒 Secure file handling and validation

## Tech Stack

### Frontend

- React 18 with TypeScript
- Vite for development, building, and SSR
- SCSS Modules + Tailwind CSS for styling
- Framer Motion for animations
- React Query for data fetching

### Backend

- Express.js server integrated with Vite for SSR
- Sharp for image processing
- Node Cache for server-side caching
- TypeScript for type safety
- Zod for validation

## Prerequisites

- Node.js >= 18.0.0
- npm (>= 9.0.0 recommended)
- Git

## Getting Started

1. **Clone the repository**

   ```bash
   # Replace 'yourusername/mediaflow.git' with the actual repository URL if different
   git clone https://github.com/yourusername/mediaflow.git
   cd mediaflow
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:

   ```env
   # Port for the Express server (Vite client assets served through this in dev)
   VITE_PORT=3001
   # Host for the server
   VITE_HOST=localhost
   # Main directory containing image files
   MAIN_DIRECTORY=/path/to/your/image/directory
   ```

4. **Development**

   ```bash
   npm run dev
   ```

   This command starts the Express server (using `tsx` for hot-reloading) which serves the Vite-processed client application with SSR enabled. Access the application at `http://localhost:3001` (or your configured `VITE_HOST`/`VITE_PORT`).

5. **Production Build**
   ```bash
   # Build client and server bundles
   npm run build
   # Start the production server
   npm start
   ```

## Project Structure

The project uses a monorepo-like structure managed within a single `package.json`, combining a Vite-based React frontend with an Express backend, leveraging Vite for SSR.

- `src/`: Contains the frontend application code.
  - `components/`: Reusable React components.
  - `pages/`: Components representing application pages/views.
  - `hooks/`: Custom React hooks.
  - `contexts/`: React context providers.
  - `utils/`: Utility functions.
  - `types/`: Shared TypeScript type definitions.
  - `styles/`: Global styles, SCSS modules, Tailwind setup.
  - `lib/`: Core libraries or modules (e.g., caching).
  - `api/`: Client-side API fetching logic (e.g., functions using React Query).
  - `workers/`: Web worker implementations.
  - `App.tsx`: Main application component.
  - `main.tsx`: Client-side entry point.
  - `entry-server.tsx`: Server-side entry point for SSR.
- `server.ts`: Express server setup, including API routing and Vite SSR middleware.
- `public/`: Static assets served by Express.
- `dist/`: Output directory for production builds (client and server).
- `vite.config.client.ts`: Vite configuration for the client build.
- `vite.config.server.ts`: Vite configuration for the server build.
- `tsconfig.json`: TypeScript configuration.
- `tailwind.config.js`: Tailwind CSS configuration.
  // ... other configuration files like .eslintrc, .prettierrc, commitlint.config.js etc.

## Configuration Files

- `vite.config.client.ts`: Vite configuration specific to the client build.
- `vite.config.server.ts`: Vite configuration specific to the server/SSR build.
- `tailwind.config.js`: Tailwind CSS theme and plugin configuration.
- `tsconfig.json`: TypeScript compiler options and path aliases.
- `.eslintrc.js` / `.eslintrc.cjs`: ESLint rules and configuration (adjust filename if needed).
- `prettier.config.js` / `.prettierrc.json`: Prettier code formatting rules (adjust filename if needed).
- `commitlint.config.js`: Conventional commit message rules.
- `.env`: Environment variables (not committed).

## API Routes

The Express server exposes the following API endpoints under the `/api` prefix:

- `/api/folders`: Endpoints related to folder operations.
- `/api/image`: Endpoints for fetching/managing single image data.
- `/api/images`: Endpoints for fetching lists of images.
- `/api/image/[...params]`: Dynamic routes for specific image parameters/actions.
- `/api/search`: Endpoint for searching images.
- `/api/upload`: Endpoint for file uploads.
- `/api/getCurrentDirectory`: Endpoint to get the configured main directory.

## Contributing

[Add contribution guidelines here]

## License

[Add license information here]
