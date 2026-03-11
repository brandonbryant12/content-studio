import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildDownloadFileName,
  downloadFromUrl,
  getFileExtensionFromUrl,
  toFileSlug,
} from './file-download';

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

describe('file download utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (originalCreateObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: originalCreateObjectURL,
      });
    } else {
      Reflect.deleteProperty(URL, 'createObjectURL');
    }

    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: originalRevokeObjectURL,
      });
    } else {
      Reflect.deleteProperty(URL, 'revokeObjectURL');
    }

    vi.restoreAllMocks();
    vi.useRealTimers();
  });

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

  it('downloads cross-origin files via a blob url', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Blob(['audio'], { type: 'audio/wav' }), {
        status: 200,
      }),
    );
    const createObjectUrlSpy = vi.fn(() => 'blob:download-url');
    const revokeObjectUrlSpy = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectUrlSpy,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectUrlSpy,
    });
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    await downloadFromUrl(
      'https://cdn.example.com/audio/final.wav?x=1',
      'market-update-audio-20260220.wav',
    );
    vi.runAllTimers();

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://cdn.example.com/audio/final.wav?x=1',
    );
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:download-url');

    const downloadLink = appendChildSpy.mock.calls[0]?.[0] as
      | HTMLAnchorElement
      | undefined;
    expect(downloadLink?.href).toBe('blob:download-url');
    expect(downloadLink?.download).toBe('market-update-audio-20260220.wav');
  });

  it('downloads blob urls directly without refetching', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    await downloadFromUrl('blob:existing-url', 'existing-file.wav');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalledTimes(1);

    const downloadLink = appendChildSpy.mock.calls[0]?.[0] as
      | HTMLAnchorElement
      | undefined;
    expect(downloadLink?.href).toBe('blob:existing-url');
    expect(downloadLink?.download).toBe('existing-file.wav');
  });
});
