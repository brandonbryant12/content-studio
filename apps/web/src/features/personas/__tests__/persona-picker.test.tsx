import { describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';
import { usePersonaList } from '@/features/personas/hooks';
import { PersonaPicker } from '@/features/podcasts/components/workbench/persona-picker';
import { render, screen, userEvent } from '@/test-utils';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: PropsWithChildren) => <a>{children}</a>,
}));

vi.mock('@/features/personas/hooks', () => ({
  usePersonaList: vi.fn(),
}));

describe('PersonaPicker', () => {
  it('guides users to create personas when none exist', () => {
    vi.mocked(usePersonaList).mockReturnValue({
      data: [],
    } as never);

    render(
      <PersonaPicker
        selectedPersonaId={null}
        onSelect={vi.fn()}
        label="Host Persona"
      />,
    );

    expect(screen.getByText('No personas yet')).toBeInTheDocument();
    expect(
      screen.getByText(/keep a recurring host or client voice consistent/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Open Personas')).toBeInTheDocument();
  });

  it('shows an info tooltip that explains personas', async () => {
    const user = userEvent.setup();

    vi.mocked(usePersonaList).mockReturnValue({
      data: [
        {
          id: 'persona-1',
          name: 'Ava Stone',
          role: 'Host',
          voiceId: 'Puck',
          voiceName: 'Puck',
        },
      ],
    } as never);

    render(
      <PersonaPicker
        selectedPersonaId={null}
        onSelect={vi.fn()}
        label="Host Persona"
      />,
    );

    await user.hover(
      screen.getByRole('button', { name: 'Host Persona: what is a persona?' }),
    );

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      /keep a host or client voice consistent/i,
    );
  });
});
