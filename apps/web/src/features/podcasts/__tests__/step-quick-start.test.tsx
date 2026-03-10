import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { StepQuickStart } from '../components/setup/steps/step-quick-start';
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
  it('shows the custom instructions step with preset buttons', () => {
    render(<ControlledStepQuickStart />);

    expect(screen.getByText('Custom Instructions')).toBeInTheDocument();
    expect(screen.getByText('Conversational')).toBeInTheDocument();
    expect(screen.getByText('Deep dive')).toBeInTheDocument();
  });

  it('updates instructions through the controlled callback', async () => {
    const user = userEvent.setup();

    render(<ControlledStepQuickStart />);

    const field = screen.getByLabelText(
      'Custom instructions for podcast generation',
    );
    await user.clear(field);
    await user.type(field, 'Lead with what each charge means.');

    expect(field).toHaveValue('Lead with what each charge means.');
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
