/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    colors: {
      // Primary
      "orange-050": "#FFE8D9",
      "orange-100": "#FFD0B5",
      "orange-200": "#FFB088",
      "orange-300": "#FF9466",
      "orange-400": "#F9703E",
      "orange-500": "#F35627",
      "orange-600": "#DE3A11",
      "orange-700": "#C52707",
      "orange-800": "#AD1D07",
      "orange-900": "#841003",

      brand: "#AD1D07",

      // Neutrals
      "gray-050": "#F5F7FA",
      "gray-100": "#E4E7EB",
      "gray-200": "#CBD2D9",
      "gray-300": "#9AA5B1",
      "gray-400": "#7B8794",
      "gray-500": "#616E7C",
      "gray-600": "#52606D",
      "gray-700": "#3E4C59",
      "gray-800": "#323F4B",
      "gray-900": "#1F2933",

      // Supporting
      "blue-050": "#E0E8F9",
      "blue-100": "#BED0F7",
      "blue-200": "#98AEEB",
      "blue-300": "#7B93DB",
      "blue-400": "#647ACB",
      "blue-500": "#4C63B6",
      "blue-600": "#4055A8",
      "blue-700": "#35469C",
      "blue-800": "#2D3A8C",
      "blue-900": "#19216C",

      "red-050": "#FFEEEE",
      "red-100": "#FACDCD",
      "red-200": "#F29B9B",
      "red-300": "#E66A6A",
      "red-400": "#D64545",
      "red-500": "#BA2525",
      "red-600": "#A61B1B",
      "red-700": "#911111",
      "red-800": "#780A0A",
      "red-900": "#610404",

      "yellow-050": "#FFFAEB",
      "yellow-100": "#FCEFC7",
      "yellow-200": "#F8E3A3",
      "yellow-300": "#F9DA8B",
      "yellow-400": "#F7D070",
      "yellow-500": "#E9B949",
      "yellow-600": "#C99A2E",
      "yellow-700": "#A27C1A",
      "yellow-800": "#7C5E10",
      "yellow-900": "#513C06",

      "green-050": "#E3F9E5",
      "green-100": "#C1EAC5",
      "green-200": "#A3D9A5",
      "green-300": "#7BC47F",
      "green-400": "#57AE5B",
      "green-500": "#3F9142",
      "green-600": "#2F8132",
      "green-700": "#207227",
      "green-800": "#0E5814",
      "green-900": "#05400A",

      black: "#0D0D0D",
      white: "#F2F2F2",
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
      },
    },
  },
  darkMode: "class",
  plugins: [],
};

module.exports = config;
