// features/brands/__tests__/brand-selector.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';
import { BrandSelector, type BrandSelectorOption } from '../components/brand-selector';

const mockBrands: BrandSelectorOption[] = [
  {
    id: 'brand-1',
    name: 'TechCorp',
    description: 'A technology company',
  },
  {
    id: 'brand-2',
    name: 'EcoFriendly',
    description: 'Sustainable products',
  },
  {
    id: 'brand-3',
    name: 'HealthFirst',
    description: null,
  },
];

describe('BrandSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with placeholder when no value selected', () => {
    render(
      <BrandSelector
        value={null}
        onChange={vi.fn()}
        brands={mockBrands}
      />,
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('');
  });

  it('renders with custom placeholder', () => {
    render(
      <BrandSelector
        value={null}
        onChange={vi.fn()}
        brands={mockBrands}
        placeholder="Choose brand"
      />,
    );

    expect(screen.getByRole('option', { name: 'Choose brand' })).toBeInTheDocument();
  });

  it('renders selected brand name', () => {
    render(
      <BrandSelector
        value="brand-1"
        onChange={vi.fn()}
        brands={mockBrands}
      />,
    );

    expect(screen.getByRole('combobox')).toHaveValue('brand-1');
  });

  it('shows all brand options', () => {
    render(
      <BrandSelector
        value={null}
        onChange={vi.fn()}
        brands={mockBrands}
      />,
    );

    const options = screen.getAllByRole('option');
    // Placeholder + 3 brands
    expect(options).toHaveLength(4);
  });

  it('shows brand with description in option text', () => {
    render(
      <BrandSelector
        value={null}
        onChange={vi.fn()}
        brands={mockBrands}
      />,
    );

    expect(screen.getByRole('option', { name: /TechCorp - A technology company/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /EcoFriendly - Sustainable products/i })).toBeInTheDocument();
  });

  it('shows brand without description when description is null', () => {
    render(
      <BrandSelector
        value={null}
        onChange={vi.fn()}
        brands={mockBrands}
      />,
    );

    // HealthFirst has null description, so only the name
    expect(screen.getByRole('option', { name: 'HealthFirst' })).toBeInTheDocument();
  });

  it('calls onChange with brand id when selected', () => {
    const onChange = vi.fn();
    render(
      <BrandSelector
        value={null}
        onChange={onChange}
        brands={mockBrands}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'brand-1' } });

    expect(onChange).toHaveBeenCalledWith('brand-1');
  });

  it('calls onChange with null when placeholder selected', () => {
    const onChange = vi.fn();
    render(
      <BrandSelector
        value="brand-1"
        onChange={onChange}
        brands={mockBrands}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <BrandSelector
        value={null}
        onChange={vi.fn()}
        brands={mockBrands}
        disabled
      />,
    );

    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('renders with only placeholder when brands empty', () => {
    render(
      <BrandSelector
        value={null}
        onChange={vi.fn()}
        brands={[]}
      />,
    );

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1); // Just placeholder
  });
});
