import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { StepInstructions } from '../components/setup/steps/step-instructions';
import { INSTRUCTION_CHAR_LIMIT } from '../lib/instruction-presets';
import { render, screen, userEvent } from '@/test-utils';

function ControlledStepInstructions({
  onInstructionsChange,
}: {
  onInstructionsChange: (value: string) => void;
}) {
  const [instructions, setInstructions] = useState('');

  return (
    <StepInstructions
      instructions={instructions}
      onInstructionsChange={(value) => {
        onInstructionsChange(value);
        setInstructions(value);
      }}
    />
  );
}

describe('StepInstructions', () => {
  it('marks a matching preset as active from incoming instructions', () => {
    render(
      <StepInstructions
        instructions="Keep the tone casual and conversational, like two friends chatting."
        onInstructionsChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Conversational' })).toHaveClass(
      'active',
    );
  });

  it('clears instructions when clicking an already-active preset', async () => {
    const user = userEvent.setup();
    const onInstructionsChange = vi.fn();

    render(
      <StepInstructions
        instructions="Keep the tone casual and conversational, like two friends chatting."
        onInstructionsChange={onInstructionsChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Conversational' }));

    expect(onInstructionsChange).toHaveBeenCalledWith('');
  });

  it('applies preset value when selecting a different preset', async () => {
    const user = userEvent.setup();
    const onInstructionsChange = vi.fn();

    render(
      <StepInstructions
        instructions=""
        onInstructionsChange={onInstructionsChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Educational' }));

    expect(onInstructionsChange).toHaveBeenCalledWith(
      'Make it educational and informative, explaining concepts clearly for beginners.',
    );
  });

  it('enforces the instruction character limit when typing', async () => {
    const user = userEvent.setup();
    const onInstructionsChange = vi.fn();
    const overLimit = 'a'.repeat(INSTRUCTION_CHAR_LIMIT + 20);

    render(
      <ControlledStepInstructions
        onInstructionsChange={onInstructionsChange}
      />,
    );

    await user.type(
      screen.getByLabelText('Custom instructions for podcast generation'),
      overLimit,
    );

    const latestCall =
      onInstructionsChange.mock.calls[
        onInstructionsChange.mock.calls.length - 1
      ];
    expect(latestCall?.[0]).toHaveLength(INSTRUCTION_CHAR_LIMIT);
  });
});
