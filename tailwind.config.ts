import type { Config } from "tailwindcss";

const withOklch = (variable: string) => {
  return ({ opacityValue }: { opacityValue?: string }) => {
    if (opacityValue !== undefined) {
      return `oklch(var(${variable}) / ${opacityValue})`;
    }
    return `oklch(var(${variable}))`;
  };
};

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: withOklch("--border"),
        input: withOklch("--input"),
        ring: withOklch("--ring"),
        background: withOklch("--background"),
        foreground: withOklch("--foreground"),
        brand: {
          DEFAULT: withOklch("--brand"),
          foreground: withOklch("--brand-foreground"),
          soft: withOklch("--brand-soft"),
          "soft-foreground": withOklch("--brand-soft-foreground"),
        },
        primary: {
          DEFAULT: withOklch("--primary"),
          foreground: withOklch("--primary-foreground"),
        },
        secondary: {
          DEFAULT: withOklch("--secondary"),
          foreground: withOklch("--secondary-foreground"),
        },
        destructive: {
          DEFAULT: withOklch("--destructive"),
          foreground: withOklch("--destructive-foreground"),
        },
        muted: {
          DEFAULT: withOklch("--muted"),
          foreground: withOklch("--muted-foreground"),
        },
        accent: {
          DEFAULT: withOklch("--accent"),
          foreground: withOklch("--accent-foreground"),
        },
        popover: {
          DEFAULT: withOklch("--popover"),
          foreground: withOklch("--popover-foreground"),
        },
        card: {
          DEFAULT: withOklch("--card"),
          foreground: withOklch("--card-foreground"),
        },
        panel: withOklch("--panel-bg"),
        canvas: withOklch("--canvas-bg"),
        "tool-hover": withOklch("--tool-hover"),
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
