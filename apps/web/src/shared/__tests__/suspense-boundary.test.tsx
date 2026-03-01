// shared/__tests__/suspense-boundary.test.tsx

import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { SuspenseBoundary } from '../components/suspense-boundary';
import { fireEvent, renderWithQuery, screen } from '@/test-utils';

const resetQueryErrorBoundaryMock = vi.fn();

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    QueryErrorResetBoundary: ({
      children,
    }: {
      children: (props: { reset: () => void }) => ReactNode;
    }) => children({ reset: resetQueryErrorBoundaryMock }),
  };
});

// Component that suspends by throwing a promise
function SuspendingComponent(): ReactNode {
  throw new Promise(() => {});
}

describe('SuspenseBoundary', () => {
  it('renders children when not suspended', () => {
    renderWithQuery(
      <SuspenseBoundary>
        <div>Test Content</div>
      </SuspenseBoundary>,
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders custom fallback when suspended', () => {
    renderWithQuery(
      <SuspenseBoundary fallback={<div>Custom Loading...</div>}>
        <SuspendingComponent />
      </SuspenseBoundary>,
    );

    expect(screen.getByText('Custom Loading...')).toBeInTheDocument();
  });

  it('renders default spinner fallback when no custom fallback', () => {
    renderWithQuery(
      <SuspenseBoundary>
        <SuspendingComponent />
      </SuspenseBoundary>,
    );

    // Should render the default spinner (check for spinner container)
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('resets query error state before calling custom onReset', () => {
    const callOrder: string[] = [];
    let shouldThrow = true;

    function ConditionalThrowingComponent() {
      if (shouldThrow) {
        throw new Error('retryable failure');
      }
      return <div>Recovered content</div>;
    }

    renderWithQuery(
      <SuspenseBoundary
        onReset={() => {
          callOrder.push('customOnReset');
        }}
      >
        <ConditionalThrowingComponent />
      </SuspenseBoundary>,
    );

    shouldThrow = false;
    resetQueryErrorBoundaryMock.mockImplementation(() => {
      callOrder.push('queryReset');
    });

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(resetQueryErrorBoundaryMock).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['queryReset', 'customOnReset']);
    expect(screen.getByText('Recovered content')).toBeInTheDocument();
  });
});
