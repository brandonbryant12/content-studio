import { describe, expect, it } from 'vitest';
import { getFileExtensionFromUrl, toFileSlug } from './file-download';

describe('file download utils', () => {
  it('creates a stable slug for filenames', () => {
    expect(toFileSlug('  Market Update 2026  ')).toBe('market-update-2026');
    expect(toFileSlug('***')).toBe('export');
    expect(toFileSlug('', 'fallback')).toBe('fallback');
  });

  it('extracts extensions from urls with query params', () => {
    expect(
      getFileExtensionFromUrl('https://cdn.example.com/audio/final.wav?x=1', 'mp3'),
    ).toBe('wav');
    expect(getFileExtensionFromUrl('/exports/file.mp3#t=10', 'wav')).toBe('mp3');
    expect(getFileExtensionFromUrl('https://example.com/no-extension', 'txt')).toBe(
      'txt',
    );
  });
});
