const FILE_SLUG_FALLBACK = 'export';
const FILE_EXTENSION_REGEX = /\.([a-z0-9]{2,5})$/i;
const FILE_DATE_REGEX = /^\d{4}-\d{2}-\d{2}/;
const DIRECT_DOWNLOAD_PROTOCOLS = new Set(['blob:', 'data:']);

export function toFileSlug(
  value: string,
  fallback = FILE_SLUG_FALLBACK,
): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return fallback;

  const normalized = trimmed
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  return normalized || fallback;
}

export function getFileExtensionFromUrl(url: string, fallback: string): string {
  const normalizedFallback = fallback.replace(/^\./, '').toLowerCase();

  const parse = (value: string): string | null => {
    const withoutQuery = value.split(/[?#]/)[0];
    const segment = withoutQuery.split('/').pop();
    if (!segment) return null;

    const match = segment.match(FILE_EXTENSION_REGEX);
    if (!match?.[1]) return null;

    return match[1].toLowerCase();
  };

  try {
    return (
      parse(new URL(url, 'http://localhost').pathname) ?? normalizedFallback
    );
  } catch {
    return parse(url) ?? normalizedFallback;
  }
}

function toFileDateSegment(value: Date | string | null | undefined): string {
  if (!value) return '';

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) return '';

    const isoMatch = normalized.match(FILE_DATE_REGEX);
    if (isoMatch?.[0]) {
      return isoMatch[0].replace(/-/g, '');
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export interface BuildDownloadFileNameInput {
  title: string;
  extension: string;
  fallbackSlug?: string;
  labels?: Array<string | null | undefined>;
  date?: Date | string | null;
}

export function buildDownloadFileName({
  title,
  extension,
  fallbackSlug = FILE_SLUG_FALLBACK,
  labels = [],
  date,
}: BuildDownloadFileNameInput): string {
  const base = toFileSlug(title, fallbackSlug);
  const normalizedExtension = extension.replace(/^\./, '').toLowerCase();
  const labelSegments = labels.flatMap((value) => {
    if (!value) return [];
    const slug = toFileSlug(value, '');
    return slug ? [slug] : [];
  });
  const dateSegment = toFileDateSegment(date);

  const fileNameParts = [base, ...labelSegments];
  if (dateSegment) {
    fileNameParts.push(dateSegment);
  }

  return `${fileNameParts.join('-')}.${normalizedExtension}`;
}

function triggerBrowserDownload(url: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function canDownloadDirectly(url: string): boolean {
  try {
    const parsedUrl = new URL(url, window.location.href);
    return (
      parsedUrl.origin === window.location.origin ||
      DIRECT_DOWNLOAD_PROTOCOLS.has(parsedUrl.protocol)
    );
  } catch {
    return true;
  }
}

export async function downloadFromUrl(
  url: string,
  fileName: string,
): Promise<void> {
  if (canDownloadDirectly(url)) {
    triggerBrowserDownload(url, fileName);
    return;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    triggerBrowserDownload(objectUrl, fileName);
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

export function downloadTextFile(
  content: string,
  fileName: string,
  mimeType = 'text/plain;charset=utf-8',
): void {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  triggerBrowserDownload(objectUrl, fileName);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
