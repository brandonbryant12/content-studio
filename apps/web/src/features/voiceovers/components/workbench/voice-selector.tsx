import { Select } from '@repo/ui/components/select';
import { Label } from '@repo/ui/components/label';
import { VOICES } from '../../lib/voices';

interface VoiceSelectorProps {
  voice: string;
  onChange: (voice: string) => void;
  disabled?: boolean;
}

export function VoiceSelector({
  voice,
  onChange,
  disabled,
}: VoiceSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="voice-select">Voice</Label>
      <Select
        id="voice-select"
        value={voice}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="" disabled>
          Select a voice
        </option>
        {VOICES.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name} - {v.description}
          </option>
        ))}
      </Select>
    </div>
  );
}
