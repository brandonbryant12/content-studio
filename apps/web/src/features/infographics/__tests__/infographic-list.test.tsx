import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InfographicList } from '../components/infographic-list';
import { fireEvent, render, screen, userEvent } from '@/test-utils';

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

describe('InfographicList quick start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a draft from quick-start dialog without prompt', () => {
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
    expect(
      screen.getByText(/Create a draft if you want to set things up first/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /create draft/i }));

    expect(onCreate).toHaveBeenCalledWith({
      title: 'Untitled Infographic',
      format: 'portrait',
      prompt: undefined,
      autoGenerate: false,
    });
  });

  it('supports create and generate when prompt is provided', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<InfographicList {...createDefaultProps()} onCreate={onCreate} />);

    const createButtons = screen.getAllByRole('button', {
      name: /create infographic/i,
    });
    fireEvent.click(createButtons[createButtons.length - 1]!);

    const createAndGenerateButton = screen.getByRole('button', {
      name: /create & generate/i,
    });
    expect(createAndGenerateButton).toBeDisabled();

    await user.type(
      screen.getByLabelText(/prompt/i),
      'Launch campaign summary infographic',
    );

    expect(createAndGenerateButton).not.toBeDisabled();
    fireEvent.click(createAndGenerateButton);

    expect(onCreate).toHaveBeenCalledWith({
      title: 'Untitled Infographic',
      format: 'portrait',
      prompt: 'Launch campaign summary infographic',
      autoGenerate: true,
    });
  });
});
