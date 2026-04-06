/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        timber: '#2C1810',
        saddle: '#5C3A21',
        rawhide: '#A67B5B',
        wheat: '#D4B896',
        parchment: '#F2E8D9',
        snow: '#FAF7F2',
        pine: '#2D4A3E',
        creek: '#4A7C6F',
        dusk: '#8B4E6A',
        ember: '#C7522A',
        gold: '#D4A333',
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Source Sans 3', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
