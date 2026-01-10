# Task 22: Frontend - Preview and Generation

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `standards/frontend/components.md`
- [ ] `standards/frontend/mutations.md`
- [ ] `apps/web/src/features/podcasts/hooks/use-podcast-generation.ts` - Reference

## Context

The preview panel shows the generated infographic image with zoom/pan controls. The generation flow:
1. User clicks Generate
2. API call starts generation job
3. Poll job status
4. On completion, refetch infographic to get imageUrl
5. Display image in preview

## Key Files

### Create New Files:
- `apps/web/src/features/infographics/components/workbench/preview-panel.tsx`
- `apps/web/src/features/infographics/components/workbench/action-bar.tsx`
- `apps/web/src/features/infographics/hooks/use-optimistic-generation.ts`

## Implementation Notes

### Generation Hook

```typescript
// apps/web/src/features/infographics/hooks/use-optimistic-generation.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import { infographicKeys } from './query-keys';
import { toast } from 'sonner';

interface GenerationState {
  isGenerating: boolean;
  jobId: string | null;
  progress: 'pending' | 'processing' | 'completed' | 'failed' | null;
  error: string | null;
}

export const useOptimisticGeneration = (infographicId: string) => {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    jobId: null,
    progress: null,
    error: null,
  });

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Poll job status
  const pollJobStatus = useCallback(
    async (jobId: string) => {
      try {
        const job = await apiClient.infographics.getJob({ jobId });

        setState((prev) => ({
          ...prev,
          progress: job.status as GenerationState['progress'],
        }));

        if (job.status === 'completed') {
          // Stop polling
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }

          // Refetch infographic to get new imageUrl
          await queryClient.invalidateQueries({
            queryKey: infographicKeys.detail(infographicId),
          });

          setState({
            isGenerating: false,
            jobId: null,
            progress: 'completed',
            error: null,
          });

          toast.success('Infographic generated successfully!');
        } else if (job.status === 'failed') {
          // Stop polling
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }

          setState({
            isGenerating: false,
            jobId: null,
            progress: 'failed',
            error: job.error ?? 'Generation failed',
          });

          toast.error(job.error ?? 'Failed to generate infographic');
        }
      } catch (error) {
        console.error('Failed to poll job status:', error);
      }
    },
    [apiClient, queryClient, infographicId],
  );

  // Start generation
  const generateMutation = useMutation({
    mutationFn: (feedbackInstructions?: string) =>
      apiClient.infographics.generate({
        id: infographicId,
        feedbackInstructions,
      }),
    onMutate: async () => {
      // Optimistic update
      await queryClient.cancelQueries({
        queryKey: infographicKeys.detail(infographicId),
      });

      const previous = queryClient.getQueryData(
        infographicKeys.detail(infographicId),
      );

      queryClient.setQueryData(
        infographicKeys.detail(infographicId),
        (old: any) => ({
          ...old,
          status: 'generating',
          imageUrl: null,
          errorMessage: null,
        }),
      );

      return { previous };
    },
    onSuccess: (result) => {
      setState({
        isGenerating: true,
        jobId: result.jobId,
        progress: result.status as GenerationState['progress'],
        error: null,
      });

      // Start polling
      pollIntervalRef.current = setInterval(() => {
        pollJobStatus(result.jobId);
      }, 2000);
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previous) {
        queryClient.setQueryData(
          infographicKeys.detail(infographicId),
          context.previous,
        );
      }

      setState({
        isGenerating: false,
        jobId: null,
        progress: 'failed',
        error: error.message,
      });

      toast.error('Failed to start generation');
    },
  });

  const generate = useCallback(
    (feedbackInstructions?: string) => {
      generateMutation.mutate(feedbackInstructions);
    },
    [generateMutation],
  );

  return {
    generate,
    isGenerating: state.isGenerating || generateMutation.isPending,
    progress: state.progress,
    error: state.error,
  };
};
```

### Preview Panel

```typescript
// apps/web/src/features/infographics/components/workbench/preview-panel.tsx
import { useState, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PreviewPanelProps {
  imageUrl: string | null;
  status: string;
  errorMessage: string | null;
  title: string;
  className?: string;
}

export function PreviewPanel({
  imageUrl,
  status,
  errorMessage,
  title,
  className,
}: PreviewPanelProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastPosition = useRef({ x: 0, y: 0 });

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDownload = async () => {
    if (!imageUrl) return;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  // Pan handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      isDragging.current = true;
      lastPosition.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;

    const deltaX = e.clientX - lastPosition.current.x;
    const deltaY = e.clientY - lastPosition.current.y;

    setPosition((prev) => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }));

    lastPosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            disabled={!imageUrl || zoom <= 0.5}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            disabled={!imageUrl || zoom >= 3}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            disabled={!imageUrl}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          disabled={!imageUrl}
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </div>

      {/* Preview area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-muted/20 flex items-center justify-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
      >
        {status === 'generating' ? (
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Generating your infographic...</p>
            <p className="text-sm text-muted-foreground mt-1">This may take 10-30 seconds</p>
          </div>
        ) : status === 'failed' ? (
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-medium">Generation Failed</p>
            <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
          </div>
        ) : imageUrl ? (
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              transition: isDragging.current ? 'none' : 'transform 0.2s',
            }}
          >
            <img
              src={imageUrl}
              alt={title}
              className="max-w-full max-h-full object-contain shadow-lg rounded"
              draggable={false}
            />
          </div>
        ) : (
          <div className="text-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No infographic generated yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add selections and click Generate to create your infographic
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Action Bar

```typescript
// apps/web/src/features/infographics/components/workbench/action-bar.tsx
import { Loader2, Wand2, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ActionBarProps {
  status: string;
  hasSelections: boolean;
  hasChanges: boolean;
  isGenerating: boolean;
  hasImage: boolean;
  onGenerate: () => void;
  onSave?: () => void;
  className?: string;
}

export function ActionBar({
  status,
  hasSelections,
  hasChanges,
  isGenerating,
  hasImage,
  onGenerate,
  onSave,
  className,
}: ActionBarProps) {
  const getButtonContent = () => {
    if (isGenerating) {
      return (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Generating...
        </>
      );
    }

    if (status === 'ready' && hasImage && !hasChanges) {
      return (
        <>
          <Check className="w-4 h-4 mr-2" />
          Ready
        </>
      );
    }

    if (status === 'failed') {
      return (
        <>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Generation
        </>
      );
    }

    if (hasImage) {
      return (
        <>
          <RefreshCw className="w-4 h-4 mr-2" />
          Regenerate
        </>
      );
    }

    return (
      <>
        <Wand2 className="w-4 h-4 mr-2" />
        Generate Infographic
      </>
    );
  };

  const isDisabled =
    isGenerating ||
    !hasSelections ||
    (status === 'ready' && hasImage && !hasChanges);

  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 border-t bg-background',
        className,
      )}
    >
      <div className="text-sm text-muted-foreground">
        {!hasSelections && (
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Add selections to generate
          </span>
        )}
        {hasSelections && hasChanges && (
          <span>Changes will be included in generation</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {hasChanges && onSave && (
          <Button variant="outline" onClick={onSave}>
            Save Changes
          </Button>
        )}

        <Button
          onClick={onGenerate}
          disabled={isDisabled}
          className={cn(
            status === 'ready' && hasImage && !hasChanges && 'bg-green-600 hover:bg-green-700',
          )}
        >
          {getButtonContent()}
        </Button>
      </div>
    </div>
  );
}
```

### SSE Integration (Optional Enhancement)

For real-time updates without polling, connect to SSE:

```typescript
// In detail container
import { useSSE } from '@/hooks/use-sse';

function InfographicDetailContainer({ infographicId }) {
  const queryClient = useQueryClient();

  // Subscribe to SSE events
  useSSE({
    onJobCompletion: (event) => {
      if (event.infographicId === infographicId) {
        queryClient.invalidateQueries({
          queryKey: infographicKeys.detail(infographicId),
        });
      }
    },
    onEntityChange: (event) => {
      if (event.entityType === 'infographic' && event.entityId === infographicId) {
        queryClient.invalidateQueries({
          queryKey: infographicKeys.detail(infographicId),
        });
      }
    },
  });

  // ... rest of component
}
```

## Verification Log

<!-- Agent writes verification results here -->
