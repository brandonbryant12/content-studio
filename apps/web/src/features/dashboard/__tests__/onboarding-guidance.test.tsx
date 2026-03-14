import { describe, expect, it, vi } from 'vitest';
import { OnboardingGuidance } from '../components/onboarding-guidance';
import { render, screen, userEvent } from '@/test-utils';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

describe('OnboardingGuidance', () => {
  it('exposes step actions to expected routes and supports dismiss', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();

    render(<OnboardingGuidance onDismiss={onDismiss} />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/sources',
      '/personas',
      '/podcasts',
    ]);

    await user.click(screen.getByRole('button', { name: /dismiss onboarding guide/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
