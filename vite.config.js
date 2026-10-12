import { defineConfig } from 'vite';

// Public URL path the site is served from.
// GitHub Pages (project site): https://<username>.github.io/<repo-name>/ → base "/<repo-name>/".
// The deploy workflow passes that path in BASE_PATH, so the repo can have any name.
// Locally (npm run dev / build without BASE_PATH) it stays "/".
// To hard-code it instead, replace the line below with: const base = '/<repo-name>/';
const base = (process.env.BASE_PATH || '/').replace(/\/?$/, '/');

export default defineConfig({
  base,
  server: { host: true, port: 5173 },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
  },
});
