// tailwind.config.js
import defaultTheme from "tailwindcss/defaultTheme";

export default {
  content: ["./src/**/*.{html,js,astro}"],
  theme: {
    extend: {
      screens: {
        "below-xs": { max: "374px" },
      },
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
        primary: {
          DEFAULT: "#178FE4",
          light: "#309BE8",
          dot: "#BEDCF1",
        },
        orange: "#FFB232",
        aqua: "#3FE694",
        green: "#89CB73",
        yellow: "#F0ED37",
        pink: "#FB98CC",
        purple: "#9E46FF",
        cornflower: "#6766FF",
        foreground: "#111111",
      },
      backgroundImage: {
        "custom-dotted":
          "url(\"data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='%23BEDCF1' stroke-width='4' stroke-dasharray='0, 10' stroke-linecap='round'/%3e%3c/svg%3e\")",
      },
    },
  },
  plugins: [],
};
