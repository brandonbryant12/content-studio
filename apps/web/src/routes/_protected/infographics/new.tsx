// routes/_protected/infographics/new.tsx
// Create new infographic page with form

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { CheckIcon, MagnifyingGlassIcon, PlusIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { Select } from '@repo/ui/components/select';
import { Spinner } from '@repo/ui/components/spinner';
import { useDocumentList } from '@/features/documents/hooks/use-document-list';
import { UploadDocumentDialog } from '@/features/documents/components/upload-document-dialog';
import { useCreateInfographic } from '@/features/infographics/hooks/use-create-infographic';

export const Route = createFileRoute('/_protected/infographics/new')({
  component: NewInfographicPage,
});

/**
 * Available infographic types with display info.
 * Matches INFOGRAPHIC_TYPES from @repo/media.
 */
const INFOGRAPHIC_TYPES = [
  {
    id: 'timeline',
    name: 'Timeline',
    description: 'Chronological events, history, or project milestones',
  },
  {
    id: 'comparison',
    name: 'Comparison',
    description: 'Side-by-side analysis of options, products, or concepts',
  },
  {
    id: 'statistical',
    name: 'Statistical',
    description: 'Data visualization with charts, graphs, and numbers',
  },
  {
    id: 'process',
    name: 'Process Flow',
    description: 'Step-by-step procedures, workflows, or instructions',
  },
  {
    id: 'list',
    name: 'List',
    description: 'Key points, features, benefits, or tips',
  },
  {
    id: 'mindMap',
    name: 'Mind Map',
    description: 'Central concept with branching related ideas',
  },
  {
    id: 'hierarchy',
    name: 'Hierarchy',
    description: 'Organizational structures, taxonomies, or rankings',
  },
  {
    id: 'geographic',
    name: 'Geographic',
    description: 'Location-based data, regional comparisons, or maps',
  },
] as const;

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (Square)' },
  { value: '16:9', label: '16:9 (Landscape)' },
  { value: '9:16', label: '9:16 (Portrait)' },
  { value: '4:3', label: '4:3 (Standard)' },
  { value: '3:4', label: '3:4 (Portrait Standard)' },
] as const;

function NewInfographicPage() {
  const navigate = useNavigate();

  // Form state
  const [title, setTitle] = useState('');
  const [infographicType, setInfographicType] = useState(
    (INFOGRAPHIC_TYPES[0]?.id ?? 'timeline') as string,
  );
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  // Data fetching
  const { data: documents = [], isLoading: isLoadingDocuments } =
    useDocumentList();

  // Mutation
  const createMutation = useCreateInfographic();

  // Filter documents by search query
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const query = searchQuery.toLowerCase();
    return documents.filter((doc) => doc.title.toLowerCase().includes(query));
  }, [documents, searchQuery]);

  // Toggle document selection
  const toggleDocument = (docId: string) => {
    setSelectedDocumentIds((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId],
    );
  };

  // Form validation
  const isValid = title.trim().length > 0 && selectedDocumentIds.length > 0;

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) return;

    createMutation.mutate({
      title: title.trim(),
      infographicType,
      aspectRatio,
      documentIds: selectedDocumentIds,
    });
  };

  // Handle cancel
  const handleCancel = () => {
    navigate({ to: '/infographics' });
  };

  return (
    <div className="page-container-narrow">
      <div className="mb-8">
        <p className="page-eyebrow">Visual Content</p>
        <h1 className="page-title">Create Infographic</h1>
        <p className="text-muted-foreground mt-2">
          Create a new infographic from your documents.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            type="text"
            placeholder="Enter infographic title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        {/* Infographic Type */}
        <div className="space-y-2">
          <Label htmlFor="infographicType">Type</Label>
          <Select
            id="infographicType"
            value={infographicType}
            onChange={(e) => setInfographicType(e.target.value)}
          >
            {INFOGRAPHIC_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} - {type.description}
              </option>
            ))}
          </Select>
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-2">
          <Label htmlFor="aspectRatio">
            Aspect Ratio{' '}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Select
            id="aspectRatio"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
          >
            {ASPECT_RATIOS.map((ratio) => (
              <option key={ratio.value} value={ratio.value}>
                {ratio.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Document Selection */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <Label>Source Documents</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Select one or more documents to use as sources for your
                infographic.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsUploadDialogOpen(true)}
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Upload
            </Button>
          </div>

          {/* Selection counter */}
          {selectedDocumentIds.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckIcon className="w-4 h-4" />
              {selectedDocumentIds.length} document
              {selectedDocumentIds.length !== 1 ? 's' : ''} selected
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Document list */}
          {isLoadingDocuments ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="w-6 h-6" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <p>No documents available.</p>
              <p className="text-sm mt-1 mb-3">
                Upload a document to get started.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUploadDialogOpen(true)}
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Upload Document
              </Button>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No documents match your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-md p-2">
              {filteredDocuments.map((doc) => {
                const isSelected = selectedDocumentIds.includes(doc.id);
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => toggleDocument(doc.id)}
                    className={`flex items-center gap-3 p-3 rounded-md border text-left transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.wordCount.toLocaleString()} words
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center ${
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-input'
                      }`}
                    >
                      {isSelected && <CheckIcon className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Upload Document Dialog */}
        <UploadDocumentDialog
          open={isUploadDialogOpen}
          onOpenChange={setIsUploadDialogOpen}
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!isValid || createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Creating...
              </>
            ) : (
              'Create Infographic'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
