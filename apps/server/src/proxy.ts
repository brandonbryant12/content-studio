import { ProxyAgent, setGlobalDispatcher } from 'undici';
import { env } from './env';

/**
 * Configure global HTTP/HTTPS proxy for corporate environments.
 *
 * When HTTPS_PROXY or HTTP_PROXY env vars are set:
 * 1. Sets NODE_TLS_REJECT_UNAUTHORIZED=0 to handle self-signed certs on corporate proxies
 * 2. Configures undici's global dispatcher with a ProxyAgent
 *
 * This must be called before any network requests are made.
 */
export const configureProxy = (): void => {
  const proxyUrl = env.HTTPS_PROXY ?? env.HTTP_PROXY;

  if (!proxyUrl) {
    return;
  }

  console.log(`[Proxy] Configuring proxy: ${proxyUrl}`);

  // Allow self-signed certificates on corporate proxies
  // This is necessary because corporate proxies often use their own CA
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.log(
    '[Proxy] Disabled TLS certificate verification (NODE_TLS_REJECT_UNAUTHORIZED=0)',
  );

  // Configure undici global dispatcher with proxy
  const proxyAgent = new ProxyAgent({
    uri: proxyUrl,
    // Pass through NO_PROXY if configured
    ...(env.NO_PROXY && {
      noProxy: env.NO_PROXY,
    }),
  });

  setGlobalDispatcher(proxyAgent);
  console.log('[Proxy] Global fetch dispatcher configured with proxy agent');

  if (env.NO_PROXY) {
    console.log(`[Proxy] NO_PROXY hosts: ${env.NO_PROXY}`);
  }
};
