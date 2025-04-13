module.exports = {
  // Specify the files Tailwind should scan for classes
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Custom color palette
      colors: {
        primary: '#7aa2f7', // Tokyo Night blue
        secondary: '#bb9af7', // Tokyo Night purple
        background: {
          light: '#1a1b26', // Tokyo Night background
          dark: '#16161e', // Tokyo Night darker background
        },
        gray: {
          100: '#a9b1d6',
          200: '#9aa5ce',
          300: '#787c99',
          400: '#565f89',
          500: '#414868',
          600: '#363b54',
          700: '#24283b',
        },
        accent: {
          peach: '#ff9e64',
          green: '#9ece6a',
          cyan: '#7dcfff',
          red: '#f7768e',
        },
        transparent: 'transparent',
      },
      // Custom font stack for consistent typography across platforms
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen-Sans',
          'Ubuntu',
          'Cantarell',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
    },
  },
  variants: {
    extend: {
      // Enable additional variant combinations for enhanced interactivity
      opacity: ['group-hover'], // Apply opacity changes on group hover
      transform: ['group-hover'], // Apply transformations on group hover
    },
  },
  plugins: [
    // Add aspect-ratio plugin for responsive image and video containers
    require('@tailwindcss/aspect-ratio'),
    // Space for additional Tailwind plugins as needed
  ],
};
