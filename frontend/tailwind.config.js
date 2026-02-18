/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        tg: {
          blue: "#2AABEE",
          dark: "#17212B",
          sidebar: "#0E1621",
          hover: "#202B36",
          input: "#242F3D",
          text: "#F5F5F5",
          muted: "#6C7883",
          green: "#4FAE4E",
          bubble: "#2B5278",
          "bubble-own": "#2B5278",
        },
      },
    },
  },
  plugins: [],
};
