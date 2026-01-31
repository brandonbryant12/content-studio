// features/brands/__tests__/segment-selector.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';
import { SegmentSelector, type SegmentSelectorOption } from '../components/segment-selector';

const mockSegments: SegmentSelectorOption[] = [
  {
    id: 'segment-1',
    name: 'Developers',
    description: 'Software developers and engineers',
    messagingTone: 'Technical but approachable',
  },
  {
    id: 'segment-2',
    name: 'Business Leaders',
    description: 'CTOs, VPs, and technical managers',
    messagingTone: 'Professional and strategic',
  },
];

describe('SegmentSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with placeholder when no value selected', () => {
    render(
      <SegmentSelector
        value={null}
        onChange={vi.fn()}
        segments={mockSegments}
      />,
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('');
  });

  it('renders with custom placeholder', () => {
    render(
      <SegmentSelector
        value={null}
        onChange={vi.fn()}
        segments={mockSegments}
        placeholder="Choose audience"
      />,
    );

    expect(screen.getByRole('option', { name: 'Choose audience' })).toBeInTheDocument();
  });

  it('renders selected segment', () => {
    render(
      <SegmentSelector
        value="segment-1"
        onChange={vi.fn()}
        segments={mockSegments}
      />,
    );

    expect(screen.getByRole('combobox')).toHaveValue('segment-1');
  });

  it('shows all segment options', () => {
    render(
      <SegmentSelector
        value={null}
        onChange={vi.fn()}
        segments={mockSegments}
      />,
    );

    const options = screen.getAllByRole('option');
    // Placeholder + 2 segments
    expect(options).toHaveLength(3);
  });

  it('shows segment info in option text', () => {
    render(
      <SegmentSelector
        value={null}
        onChange={vi.fn()}
        segments={mockSegments}
      />,
    );

    expect(screen.getByRole('option', { name: /Developers - Software developers and engineers/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Business Leaders - CTOs, VPs, and technical managers/i })).toBeInTheDocument();
  });

  it('shows messaging tone in option text', () => {
    render(
      <SegmentSelector
        value={null}
        onChange={vi.fn()}
        segments={mockSegments}
      />,
    );

    expect(screen.getByRole('option', { name: /Technical but approachable/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Professional and strategic/i })).toBeInTheDocument();
  });

  it('calls onChange with segment object when selected', () => {
    const onChange = vi.fn();
    render(
      <SegmentSelector
        value={null}
        onChange={onChange}
        segments={mockSegments}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'segment-1' } });

    expect(onChange).toHaveBeenCalledWith(mockSegments[0]);
  });

  it('calls onChange with null when placeholder selected', () => {
    const onChange = vi.fn();
    render(
      <SegmentSelector
        value="segment-1"
        onChange={onChange}
        segments={mockSegments}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <SegmentSelector
        value={null}
        onChange={vi.fn()}
        segments={mockSegments}
        disabled
      />,
    );

    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('shows empty state when no segments', () => {
    render(
      <SegmentSelector
        value={null}
        onChange={vi.fn()}
        segments={[]}
      />,
    );

    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByRole('option', { name: 'No segments defined' })).toBeInTheDocument();
  });

  it('returns segment with messagingTone for content generation', () => {
    const onChange = vi.fn();
    render(
      <SegmentSelector
        value={null}
        onChange={onChange}
        segments={mockSegments}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'segment-1' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        messagingTone: 'Technical but approachable',
      }),
    );
  });
});
