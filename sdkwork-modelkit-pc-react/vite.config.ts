import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const apiTarget =
    env.VITE_SDKWORK_MODELKIT_APPLICATION_PUBLIC_HTTP_URL || 'http://127.0.0.1:3901';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.SDKWORK_ACCESS_TOKEN': JSON.stringify(env.VITE_SDKWORK_ACCESS_TOKEN ?? ''),
    },
    resolve: {
      alias: [
        { find: '@sdkwork/modelkit-pc-core/sdk', replacement: path.resolve(__dirname, './packages/sdkwork-modelkit-pc-core/src/sdk/index.ts') },
        { find: '@sdkwork/modelkit-pc-core/host', replacement: path.resolve(__dirname, './packages/sdkwork-modelkit-pc-core/src/host/index.ts') },
        { find: '@sdkwork/modelkit-sdk-typescript', replacement: path.resolve(__dirname, './sdks/sdkwork-modelkit-sdk-typescript/src/index.ts') },
        { find: /^@sdkwork\/modelkit-(.*)$/, replacement: path.resolve(__dirname, './packages/sdkwork-modelkit-$1/src/index.ts') },
        { find: '@', replacement: path.resolve(__dirname, '.') },
      ],
    },
    server: {
      host: '127.0.0.1',
      port: 4179,
      strictPort: true,
      proxy: {
        '/app': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/healthz': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/readyz': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
