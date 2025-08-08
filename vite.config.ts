import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/auth': 'http://localhost:4000',
      '/socket.io': {
        target: 'ws://localhost:4000',
        ws: true,
      },
    },
  },
})
