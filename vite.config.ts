import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configurado para entorno de escritorio (Electron / Tauri):
// base relativa para que funcione con file:// y export estático.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173 },
  build: { outDir: 'dist' },
})
