// features/documents/__tests__/document-list.test.tsx

import { describe, it, expect, vi } from 'vitest';
import type { DocumentListItem } from '../components/document-item';
import type { ReactNode } from 'react';
import { DocumentList } from '../components/document-list';
import { render, screen, fireEvent } from '@/test-utils';

// Mock TanStack Router Link component
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

// Mock the UploadDocumentDialog to avoid complex hook dependencies
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

// Mock document data
const mockDocuments: DocumentListItem[] = [
  {
    id: 'doc-1',
    title: 'Getting Started Guide',
    source: 'application/pdf',
    wordCount: 2500,
    originalFileSize: 150000,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'doc-2',
    title: 'API Documentation',
    source: 'text/plain',
    wordCount: 5000,
    originalFileSize: 25000,
    createdAt: '2024-01-16T14:30:00Z',
  },
  {
    id: 'doc-3',
    title: 'Project Roadmap',
    source:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    wordCount: 1200,
    originalFileSize: 45000,
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

const defaultProps = {
  documents: mockDocuments,
  searchQuery: '',
  uploadOpen: false,
  deletingId: null,
  onSearch: vi.fn(),
  onUploadOpen: vi.fn(),
  onDelete: vi.fn(),
  selection: mockSelection,
  isBulkDeleting: false,
  onBulkDelete: vi.fn(),
};

describe('DocumentList', () => {
  it('renders list of documents', () => {
    render(<DocumentList {...defaultProps} />);

    // Check header
    expect(
      screen.getByRole('heading', { name: 'Documents' }),
    ).toBeInTheDocument();

    // Check all documents are rendered
    expect(screen.getByText('Getting Started Guide')).toBeInTheDocument();
    expect(screen.getByText('API Documentation')).toBeInTheDocument();
    expect(screen.getByText('Project Roadmap')).toBeInTheDocument();

    // Check word counts are displayed
    expect(screen.getByText('2,500 words')).toBeInTheDocument();
    expect(screen.getByText('5,000 words')).toBeInTheDocument();
    expect(screen.getByText('1,200 words')).toBeInTheDocument();
  });

  it('shows empty state when no documents', () => {
    render(<DocumentList {...defaultProps} documents={[]} />);

    expect(screen.getByText('No documents yet')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Upload your first document to start creating podcasts and voice overs.',
      ),
    ).toBeInTheDocument();
  });

  it('filters documents by search query', () => {
    const onSearch = vi.fn();
    render(
      <DocumentList {...defaultProps} searchQuery="API" onSearch={onSearch} />,
    );

    // Only matching document should be visible
    expect(screen.getByText('API Documentation')).toBeInTheDocument();
    expect(screen.queryByText('Getting Started Guide')).not.toBeInTheDocument();
    expect(screen.queryByText('Project Roadmap')).not.toBeInTheDocument();
  });

  it('shows no results message when search matches nothing', () => {
    render(
      <DocumentList {...defaultProps} searchQuery="nonexistent document xyz" />,
    );

    expect(screen.getByText('No documents found')).toBeInTheDocument();
    expect(
      screen.getByText('Try adjusting your search query.'),
    ).toBeInTheDocument();
  });

  it('calls onSearch when search input changes', () => {
    const onSearch = vi.fn();
    render(<DocumentList {...defaultProps} onSearch={onSearch} />);

    const searchInput = screen.getByPlaceholderText('Search documents\u2026');
    fireEvent.change(searchInput, { target: { value: 'test query' } });

    expect(onSearch).toHaveBeenCalledWith('test query');
  });

  it('calls onUploadOpen(true) when upload button clicked', () => {
    const onUploadOpen = vi.fn();
    render(<DocumentList {...defaultProps} onUploadOpen={onUploadOpen} />);

    const uploadButton = screen.getByRole('button', { name: /upload/i });
    fireEvent.click(uploadButton);

    expect(onUploadOpen).toHaveBeenCalledWith(true);
  });

  it('shows upload dialog when uploadOpen is true', () => {
    render(<DocumentList {...defaultProps} uploadOpen={true} />);

    expect(screen.getByTestId('upload-dialog')).toBeInTheDocument();
  });

  it('calls onDelete when document delete is triggered', () => {
    const onDelete = vi.fn();
    render(<DocumentList {...defaultProps} onDelete={onDelete} />);

    // Find delete buttons by their aria-label pattern
    const trashButtons = screen.getAllByRole('button', {
      name: /^Delete /,
    });

    // Click the first document's delete button
    expect(trashButtons.length).toBeGreaterThan(0);
    const firstButton = trashButtons[0];
    if (firstButton) {
      fireEvent.click(firstButton);
      expect(onDelete).toHaveBeenCalledWith('doc-1');
    }
  });

  it('renders Create Podcast link button', () => {
    render(<DocumentList {...defaultProps} />);

    const createPodcastLink = screen.getByRole('link', {
      name: /create podcast/i,
    });
    expect(createPodcastLink).toBeInTheDocument();
    expect(createPodcastLink).toHaveAttribute('href', '/podcasts');
  });

  it('shows search input with correct placeholder', () => {
    render(<DocumentList {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search documents\u2026');
    expect(searchInput).toBeInTheDocument();
  });

  it('displays search query value in input', () => {
    render(<DocumentList {...defaultProps} searchQuery="existing query" />);

    const searchInput = screen.getByPlaceholderText('Search documents\u2026');
    expect(searchInput).toHaveValue('existing query');
  });

  it('filters documents case-insensitively', () => {
    render(<DocumentList {...defaultProps} searchQuery="api" />);

    // Should match "API Documentation" even though search is lowercase
    expect(screen.getByText('API Documentation')).toBeInTheDocument();
    expect(screen.queryByText('Getting Started Guide')).not.toBeInTheDocument();
  });
});
