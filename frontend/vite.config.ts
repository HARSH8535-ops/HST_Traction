import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const root = path.resolve(__dirname);

    const env = loadEnv(mode, '.', '');
    return {
      root,

      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/v1/preview': {
            target: 'http://localhost:8001',
            changeOrigin: true,
          },
          '/api': {
            target: 'http://localhost:8001',
            changeOrigin: true,
          }
        }
      },
      plugins: [react(), tailwindcss()],
      define: {
        'process.env.AWS_ACCESS_KEY_ID': JSON.stringify(env.AWS_ACCESS_KEY_ID || 'mock_key'),
        'process.env.AWS_SECRET_ACCESS_KEY': JSON.stringify(env.AWS_SECRET_ACCESS_KEY || 'mock_secret'),
        'process.env.AWS_REGION': JSON.stringify(env.AWS_REGION || "us-east-1"),
        'process.env.ENCRYPTION_KEY': JSON.stringify(env.ENCRYPTION_KEY || 'tp_secure_x92_key'),
        'process.env.AUDIT_KEY': JSON.stringify(env.AUDIT_KEY || 'tractionpal_audit_secure')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      },
      build: {
        outDir: path.resolve(__dirname, '../dist'),
        emptyOutDir: true,
      }
    };
});
