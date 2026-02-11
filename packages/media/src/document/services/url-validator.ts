import { Effect } from 'effect';
import { InvalidUrlError } from '../../errors';

const MAX_URL_LENGTH = 2048;

const PRIVATE_IP_PATTERNS = [
  // IPv4 private ranges
  /^127\./, // 127.0.0.0/8
  /^10\./, // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
  /^192\.168\./, // 192.168.0.0/16
  /^169\.254\./, // 169.254.0.0/16
  /^0\./, // 0.0.0.0/8
  // IPv6 private ranges
  /^::1$/, // loopback
  /^fc00:/i, // unique local (fc00::/7)
  /^fd/i, // unique local (fd00::/8)
  /^fe80:/i, // link-local
];

function isPrivateIp(hostname: string): boolean {
  const clean = hostname.replace(/^\[|]$/g, '');
  if (clean === 'localhost') return true;
  return PRIVATE_IP_PATTERNS.some((re) => re.test(clean));
}

export function validateUrl(url: string): Effect.Effect<URL, InvalidUrlError> {
  return Effect.gen(function* () {
    if (url.length > MAX_URL_LENGTH) {
      return yield* new InvalidUrlError({
        url: url.slice(0, 100) + '...',
        message: `URL exceeds maximum length of ${MAX_URL_LENGTH} characters`,
      });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return yield* new InvalidUrlError({
        url,
        message: 'Invalid URL format',
      });
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return yield* new InvalidUrlError({
        url,
        message: `Unsupported URL scheme: ${parsed.protocol.replace(':', '')}. Only HTTP and HTTPS are allowed`,
      });
    }

    if (isPrivateIp(parsed.hostname)) {
      return yield* new InvalidUrlError({
        url,
        message:
          'URLs pointing to private or internal network addresses are not allowed',
      });
    }

    return parsed;
  });
}
