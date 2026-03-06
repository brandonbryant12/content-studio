import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  InfographicItem,
  type InfographicListItem,
} from '../components/infographic-item';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<{ to: string }>) => (
    <a href={props.to}>{children}</a>
  ),
}));

vi.mock('@/shared/lib/storage-url', () => ({
  getStorageUrl: (key: string) => `http://mock-storage/${key}`,
}));

const infographic: InfographicListItem = {
  id: 'infographic-1',
  title: 'Status Infographic',
  prompt: null,
  format: 'portrait',
  status: 'ready',
  imageStorageKey: 'infographics/status.png',
  createdAt: '2026-03-01T12:00:00.000Z',
  approvedBy: null,
};

describe('InfographicItem', () => {
  it('falls back to the default preview when the stored image fails', () => {
    render(
      <InfographicItem
        infographic={infographic}
        onDelete={vi.fn()}
        isDeleting={false}
      />,
    );

    const preview = screen.getByRole('img', {
      name: /status infographic preview/i,
    });
    fireEvent.error(preview);

    expect(preview).toHaveAttribute('src', '/default-infographic.svg');
  });
});
