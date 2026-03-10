import type {
  PodcastEpisodePlan,
  PodcastEpisodePlanSection,
} from '@repo/db/schema';

const trimToUndefined = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
};

const sanitizeSection = (
  section: PodcastEpisodePlanSection,
  allowedSourceIds?: ReadonlySet<string>,
): PodcastEpisodePlanSection | null => {
  const heading = trimToUndefined(section.heading);
  const summary = trimToUndefined(section.summary);

  if (!heading || !summary) {
    return null;
  }

  const keyPoints = Array.from(
    new Set(
      section.keyPoints
        .map((value) => trimToUndefined(value))
        .filter((value): value is string => value !== undefined),
    ),
  );

  const sourceIds = Array.from(
    new Set(
      section.sourceIds
        .map((value) => trimToUndefined(value))
        .filter(
          (value): value is string =>
            value !== undefined &&
            (allowedSourceIds === undefined || allowedSourceIds.has(value)),
        ),
    ),
  );

  const estimatedMinutes =
    typeof section.estimatedMinutes === 'number' &&
    Number.isFinite(section.estimatedMinutes) &&
    section.estimatedMinutes > 0
      ? Math.round(section.estimatedMinutes)
      : undefined;

  return {
    heading,
    summary,
    keyPoints,
    sourceIds,
    estimatedMinutes,
  };
};

export const sanitizePodcastEpisodePlan = (
  plan: PodcastEpisodePlan | null | undefined,
  options?: { readonly allowedSourceIds?: readonly string[] },
): PodcastEpisodePlan | null | undefined => {
  if (plan === undefined) {
    return undefined;
  }

  if (plan === null) {
    return null;
  }

  const allowedSourceIds = options?.allowedSourceIds
    ? new Set(options.allowedSourceIds)
    : undefined;
  const angle = trimToUndefined(plan.angle);
  const openingHook = trimToUndefined(plan.openingHook);
  const closingTakeaway = trimToUndefined(plan.closingTakeaway);
  const sections = plan.sections
    .map((section) => sanitizeSection(section, allowedSourceIds))
    .filter(
      (section): section is PodcastEpisodePlanSection => section !== null,
    );

  if (!angle || !openingHook || !closingTakeaway || sections.length === 0) {
    return null;
  }

  return {
    angle,
    openingHook,
    closingTakeaway,
    sections,
  };
};
