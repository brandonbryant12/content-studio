import type { PodcastFullOutput } from '@repo/db/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { SetupFooter } from './setup-footer';
import { StepIndicator } from './step-indicator';
import { StepAudio } from './steps/step-audio';
import { StepBrand } from './steps/step-brand';
import { StepDocuments } from './steps/step-documents';
import { StepInstructions } from './steps/step-instructions';
import { useOptimisticGeneration } from '../../hooks/use-optimistic-generation';
import { getPodcastQueryKey } from '../../hooks/use-podcast';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';
import type { RouterOutput } from '@repo/api/client';
import type {
  PersonaSelectorOption,
  SegmentSelectorOption,
} from '@/features/brands/components';

type PodcastFull = PodcastFullOutput;
type PodcastFormat = 'conversation' | 'voiceover';

const TOTAL_STEPS = 4;

interface SetupWizardProps {
  podcast: PodcastFull;
}

export function SetupWizard({ podcast }: SetupWizardProps) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);

  // Prefetch documents on mount so they're ready for step 2
  useEffect(() => {
    queryClient.prefetchQuery(
      apiClient.documents.list.queryOptions({ input: {} }),
    );
  }, [queryClient]);

  // Format is set at creation and read-only during setup
  const format = (podcast.format as PodcastFormat) ?? 'conversation';

  // Step 1 state - Documents
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(
    podcast.documents.map((d) => d.id),
  );

  // Step 2 state - Brand
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(
    null,
  );
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(
    null,
  );

  // Step 3 state - Audio
  const [duration, setDuration] = useState(podcast.targetDurationMinutes ?? 5);
  const [hostVoice, setHostVoice] = useState(podcast.hostVoice ?? 'Aoede');
  const [coHostVoice, setCoHostVoice] = useState(
    podcast.coHostVoice ?? 'Charon',
  );

  // Step 4 state - Instructions
  const [instructions, setInstructions] = useState(
    podcast.promptInstructions ?? '',
  );

  // Handle persona change - auto-fill host voice
  const handlePersonaChange = (persona: PersonaSelectorOption | null) => {
    setSelectedPersonaId(persona?.id ?? null);
    if (persona) {
      setHostVoice(persona.voiceId);
    }
  };

  // Handle segment change - can pre-populate instructions
  const handleSegmentChange = (segment: SegmentSelectorOption | null) => {
    setSelectedSegmentId(segment?.id ?? null);
    // Pre-populate instructions with messaging tone if no instructions set yet
    if (segment && !instructions.trim()) {
      setInstructions(
        `Target audience: ${segment.name}. Messaging tone: ${segment.messagingTone}`,
      );
    }
  };

  // Update mutation for saving progress
  const queryKey = getPodcastQueryKey(podcast.id);
  const updateMutation = useMutation(
    apiClient.podcasts.update.mutationOptions({
      onSuccess: (updatedPodcast) => {
        // Update the cache so workbench gets fresh data after wizard completes
        queryClient.setQueryData(
          queryKey,
          (current: RouterOutput['podcasts']['get'] | undefined) => {
            if (!current) return current;
            return {
              ...current,
              ...updatedPodcast,
              // Preserve documents since update only returns podcast fields
              documents: current.documents,
            };
          },
        );
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to save'));
      },
    }),
  );

  // Generate mutation for final step - uses optimistic update for immediate status feedback
  const generateMutation = useOptimisticGeneration(podcast.id);

  const isLoading = updateMutation.isPending || generateMutation.isPending;

  // Validation for each step
  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return selectedDocIds.length > 0;
      case 2:
        return true; // Brand step is optional
      case 3:
        return duration > 0 && hostVoice.length > 0;
      case 4:
        return true; // Instructions are optional
      default:
        return false;
    }
  };

  // Save current step data
  const saveStepData = async (step: number): Promise<boolean> => {
    try {
      switch (step) {
        case 1:
          await updateMutation.mutateAsync({
            id: podcast.id,
            documentIds: selectedDocIds,
          });
          break;
        case 2:
          // Brand step is optional - no data saved to podcast
          // Persona/segment selections affect voice/instructions which are saved in later steps
          break;
        case 3:
          await updateMutation.mutateAsync({
            id: podcast.id,
            targetDurationMinutes: duration,
            hostVoice,
            coHostVoice: format === 'conversation' ? coHostVoice : undefined,
          });
          break;
        case 4:
          // Save instructions and trigger generation
          await updateMutation.mutateAsync({
            id: podcast.id,
            promptInstructions: instructions.trim() || undefined,
          });
          // Trigger generation - optimistic update will set status to 'generating_script'
          // which exits setup mode via isSetupMode() check
          await generateMutation.mutateAsync({ id: podcast.id });
          break;
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleContinue = async () => {
    if (!canProceedFromStep(currentStep)) return;

    const success = await saveStepData(currentStep);
    if (success && currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
    // If step 4, generation was triggered and the component will unmount
    // as the podcast status changes
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="setup-wizard">
      <div className="setup-wizard-card">
        <StepIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />

        {currentStep === 1 && (
          <StepDocuments
            selectedIds={selectedDocIds}
            onSelectionChange={setSelectedDocIds}
          />
        )}

        {currentStep === 2 && (
          <StepBrand
            selectedBrandId={selectedBrandId}
            selectedPersonaId={selectedPersonaId}
            selectedSegmentId={selectedSegmentId}
            onBrandChange={setSelectedBrandId}
            onPersonaChange={handlePersonaChange}
            onSegmentChange={handleSegmentChange}
          />
        )}

        {currentStep === 3 && (
          <StepAudio
            format={format}
            duration={duration}
            hostVoice={hostVoice}
            coHostVoice={coHostVoice}
            onDurationChange={setDuration}
            onHostVoiceChange={setHostVoice}
            onCoHostVoiceChange={setCoHostVoice}
          />
        )}

        {currentStep === 4 && (
          <StepInstructions
            instructions={instructions}
            onInstructionsChange={setInstructions}
          />
        )}

        <SetupFooter
          currentStep={currentStep}
          onBack={handleBack}
          onContinue={handleContinue}
          continueDisabled={!canProceedFromStep(currentStep)}
          isLoading={isLoading}
          isFinalStep={currentStep === TOTAL_STEPS}
        />
      </div>
    </div>
  );
}
