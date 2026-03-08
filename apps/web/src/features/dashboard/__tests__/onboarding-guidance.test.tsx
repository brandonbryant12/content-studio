import { describe, it, expect, vi } from 'vitest';
import { OnboardingGuidance } from '../components/onboarding-guidance';
import { APP_NAME } from '@/constants';
import { render, screen, fireEvent } from '@/test-utils';

// Stub TanStack Router Link
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

describe('OnboardingGuidance', () => {
  it('renders all three workflow steps', () => {
    render(<OnboardingGuidance onDismiss={vi.fn()} />);

    expect(screen.getByText(`Welcome to ${APP_NAME}`)).toBeInTheDocument();
    expect(screen.getByText('Add source material')).toBeInTheDocument();
    expect(screen.getByText('Set up your brand voice')).toBeInTheDocument();
    expect(screen.getByText('Generate your first content')).toBeInTheDocument();
  });

  it('renders CTAs linking to the correct routes', () => {
    render(<OnboardingGuidance onDismiss={vi.fn()} />);

    const docLink = screen.getByText('Go to Sources').closest('a');
    const personaLink = screen.getByText('Go to Personas').closest('a');
    const createLink = screen.getByText('Start Creating').closest('a');

    expect(docLink).toHaveAttribute('href', '/sources');
    expect(personaLink).toHaveAttribute('href', '/personas');
    expect(createLink).toHaveAttribute('href', '/podcasts');
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<OnboardingGuidance onDismiss={onDismiss} />);

    const dismissButton = screen.getByLabelText('Dismiss onboarding guide');
    fireEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('has accessible dismiss button', () => {
    render(<OnboardingGuidance onDismiss={vi.fn()} />);

    const dismissButton = screen.getByLabelText('Dismiss onboarding guide');
    expect(dismissButton).toBeInTheDocument();
    expect(dismissButton.tagName).toBe('BUTTON');
  });
});
