import type { RouterOutput } from '@repo/api/client';
import { Label } from '@repo/ui/components/label';
import { Select } from '@repo/ui/components/select';

type Voice = RouterOutput['voices']['list'][number];

export function VoiceSelector({
  voices,
  value,
  onChange,
  label,
}: {
  voices: Voice[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
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
