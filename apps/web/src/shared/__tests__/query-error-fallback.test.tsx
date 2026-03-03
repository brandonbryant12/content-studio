import { describe, expect, it, vi } from 'vitest';
import { fireEvent, renderWithQuery, screen } from '@/test-utils';
import { QueryErrorFallback } from '../components/query-error-fallback';

describe('QueryErrorFallback', () => {
  it('renders provided Error messages', () => {
    renderWithQuery(
      <QueryErrorFallback
        error={new Error('Query failed')}
        fallbackMessage="Fallback message"
        onRetry={() => {}}
      />,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Query failed')).toBeInTheDocument();
  });

  it('uses fallback message when error is not an Error instance', () => {
    renderWithQuery(
      <QueryErrorFallback
        error={{ code: 'UNKNOWN' }}
        fallbackMessage="Unable to load data"
        onRetry={() => {}}
      />,
    );

    expect(screen.getByText('Unable to load data')).toBeInTheDocument();
  });

  it('calls onRetry when the user clicks Try Again', () => {
    const onRetry = vi.fn();

    renderWithQuery(
      <QueryErrorFallback
        error={new Error('Query failed')}
        fallbackMessage="Fallback message"
        onRetry={onRetry}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
