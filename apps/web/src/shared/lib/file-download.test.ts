import { describe, expect, it } from 'vitest';
import {
  buildDownloadFileName,
  getFileExtensionFromUrl,
  toFileSlug,
} from './file-download';

describe('file download utils', () => {
  it('creates a stable slug for filenames', () => {
    expect(toFileSlug('  Market Update 2026  ')).toBe('market-update-2026');
    expect(toFileSlug('***')).toBe('export');
    expect(toFileSlug('', 'fallback')).toBe('fallback');
  });

  it('extracts extensions from urls with query params', () => {
    expect(
      getFileExtensionFromUrl(
        'https://cdn.example.com/audio/final.wav?x=1',
        'mp3',
      ),
    ).toBe('wav');
    expect(getFileExtensionFromUrl('/exports/file.mp3#t=10', 'wav')).toBe(
      'mp3',
    );
    expect(
      getFileExtensionFromUrl('https://example.com/no-extension', 'txt'),
    ).toBe('txt');
  });

  it('builds smart download filenames with labels and date', () => {
    expect(
      buildDownloadFileName({
        title: 'Quarterly Product Update',
        extension: '.MP3',
        fallbackSlug: 'podcast',
        labels: ['audio', 'final_mix'],
        date: '2026-02-20T11:30:00.000Z',
      }),
    ).toBe('quarterly-product-update-audio-final-mix-20260220.mp3');
  });

  it('skips empty labels and invalid dates', () => {
    expect(
      buildDownloadFileName({
        title: '***',
        extension: 'png',
        fallbackSlug: 'infographic',
        labels: ['', '  ', undefined],
        date: 'not-a-date',
      }),
    ).toBe('infographic.png');
  });
});
