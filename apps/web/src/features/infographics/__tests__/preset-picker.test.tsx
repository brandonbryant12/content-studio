import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StyleProperty } from '../hooks/use-infographic-settings';
import { PresetPicker } from '../components/preset-picker';
import { render, screen, userEvent } from '@/test-utils';

const mockUseStylePresets = vi.fn();
const mockUseCreateStylePreset = vi.fn();
const mockUseDeleteStylePreset = vi.fn();

vi.mock('../hooks/use-style-presets', () => ({
  useStylePresets: () => mockUseStylePresets(),
  useCreateStylePreset: () => mockUseCreateStylePreset(),
  useDeleteStylePreset: () => mockUseDeleteStylePreset(),
}));

const PRESETS = [
  {
    id: 'preset-brand-base',
    name: 'Brand Base',
    properties: [
      { key: 'Palette', value: '#1f4ed8', type: 'color' as const },
      { key: 'Tone', value: 'Professional', type: 'text' as const },
    ],
    isBuiltIn: true,
    createdBy: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'preset-campaign-boost',
    name: 'Campaign Boost',
    properties: [
      { key: 'palette', value: '#ff3366', type: 'color' as const },
      {
        key: 'CTA Style',
        value: 'Urgent action language',
        type: 'text' as const,
      },
    ],
    isBuiltIn: true,
    createdBy: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

function ControlledPresetPicker({
  initialProperties,
  onApplyPreset,
}: {
  initialProperties: StyleProperty[];
  onApplyPreset: (properties: StyleProperty[]) => void;
}) {
  const [properties, setProperties] = useState(initialProperties);

  return (
    <PresetPicker
      currentProperties={properties}
      onApplyPreset={(nextProperties) => {
        onApplyPreset(nextProperties);
        setProperties(nextProperties);
      }}
    />
  );
}

describe('PresetPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseStylePresets.mockReturnValue({ data: PRESETS });
    mockUseCreateStylePreset.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseDeleteStylePreset.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it('merges multiple presets into one combined property list', async () => {
    const user = userEvent.setup();
    const onApplyPreset = vi.fn();

    render(
      <ControlledPresetPicker
        initialProperties={[{ key: 'Layout', value: 'Two-column' }]}
        onApplyPreset={onApplyPreset}
      />,
    );

    const brandBaseButton = screen.getByRole('button', { name: 'Brand Base' });
    const campaignBoostButton = screen.getByRole('button', {
      name: 'Campaign Boost',
    });

    expect(brandBaseButton).toHaveAttribute('aria-pressed', 'false');
    expect(campaignBoostButton).toHaveAttribute('aria-pressed', 'false');

    await user.click(brandBaseButton);
    expect(brandBaseButton).toHaveAttribute('aria-pressed', 'true');

    await user.click(campaignBoostButton);
    expect(campaignBoostButton).toHaveAttribute('aria-pressed', 'true');

    const latestProperties = onApplyPreset.mock.calls[
      onApplyPreset.mock.calls.length - 1
    ]?.[0] as StyleProperty[] | undefined;

    expect(latestProperties).toEqual(
      expect.arrayContaining([
        { key: 'Layout', value: 'Two-column' },
        { key: 'Tone', value: 'Professional', type: 'text' },
        { key: 'CTA Style', value: 'Urgent action language', type: 'text' },
      ]),
    );
    expect(
      latestProperties?.find(
        (property) => property.key.toLowerCase() === 'palette',
      )?.value,
    ).toBe('#ff3366');
  });

  it('shows infographic as the default selected content type', () => {
    render(
      <ControlledPresetPicker initialProperties={[]} onApplyPreset={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Infographic' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('replaces the default content type when another type is selected', async () => {
    const user = userEvent.setup();
    const onApplyPreset = vi.fn();

    render(
      <ControlledPresetPicker
        initialProperties={[]}
        onApplyPreset={onApplyPreset}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Social Card' }));

    expect(screen.getByRole('button', { name: 'Social Card' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Infographic' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    const latestProperties = onApplyPreset.mock.calls[
      onApplyPreset.mock.calls.length - 1
    ]?.[0] as StyleProperty[] | undefined;

    expect(latestProperties).toEqual(
      expect.arrayContaining([
        {
          key: 'style',
          value: 'Social media card — punchy, visual-first, shareable',
        },
      ]),
    );
  });

  it('keeps multi-select working when an overlapping preset is deselected', async () => {
    const user = userEvent.setup();
    const onApplyPreset = vi.fn();

    render(
      <ControlledPresetPicker
        initialProperties={[]}
        onApplyPreset={onApplyPreset}
      />,
    );

    const brandBaseButton = screen.getByRole('button', { name: 'Brand Base' });
    const campaignBoostButton = screen.getByRole('button', {
      name: 'Campaign Boost',
    });

    await user.click(brandBaseButton);
    expect(brandBaseButton).toHaveAttribute('aria-pressed', 'true');

    await user.click(campaignBoostButton);
    expect(campaignBoostButton).toHaveAttribute('aria-pressed', 'true');

    await user.click(campaignBoostButton);
    expect(brandBaseButton).toHaveAttribute('aria-pressed', 'true');
    expect(campaignBoostButton).toHaveAttribute('aria-pressed', 'false');

    const latestProperties = onApplyPreset.mock.calls[
      onApplyPreset.mock.calls.length - 1
    ]?.[0] as StyleProperty[] | undefined;

    expect(latestProperties).toEqual(
      expect.arrayContaining([
        { key: 'Palette', value: '#1f4ed8', type: 'color' },
        { key: 'Tone', value: 'Professional', type: 'text' },
      ]),
    );
    expect(
      latestProperties?.find((property) => property.key === 'CTA Style'),
    ).toBeUndefined();
  });
});
