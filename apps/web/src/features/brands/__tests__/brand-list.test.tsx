// features/brands/__tests__/brand-list.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';
import { BrandList } from '../components/brand-list';
import type { BrandListItem } from '../components/brand-item';

// Mock BrandItem to avoid router dependency
vi.mock('../components/brand-item', () => ({
  BrandItem: ({
    brand,
    onDelete,
    isDeleting,
  }: {
    brand: BrandListItem;
    onDelete: (id: string) => void;
    isDeleting: boolean;
  }) => (
    <div data-testid={`brand-item-${brand.id}`}>
      <span>{brand.name}</span>
      <button
        onClick={() => onDelete(brand.id)}
        disabled={isDeleting}
        data-testid={`delete-${brand.id}`}
      >
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  ),
}));

// Mock brand data matching BrandListItem interface
const mockBrands: BrandListItem[] = [
  {
    id: 'brand-1',
    name: 'TechCorp',
    description: 'A technology company focused on innovation',
    mission: 'Making technology accessible',
    values: ['Innovation', 'Quality', 'Trust'],
    colors: { primary: '#6366f1' },
    personaCount: 2,
    segmentCount: 3,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'brand-2',
    name: 'EcoFriendly',
    description: 'Sustainable products for everyday life',
    mission: 'Protecting our planet',
    values: ['Sustainability', 'Transparency'],
    colors: { primary: '#10b981' },
    personaCount: 1,
    segmentCount: 2,
    createdAt: '2024-01-16T10:00:00Z',
  },
  {
    id: 'brand-3',
    name: 'HealthFirst',
    description: null,
    mission: null,
    values: [],
    colors: null,
    personaCount: 0,
    segmentCount: 0,
    createdAt: '2024-01-17T10:00:00Z',
  },
];

// Default props for BrandList
const createDefaultProps = () => ({
  brands: mockBrands,
  searchQuery: '',
  isCreating: false,
  deletingId: null,
  onSearch: vi.fn(),
  onCreate: vi.fn(),
  onDelete: vi.fn(),
});

describe('BrandList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders list of brands', () => {
    render(<BrandList {...createDefaultProps()} />);

    // Check header
    expect(screen.getByText('Brands')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create new/i }),
    ).toBeInTheDocument();

    // Check all brand names are rendered
    expect(screen.getByText('TechCorp')).toBeInTheDocument();
    expect(screen.getByText('EcoFriendly')).toBeInTheDocument();
    expect(screen.getByText('HealthFirst')).toBeInTheDocument();
  });

  it('shows empty state when no brands', () => {
    render(<BrandList {...createDefaultProps()} brands={[]} />);

    expect(screen.getByText('No brands yet')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Create your first brand to define your identity and voice.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create brand/i }),
    ).toBeInTheDocument();
  });

  it('filters brands by search query', () => {
    render(<BrandList {...createDefaultProps()} searchQuery="tech" />);

    // Only "TechCorp" should be visible
    expect(screen.getByText('TechCorp')).toBeInTheDocument();
    expect(screen.queryByText('EcoFriendly')).not.toBeInTheDocument();
    expect(screen.queryByText('HealthFirst')).not.toBeInTheDocument();
  });

  it('shows no results message when search matches nothing', () => {
    render(<BrandList {...createDefaultProps()} searchQuery="nonexistent" />);

    expect(
      screen.getByText('No brands found matching "nonexistent"'),
    ).toBeInTheDocument();

    // Original brands should not be visible
    expect(screen.queryByText('TechCorp')).not.toBeInTheDocument();
    expect(screen.queryByText('EcoFriendly')).not.toBeInTheDocument();
    expect(screen.queryByText('HealthFirst')).not.toBeInTheDocument();
  });

  it('calls onCreate when create button clicked', () => {
    const onCreate = vi.fn();
    render(<BrandList {...createDefaultProps()} onCreate={onCreate} />);

    const createButton = screen.getByRole('button', { name: /create new/i });
    fireEvent.click(createButton);

    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('shows creating state when isCreating=true', () => {
    render(<BrandList {...createDefaultProps()} isCreating={true} />);

    // Should show "Creating..." text in header button
    const createButton = screen.getByRole('button', { name: /creating/i });
    expect(createButton).toBeInTheDocument();
    expect(createButton).toBeDisabled();
  });

  it('calls onDelete when brand delete is triggered', () => {
    const onDelete = vi.fn();
    render(<BrandList {...createDefaultProps()} onDelete={onDelete} />);

    // Click the delete button for the first brand
    const deleteButton = screen.getByTestId('delete-brand-1');
    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith('brand-1');
  });

  it('calls onSearch when search input changes', () => {
    const onSearch = vi.fn();
    render(<BrandList {...createDefaultProps()} onSearch={onSearch} />);

    const searchInput = screen.getByPlaceholderText('Search brands…');
    fireEvent.change(searchInput, { target: { value: 'test query' } });

    expect(onSearch).toHaveBeenCalledWith('test query');
  });

  it('shows creating state in empty state when isCreating=true and no brands', () => {
    render(
      <BrandList {...createDefaultProps()} brands={[]} isCreating={true} />,
    );

    // Both header and empty state buttons should show Creating... and be disabled
    const createButtons = screen.getAllByRole('button', { name: /creating/i });
    expect(createButtons).toHaveLength(2);
    createButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('filters case-insensitively', () => {
    render(<BrandList {...createDefaultProps()} searchQuery="TECH" />);

    // Should find "TechCorp" with uppercase query
    expect(screen.getByText('TechCorp')).toBeInTheDocument();
    expect(screen.queryByText('EcoFriendly')).not.toBeInTheDocument();
  });

  it('shows search input with current query value', () => {
    render(<BrandList {...createDefaultProps()} searchQuery="my search" />);

    const searchInput = screen.getByPlaceholderText('Search brands…');
    expect(searchInput).toHaveValue('my search');
  });

  it('calls onCreate from empty state button', () => {
    const onCreate = vi.fn();
    render(
      <BrandList {...createDefaultProps()} brands={[]} onCreate={onCreate} />,
    );

    const createButton = screen.getByRole('button', {
      name: /create brand/i,
    });
    fireEvent.click(createButton);

    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
