// features/infographics/components/infographic-list-container.tsx
// Container: Handles data fetching, state management, and mutations

import { useState, useCallback } from 'react';
import { Link } from '@tanstack/react-router';
import { PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { useInfographicList } from '../hooks/use-infographic-list';
import { useCreateInfographic } from '../hooks/use-create-infographic';
import { useOptimisticDelete as useDeleteInfographic } from '../hooks/use-optimistic-delete';

/**
 * Container: Fetches infographic list and coordinates mutations.
 */
export function InfographicListContainer() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Data fetching
  const { data, isLoading } = useInfographicList();
  const infographics = data?.items ?? [];

  // Mutations
  const createMutation = useCreateInfographic();
  const deleteMutation = useDeleteInfographic();

  const handleCreate = useCallback(() => {
    // For now, create with minimal required fields
    // This will be replaced with a proper creation flow in Task 15
    createMutation.mutate({
      title: 'Untitled Infographic',
      infographicType: 'summary',
      documentIds: [], // TODO: Will need document selection in Task 15
    });
  }, [createMutation]);

  const handleDeleteClick = useCallback((id: string) => {
    setConfirmDeleteId(id);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!confirmDeleteId) return;

    setDeletingId(confirmDeleteId);
    setConfirmDeleteId(null);
    deleteMutation.mutate(
      { id: confirmDeleteId },
      {
        onSettled: () => {
          setDeletingId(null);
        },
      },
    );
  }, [confirmDeleteId, deleteMutation]);

  const handleCancelDelete = useCallback(() => {
    setConfirmDeleteId(null);
  }, []);

  // Show loading state while initially fetching
  if (isLoading) {
    return (
      <div className="page-container-narrow">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="page-eyebrow">Visual Content</p>
            <h1 className="page-title">Infographics</h1>
          </div>
        </div>
        <div className="loading-center-lg">
          <Spinner className="w-6 h-6" />
        </div>
      </div>
    );
  }

  const isEmpty = infographics.length === 0;

  return (
    <div className="page-container-narrow">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="page-eyebrow">Visual Content</p>
          <h1 className="page-title">Infographics</h1>
        </div>
        <Button onClick={handleCreate} disabled={createMutation.isPending}>
          {createMutation.isPending ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              Creating...
            </>
          ) : (
            <>
              <PlusIcon className="w-4 h-4 mr-2" />
              Create New
            </>
          )}
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
            <h2 className="text-lg font-semibold mb-2">Delete Infographic</h2>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete this infographic? This action
              cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancelDelete}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {isEmpty ? (
        <div className="empty-state-lg">
          <div className="empty-state-icon">
            <svg
              className="w-7 h-7 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
          </div>
          <h3 className="empty-state-title">No infographics yet</h3>
          <p className="empty-state-description">
            Create your first infographic to get started.
          </p>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Creating...
              </>
            ) : (
              <>
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Infographic
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {infographics.map((infographic) => (
            <div
              key={infographic.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <Link
                // Route will be typed once routeTree.gen.ts is regenerated
                to={'/infographics/$infographicId' as '/podcasts/$podcastId'}
                params={
                  { infographicId: infographic.id } as unknown as {
                    podcastId: string;
                  }
                }
                className="flex-1 min-w-0"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{infographic.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="capitalize">{infographic.status}</span>
                      <span>·</span>
                      <span className="capitalize">
                        {infographic.infographicType}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteClick(infographic.id);
                }}
                disabled={deletingId === infographic.id}
                className="text-muted-foreground hover:text-destructive"
              >
                {deletingId === infographic.id ? (
                  <Spinner className="w-4 h-4" />
                ) : (
                  <TrashIcon className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
