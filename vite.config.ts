import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'www' // This tells Vite to output the build to the 'www' folder Capacitor expects
  }
})
