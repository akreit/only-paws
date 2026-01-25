export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app/**/*.{js,vue,ts}',
    './error.vue'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef3e2',
          100: '#fde8c8',
          200: '#fbd4a0',
          300: '#f8b36b',
          400: '#f5923b',
          500: '#f37516',
          600: '#d45e11',
          700: '#b14a0e',
          800: '#8f3b14',
          900: '#753313',
          950: '#3d1a08'
        }
      }
    }
  },
  plugins: []
}