# MediaFlow

MediaFlow is a web application for managing and viewing image files, with a focus on displaying preview images for LORA (Low-Rank Adaptation) FLUX and related models. Built with Vite, Express, and React, it provides a robust platform for image management and viewing.

## Features

- 🖼️ Advanced image management and viewing capabilities
- 📁 Hierarchical folder navigation and management
- 🔍 Full-text search across all images and folders
- 🎨 Responsive masonry grid layout
- 🔄 Real-time image processing with Sharp
- 📱 Mobile-friendly responsive design
- ⚡ Fast image loading with lazy loading and caching
- 🎯 Cursor-based pagination for efficient data loading
- 🔒 Secure file handling and validation

## Tech Stack

### Frontend

- React 18 with TypeScript
- Vite for development and building
- SCSS Modules + Tailwind CSS for styling
- Framer Motion for animations
- React Query for data fetching
- Zustand for state management (planned)

### Backend

- Express.js server
- Sharp for image processing
- Node Cache for server-side caching
- TypeScript for type safety
- Socket.io for real-time features (planned)

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/lorafinder.git
   cd lorafinder
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:

   ```env
   VITE_PORT=3001
   VITE_HOST=localhost
   MAIN_DIRECTORY=/path/to/your/image/directory
   ```

4. **Development**

   ```bash
   npm run dev
   ```

   This will start:

   - Client at http://localhost:5173
   - Server at http://localhost:3001

5. **Production Build**
   ```bash
   npm run build
   npm start
   ```

## Project Structure

- `/components`: React components
- `/pages`: Next.js pages and API routes
- `/hooks`: Custom React hooks
- `/utils`: Utility functions and constants
- `/types`: TypeScript type definitions
- `/styles`: Global styles and Tailwind config

## Configuration

- `next.config.js`: Next.js configuration
- `tailwind.config.js`: Tailwind CSS configuration
- `tsconfig.json`: TypeScript configuration
- `.eslintrc.json`: ESLint configuration

## API Routes

- `/api/images`: Get images from a specified folder
- `/api/upload`: Upload files to a specified folder
- `/api/getCurrentDirectory`: Get the current main directory
- `/api/search`: Search for images across all folders

## Contributing

[Add contribution guidelines here]

## License

[Add license information here]
