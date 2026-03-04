import { useState, useMemo } from 'react';
import type { SourceInfo } from '@/shared/hooks/use-source-selection';
import { AddSourceDialog } from './add-source-dialog';
import { SourceList } from './source-list';

interface SourceManagerProps {
  sources: SourceInfo[];
  onAddSources: (sources: SourceInfo[]) => void;
  onRemoveSource: (sourceId: string) => void;
  disabled?: boolean;
}

export function SourceManager({
  sources,
  onAddSources,
  onRemoveSource,
  disabled,
}: SourceManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const currentIds = useMemo(() => sources.map((s) => s.id), [sources]);

  return (
    <>
      <SourceList
        sources={sources}
        disabled={disabled}
        onRemove={onRemoveSource}
        onAdd={() => setAddDialogOpen(true)}
      />

      <AddSourceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        currentSourceIds={currentIds}
        onAddSources={onAddSources}
      />
    </>
  );
}
