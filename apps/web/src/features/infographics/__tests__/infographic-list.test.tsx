import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InfographicList } from '../components/infographic-list';
import { fireEvent, render, screen } from '@/test-utils';

vi.mock('../components/infographic-item', () => ({
  InfographicItem: () => <div data-testid="infographic-item" />,
}));

vi.mock('@/shared/components/bulk-action-bar', () => ({
  BulkActionBar: () => null,
}));

const mockSelection = {
  selectedIds: new Set<string>() as ReadonlySet<string>,
  selectedCount: 0,
  isSelected: () => false,
  toggle: vi.fn(),
  selectAll: vi.fn(),
  deselectAll: vi.fn(),
  isAllSelected: () => false,
  isIndeterminate: () => false,
};

const createDefaultProps = () => ({
  infographics: [],
  searchQuery: '',
  isCreating: false,
  deletingId: null,
  onSearch: vi.fn(),
  onCreate: vi.fn(),
  onDelete: vi.fn(),
  selection: mockSelection,
  isBulkDeleting: false,
  onBulkDelete: vi.fn(),
});

describe('InfographicList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a draft immediately from the primary action', () => {
    const onCreate = vi.fn();
    render(<InfographicList {...createDefaultProps()} onCreate={onCreate} />);

    expect(
      screen.getByText(
        /Infographics turn a prompt into a generated visual draft that you can refine through prompt, style, and format changes\./,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('How infographics work')).toBeInTheDocument();

    const createButtons = screen.getAllByRole('button', {
      name: /create infographic/i,
    });
    fireEvent.click(createButtons[createButtons.length - 1]!);

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith();
  });

  it('uses the empty-state action to go straight to the workbench flow', () => {
    const onCreate = vi.fn();
    render(<InfographicList {...createDefaultProps()} onCreate={onCreate} />);

    const createButton = screen.getAllByRole('button', {
      name: /create infographic/i,
    })[0]!;
    fireEvent.click(createButton);

    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
