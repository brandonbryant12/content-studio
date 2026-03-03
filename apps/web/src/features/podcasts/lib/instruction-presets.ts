export const INSTRUCTION_PRESETS = [
  {
    label: 'Conversational',
    value:
      'Keep the tone casual and conversational, like two friends chatting.',
  },
  {
    label: 'Key takeaways',
    value:
      'Focus on extracting and highlighting the key takeaways and main insights.',
  },
  {
    label: 'Educational',
    value:
      'Make it educational and informative, explaining concepts clearly for beginners.',
  },
  {
    label: 'Add humor',
    value:
      'Include light humor and make the discussion entertaining and engaging.',
  },
  {
    label: 'Deep dive',
    value:
      'Go in-depth on the topic, exploring nuances and providing detailed analysis.',
  },
  {
    label: 'Quick summary',
    value:
      'Keep it concise and to the point, covering only the essential information.',
  },
] as const;

export const INSTRUCTION_CHAR_LIMIT = 1000;

export const getInstructionPresetLabel = (value: string): string | null =>
  INSTRUCTION_PRESETS.find((preset) => preset.value === value)?.label ?? null;
