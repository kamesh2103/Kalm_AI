module.exports = {
  purge: [],
  darkMode: false, // or 'media' or 'class'
   theme: {
    extend: {
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
      animation: {
        fadeIn: 'fadeIn 1.5s ease-in-out',
      }
    }},
  variants: {
    extend: {},
  },
  plugins: [],
}
