import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import type { PodcastFullOutput } from '@repo/db/schema';
import { useOptimisticGeneration } from '../../hooks/use-optimistic-generation';
import { getPodcastQueryKey } from '../../hooks/use-podcast';
import { SetupFooter } from './setup-footer';
import { StepIndicator } from './step-indicator';
import { StepAudio } from './steps/step-audio';
import { StepDocuments } from './steps/step-documents';
import { StepInstructions } from './steps/step-instructions';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

const TOTAL_STEPS = 3;

interface SetupWizardProps {
  podcast: PodcastFullOutput;
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

  const format = podcast.format ?? 'conversation';

  // Step 2 state
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(
    podcast.documents.map((d) => d.id),
  );
  const [researchDocId, setResearchDocId] = useState<string | null>(null);

  const handleDocumentCreated = useCallback((docId: string, _title: string) => {
    setResearchDocId(docId);
    setSelectedDocIds((prev) => [...prev, docId]);
  }, []);

  // Step 3 state
  const [duration, setDuration] = useState(podcast.targetDurationMinutes ?? 5);
  const [hostVoice, setHostVoice] = useState(podcast.hostVoice ?? 'Aoede');
  const [coHostVoice, setCoHostVoice] = useState(
    podcast.coHostVoice ?? 'Charon',
  );
  const [hostPersonaId, setHostPersonaId] = useState<string | null>(
    podcast.hostPersonaId ?? null,
  );
  const [coHostPersonaId, setCoHostPersonaId] = useState<string | null>(
    podcast.coHostPersonaId ?? null,
  );
  const [hostPersonaVoiceId, setHostPersonaVoiceId] = useState<string | null>(
    null,
  );
  const [coHostPersonaVoiceId, setCoHostPersonaVoiceId] = useState<
    string | null
  >(null);

  // Step 3 state (instructions)
  const [instructions, setInstructions] = useState(
    podcast.promptInstructions ?? '',
  );

  const handleHostPersonaChange = (
    personaId: string | null,
    voiceId: string | null,
  ) => {
    setHostPersonaId(personaId);
    setHostPersonaVoiceId(voiceId);
    if (voiceId) setHostVoice(voiceId);
  };

  const handleCoHostPersonaChange = (
    personaId: string | null,
    voiceId: string | null,
  ) => {
    setCoHostPersonaId(personaId);
    setCoHostPersonaVoiceId(voiceId);
    if (voiceId) setCoHostVoice(voiceId);
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
        return duration > 0 && hostVoice.length > 0;
      case 3:
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
          await updateMutation.mutateAsync({
            id: podcast.id,
            targetDurationMinutes: duration,
            hostVoice,
            coHostVoice: format === 'conversation' ? coHostVoice : undefined,
            hostPersonaId: hostPersonaId || undefined,
            coHostPersonaId:
              format === 'conversation'
                ? coHostPersonaId || undefined
                : undefined,
          });
          break;
        case 3:
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
    // If final step, generation was triggered and the component will unmount
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
            researchDocId={researchDocId}
            onDocumentCreated={handleDocumentCreated}
          />
        )}

        {currentStep === 2 && (
          <StepAudio
            format={format}
            duration={duration}
            hostVoice={hostVoice}
            coHostVoice={coHostVoice}
            hostPersonaId={hostPersonaId}
            coHostPersonaId={coHostPersonaId}
            hostPersonaVoiceId={hostPersonaVoiceId}
            coHostPersonaVoiceId={coHostPersonaVoiceId}
            onDurationChange={setDuration}
            onHostVoiceChange={setHostVoice}
            onCoHostVoiceChange={setCoHostVoice}
            onHostPersonaChange={handleHostPersonaChange}
            onCoHostPersonaChange={handleCoHostPersonaChange}
          />
        )}

        {currentStep === 3 && (
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
          subtitle={
            currentStep === TOTAL_STEPS && researchDocId
              ? 'Research will complete in the background'
              : undefined
          }
        />
      </div>
    </div>
  );
}
