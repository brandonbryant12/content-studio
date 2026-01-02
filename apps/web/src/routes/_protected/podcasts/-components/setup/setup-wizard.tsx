import type { PodcastFullOutput } from '@repo/db/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { SetupFooter } from './setup-footer';
import { StepIndicator } from './step-indicator';
import { StepAudio } from './steps/step-audio';
import { StepBasics } from './steps/step-basics';
import { StepDocuments } from './steps/step-documents';
import { StepInstructions } from './steps/step-instructions';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/lib/errors';

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

  // Step 2 state
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(
    podcast.documents.map((d) => d.id),
  );

  // Step 3 state
  const [duration, setDuration] = useState(podcast.targetDurationMinutes ?? 5);
  const [hostVoice, setHostVoice] = useState(podcast.hostVoice ?? 'Aoede');
  const [coHostVoice, setCoHostVoice] = useState(
    podcast.coHostVoice ?? 'Charon',
  );

  // Step 4 state
  const [instructions, setInstructions] = useState(
    podcast.promptInstructions ?? '',
  );

  // Update mutation for saving progress
  const updateMutation = useMutation(
    apiClient.podcasts.update.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to save'));
      },
    }),
  );

  // Generate mutation for final step
  const generateMutation = useMutation(
    apiClient.podcasts.generate.mutationOptions({
      onSuccess: () => {
        // Invalidate podcast query so parent detects exit from setup mode
        queryClient.invalidateQueries({
          queryKey: apiClient.podcasts.get.queryOptions({
            input: { id: podcast.id },
          }).queryKey,
        });
        toast.success('Generation started');
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to start generation'));
      },
    }),
  );

  const isLoading = updateMutation.isPending || generateMutation.isPending;

  // Validation for each step
  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return true; // Step 1 is informational, always proceed
      case 2:
        return selectedDocIds.length > 0;
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
          // Step 1 is informational - no data to save
          break;
        case 2:
          await updateMutation.mutateAsync({
            id: podcast.id,
            documentIds: selectedDocIds,
          });
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
          // Trigger generation
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

        {currentStep === 1 && <StepBasics format={format} />}

        {currentStep === 2 && (
          <StepDocuments
            selectedIds={selectedDocIds}
            onSelectionChange={setSelectedDocIds}
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
