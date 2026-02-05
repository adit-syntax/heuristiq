import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// LeetCode/CodeChef contest data is public but CORS-locked to their own
// sites; proxy so the browser hits them same-origin. (Codeforces and
// AtCoder's community API are CORS-open and need no proxy.)
const contestProxies = {
  '/lc-graphql': {
    target: 'https://leetcode.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/lc-graphql/, ''),
  },
  '/cc-api': {
    target: 'https://www.codechef.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/cc-api/, ''),
  },
  '/ac': {
    target: 'https://atcoder.jp',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/ac/, ''),
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Excalidraw reads this at module scope.
  define: { 'process.env.IS_PREACT': JSON.stringify('false') },
  server: { proxy: contestProxies },
  preview: { proxy: contestProxies },
  build: {
    // Keep the 500 kB question sheet and the editor/whiteboard out of the entry chunk.
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          excalidraw: ['@excalidraw/excalidraw'],
        },
      },
    },
  },
})
