import { useState } from 'react';
import { toast } from 'sonner';
import type { SourceInfo } from '@/shared/hooks/use-source-selection';
import { AddSourceDialog } from '@/shared/components/source-manager';
import { SourceList } from '@/shared/components/source-manager';

interface SourceManagerProps {
  sources: SourceInfo[];
  onAddSources: (docs: SourceInfo[]) => void;
  onRemoveSource: (docId: string) => void;
  disabled?: boolean;
}

export function SourceManager({
  sources,
  onAddSources,
  onRemoveSource,
  disabled,
}: SourceManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const handleRemove = (docId: string) => {
    if (sources.length <= 1) {
      toast.error('Podcast must have at least one source');
      return;
    }
    onRemoveSource(docId);
  };

  const currentSourceIds = sources.map((d) => d.id);

  return (
    <>
      <SourceList
        sources={sources}
        disabled={disabled}
        onRemove={handleRemove}
        onAdd={() => setAddDialogOpen(true)}
      />

      <AddSourceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        currentSourceIds={currentSourceIds}
        onAddSources={onAddSources}
      />
    </>
  );
}
