/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // Deadline/date derivations are TZ-sensitive (prototype parity uses the
    // viewer's TZ); tests pin the demo timezone for determinism.
    env: { TZ: 'America/New_York' },
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
    passWithNoTests: true,
  },
})
