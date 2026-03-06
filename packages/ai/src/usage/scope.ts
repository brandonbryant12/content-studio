import { Effect, FiberRef } from 'effect';
import type { AIUsageScope } from './types';

const EMPTY_AI_USAGE_SCOPE: AIUsageScope = {};

export const AIUsageScopeRef: FiberRef.FiberRef<AIUsageScope> =
  FiberRef.unsafeMake<AIUsageScope>(EMPTY_AI_USAGE_SCOPE);

export const mergeAIUsageScope = (
  current: AIUsageScope,
  next: Partial<AIUsageScope>,
): AIUsageScope => ({
  userId: next.userId ?? current.userId,
  requestId: next.requestId ?? current.requestId,
  jobId: next.jobId ?? current.jobId,
  operation: next.operation ?? current.operation,
  resourceType: next.resourceType ?? current.resourceType,
  resourceId: next.resourceId ?? current.resourceId,
});

export const getAIUsageScope: Effect.Effect<AIUsageScope> =
  FiberRef.get(AIUsageScopeRef);

export const withAIUsageScope =
  (scope: Partial<AIUsageScope>) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.locallyWith(AIUsageScopeRef, (current) =>
      mergeAIUsageScope(current, scope),
    )(effect);

export const annotateAIUsageScope = (scope: Partial<AIUsageScope>) =>
  FiberRef.update(AIUsageScopeRef, (current) =>
    mergeAIUsageScope(current, scope),
  );

export const inferAIUsageResourceType = (
  attributes?: Record<string, string | number | boolean | null | undefined>,
): string | undefined => {
  if (!attributes) {
    return undefined;
  }

  const resourceKey = Object.keys(attributes).find(
    (key) => key.endsWith('.id') && key !== 'resource.id' && key !== 'user.id',
  );

  if (!resourceKey) {
    return undefined;
  }

  return resourceKey.slice(0, -3);
};
