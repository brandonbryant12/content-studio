import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import {
  DocumentFailedState,
  DocumentProcessingState,
} from '../components/document-detail-content';

vi.mock('@repo/ui/components/spinner', () => ({
  Spinner: ({ className }: { className?: string }) => (
    <span data-testid="spinner" className={className}>
      Loading...
    </span>
  ),
}));

describe('DocumentProcessingState', () => {
  it('announces research processing in a live status region', () => {
    render(<DocumentProcessingState source="research" />);

    const liveStatus = screen.getByRole('status');
    expect(liveStatus).toHaveAttribute('aria-live', 'polite');
    expect(
      screen.getByText(
        'Document research is in progress and may take a few minutes',
      ),
    ).toBeInTheDocument();
  });

  it('announces document processing in a live status region', () => {
    render(<DocumentProcessingState source="text/plain" />);

    const liveStatus = screen.getByRole('status');
    expect(liveStatus).toHaveAttribute('aria-live', 'polite');
    expect(
      screen.getByText('Document processing is in progress'),
    ).toBeInTheDocument();
  });
});

describe('DocumentFailedState', () => {
  it('announces retry state for failed documents in a live region', () => {
    render(
      <DocumentFailedState
        errorMessage={null}
        onRetry={vi.fn()}
        isRetrying={true}
      />,
    );

    const liveStatus = screen.getByRole('status');
    expect(liveStatus).toHaveAttribute('aria-live', 'polite');
    expect(
      screen.getByText('Retrying document processing'),
    ).toBeInTheDocument();
  });

  it('announces failure message in a live region while not retrying', () => {
    render(
      <DocumentFailedState
        errorMessage={null}
        onRetry={vi.fn()}
        isRetrying={false}
      />,
    );

    const liveStatus = screen.getByRole('status');
    expect(liveStatus).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Retrying document processing')).not.toBeInTheDocument();
    expect(screen.getByText('Processing failed')).toBeInTheDocument();
  });
});
