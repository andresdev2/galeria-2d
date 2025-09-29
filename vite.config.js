import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/galeria-2d/',   // ← exactamente el nombre del repo
  plugins: [react()],
})