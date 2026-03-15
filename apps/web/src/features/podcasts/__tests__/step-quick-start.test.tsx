import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { StepQuickStart } from '../components/setup/steps/step-quick-start';
import { INSTRUCTION_CHAR_LIMIT } from '../lib/instruction-presets';
import { render, screen, userEvent } from '@/test-utils';

function ControlledStepQuickStart() {
  const [instructions, setInstructions] = useState(
    'Focus on the billing basics.',
  );

  return (
    <StepQuickStart
      instructions={instructions}
      onInstructionsChange={setInstructions}
    />
  );
}

describe('StepQuickStart', () => {
  it('enforces the instruction character limit when typing long input', async () => {
    const user = userEvent.setup();

    render(<ControlledStepQuickStart />);

    const field = screen.getByLabelText(
      'Custom instructions for podcast generation',
    );
    await user.clear(field);
    await user.type(field, 'x'.repeat(INSTRUCTION_CHAR_LIMIT + 25));

    expect(field).toHaveValue('x'.repeat(INSTRUCTION_CHAR_LIMIT));
    expect(
      screen.getByText(`${INSTRUCTION_CHAR_LIMIT} / ${INSTRUCTION_CHAR_LIMIT}`),
    ).toBeInTheDocument();
  });

  it('toggles a preset on and off', async () => {
    const user = userEvent.setup();

    render(<ControlledStepQuickStart />);

    const preset = screen.getByText('Educational');
    await user.click(preset);

    const field = screen.getByLabelText(
      'Custom instructions for podcast generation',
    );
    expect(field).toHaveValue(
      'Make it educational and informative, explaining concepts clearly for beginners.',
    );

    // Click again to deselect
    await user.click(preset);
    expect(field).toHaveValue('');
  });
});
