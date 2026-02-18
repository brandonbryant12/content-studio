interface BuildVoiceoverTextExportInput {
  title: string;
  text: string;
  voice: string;
  voiceName: string | null;
}

function getExportTitle(title: string): string {
  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed : 'Untitled Voiceover';
}

export function buildVoiceoverTextExport({
  title,
  text,
  voice,
  voiceName,
}: BuildVoiceoverTextExportInput): string {
  const effectiveVoice = voiceName ?? voice;

  return [
    `Title: ${getExportTitle(title)}`,
    `Voice: ${effectiveVoice}`,
    `Exported: ${new Date().toISOString()}`,
    '',
    text.trim(),
  ].join('\n');
}

export function buildVoiceoverTranscriptMarkdown({
  title,
  text,
  voice,
  voiceName,
}: BuildVoiceoverTextExportInput): string {
  const effectiveVoice = voiceName ?? voice;

  return [
    `# ${getExportTitle(title)}`,
    '',
    `Voice: ${effectiveVoice}`,
    `Copied: ${new Date().toISOString()}`,
    '',
    text.trim(),
  ].join('\n');
}
