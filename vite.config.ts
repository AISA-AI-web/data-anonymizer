import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// The built app must never talk to the network: student data stays in the browser.
// `connect-src 'none'` blocks fetch/XHR/WebSocket even if a bug or a dependency tried.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'none'",
  // Only the click-to-play video tutorial, played by Google Drive's own player.
  'frame-src https://drive.google.com',
  "worker-src 'none'",
  "object-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`,
      );
    },
  };
}

export default defineConfig({
  // Relative paths so the build works on GitHub Pages sub-paths and when opened from disk.
  base: './',
  plugins: [react(), contentSecurityPolicy()],
  build: {
    chunkSizeWarningLimit: 1500,
  },
});
