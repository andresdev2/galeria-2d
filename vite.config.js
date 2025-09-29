import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/galeria-2d/',     // ← nombre EXACTO del repo
  build: { outDir: 'docs' },// ← Vite generará la web en /docs
  plugins: [react()],
})