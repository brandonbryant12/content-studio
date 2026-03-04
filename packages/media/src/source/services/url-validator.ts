import dns from 'node:dns/promises';
import net from 'node:net';
import { env } from 'node:process';
import { Effect } from 'effect';
import { InvalidUrlError } from '../../errors';

const MAX_URL_LENGTH = 2048;

interface ValidateUrlOptions {
  enforceDnsResolution?: boolean;
  lookupHostAddresses?: (hostname: string) => Promise<readonly string[]>;
}

const BLOCKED_HOSTNAMES = new Set(['localhost']);

const shouldEnforceDnsResolution = (): boolean => env.NODE_ENV === 'production';

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^\[|]$/g, '').toLowerCase();
}

function parseIPv4(
  hostname: string,
): readonly [number, number, number, number] | null {
  if (!net.isIPv4(hostname)) return null;
  const parts = hostname.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return null;
  }
  return [parts[0]!, parts[1]!, parts[2]!, parts[3]!];
}

function isPrivateOrReservedIPv4(
  octets: readonly [number, number, number, number],
): boolean {
  const [a, b] = octets;

  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

function parseIPv6(hostname: string): readonly number[] | null {
  let value = hostname.toLowerCase();
  const zoneIndex = value.indexOf('%');
  if (zoneIndex >= 0) {
    value = value.slice(0, zoneIndex);
  }

  if (value.includes('.')) {
    const ipv4SeparatorIndex = value.lastIndexOf(':');
    if (ipv4SeparatorIndex < 0) return null;

    const ipv4 = parseIPv4(value.slice(ipv4SeparatorIndex + 1));
    if (!ipv4) return null;

    const high = ((ipv4[0] << 8) | ipv4[1]).toString(16);
    const low = ((ipv4[2] << 8) | ipv4[3]).toString(16);
    value = `${value.slice(0, ipv4SeparatorIndex)}:${high}:${low}`;
  }

  const parts = value.split('::');
  if (parts.length > 2) return null;

  const left = parts[0] ? parts[0].split(':').filter(Boolean) : [];
  const right =
    parts.length === 2 && parts[1] ? parts[1].split(':').filter(Boolean) : [];

  const missingGroups = 8 - (left.length + right.length);
  if ((parts.length === 1 && missingGroups !== 0) || missingGroups < 0) {
    return null;
  }

  const full = [
    ...left,
    ...(parts.length === 2 ? Array(missingGroups).fill('0') : []),
    ...right,
  ];

  if (full.length !== 8) return null;
  const hextets: number[] = [];
  for (const part of full) {
    if (!/^[0-9a-f]{1,4}$/i.test(part)) return null;
    hextets.push(parseInt(part, 16));
  }

  return hextets;
}

function isPrivateOrReservedIPv6(hextets: readonly number[]): boolean {
  const first = hextets[0]!;
  const second = hextets[1]!;
  const mappedIpv4 = ipv4FromMappedIpv6(hextets);

  if (mappedIpv4) {
    return isPrivateOrReservedIPv4(mappedIpv4);
  }

  const loopback =
    hextets.slice(0, 7).every((segment) => segment === 0) && hextets[7] === 1;
  const unspecified = hextets.every((segment) => segment === 0);
  const uniqueLocal = (first & 0xfe00) === 0xfc00;
  const linkLocal = (first & 0xffc0) === 0xfe80;
  const multicast = (first & 0xff00) === 0xff00;
  const documentation = first === 0x2001 && second === 0x0db8;

  return (
    loopback ||
    unspecified ||
    uniqueLocal ||
    linkLocal ||
    multicast ||
    documentation
  );
}

function ipv4FromMappedIpv6(
  hextets: readonly number[],
): readonly [number, number, number, number] | null {
  const isIpv4Mapped =
    hextets.length === 8 &&
    hextets[0] === 0 &&
    hextets[1] === 0 &&
    hextets[2] === 0 &&
    hextets[3] === 0 &&
    hextets[4] === 0 &&
    hextets[5] === 0xffff;

  if (!isIpv4Mapped) {
    return null;
  }

  const seventh = hextets[6]!;
  const eighth = hextets[7]!;

  return [
    (seventh >> 8) & 0xff,
    seventh & 0xff,
    (eighth >> 8) & 0xff,
    eighth & 0xff,
  ];
}

function isPrivateOrReservedHost(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  if (BLOCKED_HOSTNAMES.has(normalized)) return true;

  const ipv4 = parseIPv4(normalized);
  if (ipv4) return isPrivateOrReservedIPv4(ipv4);

  const ipv6 = parseIPv6(normalized);
  if (ipv6) return isPrivateOrReservedIPv6(ipv6);

  return false;
}

function isIpLiteral(hostname: string): boolean {
  return net.isIP(normalizeHostname(hostname)) !== 0;
}

async function lookupHostAddresses(
  hostname: string,
): Promise<readonly string[]> {
  const results = await dns.lookup(hostname, { all: true, verbatim: true });
  return results.map((result) => result.address);
}

export function validateUrl(
  url: string,
  options?: ValidateUrlOptions,
): Effect.Effect<URL, InvalidUrlError> {
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

    if (parsed.username || parsed.password) {
      return yield* new InvalidUrlError({
        url,
        message: 'URLs with embedded credentials are not allowed',
      });
    }

    if (isPrivateOrReservedHost(parsed.hostname)) {
      return yield* new InvalidUrlError({
        url,
        message:
          'URLs pointing to private or internal network addresses are not allowed',
      });
    }

    const enforceDnsResolution =
      options?.enforceDnsResolution ?? shouldEnforceDnsResolution();
    const hostname = normalizeHostname(parsed.hostname);

    if (enforceDnsResolution && !isIpLiteral(hostname)) {
      const resolvedAddresses = yield* Effect.tryPromise({
        try: () =>
          (options?.lookupHostAddresses ?? lookupHostAddresses)(hostname),
        catch: () =>
          new InvalidUrlError({
            url,
            message: 'Unable to resolve host address',
          }),
      });

      if (resolvedAddresses.length === 0) {
        return yield* new InvalidUrlError({
          url,
          message: 'Unable to resolve host address',
        });
      }

      if (
        resolvedAddresses.some((address) => isPrivateOrReservedHost(address))
      ) {
        return yield* new InvalidUrlError({
          url,
          message: 'URL host resolves to a private or reserved network address',
        });
      }
    }

    return parsed;
  });
}
