/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        gowash: {
          50: "#eef7ff",
          100: "#d9edff",
          500: "#0284c7",
          600: "#0369a1",
          700: "#075985",
        },
      },
    },
  },
  plugins: [],
};
