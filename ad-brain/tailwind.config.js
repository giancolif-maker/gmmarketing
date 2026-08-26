/** Ad-Brain's Tailwind config. Compiled once with `npx tailwindcss` into
 * static/css/app.css — no CDN script at runtime, so the app renders fully
 * offline (fitting for a self-hosted tool). Re-run the build command in
 * README.md after changing any class names in templates/ or static/js/. */
module.exports = {
  content: ["./templates/**/*.html", "./static/js/**/*.js"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
