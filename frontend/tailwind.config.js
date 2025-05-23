/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'panze-orange': '#FF8C00', 
        'panze-blue': '#3498DB',
        'panze-green': '#2ECC71', 
        'panze-purple': '#9B59B6',
        'panze-red': '#E74C3C',
        'panze-gray': '#BDC3C7',
        'panze-dark': '#2C3E50',
        'brand-primary': '#3498DB', // 이전 컬러 이름 (호환성 유지)
        'brand-secondary': '#FF8C00',
        'brand-success': '#2ECC71',
        'brand-purple': '#9B59B6',
        'brand-danger': '#E74C3C',
        'brand-gray': '#BDC3C7',
        'gradient-start': '#FFA07A',
        'gradient-end': '#87CEEB',
        'card-bg': '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'panze': '12px',
        'panze-lg': '20px',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'panze': '0 2px 10px rgba(0, 0, 0, 0.05)',
        'card': '0 4px 15px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 10px 25px rgba(0, 0, 0, 0.1)',
      },
      backgroundImage: {
        'gradient-dashboard': 'linear-gradient(135deg, #FFA07A 0%, #87CEEB 100%)',
      },
    },
  },
  plugins: [],
}
