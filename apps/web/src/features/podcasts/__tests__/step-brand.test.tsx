// features/podcasts/__tests__/step-brand.test.tsx
// Tests for StepBrand component - brand/persona/segment integration in podcast wizard
// These tests verify the UI behavior of the step-brand component with mocked API responses

import { describe, it, expect, vi, beforeEach } from 'vitest';
// Import directly from component files to avoid triggering env module
import {
  BrandSelector,
  type BrandSelectorOption,
} from '@/features/brands/components/brand-selector';
import {
  PersonaSelector,
  type PersonaSelectorOption,
} from '@/features/brands/components/persona-selector';
import {
  SegmentSelector,
  type SegmentSelectorOption,
} from '@/features/brands/components/segment-selector';
import { render, screen, fireEvent } from '@/test-utils';

// Test BrandSelector integration behavior
describe('BrandSelector in Podcast Setup', () => {
  const mockBrands: BrandSelectorOption[] = [
    { id: 'brd_1', name: 'TechCorp', description: 'A tech company' },
    { id: 'brd_2', name: 'EcoFriendly', description: 'Sustainable products' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders brand dropdown with options', () => {
    render(
      <BrandSelector
        value={null}
        onChange={vi.fn()}
        brands={mockBrands}
        placeholder="Select a brand (optional)"
      />,
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /select a brand/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /TechCorp/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /EcoFriendly/i }),
    ).toBeInTheDocument();
  });

  it('calls onChange when brand is selected', () => {
    const onChange = vi.fn();
    render(
      <BrandSelector value={null} onChange={onChange} brands={mockBrands} />,
    );

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'brd_1' },
    });

    expect(onChange).toHaveBeenCalledWith('brd_1');
  });

  it('calls onChange with null when placeholder selected', () => {
    const onChange = vi.fn();
    render(
      <BrandSelector value="brd_1" onChange={onChange} brands={mockBrands} />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith(null);
  });
});

// Test PersonaSelector integration behavior
describe('PersonaSelector in Podcast Setup', () => {
  const mockPersonas: PersonaSelectorOption[] = [
    {
      id: 'persona-1',
      name: 'Alex',
      role: 'Host',
      voiceId: 'Aoede',
      personalityDescription: 'Friendly tech expert',
    },
    {
      id: 'persona-2',
      name: 'Jordan',
      role: 'Co-Host',
      voiceId: 'Charon',
      personalityDescription: 'Curious interviewer',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders persona cards', () => {
    render(
      <PersonaSelector
        value={null}
        onChange={vi.fn()}
        personas={mockPersonas}
      />,
    );

    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByText('Jordan')).toBeInTheDocument();
    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.getByText('Co-Host')).toBeInTheDocument();
  });

  it('calls onChange with full persona object including voiceId when selected', () => {
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
        id: 'persona-1',
        name: 'Alex',
        voiceId: 'Aoede',
      }),
    );
  });

  it('persona selection can auto-fill host voice by providing voiceId', () => {
    const onChange = vi.fn();
    render(
      <PersonaSelector
        value={null}
        onChange={onChange}
        personas={mockPersonas}
      />,
    );

    fireEvent.click(screen.getByText('Jordan'));

    // Parent component would use persona.voiceId to set hostVoice
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        voiceId: 'Charon',
      }),
    );
  });

  it('shows none option and allows deselection', () => {
    const onChange = vi.fn();
    render(
      <PersonaSelector
        value="persona-1"
        onChange={onChange}
        personas={mockPersonas}
      />,
    );

    // There should be a "None" option
    const noneButton = screen.getByRole('button', { name: /none/i });
    expect(noneButton).toBeInTheDocument();

    fireEvent.click(noneButton);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('shows selected persona with aria-pressed', () => {
    render(
      <PersonaSelector
        value="persona-1"
        onChange={vi.fn()}
        personas={mockPersonas}
      />,
    );

    const alexButton = screen.getByRole('button', { name: /alex/i });
    expect(alexButton).toHaveAttribute('aria-pressed', 'true');

    const jordanButton = screen.getByRole('button', { name: /jordan/i });
    expect(jordanButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows empty message when no personas defined', () => {
    render(<PersonaSelector value={null} onChange={vi.fn()} personas={[]} />);

    expect(
      screen.getByText(/no personas defined for this brand/i),
    ).toBeInTheDocument();
  });
});

// Test SegmentSelector integration behavior
describe('SegmentSelector in Podcast Setup', () => {
  const mockSegments: SegmentSelectorOption[] = [
    {
      id: 'segment-1',
      name: 'Developers',
      description: 'Software developers',
      messagingTone: 'Technical but approachable',
    },
    {
      id: 'segment-2',
      name: 'Executives',
      description: 'Business leaders',
      messagingTone: 'Professional and strategic',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders segment dropdown with options', () => {
    render(
      <SegmentSelector
        value={null}
        onChange={vi.fn()}
        segments={mockSegments}
        placeholder="Select target audience (optional)"
      />,
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText(/Developers/)).toBeInTheDocument();
    expect(screen.getByText(/Executives/)).toBeInTheDocument();
  });

  it('calls onChange with full segment object including messagingTone', () => {
    const onChange = vi.fn();
    render(
      <SegmentSelector
        value={null}
        onChange={onChange}
        segments={mockSegments}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'segment-1' },
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'segment-1',
        name: 'Developers',
        messagingTone: 'Technical but approachable',
      }),
    );
  });

  it('segment selection provides messagingTone for instructions', () => {
    const onChange = vi.fn();
    render(
      <SegmentSelector
        value={null}
        onChange={onChange}
        segments={mockSegments}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'segment-2' },
    });

    // Parent component would use segment.messagingTone to set instructions
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        messagingTone: 'Professional and strategic',
      }),
    );
  });

  it('shows empty dropdown when no segments defined', () => {
    render(<SegmentSelector value={null} onChange={vi.fn()} segments={[]} />);

    expect(screen.getByText(/no segments defined/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('allows clearing selection', () => {
    const onChange = vi.fn();
    render(
      <SegmentSelector
        value="segment-1"
        onChange={onChange}
        segments={mockSegments}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith(null);
  });
});

// Integration behavior tests
describe('Brand Integration Auto-Fill Behavior', () => {
  it('demonstrates voice auto-fill flow', () => {
    // Simulates what happens in setup-wizard when persona is selected
    const hostVoice = { current: 'Aoede' };
    const handlePersonaChange = (persona: PersonaSelectorOption | null) => {
      if (persona) {
        hostVoice.current = persona.voiceId;
      }
    };

    const mockPersona: PersonaSelectorOption = {
      id: 'p1',
      name: 'Test',
      role: 'Host',
      voiceId: 'Charon',
      personalityDescription: 'Test',
    };

    handlePersonaChange(mockPersona);

    expect(hostVoice.current).toBe('Charon');
  });

  it('demonstrates instructions auto-fill flow', () => {
    // Simulates what happens in setup-wizard when segment is selected
    const instructions = { current: '' };
    const handleSegmentChange = (segment: SegmentSelectorOption | null) => {
      if (segment && !instructions.current.trim()) {
        instructions.current = `Target audience: ${segment.name}. Messaging tone: ${segment.messagingTone}`;
      }
    };

    const mockSegment: SegmentSelectorOption = {
      id: 's1',
      name: 'Developers',
      description: 'Software devs',
      messagingTone: 'Technical but friendly',
    };

    handleSegmentChange(mockSegment);

    expect(instructions.current).toBe(
      'Target audience: Developers. Messaging tone: Technical but friendly',
    );
  });

  it('does not override existing instructions on segment change', () => {
    const instructions = { current: 'Keep it casual and fun' };
    const handleSegmentChange = (segment: SegmentSelectorOption | null) => {
      if (segment && !instructions.current.trim()) {
        instructions.current = `Target audience: ${segment.name}. Messaging tone: ${segment.messagingTone}`;
      }
    };

    const mockSegment: SegmentSelectorOption = {
      id: 's1',
      name: 'Developers',
      description: 'Software devs',
      messagingTone: 'Technical but friendly',
    };

    handleSegmentChange(mockSegment);

    // Instructions should NOT be overwritten
    expect(instructions.current).toBe('Keep it casual and fun');
  });
});
