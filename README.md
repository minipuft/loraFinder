# LoraFinder

LoraFinder is a web application for managing and viewing image files, with a focus on LORA (Low-Rank Adaptation) models or related content.

## Features

- Browse images stored in different folders
- Upload new images to specific folders
- Search functionality across all images
- Zoom control for image viewing
- Responsive design

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Axios for API calls

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Create a `.env.local` file in the root directory and add:
   ```bash
   MAIN_DIRECTORY=/path/to/your/image/directory
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

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
