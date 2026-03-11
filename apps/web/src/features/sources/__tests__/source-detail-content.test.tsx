import { describe, it, expect, vi } from 'vitest';
import {
  SourceContentReader,
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

describe('SourceContentReader', () => {
  it('renders deep research content as markdown when search is inactive', () => {
    render(
      <SourceContentReader
        content={'# Market Analysis\n\n- First finding'}
        sourceType="research"
        paragraphs={['# Market Analysis', '', '- First finding']}
        queryLength={0}
        matchCount={0}
        currentMatchIndex={0}
        matchesByParagraph={new Map()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Market Analysis', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('First finding')).toBeInTheDocument();
  });

  it('falls back to plain text rendering for research search results', () => {
    render(
      <SourceContentReader
        content={'# Market Analysis'}
        sourceType="research"
        paragraphs={['# Market Analysis']}
        queryLength={2}
        matchCount={1}
        currentMatchIndex={0}
        matchesByParagraph={
          new Map([
            [0, [{ paragraphIndex: 0, start: 2, length: 6, globalIndex: 0 }]],
          ])
        }
      />,
    );

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName.toLowerCase() === 'p' &&
          element.textContent === '# Market Analysis',
      ),
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
