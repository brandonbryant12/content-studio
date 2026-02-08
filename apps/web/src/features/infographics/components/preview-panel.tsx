import { ImageIcon } from '@radix-ui/react-icons';
import { Spinner } from '@repo/ui/components/spinner';

interface PreviewPanelProps {
  imageUrl: string | null;
  title: string;
  isGenerating: boolean;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
        <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        No image generated yet
      </p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        Write a prompt and click Generate to create your infographic
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-4">
      <Spinner className="w-8 h-8" />
      <div>
        <p className="text-sm font-medium">Generating infographic...</p>
        <p className="text-xs text-muted-foreground mt-1">
          This may take a moment
        </p>
      </div>
    </div>
  );
}

export function PreviewPanel({
  imageUrl,
  title,
  isGenerating,
}: PreviewPanelProps) {
  if (isGenerating) {
    return (
      <div className="flex-1 flex flex-col border border-border/40 rounded-xl bg-muted/20 min-h-[400px]">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="flex-1 flex flex-col border border-border/40 rounded-xl bg-muted/20 min-h-[400px]">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center border border-border/40 rounded-xl bg-muted/10 p-4 min-h-[400px] overflow-hidden">
      <img
        src={imageUrl}
        alt={`${title} infographic`}
        className="max-w-full max-h-full rounded-lg object-contain"
      />
    </div>
  );
}
