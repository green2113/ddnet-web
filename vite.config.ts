import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isElectron = env.VITE_APP_TARGET === 'electron'
  return {
    plugins: [react()],
    base: isElectron ? './' : '/',
  }
})
