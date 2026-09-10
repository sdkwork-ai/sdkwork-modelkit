import { resolveBaseUrl } from '@sdkwork/sdk-common';
import { createClient, type SdkworkAppClient } from '@sdkwork/iam-app-sdk';
import {
  createSdkworkAppbasePcAuthRuntime,
  type SdkworkAppbasePcAuthRuntimeComposition,
  type SdkworkAppbasePcAuthSessionBridgeSession,
} from '@sdkwork/auth-runtime-pc-react';
import type { IamDeploymentMode, IamEnvironment } from '@sdkwork/iam-contracts';
import type { AuthTokenManager } from '@sdkwork/sdk-common';
import { createDriveAppClient, type SdkworkDriveAppClient } from '@sdkwork/drive-app-sdk';

import {
  hasModelkitIamSession,
  modelkitSessionStore,
  type ModelkitSessionSnapshot,
} from '../session/modelkitSessionStore';
import {
  clearModelkitAppSessionTokens,
  persistModelkitAppSessionTokens,
  readModelkitAppSessionTokens,
  type ModelkitAppSessionTokens,
} from '../session/appSession';
import { getModelkitGlobalTokenManager, resetModelkitGlobalTokenManager } from '../session/sessionTokenManager';
import { resetModelkitDriveAppClient } from '../sdk/driveAppClient';

const MODELKIT_APP_ID = 'sdkwork-modelkit-pc';
const APP_API_PREFIX = '/app/v3/api';

export type ModelkitIamRuntime = ReturnType<SdkworkAppbasePcAuthRuntimeComposition['getRuntime']>;

export interface ModelkitIamBundle {
  tokenManager: AuthTokenManager;
  appbaseApp: SdkworkAppClient;
  runtime: ModelkitIamRuntime;
  createDriveClient: () => SdkworkDriveAppClient;
}

let cachedComposition: SdkworkAppbasePcAuthRuntimeComposition | null = null;

function readEnvValue(...keys: string[]): string | undefined {
  const meta = import.meta as ImportMeta & {
    env?: Record<string, string | boolean | undefined>;
  };

  for (const key of keys) {
    const value = meta.env?.[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

export function resolveModelkitPlatformApiGatewayHttpUrl(): string {
  return (
    readEnvValue(
      'VITE_SDKWORK_MODELKIT_PLATFORM_API_GATEWAY_HTTP_URL',
      'VITE_SDKWORK_MODELKIT_APPLICATION_PUBLIC_HTTP_URL',
      'VITE_SDKWORK_APPBASE_APP_API_BASE_URL',
      'VITE_SDKWORK_IAM_APP_API_BASE_URL',
    )
    // Shared §6.3 default: SDKWORK_API_BASE_URL candidates matched against
    // the page host, else derived from it (cloud dev -> local cloud-gateway
    // dev port; standalone -> same origin).
    ?? resolveBaseUrl().url
    // base-url-check: exempt (no-window SSR/test last-ditch modelkit local
    // listener; browser resolution above goes through resolveBaseUrl)
    ?? 'http://127.0.0.1:3901'
  );
}

function normalizeGeneratedSdkBaseUrl(baseUrl: string, apiPrefix: string): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const normalizedApiPrefix = apiPrefix.replace(/\/+$/, '');
  if (normalizedBaseUrl.endsWith(normalizedApiPrefix)) {
    return normalizedBaseUrl.slice(0, -normalizedApiPrefix.length) || normalizedBaseUrl;
  }
  return normalizedBaseUrl;
}

function toIamDeploymentMode(): IamDeploymentMode {
  const profile = readEnvValue('VITE_SDKWORK_MODELKIT_DEPLOYMENT_PROFILE', 'VITE_SDKWORK_DEPLOYMENT_MODE');
  if (profile === 'cloud' || profile === 'saas') {
    return 'saas';
  }
  if (profile === 'private') {
    return 'private';
  }
  return 'local';
}

function toIamEnvironment(): IamEnvironment {
  const value = readEnvValue('VITE_SDKWORK_MODELKIT_IAM_ENVIRONMENT', 'VITE_SDKWORK_IAM_ENVIRONMENT', 'MODE');
  if (value === 'production' || value === 'prod') {
    return 'prod';
  }
  if (value === 'test') {
    return 'test';
  }
  return 'dev';
}

function toBridgeSession(
  snapshot: ModelkitSessionSnapshot,
): SdkworkAppbasePcAuthSessionBridgeSession | null {
  if (!snapshot.authToken && !snapshot.accessToken) {
    return null;
  }

  return {
    ...(snapshot.accessToken ? { accessToken: snapshot.accessToken } : {}),
    ...(snapshot.authToken ? { authToken: snapshot.authToken } : {}),
    ...(snapshot.refreshToken ? { refreshToken: snapshot.refreshToken } : {}),
    ...(snapshot.sessionId ? { sessionId: snapshot.sessionId } : {}),
  };
}

function createAppbaseAppClient(tokenManager: AuthTokenManager): SdkworkAppClient {
  return createClient({
    authMode: 'dual-token',
    baseUrl: normalizeGeneratedSdkBaseUrl(resolveModelkitPlatformApiGatewayHttpUrl(), APP_API_PREFIX),
    platform: 'pc',
    tokenManager,
  });
}

function createModelkitIamComposition(): SdkworkAppbasePcAuthRuntimeComposition {
  const tokenManager = getModelkitGlobalTokenManager();
  const appbaseApp = createAppbaseAppClient(tokenManager);

  return createSdkworkAppbasePcAuthRuntime({
    app: {
      appId: MODELKIT_APP_ID,
      deploymentMode: toIamDeploymentMode(),
      environment: toIamEnvironment(),
      platform: 'pc',
    },
    baseUrls: {
      appbaseAppApiBaseUrl: resolveModelkitPlatformApiGatewayHttpUrl(),
    },
    createAppbaseAppClient: () => appbaseApp,
    hooks: {
      onSessionChanged: () => {
        resetModelkitDriveAppClient();
      },
    },
    sessionBridge: {
      clearSession: () => {
        clearModelkitAppSessionTokens();
        modelkitSessionStore.clearSession();
      },
      commitSession: (session) => {
        const tokens: ModelkitAppSessionTokens = {
          accessToken: session.accessToken,
          authToken: session.authToken,
          refreshToken: session.refreshToken,
        };
        persistModelkitAppSessionTokens(tokens);
        modelkitSessionStore.setSession({
          ...tokens,
          sessionId: session.sessionId,
        });
        return session;
      },
      readSession: () => toBridgeSession(modelkitSessionStore.refreshSession()),
    },
    tokenManager,
    sdkClients: [],
  });
}

export function invalidateModelkitIamRuntime(): void {
  cachedComposition = null;
}

export function getModelkitIamComposition(): SdkworkAppbasePcAuthRuntimeComposition {
  if (!cachedComposition) {
    cachedComposition = createModelkitIamComposition();
  }
  return cachedComposition;
}

export function getModelkitIamBundle(): ModelkitIamBundle {
  const composition = getModelkitIamComposition();
  const tokenManager = composition.tokenManager;

  return {
    tokenManager,
    appbaseApp: composition.appbaseApp,
    runtime: composition.runtime,
    createDriveClient: () =>
      createDriveAppClient({
        authMode: 'dual-token',
        baseUrl: normalizeGeneratedSdkBaseUrl(resolveModelkitPlatformApiGatewayHttpUrl(), APP_API_PREFIX),
        platform: 'pc',
        tokenManager,
      }),
  };
}

export async function bootstrapModelkitIamSession(): Promise<boolean> {
  const devAccessToken = readEnvValue('VITE_SDKWORK_ACCESS_TOKEN', 'SDKWORK_ACCESS_TOKEN');
  if (devAccessToken) {
    return true;
  }

  const { runtime } = getModelkitIamBundle();
  await runtime.hydrateTokenManager();

  const tokens = runtime.tokenManager.getTokens();
  if (!tokens?.authToken || !tokens.accessToken) {
    modelkitSessionStore.clearSession();
    invalidateModelkitIamRuntime();
    return false;
  }

  try {
    await runtime.service.auth.sessions.current.retrieve();
    return true;
  } catch {
    await runtime.service.auth.sessions.current.delete().catch(() => undefined);
    modelkitSessionStore.clearSession();
    invalidateModelkitIamRuntime();
    return false;
  }
}

export function hasModelkitAuthenticatedSession(
  snapshot: ModelkitSessionSnapshot = modelkitSessionStore.getSnapshot(),
): boolean {
  if (readEnvValue('VITE_SDKWORK_ACCESS_TOKEN', 'SDKWORK_ACCESS_TOKEN')) {
    return true;
  }
  return hasModelkitIamSession(snapshot);
}

export function resetModelkitIamRuntime(): void {
  cachedComposition = null;
  resetModelkitGlobalTokenManager();
  resetModelkitDriveAppClient();
}

export { readModelkitAppSessionTokens, persistModelkitAppSessionTokens, clearModelkitAppSessionTokens };
