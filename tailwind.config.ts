import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        persian: {
          50: '#f0f4fa',
          100: '#d9e4f5',
          200: '#b8ceeb',
          300: '#8baede',
          400: '#5a8ad0',
          500: '#1c39bb',
          600: '#132ea0',
          700: '#0e2280',
          800: '#002d62',
          900: '#001a3d',
        },
        surface: '#ffffff',
        cardbg: '#f8fafc',
        linebg: '#f1f5f9',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
