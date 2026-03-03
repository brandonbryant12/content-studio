import { describe, it, expect, vi } from 'vitest';
import type { DocumentListItem } from '../components/document-item';
import type { ReactNode, ComponentProps } from 'react';
import { DocumentList } from '../components/document-list';
import { render, screen, userEvent } from '@/test-utils';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('../components/upload-document-dialog', () => ({
  UploadDocumentDialog: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="upload-dialog">
        <button onClick={() => onOpenChange(false)}>Close Upload Dialog</button>
      </div>
    ) : null,
}));

const mockDocuments: DocumentListItem[] = [
  {
    id: 'doc-1',
    title: 'Getting Started Guide',
    source: 'application/pdf',
    status: 'ready',
    wordCount: 2500,
    originalFileSize: 150000,
    sourceUrl: null,
    errorMessage: null,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'doc-2',
    title: 'API Documentation',
    source: 'text/plain',
    status: 'ready',
    wordCount: 5000,
    originalFileSize: 25000,
    sourceUrl: null,
    errorMessage: null,
    createdAt: '2024-01-16T14:30:00Z',
  },
  {
    id: 'doc-3',
    title: 'Project Roadmap',
    source:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    status: 'ready',
    wordCount: 1200,
    originalFileSize: 45000,
    sourceUrl: null,
    errorMessage: null,
    createdAt: '2024-01-17T09:15:00Z',
  },
];

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

const createProps = (
  overrides: Partial<ComponentProps<typeof DocumentList>> = {},
) => ({
  documents: mockDocuments,
  searchQuery: '',
  uploadOpen: false,
  deletingId: null,
  onSearch: vi.fn(),
  onUploadOpen: vi.fn(),
  onUrlDialogOpen: vi.fn(),
  onResearchDialogOpen: vi.fn(),
  onDelete: vi.fn(),
  selection: mockSelection,
  isBulkDeleting: false,
  onBulkDelete: vi.fn(),
  ...overrides,
});

const renderList = (
  overrides: Partial<ComponentProps<typeof DocumentList>> = {},
) => render(<DocumentList {...createProps(overrides)} />);

describe('DocumentList', () => {
  it('renders heading, controls, and document rows', () => {
    renderList();

    expect(
      screen.getByRole('heading', { name: 'Documents' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /add source/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Search documents…'),
    ).toBeInTheDocument();
    expect(screen.getByText('Getting Started Guide')).toBeInTheDocument();
    expect(screen.getByText('API Documentation')).toBeInTheDocument();
    expect(screen.getByText('Project Roadmap')).toBeInTheDocument();
    expect(screen.getByText('2,500')).toBeInTheDocument();
  });

  it.each([
    {
      name: 'shows empty state when there are no documents',
      props: { documents: [] as DocumentListItem[] },
      expectedTitle: 'No documents yet',
      expectedDescription:
        'Upload your first document to start creating podcasts, voiceovers, and infographics.',
    },
    {
      name: 'shows no-results state when search has no matches',
      props: { searchQuery: 'nonexistent document xyz' },
      expectedTitle: 'No documents found',
      expectedDescription: 'Try adjusting your search query.',
    },
  ])('$name', ({ props, expectedTitle, expectedDescription }) => {
    renderList(props);

    expect(screen.getByText(expectedTitle)).toBeInTheDocument();
    expect(screen.getByText(expectedDescription)).toBeInTheDocument();
  });

  it('filters documents case-insensitively', () => {
    renderList({ searchQuery: 'api' });

    expect(screen.getByText('API Documentation')).toBeInTheDocument();
    expect(screen.queryByText('Getting Started Guide')).not.toBeInTheDocument();
    expect(screen.queryByText('Project Roadmap')).not.toBeInTheDocument();
  });

  it('calls onSearch when user types in search input', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    renderList({ onSearch });

    await user.type(
      screen.getByPlaceholderText('Search documents…'),
      'test query',
    );

    expect(onSearch).toHaveBeenCalled();
  });

  it('opens upload flow from Add Source menu', async () => {
    const user = userEvent.setup();
    const onUploadOpen = vi.fn();
    renderList({ onUploadOpen });

    await user.click(screen.getByRole('button', { name: /add source/i }));
    await user.click(await screen.findByRole('menuitem', { name: /upload/i }));

    expect(onUploadOpen).toHaveBeenCalledWith(true);
  });

  it('renders upload dialog when uploadOpen is true', () => {
    renderList({ uploadOpen: true });
    expect(screen.getByTestId('upload-dialog')).toBeInTheDocument();
  });

  it('calls onDelete with selected document id', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderList({ onDelete });

    const deleteButton = screen.getAllByRole('button', { name: /^Delete / })[0];
    expect(deleteButton).toBeDefined();
    if (!deleteButton) throw new Error('Expected at least one delete button');

    await user.click(deleteButton);
    expect(onDelete).toHaveBeenCalledWith('doc-1');
  });
});
