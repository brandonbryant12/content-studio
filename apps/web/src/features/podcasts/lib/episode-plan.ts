import type { RouterOutput } from '@repo/api/client';

export type EpisodePlan = NonNullable<
  RouterOutput['podcasts']['get']['episodePlan']
>;
export type EpisodePlanSection = EpisodePlan['sections'][number];

const trimToUndefined = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
};

export function cloneEpisodePlan(
  plan: RouterOutput['podcasts']['get']['episodePlan'] | null | undefined,
): EpisodePlan | null {
  if (!plan) {
    return null;
  }

  return {
    angle: plan.angle,
    openingHook: plan.openingHook,
    closingTakeaway: plan.closingTakeaway,
    sections: plan.sections.map((section) => ({
      heading: section.heading,
      summary: section.summary,
      keyPoints: [...section.keyPoints],
      sourceIds: [...section.sourceIds],
      estimatedMinutes: section.estimatedMinutes,
    })),
  };
}

export function createEmptyEpisodePlanSection(): EpisodePlanSection {
  return {
    heading: '',
    summary: '',
    keyPoints: [],
    sourceIds: [],
  };
}

export function sanitizeEpisodePlanDraft(
  plan: EpisodePlan | null,
  allowedSourceIds: readonly string[],
): EpisodePlan | null {
  if (!plan) {
    return null;
  }

  const allowedSet = new Set(allowedSourceIds);
  const sections: Array<EpisodePlanSection | null> = plan.sections.map(
    (section) => {
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
          section.sourceIds.filter((sourceId) => allowedSet.has(sourceId)),
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
    },
  );
  const sanitizedSections = sections.filter(
    (section): section is EpisodePlanSection => section !== null,
  );

  const angle = trimToUndefined(plan.angle);
  const openingHook = trimToUndefined(plan.openingHook);
  const closingTakeaway = trimToUndefined(plan.closingTakeaway);

  if (
    !angle ||
    !openingHook ||
    !closingTakeaway ||
    sanitizedSections.length === 0
  ) {
    return null;
  }

  return {
    angle,
    openingHook,
    closingTakeaway,
    sections: sanitizedSections,
  };
}

export function isEpisodePlanReady(plan: EpisodePlan | null): boolean {
  return (
    sanitizeEpisodePlanDraft(
      plan,
      plan?.sections.flatMap((section) => section.sourceIds) ?? [],
    ) !== null
  );
}
