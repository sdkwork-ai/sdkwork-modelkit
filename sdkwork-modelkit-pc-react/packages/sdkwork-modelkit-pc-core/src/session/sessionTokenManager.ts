import type { AuthTokenManager, AuthTokens } from '@sdkwork/sdk-common';
import { readBootstrapAccessTokenFromProcessEnv } from '@sdkwork/iam-credential-entry';
import { resetModelkitDriveAppClient } from '../sdk/driveAppClient';
import {
  clearModelkitAppSessionTokens,
  persistModelkitAppSessionTokens,
  readModelkitAppSessionTokens,
  type ModelkitAppSessionTokens,
} from './appSession';

let modelkitGlobalTokenManager: AuthTokenManager | null = null;

function createModelkitSessionTokenManager(
  readSession: () => ModelkitAppSessionTokens,
): AuthTokenManager {
  let currentSession = readSession();

  const readCurrentSession = () => currentSession ?? readSession();
  const patchTokens = (tokens: Partial<ModelkitAppSessionTokens>) => {
    currentSession = {
      ...readCurrentSession(),
      ...tokens,
    };
    persistModelkitAppSessionTokens(currentSession);
    resetModelkitDriveAppClient();
  };

  const readAccessToken = (): string | undefined =>
    readCurrentSession().accessToken ?? readBootstrapAccessTokenFromProcessEnv();

  return {
    getAuthToken: () => readCurrentSession().authToken,
    // Fall back to the private credential-entry bootstrap artifact when no login
    // session exists yet (APP_SDK_INTEGRATION_SPEC §4). Without this, every
    // generated SDK transport throws "access-token-only request requires
    // Access-Token before request dispatch" during credential entry.
    getAccessToken: readAccessToken,
    getRefreshToken: () => readCurrentSession().refreshToken,
    getTokens: (): AuthTokens => {
      const accessToken = readAccessToken();
      return {
        ...(accessToken ? { accessToken } : {}),
        ...(readCurrentSession().authToken ? { authToken: readCurrentSession().authToken } : {}),
        ...(readCurrentSession().refreshToken ? { refreshToken: readCurrentSession().refreshToken } : {}),
      };
    },
    setTokens: (tokens: AuthTokens) => patchTokens(tokens),
    setAccessToken: (accessToken: string) => patchTokens({ accessToken }),
    setAuthToken: (authToken: string) => patchTokens({ authToken }),
    setRefreshToken: (refreshToken: string) => patchTokens({ refreshToken }),
    clearTokens: () => {
      currentSession = {};
      clearModelkitAppSessionTokens();
      resetModelkitDriveAppClient();
    },
    clearAuthToken: () => patchTokens({ authToken: undefined }),
    clearAccessToken: () => patchTokens({ accessToken: undefined }),
    isExpired: () => false,
    isValid: () => Boolean(readCurrentSession().authToken && readCurrentSession().accessToken),
    hasToken: () => Boolean(readCurrentSession().authToken && readCurrentSession().accessToken),
    hasAuthToken: () => Boolean(readCurrentSession().authToken),
    hasAccessToken: () => readAccessToken() !== undefined,
    willExpireIn: () => false,
  };
}

export function getModelkitGlobalTokenManager(): AuthTokenManager {
  if (!modelkitGlobalTokenManager) {
    modelkitGlobalTokenManager = createModelkitSessionTokenManager(() => readModelkitAppSessionTokens());
  }
  return modelkitGlobalTokenManager;
}

export function resetModelkitGlobalTokenManager(): void {
  modelkitGlobalTokenManager = null;
}
