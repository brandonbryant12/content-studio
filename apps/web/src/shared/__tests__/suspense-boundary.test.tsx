// shared/__tests__/suspense-boundary.test.tsx

import type { ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { renderWithQuery, screen } from '@/test-utils';
import { SuspenseBoundary } from '../components/suspense-boundary';

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
});
