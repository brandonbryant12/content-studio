# Components

This document defines the Container/Presenter pattern for Content Studio components.

## Overview

Components are split into two types:

1. **Containers** - Fetch data, manage state, handle mutations
2. **Presenters** - Pure UI, receive props, emit events

This separation enables:
- Reusable presenters (testable, Storybook-friendly)
- Clear data flow (container → presenter)
- Easier testing (mock container, test presenter in isolation)

## Container Components

### Responsibilities

- Fetch data via `useSuspenseQuery`
- Coordinate custom hooks for state management
- Handle mutations and optimistic updates
- Compute derived state
- Pass data and callbacks to presenters

### Naming Convention

```
{Domain}{View}Container.tsx
```

Examples:
- `podcast-list-container.tsx`
- `podcast-detail-container.tsx`
- `document-upload-container.tsx`

### Template

```typescript
// features/podcasts/components/podcast-detail-container.tsx

import { useSuspenseQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { apiClient } from '@/clients/api-client';
import {
  usePodcastSettings,
  useScriptEditor,
  useOptimisticGeneration,
} from '../hooks';
import { PodcastDetail } from './podcast-detail';

/**
 * Container: Fetches data and coordinates state.
 * Renders PodcastDetail presenter with all data and callbacks.
 */
export function PodcastDetailContainer() {
  // Get route params
  const { podcastId } = useParams({ from: '/_protected/podcasts/$podcastId' });

  // Data fetching (Suspense handles loading)
  const { data: podcast } = useSuspenseQuery(
    apiClient.podcasts.get.queryOptions({ input: { id: podcastId } }),
  );

  // State management via custom hooks
  const scriptEditor = useScriptEditor({
    podcastId,
    initialSegments: podcast.activeVersion?.segments ?? [],
  });

  const settings = usePodcastSettings({ podcast });

  // Mutations
  const generateMutation = useOptimisticGeneration(podcastId);

  // Computed values
  const hasChanges = scriptEditor.hasChanges || settings.hasChanges;
  const isGenerating = podcast.activeVersion?.status === 'generating_script';

  // Event handlers
  const handleSave = async () => {
    if (scriptEditor.hasChanges) {
      await scriptEditor.saveChanges();
    }
    if (settings.hasChanges) {
      await settings.saveSettings();
    }
  };

  const handleGenerate = () => {
    generateMutation.mutate({ id: podcast.id });
  };

  // Render presenter with all data and callbacks
  return (
    <PodcastDetail
      podcast={podcast}
      segments={scriptEditor.segments}
      settings={settings}
      hasChanges={hasChanges}
      isGenerating={isGenerating}
      isSaving={scriptEditor.isSaving || settings.isSaving}
      onUpdateSegment={scriptEditor.updateSegment}
      onRemoveSegment={scriptEditor.removeSegment}
      onReorderSegments={scriptEditor.reorderSegments}
      onSave={handleSave}
      onGenerate={handleGenerate}
    />
  );
}
```

## Presenter Components

### Responsibilities

- Render UI based on props
- Emit events via callback props
- Manage purely local UI state (open/closed, hover, focus)
- **No** data fetching, mutations, or business logic

### Naming Convention

```
{Domain}{View}.tsx
```

Examples:
- `podcast-detail.tsx`
- `podcast-list.tsx`
- `podcast-card.tsx`

### Template

```typescript
// features/podcasts/components/podcast-detail.tsx

import type { RouterOutput } from '@repo/api/client';
import type { UsePodcastSettingsReturn } from '../hooks';
import { Button } from '@repo/ui/components/button';
import { Badge } from '@repo/ui/components/badge';

type Podcast = RouterOutput['podcasts']['get'];

interface Segment {
  speaker: string;
  line: string;
  index: number;
}

/**
 * Props: All data in, all events out.
 */
export interface PodcastDetailProps {
  // Data (readonly)
  podcast: Podcast;
  segments: Segment[];
  settings: UsePodcastSettingsReturn;

  // State flags
  hasChanges: boolean;
  isGenerating: boolean;
  isSaving: boolean;

  // Event callbacks
  onUpdateSegment: (index: number, data: Partial<Segment>) => void;
  onRemoveSegment: (index: number) => void;
  onReorderSegments: (from: number, to: number) => void;
  onSave: () => void;
  onGenerate: () => void;
}

/**
 * Presenter: Pure rendering component.
 */
export function PodcastDetail({
  podcast,
  segments,
  settings,
  hasChanges,
  isGenerating,
  isSaving,
  onUpdateSegment,
  onRemoveSegment,
  onReorderSegments,
  onSave,
  onGenerate,
}: PodcastDetailProps) {
  // Local UI state only (not business state)
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);

  return (
    <div className="podcast-detail">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{podcast.title}</h1>
        {hasChanges && (
          <Badge variant="warning">Unsaved changes</Badge>
        )}
      </header>

      <ScriptSection
        segments={segments}
        disabled={isGenerating}
        onUpdate={onUpdateSegment}
        onRemove={onRemoveSegment}
        onReorder={onReorderSegments}
      />

      <SettingsSection
        expanded={expandedPanel === 'settings'}
        onToggle={() => setExpandedPanel(
          expandedPanel === 'settings' ? null : 'settings'
        )}
        settings={settings}
        disabled={isGenerating}
      />

      <footer className="flex gap-4">
        <Button
          onClick={onSave}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate'}
        </Button>
      </footer>
    </div>
  );
}
```

## Custom Hook Patterns

### Data Fetching Hook

```typescript
// features/podcasts/hooks/use-podcast.ts

import { useSuspenseQuery, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/clients/api-client';

/**
 * Fetch a single podcast.
 * Uses Suspense for cleaner loading states.
 */
export function usePodcast(podcastId: string) {
  return useSuspenseQuery(
    apiClient.podcasts.get.queryOptions({ input: { id: podcastId } }),
  );
}

/**
 * Fetch podcast list.
 */
export function usePodcastList(options: { limit?: number } = {}) {
  return useQuery(
    apiClient.podcasts.list.queryOptions({ input: { limit: options.limit } }),
  );
}
```

### State Management Hook

```typescript
// features/podcasts/hooks/use-podcast-settings.ts

import { useState, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/api-client';
import { getErrorMessage } from '@/shared/lib/errors';

type Podcast = RouterOutput['podcasts']['get'];

interface UsePodcastSettingsOptions {
  podcast: Podcast | undefined;
}

export interface UsePodcastSettingsReturn {
  // Current values
  hostVoice: string;
  coHostVoice: string;
  targetDuration: number;

  // Setters
  setHostVoice: (voice: string) => void;
  setCoHostVoice: (voice: string) => void;
  setTargetDuration: (duration: number) => void;

  // State
  hasChanges: boolean;
  isSaving: boolean;

  // Actions
  saveSettings: () => Promise<void>;
  discardChanges: () => void;
}

export function usePodcastSettings({
  podcast,
}: UsePodcastSettingsOptions): UsePodcastSettingsReturn {
  // Track podcast ID to reset on navigation
  const podcastIdRef = useRef(podcast?.id);

  // Local state
  const [hostVoice, setHostVoice] = useState(podcast?.hostVoice ?? 'Aoede');
  const [coHostVoice, setCoHostVoice] = useState(podcast?.coHostVoice ?? 'Charon');
  const [targetDuration, setTargetDuration] = useState(
    podcast?.targetDurationMinutes ?? 5
  );

  // Reset on navigation to different podcast
  if (podcast?.id !== podcastIdRef.current) {
    podcastIdRef.current = podcast?.id;
    setHostVoice(podcast?.hostVoice ?? 'Aoede');
    setCoHostVoice(podcast?.coHostVoice ?? 'Charon');
    setTargetDuration(podcast?.targetDurationMinutes ?? 5);
  }

  // Track changes
  const hasChanges =
    hostVoice !== (podcast?.hostVoice ?? 'Aoede') ||
    coHostVoice !== (podcast?.coHostVoice ?? 'Charon') ||
    targetDuration !== (podcast?.targetDurationMinutes ?? 5);

  // Mutation
  const updateMutation = useMutation(
    apiClient.podcasts.update.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to save settings'));
      },
    }),
  );

  const saveSettings = useCallback(async () => {
    if (!podcast?.id) return;

    await updateMutation.mutateAsync({
      id: podcast.id,
      hostVoice,
      coHostVoice,
      targetDurationMinutes: targetDuration,
    });
  }, [podcast?.id, hostVoice, coHostVoice, targetDuration, updateMutation]);

  const discardChanges = useCallback(() => {
    setHostVoice(podcast?.hostVoice ?? 'Aoede');
    setCoHostVoice(podcast?.coHostVoice ?? 'Charon');
    setTargetDuration(podcast?.targetDurationMinutes ?? 5);
  }, [podcast]);

  return {
    hostVoice,
    coHostVoice,
    targetDuration,
    setHostVoice,
    setCoHostVoice,
    setTargetDuration,
    hasChanges,
    isSaving: updateMutation.isPending,
    saveSettings,
    discardChanges,
  };
}
```

### Optimistic Mutation Hook

See [Mutations](./mutations.md) for optimistic update patterns.

## Props Interface Patterns

### Passing Hook Returns

When a hook returns a coherent set of related values, pass the whole return:

```typescript
// GOOD - related values stay together
interface Props {
  settings: UsePodcastSettingsReturn;
}

<SettingsPanel settings={settings} />

// Inside SettingsPanel
function SettingsPanel({ settings }: Props) {
  return (
    <Select value={settings.hostVoice} onChange={settings.setHostVoice}>
      ...
    </Select>
  );
}
```

### Flattening Unrelated Values

When values come from different sources, flatten them:

```typescript
// GOOD - clear where each prop comes from
interface Props {
  podcast: Podcast;
  isGenerating: boolean;
  onGenerate: () => void;
}
```

### Event Callback Naming

Use `on{Action}` for callbacks:

```typescript
interface Props {
  onSave: () => void;
  onDelete: () => void;
  onUpdateSegment: (index: number, data: Partial<Segment>) => void;
}
```

## Component Composition

### Sub-Presenters

Break large presenters into focused sub-components:

```typescript
// podcast-detail.tsx (main presenter)
function PodcastDetail({ ... }: PodcastDetailProps) {
  return (
    <div>
      <PodcastHeader podcast={podcast} hasChanges={hasChanges} />
      <ScriptSection
        segments={segments}
        onUpdate={onUpdateSegment}
        onRemove={onRemoveSegment}
      />
      <SettingsPanel settings={settings} />
      <ActionBar onSave={onSave} onGenerate={onGenerate} />
    </div>
  );
}

// script-section.tsx (sub-presenter)
interface ScriptSectionProps {
  segments: Segment[];
  onUpdate: (index: number, data: Partial<Segment>) => void;
  onRemove: (index: number) => void;
}

function ScriptSection({ segments, onUpdate, onRemove }: ScriptSectionProps) {
  return (
    <section>
      {segments.map((segment) => (
        <SegmentItem
          key={segment.index}
          segment={segment}
          onUpdate={(data) => onUpdate(segment.index, data)}
          onRemove={() => onRemove(segment.index)}
        />
      ))}
    </section>
  );
}
```

## Responsibility Matrix

| Responsibility | Container | Presenter |
|----------------|-----------|-----------|
| Data fetching | useSuspenseQuery | Never |
| Mutations | useMutation hooks | Never |
| Route params | useParams | Never (receive as prop) |
| Business logic | Orchestrate hooks | Never |
| Computed state | Derive from data | Never |
| Local UI state | Rarely | Yes (open/hover/focus) |
| Error handling | onError callbacks | Display error props |
| Suspense | Wrapped by boundary | Can throw if needed |

## Anti-Patterns

### Data Fetching in Presenters

```typescript
// WRONG
function PodcastDetail({ podcastId }: { podcastId: string }) {
  const { data } = useQuery(...);  // NO!
  return <div>{data?.title}</div>;
}

// CORRECT
function PodcastDetailContainer() {
  const { data } = useSuspenseQuery(...);
  return <PodcastDetail podcast={data} />;
}

function PodcastDetail({ podcast }: { podcast: Podcast }) {
  return <div>{podcast.title}</div>;
}
```

### Mutations in Presenters

```typescript
// WRONG
function PodcastDetail({ podcast }: { podcast: Podcast }) {
  const deleteMutation = useMutation(...);  // NO!
  return <Button onClick={() => deleteMutation.mutate()}>Delete</Button>;
}

// CORRECT
function PodcastDetailContainer() {
  const deleteMutation = useMutation(...);
  return (
    <PodcastDetail
      podcast={podcast}
      onDelete={() => deleteMutation.mutate({ id: podcast.id })}
      isDeleting={deleteMutation.isPending}
    />
  );
}

function PodcastDetail({ onDelete, isDeleting }: Props) {
  return <Button onClick={onDelete} disabled={isDeleting}>Delete</Button>;
}
```

### Business Logic in Presenters

```typescript
// WRONG
function PodcastDetail({ podcast, segments, settings }) {
  const handleSave = async () => {
    // Business logic - NO!
    if (documentSelection.hasChanges) {
      await updateMutation.mutateAsync({ ... });
      await generateMutation.mutateAsync({ ... });
    }
  };
}

// CORRECT
function PodcastDetailContainer() {
  const handleSave = async () => {
    // Business logic in container
    if (documentSelection.hasChanges) { ... }
  };
  return <PodcastDetail onSave={handleSave} />;
}

function PodcastDetail({ onSave }: Props) {
  return <Button onClick={onSave}>Save</Button>;
}
```

### Route Params in Presenters

```typescript
// WRONG - hidden dependency
function ScriptEditor() {
  const { podcastId } = useParams();  // NO!
  // ...
}

// CORRECT - explicit prop
interface ScriptEditorProps {
  podcastId: string;
}

function ScriptEditor({ podcastId }: ScriptEditorProps) {
  // ...
}
```

### Mixing Query Types

```typescript
// WRONG - inconsistent loading states
function Container() {
  const { data: podcast } = useSuspenseQuery(...);  // Suspends
  const { data: docs, isPending } = useQuery(...);  // Doesn't suspend
  if (isPending) return <Spinner />;  // Confusing!
}

// CORRECT - consistent approach
function Container() {
  const { data: podcast } = useSuspenseQuery(...);
  const { data: docs } = useSuspenseQuery(...);
  // Both suspend, Suspense boundary handles loading
}
```

### Over-Prop-Drilling

```typescript
// WRONG - too many individual props
<PodcastDetail
  hostVoice={settings.hostVoice}
  coHostVoice={settings.coHostVoice}
  targetDuration={settings.targetDuration}
  onHostVoiceChange={settings.setHostVoice}
  onCoHostVoiceChange={settings.setCoHostVoice}
  // ... 20 more props
/>

// CORRECT - pass coherent objects
<PodcastDetail
  settings={settings}
/>
```
