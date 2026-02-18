import { describe, expect, it } from 'vitest';
import { fileToBase64 } from './file-base64';

describe('fileToBase64', () => {
  it('converts a file to a base64 string payload', async () => {
    const file = new File(['hello world'], 'hello.txt', {
      type: 'text/plain',
    });

    await expect(fileToBase64(file)).resolves.toBe('aGVsbG8gd29ybGQ=');
  });
});
