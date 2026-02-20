import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as FileDownloadModule from '@/shared/lib/file-download';
import { ExportDropdown } from '../components/export-dropdown';
import { render, screen, userEvent } from '@/test-utils';

const { downloadFromUrlSpy } = vi.hoisted(() => ({
  downloadFromUrlSpy: vi.fn(),
}));

vi.mock('@/shared/lib/file-download', async () => {
  const actual = await vi.importActual<typeof FileDownloadModule>(
    '@/shared/lib/file-download',
  );

  return {
    ...actual,
    downloadFromUrl: downloadFromUrlSpy,
  };
});

describe('ExportDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses a smart filename for png export', async () => {
    render(
      <ExportDropdown
        imageUrl="https://cdn.example.com/infographic.png"
        title="Q1 Growth Snapshot"
        format="landscape"
        versionNumber={3}
        updatedAt="2026-02-20T13:00:00.000Z"
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Export options' }),
    );
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Download PNG' }),
    );

    expect(downloadFromUrlSpy).toHaveBeenCalledWith(
      'https://cdn.example.com/infographic.png',
      'q1-growth-snapshot-landscape-v3-20260220.png',
    );
  });
});
