/* eslint-disable no-console -- Lifecycle logging before Effect runtime is available */
import { env as processEnv } from 'node:process';
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import { env } from './env';

/**
 * Configure global HTTP/HTTPS proxy for corporate environments.
 * Must be called before any network requests are made.
 */
export const configureProxy = (): void => {
  const proxyUrl = env.HTTPS_PROXY ?? env.HTTP_PROXY;

  if (!proxyUrl) {
    return;
  }

  processEnv.NODE_EXTRA_CA_CERTS = env.NODE_EXTRA_CA_CERTS!;
  console.log(
    `[Proxy] Configuring proxy: ${maskProxyUrl(proxyUrl)} (NODE_EXTRA_CA_CERTS configured)`,
  );

  const proxyAgent = new ProxyAgent({
    uri: proxyUrl,
    ...(env.NO_PROXY && { noProxy: env.NO_PROXY }),
  });

  setGlobalDispatcher(proxyAgent);
  console.log('[Proxy] Global fetch dispatcher configured with proxy agent');

  if (env.NO_PROXY) {
    console.log(`[Proxy] NO_PROXY hosts: ${env.NO_PROXY}`);
  }
};

function maskProxyUrl(value: string): string {
  try {
    const parsed = new URL(value);
    if (!parsed.username && !parsed.password) {
      return parsed.toString();
    }
    parsed.username = '***';
    parsed.password = '***';
    return parsed.toString();
  } catch {
    return '[invalid-proxy-url]';
  }
}
