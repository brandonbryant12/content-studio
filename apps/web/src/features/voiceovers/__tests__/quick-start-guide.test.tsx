import { describe, it, expect, vi } from 'vitest';
import { QuickStartGuide } from '../components/workbench/quick-start-guide';
import { render, screen, fireEvent } from '@/test-utils';

describe('QuickStartGuide', () => {
  it('renders three step cards with correct titles', () => {
    render(<QuickStartGuide onStartWriting={vi.fn()} onDismiss={vi.fn()} />);

    expect(screen.getByText('Choose a Voice')).toBeInTheDocument();
    expect(screen.getByText('Write Your Script')).toBeInTheDocument();
    expect(screen.getByText('Try the Writing Assistant')).toBeInTheDocument();
  });

  it('calls onStartWriting when "Start Writing" is clicked', () => {
    const onStartWriting = vi.fn();
    render(
      <QuickStartGuide onStartWriting={onStartWriting} onDismiss={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /start writing/i }));
    expect(onStartWriting).toHaveBeenCalledOnce();
  });

  it('calls onDismiss when "Skip this guide" is clicked', () => {
    const onDismiss = vi.fn();
    render(<QuickStartGuide onStartWriting={vi.fn()} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: /skip this guide/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
