import { describe, expect, it, vi } from 'vitest';
import { fireEvent, renderWithQuery, screen } from '@/test-utils';
import {
  ListPageErrorState,
  ListPageLoadingState,
} from '../components/list-page-state';

describe('ListPageState', () => {
  it('renders title and spinner for loading state', () => {
    renderWithQuery(<ListPageLoadingState title="Voiceovers" />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Voiceovers' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });

  it('renders title and error fallback for error state', () => {
    renderWithQuery(
      <ListPageErrorState
        title="Documents"
        error={new Error('Failed to fetch')}
        fallbackMessage="Fallback message"
        onRetry={() => {}}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Documents' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
  });

  it('wires retry action from error state', () => {
    const onRetry = vi.fn();
    renderWithQuery(
      <ListPageErrorState
        title="Podcasts"
        error={{ code: 'UNKNOWN' }}
        fallbackMessage="Unable to load podcasts"
        onRetry={onRetry}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
