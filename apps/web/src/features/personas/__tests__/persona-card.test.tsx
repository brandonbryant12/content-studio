import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PersonaCard } from '../components/persona-card';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<{ to: string }>) => (
    <a href={props.to}>{children}</a>
  ),
}));

vi.mock('@/shared/lib/storage-url', () => ({
  getStorageUrl: (key: string) => `http://mock-storage/${key}`,
}));

const persona = {
  id: 'persona-1',
  name: 'Marcus Vane',
  role: 'Research Host',
  avatarStorageKey: 'personas/marcus.png',
  voiceName: 'Aoede',
};

describe('PersonaCard', () => {
  it('falls back to initials when the avatar image fails', () => {
    render(
      <PersonaCard
        persona={persona as never}
        isSelected={false}
        onToggleSelect={vi.fn()}
      />,
    );

    const avatar = screen.getByRole('img', { name: /marcus vane/i });
    fireEvent.error(avatar);

    expect(screen.getByText('MV')).toBeInTheDocument();
  });
});
