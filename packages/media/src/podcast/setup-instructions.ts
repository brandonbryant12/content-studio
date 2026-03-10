export const sanitizePodcastSetupInstructions = (
  value: string | null | undefined,
): string | null | undefined => {
  if (value == null) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
