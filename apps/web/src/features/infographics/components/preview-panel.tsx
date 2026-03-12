import { ImageIcon } from '@radix-ui/react-icons';
import { Spinner } from '@repo/ui/components/spinner';

interface PreviewPanelProps {
  imageUrl: string | null;
  title: string;
  isGenerating: boolean;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8">
      <div className="w-20 h-20 rounded-2xl bg-card border border-border/60 flex items-center justify-center mb-5 shadow-sm">
        <ImageIcon className="w-9 h-9 text-muted-foreground/40" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        No image generated yet
      </p>
      <p className="text-xs text-muted-foreground/60 mt-1.5 max-w-[260px] leading-relaxed">
        Write a prompt and click Generate to create your infographic
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-4">
      <Spinner className="w-8 h-8" />
      <div>
        <p className="text-sm font-medium">Generating infographic...</p>
        <p className="text-xs text-muted-foreground mt-1">
          This may take a minute
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
  if (isGenerating) return <LoadingSkeleton />;
  if (!imageUrl) return <EmptyState />;

  return (
    <img
      src={imageUrl}
      alt={`${title} infographic`}
      className="max-w-full max-h-full rounded-md object-contain"
    />
  );
}
