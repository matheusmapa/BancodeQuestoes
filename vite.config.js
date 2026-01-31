import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        importador: resolve(__dirname, 'import.html'), // <--- Adicionamos o import.html aqui
      },
    },
  },
})
