import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import type { PodcastFullOutput } from '@repo/api/contracts';
import { useCreatePodcast } from '../../hooks/use-create-podcast';
import { useOptimisticGeneration } from '../../hooks/use-optimistic-generation';
import { getPodcastQueryKey } from '../../hooks/use-podcast';
import { recommendPodcastTargetDurationMinutes } from '../../lib/duration-recommendation';
import {
  cloneEpisodePlan,
  isEpisodePlanReady,
  sanitizeEpisodePlanDraft,
  type EpisodePlan,
} from '../../lib/episode-plan';
import { SetupFooter } from './setup-footer';
import { StepIndicator, type SetupStepDefinition } from './step-indicator';
import { StepAudio } from './steps/step-audio';
import { StepPlan } from './steps/step-plan';
import { StepQuickStart } from './steps/step-quick-start';
import { StepSources } from './steps/step-sources';
import { apiClient } from '@/clients/apiClient';
import {
  getSourceListQueryKey,
  useSources,
} from '@/features/sources/hooks/use-source-list';
import { getErrorMessage } from '@/shared/lib/errors';

const STEP_SOURCES = 1;
const STEP_AUDIO = 2;
const STEP_QUICK_START = 3;
const STEP_PLANNER = 4;
const SETUP_STEPS: readonly SetupStepDefinition[] = [
  { label: 'Sources' },
  { label: 'Audio' },
  { label: 'Instructions', optional: true },
  { label: 'Episode Planner', optional: true },
];

interface SetupWizardProps {
  podcast?: PodcastFullOutput;
  initialSourceIds?: string[];
}

type PodcastDetail = RouterOutput['podcasts']['get'];
type SourceList = RouterOutput['sources']['list'];
type SelectedSourceSummary = {
  id: string;
  title: string;
  status: string;
  wordCount: number;
};

type AsyncMutation = {
  mutate: (variables: any) => void;
  mutateAsync: (variables: any) => Promise<any>;
  isPending: boolean;
};

type SetupSecondaryAction = {
  label: string;
  loadingLabel?: string;
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
};

function getInitialStep(podcast?: PodcastFullOutput) {
  if (!podcast || podcast.sources.length === 0) {
    return STEP_SOURCES;
  }

  if (podcast.hostVoice === null) {
    return STEP_AUDIO;
  }

  return podcast.episodePlan === null ? STEP_QUICK_START : STEP_PLANNER;
}

function getInitialSelectedDocIds(
  podcast: PodcastFullOutput | undefined,
  initialSourceIds: string[] | undefined,
) {
  return podcast?.sources.map((source) => source.id) ?? initialSourceIds ?? [];
}

function sanitizeSetupInstructionsInput(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildSelectedSources(
  podcastSources: PodcastDetail['sources'] | undefined,
  allSources: SourceList,
  selectedDocIds: string[],
) {
  const sourceMap = new Map<string, SelectedSourceSummary>();

  (podcastSources ?? []).forEach((source) =>
    sourceMap.set(source.id, {
      id: source.id,
      title: source.title,
      status: source.status,
      wordCount: source.wordCount,
    }),
  );
  allSources.forEach((source) =>
    sourceMap.set(source.id, {
      id: source.id,
      title: source.title,
      status: source.status,
      wordCount: source.wordCount,
    }),
  );

  return selectedDocIds
    .map((sourceId) => sourceMap.get(sourceId))
    .filter((source): source is SelectedSourceSummary => source !== undefined);
}

function canProceedFromStep({
  currentStep,
  duration,
  episodePlan,
  hostVoice,
  selectedDocIds,
}: {
  currentStep: number;
  duration: number;
  episodePlan: EpisodePlan | null;
  hostVoice: string;
  selectedDocIds: string[];
}) {
  switch (currentStep) {
    case STEP_SOURCES:
      return selectedDocIds.length > 0;
    case STEP_AUDIO:
      return duration > 0 && hostVoice.length > 0;
    case STEP_QUICK_START:
      return true;
    case STEP_PLANNER:
      return episodePlan !== null && isEpisodePlanReady(episodePlan);
    default:
      return false;
  }
}

function getContinueLabel(currentStep: number) {
  if (currentStep === STEP_QUICK_START) {
    return 'Episode Planner';
  }

  if (currentStep === STEP_PLANNER) {
    return 'Approve Plan & Generate';
  }

  return undefined;
}

function getLoadingLabel(currentStep: number) {
  return currentStep === STEP_PLANNER ? 'Starting draft...' : undefined;
}

function getSecondaryAction({
  currentStep,
  podcast,
  episodePlan,
  canGeneratePlan,
  isLoading,
  isGeneratingPlan,
  isGeneratingDraft,
  onGenerateNow,
  onGeneratePlan,
}: {
  currentStep: number;
  podcast?: PodcastFullOutput;
  episodePlan: EpisodePlan | null;
  canGeneratePlan: boolean;
  isLoading: boolean;
  isGeneratingPlan: boolean;
  isGeneratingDraft: boolean;
  onGenerateNow: () => void;
  onGeneratePlan: () => void;
}): SetupSecondaryAction | undefined {
  if (!podcast) {
    return undefined;
  }

  if (currentStep === STEP_QUICK_START) {
    return {
      label: 'Generate Now',
      loadingLabel: 'Starting draft...',
      onClick: onGenerateNow,
      disabled: isLoading,
      isLoading: isGeneratingDraft,
    };
  }

  if (currentStep === STEP_PLANNER) {
    return {
      label: episodePlan === null ? 'Generate Plan' : 'Regenerate Plan',
      loadingLabel: 'Generating plan...',
      onClick: onGeneratePlan,
      disabled: !canGeneratePlan || isLoading,
      isLoading: isGeneratingPlan,
    };
  }

  return undefined;
}

function SetupWizardStepContent({
  currentStep,
  format,
  selectedDocIds,
  duration,
  recommendedDuration,
  selectedSourceCount,
  selectedSourceWordCount,
  pendingSourceCount,
  hostVoice,
  coHostVoice,
  hostPersonaId,
  coHostPersonaId,
  hostPersonaVoiceId,
  coHostPersonaVoiceId,
  setupInstructions,
  episodePlan,
  selectedSources,
  canGeneratePlan,
  isGeneratingPlan,
  onSelectionChange,
  onDurationChange,
  onHostVoiceChange,
  onCoHostVoiceChange,
  onHostPersonaChange,
  onCoHostPersonaChange,
  onInstructionsChange,
  onPlanChange,
}: {
  currentStep: number;
  format: PodcastFullOutput['format'] | 'conversation';
  selectedDocIds: string[];
  duration: number;
  recommendedDuration: number | null;
  selectedSourceCount: number;
  selectedSourceWordCount: number;
  pendingSourceCount: number;
  hostVoice: string;
  coHostVoice: string;
  hostPersonaId: string | null;
  coHostPersonaId: string | null;
  hostPersonaVoiceId: string | null;
  coHostPersonaVoiceId: string | null;
  setupInstructions: string;
  episodePlan: EpisodePlan | null;
  selectedSources: SelectedSourceSummary[];
  canGeneratePlan: boolean;
  isGeneratingPlan: boolean;
  onSelectionChange: (ids: string[]) => void;
  onDurationChange: (value: number) => void;
  onHostVoiceChange: (value: string) => void;
  onCoHostVoiceChange: (value: string) => void;
  onHostPersonaChange: (
    personaId: string | null,
    voiceId: string | null,
  ) => void;
  onCoHostPersonaChange: (
    personaId: string | null,
    voiceId: string | null,
  ) => void;
  onInstructionsChange: (value: string) => void;
  onPlanChange: (plan: EpisodePlan) => void;
}) {
  if (currentStep === STEP_SOURCES) {
    return (
      <StepSources
        selectedIds={selectedDocIds}
        onSelectionChange={onSelectionChange}
      />
    );
  }

  if (currentStep === STEP_AUDIO) {
    return (
      <StepAudio
        format={format}
        duration={duration}
        recommendedDuration={recommendedDuration}
        selectedSourceCount={selectedSourceCount}
        selectedSourceWordCount={selectedSourceWordCount}
        pendingSourceCount={pendingSourceCount}
        hostVoice={hostVoice}
        coHostVoice={coHostVoice}
        hostPersonaId={hostPersonaId}
        coHostPersonaId={coHostPersonaId}
        hostPersonaVoiceId={hostPersonaVoiceId}
        coHostPersonaVoiceId={coHostPersonaVoiceId}
        onDurationChange={onDurationChange}
        onHostVoiceChange={onHostVoiceChange}
        onCoHostVoiceChange={onCoHostVoiceChange}
        onHostPersonaChange={onHostPersonaChange}
        onCoHostPersonaChange={onCoHostPersonaChange}
      />
    );
  }

  if (currentStep === STEP_QUICK_START) {
    return (
      <StepQuickStart
        instructions={setupInstructions}
        onInstructionsChange={onInstructionsChange}
      />
    );
  }

  return (
    <StepPlan
      plan={episodePlan}
      setupInstructions={setupInstructions}
      selectedSources={selectedSources}
      canGeneratePlan={canGeneratePlan}
      isGeneratingPlan={isGeneratingPlan}
      pendingSourceCount={pendingSourceCount}
      onPlanChange={onPlanChange}
    />
  );
}

function useSetupWizardState({ podcast, initialSourceIds }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(() => getInitialStep(podcast));
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(() =>
    getInitialSelectedDocIds(podcast, initialSourceIds),
  );
  const [duration, setDuration] = useState(podcast?.targetDurationMinutes ?? 5);
  const [hasManualDurationOverride, setHasManualDurationOverride] =
    useState(false);
  const [hostVoice, setHostVoice] = useState(podcast?.hostVoice ?? 'Aoede');
  const [coHostVoice, setCoHostVoice] = useState(
    podcast?.coHostVoice ?? 'Charon',
  );
  const [hostPersonaId, setHostPersonaId] = useState<string | null>(
    podcast?.hostPersonaId ?? null,
  );
  const [coHostPersonaId, setCoHostPersonaId] = useState<string | null>(
    podcast?.coHostPersonaId ?? null,
  );
  const [hostPersonaVoiceId, setHostPersonaVoiceId] = useState<string | null>(
    null,
  );
  const [coHostPersonaVoiceId, setCoHostPersonaVoiceId] = useState<
    string | null
  >(null);
  const [setupInstructions, setSetupInstructions] = useState(
    podcast?.setupInstructions ?? '',
  );
  const [episodePlan, setEpisodePlan] = useState<EpisodePlan | null>(() =>
    cloneEpisodePlan(podcast?.episodePlan),
  );

  const handleEpisodePlanChange = useCallback((nextPlan: EpisodePlan) => {
    setEpisodePlan(nextPlan);
  }, []);

  const handleDurationChange = useCallback((nextDuration: number) => {
    setHasManualDurationOverride(true);
    setDuration(nextDuration);
  }, []);

  const handleSetupInstructionsChange = useCallback((value: string) => {
    setSetupInstructions(value);
  }, []);

  const handleHostPersonaChange = useCallback(
    (personaId: string | null, voiceId: string | null) => {
      setHostPersonaId(personaId);
      setHostPersonaVoiceId(voiceId);
      if (voiceId) {
        setHostVoice(voiceId);
      }
    },
    [],
  );

  const handleCoHostPersonaChange = useCallback(
    (personaId: string | null, voiceId: string | null) => {
      setCoHostPersonaId(personaId);
      setCoHostPersonaVoiceId(voiceId);
      if (voiceId) {
        setCoHostVoice(voiceId);
      }
    },
    [],
  );

  return {
    currentStep,
    setCurrentStep,
    selectedDocIds,
    setSelectedDocIds,
    duration,
    setDuration,
    hasManualDurationOverride,
    hostVoice,
    setHostVoice,
    coHostVoice,
    setCoHostVoice,
    hostPersonaId,
    coHostPersonaId,
    hostPersonaVoiceId,
    coHostPersonaVoiceId,
    setupInstructions,
    setSetupInstructions,
    episodePlan,
    setEpisodePlan,
    handleEpisodePlanChange,
    handleDurationChange,
    handleSetupInstructionsChange,
    handleHostPersonaChange,
    handleCoHostPersonaChange,
  };
}

function useSetupWizardActions({
  navigate,
  podcast,
  format,
  currentStep,
  setCurrentStep,
  selectedDocIds,
  duration,
  hostVoice,
  coHostVoice,
  hostPersonaId,
  coHostPersonaId,
  setupInstructions,
  setSetupInstructions,
  episodePlan,
  setEpisodePlan,
  canGeneratePlan,
  isLoading,
  createMutation,
  updateMutation,
  generatePlanMutation,
  generateMutation,
}: {
  navigate: ReturnType<typeof useNavigate>;
  podcast?: PodcastFullOutput;
  format: PodcastFullOutput['format'] | 'conversation';
  currentStep: number;
  setCurrentStep: (step: number | ((prev: number) => number)) => void;
  selectedDocIds: string[];
  duration: number;
  hostVoice: string;
  coHostVoice: string;
  hostPersonaId: string | null;
  coHostPersonaId: string | null;
  setupInstructions: string;
  setSetupInstructions: (value: string) => void;
  episodePlan: EpisodePlan | null;
  setEpisodePlan: (plan: EpisodePlan | null) => void;
  canGeneratePlan: boolean;
  isLoading: boolean;
  createMutation: ReturnType<typeof useCreatePodcast>;
  updateMutation: AsyncMutation;
  generatePlanMutation: AsyncMutation;
  generateMutation: AsyncMutation;
}) {
  const saveSourceStep = useCallback(async () => {
    if (!podcast) {
      await createMutation.mutateAsync({
        title: 'Untitled Podcast',
        format,
        sourceIds: selectedDocIds,
      });
      return true;
    }

    await updateMutation.mutateAsync({
      id: podcast.id,
      sourceIds: selectedDocIds,
    });
    return true;
  }, [createMutation, format, podcast, selectedDocIds, updateMutation]);

  const saveAudioStep = useCallback(async () => {
    if (!podcast) {
      return false;
    }

    await updateMutation.mutateAsync({
      id: podcast.id,
      targetDurationMinutes: duration,
      hostVoice,
      coHostVoice: format === 'conversation' ? coHostVoice : undefined,
      hostPersonaId: hostPersonaId || undefined,
      coHostPersonaId:
        format === 'conversation' ? coHostPersonaId || undefined : undefined,
    });
    return true;
  }, [
    coHostPersonaId,
    coHostVoice,
    duration,
    format,
    hostPersonaId,
    hostVoice,
    podcast,
    updateMutation,
  ]);

  const saveQuickStartStep = useCallback(async () => {
    if (!podcast) {
      return false;
    }

    const updatedPodcast = await updateMutation.mutateAsync({
      id: podcast.id,
      setupInstructions: sanitizeSetupInstructionsInput(setupInstructions),
    });

    setSetupInstructions(updatedPodcast.setupInstructions ?? '');
    return updatedPodcast.setupInstructions ?? null;
  }, [podcast, setSetupInstructions, setupInstructions, updateMutation]);

  const savePlannerStep = useCallback(async () => {
    if (!podcast) {
      return false;
    }

    const sanitizedPlan = sanitizeEpisodePlanDraft(episodePlan, selectedDocIds);
    if (!sanitizedPlan) {
      return false;
    }

    const updatedPodcast = await updateMutation.mutateAsync({
      id: podcast.id,
      episodePlan: sanitizedPlan,
    });

    setEpisodePlan(cloneEpisodePlan(updatedPodcast.episodePlan));
    return true;
  }, [episodePlan, podcast, selectedDocIds, setEpisodePlan, updateMutation]);

  const handleGeneratePlan = useCallback(() => {
    if (!podcast || !canGeneratePlan || isLoading) {
      return;
    }

    generatePlanMutation.mutate({ id: podcast.id });
  }, [canGeneratePlan, generatePlanMutation, isLoading, podcast]);

  const handleContinue = useCallback(async () => {
    if (
      !canProceedFromStep({
        currentStep,
        duration,
        episodePlan,
        hostVoice,
        selectedDocIds,
      })
    ) {
      return;
    }

    try {
      switch (currentStep) {
        case STEP_SOURCES: {
          const success = await saveSourceStep();
          if (!podcast && success) {
            return;
          }
          if (success) {
            setCurrentStep(STEP_AUDIO);
          }
          return;
        }
        case STEP_AUDIO: {
          const success = await saveAudioStep();
          if (success) {
            setCurrentStep(STEP_QUICK_START);
          }
          return;
        }
        case STEP_QUICK_START: {
          if (!podcast) {
            return;
          }
          const savedInstructions = await saveQuickStartStep();
          if (savedInstructions !== false) {
            setCurrentStep(STEP_PLANNER);
          }
          return;
        }
        case STEP_PLANNER: {
          if (!podcast) {
            return;
          }
          const success = await savePlannerStep();
          if (success) {
            await generateMutation.mutateAsync({ id: podcast.id });
          }
          return;
        }
        default:
          return;
      }
    } catch {
      return;
    }
  }, [
    currentStep,
    duration,
    episodePlan,
    generateMutation,
    hostVoice,
    podcast,
    saveAudioStep,
    savePlannerStep,
    saveQuickStartStep,
    saveSourceStep,
    selectedDocIds,
    setCurrentStep,
  ]);

  const handleGenerateNow = useCallback(async () => {
    if (currentStep !== STEP_QUICK_START || !podcast) {
      return;
    }

    try {
      const savedInstructions = await saveQuickStartStep();
      if (savedInstructions === false) {
        return;
      }

      await generateMutation.mutateAsync({
        id: podcast.id,
        promptInstructions: savedInstructions ?? undefined,
      });
    } catch {
      return;
    }
  }, [currentStep, generateMutation, podcast, saveQuickStartStep]);

  const handleBack = useCallback(() => {
    if (!podcast && currentStep === STEP_SOURCES) {
      void navigate({ to: '/podcasts' });
      return;
    }

    if (currentStep > STEP_SOURCES) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep, navigate, podcast, setCurrentStep]);

  return {
    handleBack,
    handleContinue,
    handleGenerateNow,
    handleGeneratePlan,
  };
}

type SetupWizardViewProps = {
  currentStep: number;
  format: PodcastFullOutput['format'] | 'conversation';
  selectedDocIds: string[];
  duration: number;
  recommendedDuration: number | null;
  selectedSources: SelectedSourceSummary[];
  selectedSourceWordCount: number;
  pendingSourceCount: number;
  hostVoice: string;
  coHostVoice: string;
  hostPersonaId: string | null;
  coHostPersonaId: string | null;
  hostPersonaVoiceId: string | null;
  coHostPersonaVoiceId: string | null;
  setupInstructions: string;
  episodePlan: EpisodePlan | null;
  canGeneratePlan: boolean;
  isLoading: boolean;
  isGeneratingPlan: boolean;
  isGeneratingDraft: boolean;
  podcast?: PodcastFullOutput;
  onSelectionChange: (ids: string[]) => void;
  onDurationChange: (value: number) => void;
  onHostVoiceChange: (value: string) => void;
  onCoHostVoiceChange: (value: string) => void;
  onHostPersonaChange: (
    personaId: string | null,
    voiceId: string | null,
  ) => void;
  onCoHostPersonaChange: (
    personaId: string | null,
    voiceId: string | null,
  ) => void;
  onInstructionsChange: (value: string) => void;
  onPlanChange: (plan: EpisodePlan) => void;
  onBack: () => void;
  onContinue: () => void | Promise<void>;
  onGenerateNow: () => void | Promise<void>;
  onGeneratePlan: () => void;
};

function SetupWizardView({
  currentStep,
  format,
  selectedDocIds,
  duration,
  recommendedDuration,
  selectedSources,
  selectedSourceWordCount,
  pendingSourceCount,
  hostVoice,
  coHostVoice,
  hostPersonaId,
  coHostPersonaId,
  hostPersonaVoiceId,
  coHostPersonaVoiceId,
  setupInstructions,
  episodePlan,
  canGeneratePlan,
  isLoading,
  isGeneratingPlan,
  isGeneratingDraft,
  podcast,
  onSelectionChange,
  onDurationChange,
  onHostVoiceChange,
  onCoHostVoiceChange,
  onHostPersonaChange,
  onCoHostPersonaChange,
  onInstructionsChange,
  onPlanChange,
  onBack,
  onContinue,
  onGenerateNow,
  onGeneratePlan,
}: SetupWizardViewProps) {
  const continueDisabled =
    !canProceedFromStep({
      currentStep,
      duration,
      episodePlan,
      hostVoice,
      selectedDocIds,
    }) ||
    (currentStep === STEP_PLANNER && isGeneratingPlan);

  const secondaryAction = getSecondaryAction({
    currentStep,
    podcast,
    episodePlan,
    canGeneratePlan,
    isLoading,
    isGeneratingPlan,
    isGeneratingDraft,
    onGenerateNow: () => {
      void onGenerateNow();
    },
    onGeneratePlan,
  });

  return (
    <div className="setup-wizard">
      <div className="setup-wizard-card">
        <StepIndicator currentStep={currentStep} steps={SETUP_STEPS} />

        <SetupWizardStepContent
          currentStep={currentStep}
          format={format}
          selectedDocIds={selectedDocIds}
          duration={duration}
          recommendedDuration={recommendedDuration}
          selectedSourceCount={selectedSources.length}
          selectedSourceWordCount={selectedSourceWordCount}
          pendingSourceCount={pendingSourceCount}
          hostVoice={hostVoice}
          coHostVoice={coHostVoice}
          hostPersonaId={hostPersonaId}
          coHostPersonaId={coHostPersonaId}
          hostPersonaVoiceId={hostPersonaVoiceId}
          coHostPersonaVoiceId={coHostPersonaVoiceId}
          setupInstructions={setupInstructions}
          episodePlan={episodePlan}
          selectedSources={selectedSources}
          canGeneratePlan={canGeneratePlan}
          isGeneratingPlan={isGeneratingPlan}
          onSelectionChange={onSelectionChange}
          onDurationChange={onDurationChange}
          onHostVoiceChange={onHostVoiceChange}
          onCoHostVoiceChange={onCoHostVoiceChange}
          onHostPersonaChange={onHostPersonaChange}
          onCoHostPersonaChange={onCoHostPersonaChange}
          onInstructionsChange={onInstructionsChange}
          onPlanChange={onPlanChange}
        />

        <SetupFooter
          currentStep={currentStep}
          onBack={onBack}
          onContinue={() => {
            void onContinue();
          }}
          continueDisabled={continueDisabled}
          continueLabel={getContinueLabel(currentStep)}
          loadingLabel={getLoadingLabel(currentStep)}
          isLoading={isLoading}
          isFinalStep={currentStep === STEP_PLANNER}
          secondaryAction={secondaryAction}
        />
      </div>
    </div>
  );
}

export function SetupWizard({ podcast, initialSourceIds }: SetupWizardProps) {
  const wizardKey =
    podcast?.id ?? `new:${initialSourceIds?.join(',') ?? 'no-sources'}`;

  return (
    <SetupWizardContent
      key={wizardKey}
      podcast={podcast}
      initialSourceIds={initialSourceIds}
    />
  );
}

function SetupWizardContent({ podcast, initialSourceIds }: SetupWizardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    currentStep,
    setCurrentStep,
    selectedDocIds,
    setSelectedDocIds,
    duration,
    setDuration,
    hasManualDurationOverride,
    hostVoice,
    setHostVoice,
    coHostVoice,
    setCoHostVoice,
    hostPersonaId,
    coHostPersonaId,
    hostPersonaVoiceId,
    coHostPersonaVoiceId,
    setupInstructions,
    setSetupInstructions,
    episodePlan,
    setEpisodePlan,
    handleEpisodePlanChange,
    handleDurationChange,
    handleSetupInstructionsChange,
    handleHostPersonaChange,
    handleCoHostPersonaChange,
  } = useSetupWizardState({ podcast, initialSourceIds });
  const autoPlanRequestKeyRef = useRef<string | null>(null);
  const format = podcast?.format ?? 'conversation';

  useEffect(() => {
    queryClient.prefetchQuery(
      apiClient.sources.list.queryOptions({ input: {} }),
    );
  }, [queryClient]);

  const createMutation = useCreatePodcast();
  const queryKey = getPodcastQueryKey(podcast?.id ?? 'pending-podcast');

  const mergePodcastIntoCache = useCallback(
    (updatedPodcast: RouterOutput['podcasts']['update']) => {
      queryClient.setQueryData(
        queryKey,
        (current: PodcastDetail | undefined) => {
          if (!current) {
            return current;
          }

          const cachedSources =
            queryClient.getQueryData<SourceList>(getSourceListQueryKey()) ?? [];
          const sourceMap = new Map<string, PodcastDetail['sources'][number]>();

          current.sources.forEach((source) => sourceMap.set(source.id, source));
          cachedSources.forEach((source) =>
            sourceMap.set(source.id, {
              ...source,
              extractedText: null,
            }),
          );

          const nextSources =
            updatedPodcast.sourceIds.length === 0
              ? []
              : updatedPodcast.sourceIds
                  .map((sourceId) => sourceMap.get(sourceId))
                  .filter(
                    (source): source is PodcastDetail['sources'][number] =>
                      source !== undefined,
                  );

          return {
            ...current,
            ...updatedPodcast,
            sources: nextSources,
          };
        },
      );
    },
    [queryClient, queryKey],
  );

  const updateMutation = useMutation(
    apiClient.podcasts.update.mutationOptions({
      onSuccess: (updatedPodcast) => {
        mergePodcastIntoCache(updatedPodcast);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to save'));
      },
    }),
  );

  const generatePlanMutation = useMutation(
    apiClient.podcasts.generatePlan.mutationOptions({
      onSuccess: (updatedPodcast) => {
        mergePodcastIntoCache(updatedPodcast);
        setEpisodePlan(cloneEpisodePlan(updatedPodcast.episodePlan));
        toast.success('Episode plan ready');
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to generate plan'));
      },
    }),
  );

  const generateMutation = useOptimisticGeneration(podcast?.id ?? 'pending');
  const isLoading =
    createMutation.isPending ||
    updateMutation.isPending ||
    generateMutation.isPending;

  const { data: allSources = [] } = useSources({
    enabled: currentStep >= STEP_AUDIO,
  });

  const selectedSources = useMemo(
    () => buildSelectedSources(podcast?.sources, allSources, selectedDocIds),
    [allSources, podcast?.sources, selectedDocIds],
  );

  const unresolvedSourceCount = Math.max(
    0,
    selectedDocIds.length - selectedSources.length,
  );
  const selectedSourceWordCount = selectedSources.reduce(
    (sum, source) => sum + source.wordCount,
    0,
  );
  const pendingSourceCount =
    unresolvedSourceCount +
    selectedSources.filter((source) => source.status !== 'ready').length;
  const recommendedDuration = useMemo(
    () =>
      recommendPodcastTargetDurationMinutes({
        totalSourceWords: selectedSourceWordCount,
        sourceCount: selectedSources.length,
      }),
    [selectedSourceWordCount, selectedSources.length],
  );
  const canGeneratePlan =
    selectedDocIds.length > 0 &&
    pendingSourceCount === 0 &&
    !generatePlanMutation.isPending;

  const autoPlanRequestKey = useMemo(
    () =>
      podcast
        ? `${podcast.id}:${selectedDocIds.join(',')}:${setupInstructions.trim()}`
        : '',
    [podcast, selectedDocIds, setupInstructions],
  );

  useEffect(() => {
    if (currentStep !== STEP_PLANNER) {
      autoPlanRequestKeyRef.current = null;
      return;
    }

    if (
      !podcast ||
      !canGeneratePlan ||
      episodePlan !== null ||
      isLoading ||
      generatePlanMutation.isPending
    ) {
      return;
    }

    if (autoPlanRequestKeyRef.current === autoPlanRequestKey) {
      return;
    }

    autoPlanRequestKeyRef.current = autoPlanRequestKey;
    generatePlanMutation.mutate({ id: podcast.id });
  }, [
    autoPlanRequestKey,
    canGeneratePlan,
    currentStep,
    episodePlan,
    generatePlanMutation,
    isLoading,
    podcast,
  ]);

  useEffect(() => {
    if (
      recommendedDuration === null ||
      hasManualDurationOverride ||
      (podcast && (podcast.hostVoice !== null || podcast.coHostVoice !== null))
    ) {
      return;
    }

    if (duration !== recommendedDuration) {
      setDuration(recommendedDuration);
    }
  }, [
    duration,
    hasManualDurationOverride,
    podcast,
    recommendedDuration,
    setDuration,
  ]);

  const actions = useSetupWizardActions({
    navigate,
    podcast,
    format,
    currentStep,
    setCurrentStep,
    selectedDocIds,
    duration,
    hostVoice,
    coHostVoice,
    hostPersonaId,
    coHostPersonaId,
    setupInstructions,
    setSetupInstructions,
    episodePlan,
    setEpisodePlan,
    canGeneratePlan,
    isLoading,
    createMutation,
    updateMutation,
    generatePlanMutation,
    generateMutation,
  });

  return (
    <SetupWizardView
      currentStep={currentStep}
      format={format}
      selectedDocIds={selectedDocIds}
      duration={duration}
      recommendedDuration={recommendedDuration}
      selectedSources={selectedSources}
      selectedSourceWordCount={selectedSourceWordCount}
      pendingSourceCount={pendingSourceCount}
      hostVoice={hostVoice}
      coHostVoice={coHostVoice}
      hostPersonaId={hostPersonaId}
      coHostPersonaId={coHostPersonaId}
      hostPersonaVoiceId={hostPersonaVoiceId}
      coHostPersonaVoiceId={coHostPersonaVoiceId}
      setupInstructions={setupInstructions}
      episodePlan={episodePlan}
      canGeneratePlan={canGeneratePlan}
      isLoading={isLoading}
      isGeneratingPlan={generatePlanMutation.isPending}
      isGeneratingDraft={generateMutation.isPending}
      podcast={podcast}
      onSelectionChange={setSelectedDocIds}
      onDurationChange={handleDurationChange}
      onHostVoiceChange={setHostVoice}
      onCoHostVoiceChange={setCoHostVoice}
      onHostPersonaChange={handleHostPersonaChange}
      onCoHostPersonaChange={handleCoHostPersonaChange}
      onInstructionsChange={handleSetupInstructionsChange}
      onPlanChange={handleEpisodePlanChange}
      onBack={actions.handleBack}
      onContinue={actions.handleContinue}
      onGenerateNow={actions.handleGenerateNow}
      onGeneratePlan={actions.handleGeneratePlan}
    />
  );
}
