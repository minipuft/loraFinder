module.exports = {
  // Specify the files Tailwind should scan for classes
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom color palette
      colors: {
        primary: '#E60023', // Pinterest red
        secondary: '#111111', // Dark gray for text
        background: {
          light: '#FFFFFF',
          dark: '#EFEFEF',
        },
        gray: {
          100: '#F7F7F7',
          200: '#EFEFEF',
          300: '#DCDCDC',
          400: '#CCCCCC',
          500: '#8E8E8E',
          600: '#767676',
          700: '#111111',
        },
        peach: '#C53453',
        navy: '#001f3f', // Add the navy color here
      },
      // Custom font stack
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen-Sans', 'Ubuntu', 'Cantarell', 'Helvetica Neue', 'sans-serif'],
      },
    },
  },
  variants: {
    extend: {
      // Enable additional variant combinations
      opacity: ['group-hover'],
      transform: ['group-hover'],
    },
  },
  plugins: [
    require('@tailwindcss/aspect-ratio'),
    // Add any Tailwind plugins here
  ],
}