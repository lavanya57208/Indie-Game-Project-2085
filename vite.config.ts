import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/Indie-Game-Project-2085/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
