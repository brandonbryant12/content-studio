// features/brands/__tests__/persona-selector.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';
import { PersonaSelector, type PersonaSelectorOption } from '../components/persona-selector';

const mockPersonas: PersonaSelectorOption[] = [
  {
    id: 'persona-1',
    name: 'Alex',
    role: 'Host',
    voiceId: 'Aoede',
    personalityDescription: 'Friendly and knowledgeable tech expert',
  },
  {
    id: 'persona-2',
    name: 'Jordan',
    role: 'Co-host',
    voiceId: 'Charon',
    personalityDescription: 'Curious interviewer who asks great questions',
  },
];

describe('PersonaSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all persona cards', () => {
    render(
      <PersonaSelector
        value={null}
        onChange={vi.fn()}
        personas={mockPersonas}
      />,
    );

    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByText('Jordan')).toBeInTheDocument();
  });

  it('renders None option', () => {
    render(
      <PersonaSelector
        value={null}
        onChange={vi.fn()}
        personas={mockPersonas}
      />,
    );

    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.getByText('No persona selected')).toBeInTheDocument();
  });

  it('shows persona roles', () => {
    render(
      <PersonaSelector
        value={null}
        onChange={vi.fn()}
        personas={mockPersonas}
      />,
    );

    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.getByText('Co-host')).toBeInTheDocument();
  });

  it('shows persona personality descriptions', () => {
    render(
      <PersonaSelector
        value={null}
        onChange={vi.fn()}
        personas={mockPersonas}
      />,
    );

    expect(screen.getByText('Friendly and knowledgeable tech expert')).toBeInTheDocument();
    expect(screen.getByText('Curious interviewer who asks great questions')).toBeInTheDocument();
  });

  it('calls onChange with persona when selected', () => {
    const onChange = vi.fn();
    render(
      <PersonaSelector
        value={null}
        onChange={onChange}
        personas={mockPersonas}
      />,
    );

    fireEvent.click(screen.getByText('Alex'));

    expect(onChange).toHaveBeenCalledWith(mockPersonas[0]);
  });

  it('calls onChange with null when None selected', () => {
    const onChange = vi.fn();
    render(
      <PersonaSelector
        value="persona-1"
        onChange={onChange}
        personas={mockPersonas}
      />,
    );

    fireEvent.click(screen.getByText('None'));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('shows selected state for current persona', () => {
    render(
      <PersonaSelector
        value="persona-1"
        onChange={vi.fn()}
        personas={mockPersonas}
      />,
    );

    const alexButton = screen.getByRole('button', { name: /alex/i });
    expect(alexButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows selected state for None when value is null', () => {
    render(
      <PersonaSelector
        value={null}
        onChange={vi.fn()}
        personas={mockPersonas}
      />,
    );

    const noneButton = screen.getByRole('button', { name: /none/i });
    expect(noneButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('disables all buttons when disabled', () => {
    render(
      <PersonaSelector
        value={null}
        onChange={vi.fn()}
        personas={mockPersonas}
        disabled
      />,
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('shows empty state when no personas', () => {
    render(
      <PersonaSelector
        value={null}
        onChange={vi.fn()}
        personas={[]}
      />,
    );

    expect(screen.getByText('No personas defined for this brand.')).toBeInTheDocument();
  });

  it('returns full persona object with voiceId on selection', () => {
    const onChange = vi.fn();
    render(
      <PersonaSelector
        value={null}
        onChange={onChange}
        personas={mockPersonas}
      />,
    );

    fireEvent.click(screen.getByText('Alex'));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        voiceId: 'Aoede',
      }),
    );
  });
});
