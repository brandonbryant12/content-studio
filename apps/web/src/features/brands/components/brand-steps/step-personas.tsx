// features/brands/components/brand-steps/step-personas.tsx
// Step component for managing brand personas

import { PlusIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';
import { memo, useCallback } from 'react';
import type { RouterOutput } from '@repo/api/client';
import type { BrandPersona } from '@repo/db/schema';
import { useOptimisticUpdate } from '../../hooks/use-optimistic-update';
import { PersonaCard } from '../brand-inputs/persona-card';
import {
  AIAssistantPanel,
  type QuickAction,
} from '../brand-wizard/ai-assistant-panel';
import {
  SortableList,
  SortableItemWrapper,
  DragHandle,
} from '@/shared/components';

type Brand = RouterOutput['brands']['get'];

interface StepPersonasProps {
  /** Current brand data */
  brand: Brand;
  /** Callback when AI completes step - auto-progress to next */
  /** Optional className for container */
  className?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Suggest personas',
    prompt:
      'Based on my brand description and mission, suggest 2-3 brand personas that would work well for content creation.',
  },
  {
    label: 'Create host persona',
    prompt:
      'Help me create a host persona for podcast content based on my brand.',
  },
  {
    label: 'Create expert persona',
    prompt: 'Help me create an expert/thought leader persona for my brand.',
  },
];

/**
 * Generate a unique ID for a new persona.
 */
function generatePersonaId(): string {
  return `persona_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a new empty persona.
 */
function createEmptyPersona(): BrandPersona {
  return {
    id: generatePersonaId(),
    name: '',
    role: '',
    voiceId: '',
    personalityDescription: '',
    speakingStyle: '',
    exampleQuotes: [],
  };
}

/**
 * Wizard step for managing brand personas.
 * Features a list of PersonaCards with add functionality.
 */
export const StepPersonas = memo(function StepPersonas({
  brand,
  className,
}: StepPersonasProps) {
  const updateMutation = useOptimisticUpdate();
  // Deep clone to convert readonly to mutable (including nested arrays)
  const personas: BrandPersona[] = (brand.personas ?? []).map((p) => ({
    ...p,
    exampleQuotes: [...p.exampleQuotes],
  }));

  const handleAddPersona = useCallback(async () => {
    const newPersona = createEmptyPersona();
    await updateMutation.mutateAsync({
      id: brand.id,
      personas: [...personas, newPersona],
    });
  }, [brand.id, personas, updateMutation]);

  const handleUpdatePersona = useCallback(
    async (updatedPersona: BrandPersona) => {
      const updatedPersonas = personas.map((p) =>
        p.id === updatedPersona.id ? updatedPersona : p,
      );
      await updateMutation.mutateAsync({
        id: brand.id,
        personas: updatedPersonas,
      });
    },
    [brand.id, personas, updateMutation],
  );

  const handleDeletePersona = useCallback(
    async (personaId: string) => {
      const updatedPersonas = personas.filter((p) => p.id !== personaId);
      await updateMutation.mutateAsync({
        id: brand.id,
        personas: updatedPersonas,
      });
    },
    [brand.id, personas, updateMutation],
  );

  const handleReorderPersonas = useCallback(
    async (reorderedPersonas: BrandPersona[]) => {
      await updateMutation.mutateAsync({
        id: brand.id,
        personas: reorderedPersonas,
      });
    },
    [brand.id, updateMutation],
  );

  return (
    <div
      className={cn('grid grid-cols-1 lg:grid-cols-2 gap-6 h-full', className)}
    >
      {/* Left side: Personas list */}
      <div className="flex flex-col space-y-6 p-6 bg-muted/30 rounded-xl overflow-hidden">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Brand Personas
          </h3>
          <p className="text-sm text-muted-foreground">
            Create characters that represent your brand voice in content.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {personas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">No personas yet.</p>
              <p className="text-sm">
                Add a persona or ask the AI to suggest some.
              </p>
            </div>
          ) : (
            <SortableList
              items={personas}
              onReorder={handleReorderPersonas}
              className="space-y-4"
              useDragHandle
            >
              {(persona) => (
                <SortableItemWrapper key={persona.id} id={persona.id}>
                  <div className="flex items-start gap-2">
                    <DragHandle className="mt-3 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors shrink-0" />
                    <div className="flex-1 min-w-0">
                      <PersonaCard
                        persona={persona}
                        onUpdate={handleUpdatePersona}
                        onDelete={handleDeletePersona}
                        disabled={updateMutation.isPending}
                      />
                    </div>
                  </div>
                </SortableItemWrapper>
              )}
            </SortableList>
          )}
        </div>

        {/* Add button */}
        <div className="shrink-0">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleAddPersona}
            disabled={updateMutation.isPending}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Persona
          </Button>
        </div>

        {/* Persona tips */}
        <div className="space-y-2 text-sm text-muted-foreground shrink-0">
          <p>
            <strong className="text-foreground">Persona ideas:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Host: Main voice for podcasts and videos</li>
            <li>Expert: Thought leader for educational content</li>
            <li>Storyteller: Engaging narrator for brand stories</li>
          </ul>
        </div>

        {updateMutation.isPending && (
          <p className="text-xs text-muted-foreground animate-pulse shrink-0">
            Saving...
          </p>
        )}
      </div>

      {/* Right side: AI assistant */}
      <div className="h-full min-h-[400px] lg:min-h-0">
        <AIAssistantPanel
          brandId={brand.id}
          stepKey="personas"
          quickActions={QUICK_ACTIONS}
          className="h-full"
        />
      </div>
    </div>
  );
});
