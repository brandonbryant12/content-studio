import { Select } from '@repo/ui/components/select';
import { Label } from '@repo/ui/components/label';

// Voice options - these match the Gemini TTS voices
export const VOICES = [
  {
    id: 'Aoede',
    name: 'Aoede',
    gender: 'female',
    description: 'Melodic and engaging',
  },
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'female',
    description: 'Youthful and energetic',
  },
  {
    id: 'Leda',
    name: 'Leda',
    gender: 'female',
    description: 'Friendly and approachable',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'female',
    description: 'Light and airy',
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'male',
    description: 'Clear and professional',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'male',
    description: 'Bold and dynamic',
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'male',
    description: 'Lively and engaging',
  },
  {
    id: 'Orus',
    name: 'Orus',
    gender: 'male',
    description: 'Friendly and conversational',
  },
] as const;

interface VoiceSelectorProps {
  voice: string;
  onChange: (voice: string) => void;
  disabled?: boolean;
}

export function VoiceSelector({ voice, onChange, disabled }: VoiceSelectorProps) {
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
