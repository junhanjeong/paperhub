import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    safelist: [
        {
            pattern: /bg-(blue|indigo|emerald|yellow|rose|purple)-(50|600)/,
        },
        {
            pattern: /text-(blue|indigo|emerald|yellow|rose|purple)-600/,
        },
        {
            pattern: /group-hover:bg-(blue|indigo|emerald|yellow|rose|purple)-600/,
        },
        {
            pattern: /group-hover:text-white/,
        },
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-inter)", "var(--font-noto-sans-kr)", "sans-serif"],
            },
        },
    },
    plugins: [],
};
export default config;
