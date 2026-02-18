const FILE_SLUG_FALLBACK = 'export';
const FILE_EXTENSION_REGEX = /\.([a-z0-9]{2,5})$/i;

export function toFileSlug(value: string, fallback = FILE_SLUG_FALLBACK): string {
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
    const withoutQuery = value.split(/[?#]/)[0] ?? value;
    const segment = withoutQuery.split('/').pop() ?? '';
    if (!segment) return null;

    const match = segment.match(FILE_EXTENSION_REGEX);
    if (!match?.[1]) return null;

    return match[1].toLowerCase();
  };

  try {
    return parse(new URL(url, 'http://localhost').pathname) ?? normalizedFallback;
  } catch {
    return parse(url) ?? normalizedFallback;
  }
}

export function downloadFromUrl(url: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadTextFile(
  content: string,
  fileName: string,
  mimeType = 'text/plain;charset=utf-8',
): void {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  downloadFromUrl(objectUrl, fileName);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
