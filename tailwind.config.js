// tailwind.config.js
import defaultTheme from "tailwindcss/defaultTheme";

export default {
  content: ["./src/**/*.{html,js,astro}"],
  theme: {
    extend: {
      fontFamily: {
        future: ['"Test The Future"', ...defaultTheme.fontFamily.sans],
      },
      fontSize: {
        headline: ["48px", { lineHeight: "60px" }],
        intro: ["36px", { lineHeight: "44px" }],
        bodyPrimary: ["21px", { lineHeight: "28px" }],
        bodySecondary: ["16px", { lineHeight: "22px" }],
        bodyTertiary: ["13px", { lineHeight: "18px" }],
        caption: ["11px", { lineHeight: "14px" }],
      },
      colors: {
        white: "#FAFAFA",
        primary: {
          DEFAULT: "#6081B4",
          light: "#258FE1",
        },
        orange: "#FB9061",
        green: "#89CB73",
        yellow: "#F0ED37",
        pink: "#FB98CC",
        foreground: "#111111",
      },
    },
  },
  plugins: [],
};
