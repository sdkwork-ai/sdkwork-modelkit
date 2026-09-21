import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { createSdkworkCredentialEntryBootstrapVitePlugin } from '@sdkwork/iam-credential-entry/vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const bootstrapAccessToken = env.SDKWORK_ACCESS_TOKEN ?? process.env.SDKWORK_ACCESS_TOKEN;
  const apiTarget =
    env.VITE_SDKWORK_MODELKIT_APPLICATION_PUBLIC_HTTP_URL || 'http://127.0.0.1:3901';

  return {
    plugins: [
      // The bootstrap credential reaches the renderer only through the shared IAM
      // plugin (dev-server HTML injection as
      // `globalThis.__SDKWORK_CREDENTIAL_ENTRY_BOOTSTRAP_ACCESS_TOKEN__`).
      // `define['process.env.SDKWORK_ACCESS_TOKEN']` is NOT a valid handoff
      // (IAM_CREDENTIAL_ENTRY_SPEC.md section 4/5).
      createSdkworkCredentialEntryBootstrapVitePlugin({
        accessToken: bootstrapAccessToken,
        environment: resolveViteEnvironment(mode, process.env),
      }),
      react(), tailwindcss(),
    ],
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
