// features/brands/components/segment-selector.tsx

import { Select } from '@repo/ui/components/select';
import { memo, type ChangeEvent } from 'react';

export interface SegmentSelectorOption {
  id: string;
  name: string;
  description: string;
  messagingTone: string;
}

interface SegmentSelectorProps {
  value: string | null;
  onChange: (segment: SegmentSelectorOption | null) => void;
  segments: SegmentSelectorOption[];
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Segment selector dropdown with descriptions.
 * Shows segments with their messaging tone.
 * Selection provides messaging guidance for content.
 */
export const SegmentSelector = memo(function SegmentSelector({
  value,
  onChange,
  segments,
  disabled,
  placeholder = 'Select target audience',
}: SegmentSelectorProps) {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const segmentId = e.target.value;
    if (segmentId === '') {
      onChange(null);
      return;
    }
    const segment = segments.find((s) => s.id === segmentId);
    if (segment) {
      onChange(segment);
    }
  };

  if (segments.length === 0) {
    return (
      <Select disabled>
        <option value="">No segments defined</option>
      </Select>
    );
  }

  return (
    <Select value={value ?? ''} onChange={handleChange} disabled={disabled}>
      <option value="">{placeholder}</option>
      {segments.map((segment) => (
        <option key={segment.id} value={segment.id}>
          {segment.name} - {segment.description} ({segment.messagingTone})
        </option>
      ))}
    </Select>
  );
});
