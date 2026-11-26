import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative base so the built site works under any GitHub Pages path (https://<user>.github.io/<repo>/)
  base: './',
})
