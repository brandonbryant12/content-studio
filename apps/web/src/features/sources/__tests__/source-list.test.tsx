import { describe, it, expect, vi } from 'vitest';
import type { SourceListItem } from '../components/source-item';
import type { ReactNode, ComponentProps } from 'react';
import { SourceList } from '../components/source-list';
import { APP_NAME } from '@/constants';
import { render, screen, userEvent } from '@/test-utils';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('@/env', () => ({
  env: {
    PUBLIC_SERVER_URL: 'http://localhost:3035',
    PUBLIC_SERVER_API_PATH: '/api',
    PUBLIC_BASE_PATH: '/',
  },
  isDeepResearchEnabled: true,
}));

vi.mock('../components/upload-source-dialog', () => ({
  UploadSourceDialog: ({
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

const mockSources: SourceListItem[] = [
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
  overrides: Partial<ComponentProps<typeof SourceList>> = {},
) => ({
  sources: mockSources,
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
  overrides: Partial<ComponentProps<typeof SourceList>> = {},
) => render(<SourceList {...createProps(overrides)} />);

describe('SourceList', () => {
  it('renders heading, controls, and source rows', () => {
    renderList();

    expect(
      screen.getByRole('heading', { name: 'Sources' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(
          `Sources are reusable reference materials that ${APP_NAME} turns into podcasts, voiceovers, infographics, and future edits\\.`,
        ),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('What sources do')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /how it works/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Upload a file')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /add source/i }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search sources…')).toBeInTheDocument();
    expect(screen.getByText('Getting Started Guide')).toBeInTheDocument();
    expect(screen.getByText('API Documentation')).toBeInTheDocument();
    expect(screen.getByText('Project Roadmap')).toBeInTheDocument();
    expect(screen.getByText('2,500 words')).toBeInTheDocument();
    expect(screen.getAllByText('Words').length).toBeGreaterThan(0);
    expect(screen.getAllByText('File size').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Updated').length).toBeGreaterThan(0);
  });

  it.each([
    {
      name: 'shows empty state when there are no sources',
      props: { sources: [] as SourceListItem[] },
      expectedTitle: 'No sources yet',
      expectedDescription:
        'Add your first source from a file, URL, or research brief so future content has something reliable to draw from.',
    },
    {
      name: 'shows no-results state when search has no matches',
      props: { searchQuery: 'nonexistent source xyz' },
      expectedTitle: 'No sources found',
      expectedDescription: 'Try adjusting your search query.',
    },
  ])('$name', ({ props, expectedTitle, expectedDescription }) => {
    renderList(props);

    expect(screen.getByText(expectedTitle)).toBeInTheDocument();
    expect(screen.getByText(expectedDescription)).toBeInTheDocument();
  });

  it('filters sources case-insensitively', () => {
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
      screen.getByPlaceholderText('Search sources…'),
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

  it('calls onDelete with selected source id', async () => {
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
