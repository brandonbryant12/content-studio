import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { EpisodePlan } from '../lib/episode-plan';
import { StepPlan } from '../components/setup/steps/step-plan';
import { render, screen, userEvent } from '@/test-utils';

const basePlan: EpisodePlan = {
  angle: 'Focus on the rollout lessons.',
  openingHook: 'Most launches fail in the handoff.',
  closingTakeaway: 'Start with one workflow and tighten feedback.',
  sections: [
    {
      heading: 'Why teams stall',
      summary: 'Operational gaps that block execution.',
      keyPoints: ['Ownership drift', 'Weak source quality'],
      sourceIds: ['src_1'],
      estimatedMinutes: 2,
    },
  ],
};

function ControlledStepPlan() {
  const [plan, setPlan] = useState<EpisodePlan | null>(basePlan);

  return (
    <StepPlan
      plan={plan}
      setupInstructions="Lead with customer bill basics."
      selectedSources={[{ id: 'src_1', title: 'Source One', status: 'ready' }]}
      canGeneratePlan={true}
      isGeneratingPlan={false}
      pendingSourceCount={0}
      onPlanChange={setPlan}
    />
  );
}

describe('StepPlan', () => {
  it('explains that generate will auto-plan in the background when no plan exists', () => {
    render(
      <StepPlan
        plan={null}
        setupInstructions=""
        selectedSources={[]}
        canGeneratePlan={false}
        isGeneratingPlan={false}
        pendingSourceCount={1}
        onPlanChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Plan your episode')).toBeInTheDocument();
    expect(
      screen.getByText(/we will build the episode plan in the background/i),
    ).toBeInTheDocument();
  });

  it('updates plan fields through the controlled callback', async () => {
    const user = userEvent.setup();

    render(<ControlledStepPlan />);

    const angleField = screen.getByLabelText('Episode plan angle');
    await user.clear(angleField);
    await user.type(angleField, 'Center the episode on operational readiness.');

    expect(angleField).toHaveValue(
      'Center the episode on operational readiness.',
    );
  });

  it('lets users add and remove sections', async () => {
    const user = userEvent.setup();

    render(<ControlledStepPlan />);

    await user.click(screen.getByRole('button', { name: 'Add section' }));
    expect(
      screen.getAllByRole('button', { name: /Remove section/ }),
    ).toHaveLength(2);

    await user.click(
      screen.getAllByRole('button', { name: /Remove section/ })[1]!,
    );
    expect(
      screen.getAllByRole('button', { name: /Remove section/ }),
    ).toHaveLength(1);
  });
});
