import { describe, expect, it, vi } from 'vitest';
import { SourceManager } from '../components/workbench/source-manager';
import { render, screen, userEvent } from '@/test-utils';

vi.mock('@/env', () => ({
  env: {
    PUBLIC_SERVER_URL: 'https://api.example.com',
    PUBLIC_AUTH_MODE: 'dev-password',
  },
  isPasswordAuthEnabled: true,
}));

describe('SourceManager', () => {
  it('allows removing sources but does not expose add-source UI', async () => {
    const user = userEvent.setup();
    const onRemoveSource = vi.fn();

    render(
      <SourceManager
        sources={[
          {
            id: 'src_1',
            title: 'Source One',
            mimeType: 'text/plain',
            wordCount: 200,
          },
          {
            id: 'src_2',
            title: 'Source Two',
            mimeType: 'application/pdf',
            wordCount: 350,
          },
        ]}
        onRemoveSource={onRemoveSource}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /add source/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove Source One' }));

    expect(onRemoveSource).toHaveBeenCalledWith('src_1');
  });
});
