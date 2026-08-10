import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  preview: {
    allowedHosts: true,
  },
  build: {
    // El bundle principal ronda ~500 kB (145 kB gzip), peso aceptable para un
    // menú QR ligero. Subimos el umbral para evitar el falso warning de chunk
    // "> 500 kB" que PowerShell confunde con un error (NativeCommandError).
    chunkSizeWarningLimit: 700,
  },
})
