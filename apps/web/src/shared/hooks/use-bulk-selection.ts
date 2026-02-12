import { useState, useCallback } from 'react';

export interface UseBulkSelectionReturn {
  selectedIds: ReadonlySet<string>;
  selectedCount: number;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  selectAll: (ids: readonly string[]) => void;
  deselectAll: () => void;
  isAllSelected: (ids: readonly string[]) => boolean;
  isIndeterminate: (ids: readonly string[]) => boolean;
}

export function useBulkSelection(): UseBulkSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    new Set(),
  );

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: readonly string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  );

  const selectedCount = selectedIds.size;

  const isAllSelected = useCallback(
    (ids: readonly string[]) =>
      ids.length > 0 && ids.every((id) => selectedIds.has(id)),
    [selectedIds],
  );

  const isIndeterminate = useCallback(
    (ids: readonly string[]) => {
      const someSelected = ids.some((id) => selectedIds.has(id));
      const allSelected = ids.every((id) => selectedIds.has(id));
      return someSelected && !allSelected;
    },
    [selectedIds],
  );

  return {
    selectedIds,
    selectedCount,
    isSelected,
    toggle,
    selectAll,
    deselectAll,
    isAllSelected,
    isIndeterminate,
  };
}
