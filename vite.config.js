import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  preview: {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 4173,
    host: '0.0.0.0',
    allowedHosts: ['.+', 'fampals-925495129376.europe-west4.run.app']
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
