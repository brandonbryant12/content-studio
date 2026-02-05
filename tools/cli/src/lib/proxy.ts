import { ProxyAgent, setGlobalDispatcher } from 'undici';

/**
 * Configure global HTTP/HTTPS proxy when proxy env vars are present.
 * Must be called before any network requests.
 */
export const configureProxy = (): void => {
  // eslint-disable-next-line no-restricted-properties
  const proxyUrl = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;

  if (!proxyUrl) {
    return;
  }

  console.log(`[Proxy] Configuring proxy: ${proxyUrl}`);

  // eslint-disable-next-line no-restricted-properties
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  // eslint-disable-next-line no-restricted-properties
  const noProxy = process.env.NO_PROXY;

  const proxyAgent = new ProxyAgent({
    uri: proxyUrl,
    ...(noProxy && { noProxy }),
  });

  setGlobalDispatcher(proxyAgent);
  console.log('[Proxy] Global fetch dispatcher configured with proxy agent');

  if (noProxy) {
    console.log(`[Proxy] NO_PROXY hosts: ${noProxy}`);
  }
};
