'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
  type DraggableAttributes,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  createContext,
  useContext,
  type CSSProperties,
  type ReactNode,
} from 'react';

/* -----------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------*/

export interface SortableItem {
  id: UniqueIdentifier;
}

export interface SortableListProps<T extends SortableItem> {
  /** Items to render in the sortable list */
  items: T[];
  /** Callback when items are reordered */
  onReorder: (items: T[]) => void;
  /** Render function for each item */
  children: (item: T, index: number) => ReactNode;
  /** Optional class name for the list container */
  className?: string;
  /** Whether drag handle is required (vs whole item draggable) */
  useDragHandle?: boolean;
}

export interface SortableItemWrapperProps {
  /** Unique identifier for the item */
  id: UniqueIdentifier;
  /** Content to render inside the sortable item */
  children: ReactNode;
  /** Optional class name */
  className?: string;
  /** Whether the item is disabled */
  disabled?: boolean;
}

export interface DragHandleProps {
  /** Optional class name */
  className?: string;
  /** Content to render (defaults to drag icon) */
  children?: ReactNode;
}

/* -----------------------------------------------------------------------------
 * Context
 * ---------------------------------------------------------------------------*/

interface SortableItemContextValue {
  attributes: DraggableAttributes;
  listeners: ReturnType<typeof useSortable>['listeners'];
  setNodeRef: (node: HTMLElement | null) => void;
  isDragging: boolean;
}

const SortableItemContext = createContext<SortableItemContextValue | null>(
  null
);

function useSortableItemContext() {
  const context = useContext(SortableItemContext);
  if (!context) {
    throw new Error(
      'useSortableItemContext must be used within a SortableItemWrapper'
    );
  }
  return context;
}

/* -----------------------------------------------------------------------------
 * DragHandle Component
 * ---------------------------------------------------------------------------*/

export function DragHandle({ className, children }: DragHandleProps) {
  const { attributes, listeners } = useSortableItemContext();

  return (
    <button
      type="button"
      className={className}
      {...attributes}
      {...listeners}
      aria-label="Drag to reorder"
    >
      {children ?? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  );
}

/* -----------------------------------------------------------------------------
 * SortableItemWrapper Component
 * ---------------------------------------------------------------------------*/

export function SortableItemWrapper({
  id,
  children,
  className,
  disabled = false,
}: SortableItemWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : undefined,
  };

  const contextValue: SortableItemContextValue = {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  };

  return (
    <SortableItemContext.Provider value={contextValue}>
      <div ref={setNodeRef} style={style} className={className}>
        {children}
      </div>
    </SortableItemContext.Provider>
  );
}

/* -----------------------------------------------------------------------------
 * SortableList Component
 * ---------------------------------------------------------------------------*/

export function SortableList<T extends SortableItem>({
  items,
  onReorder,
  children,
  className,
  useDragHandle = false,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      onReorder(newItems);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={className} role="list">
          {items.map((item, index) => children(item, index))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

/* -----------------------------------------------------------------------------
 * Utility Hooks
 * ---------------------------------------------------------------------------*/

/**
 * Hook to access sortable item state (isDragging, etc.)
 * Must be used within a SortableItemWrapper
 */
export function useSortableItem() {
  return useSortableItemContext();
}
