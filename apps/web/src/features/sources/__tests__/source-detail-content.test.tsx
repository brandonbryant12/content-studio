import { describe, it, expect, vi } from 'vitest';
import {
  SourceFailedState,
  SourceProcessingState,
} from '../components/source-detail-content';
import { render, screen } from '@/test-utils';

vi.mock('@repo/ui/components/spinner', () => ({
  Spinner: ({ className }: { className?: string }) => (
    <span data-testid="spinner" className={className}>
      Loading...
    </span>
  ),
}));

describe('SourceProcessingState', () => {
  it('announces research processing in a live status region', () => {
    render(<SourceProcessingState source="research" />);

    const liveStatus = screen.getByRole('status');
    expect(liveStatus).toHaveAttribute('aria-live', 'polite');
    expect(
      screen.getByText(
        'Source research is in progress and may take a few minutes',
      ),
    ).toBeInTheDocument();
  });

  it('announces source processing in a live status region', () => {
    render(<SourceProcessingState source="text/plain" />);

    const liveStatus = screen.getByRole('status');
    expect(liveStatus).toHaveAttribute('aria-live', 'polite');
    expect(
      screen.getByText('Source processing is in progress'),
    ).toBeInTheDocument();
  });
});

describe('SourceFailedState', () => {
  it('announces retry state for failed sources in a live region', () => {
    render(
      <SourceFailedState
        errorMessage={null}
        onRetry={vi.fn()}
        isRetrying={true}
      />,
    );

    const liveStatus = screen.getByRole('status');
    expect(liveStatus).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Retrying source processing')).toBeInTheDocument();
  });

  it('announces failure message in a live region while not retrying', () => {
    render(
      <SourceFailedState
        errorMessage={null}
        onRetry={vi.fn()}
        isRetrying={false}
      />,
    );

    const liveStatus = screen.getByRole('status');
    expect(liveStatus).toHaveAttribute('aria-live', 'polite');
    expect(
      screen.queryByText('Retrying source processing'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Processing failed')).toBeInTheDocument();
  });
});
