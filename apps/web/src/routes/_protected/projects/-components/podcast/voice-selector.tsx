import { Label } from '@repo/ui/components/label';
import { Select } from '@repo/ui/components/select';
import type { RouterOutput } from '@repo/api/client';

type Voice = RouterOutput['voices']['list'][number];

export function VoiceSelector({
  voices,
  value,
  onChange,
  label,
  disabled,
}: {
  voices: Voice[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value="">Select a voice...</option>
        {voices.map((voice) => (
          <option key={voice.id} value={voice.id}>
            {voice.name} ({voice.gender})
          </option>
        ))}
      </Select>
    </div>
  );
}
