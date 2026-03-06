import type { JsonValue } from '@repo/db/schema';
import type { AIUsageEventModality, AIUsageEventStatus } from '@repo/db/schema';

export interface AIUsageScope {
  readonly userId?: string | null;
  readonly requestId?: string | null;
  readonly jobId?: string | null;
  readonly operation?: string | null;
  readonly resourceType?: string | null;
  readonly resourceId?: string | null;
}

export interface AIUsageRecordInput {
  readonly modality: AIUsageEventModality;
  readonly provider: string;
  readonly providerOperation: string;
  readonly model?: string | null;
  readonly status: AIUsageEventStatus;
  readonly errorTag?: string | null;
  readonly providerResponseId?: string | null;
  readonly usage?: Record<string, JsonValue> | null;
  readonly metadata?: Record<string, JsonValue> | null;
  readonly rawUsage?: Record<string, unknown> | null;
  readonly estimatedCostUsdMicros?: number | null;
  readonly scope?: Partial<AIUsageScope>;
}

export interface PersistAIUsageInput
  extends Omit<AIUsageRecordInput, 'usage' | 'metadata' | 'rawUsage'> {
  readonly userId?: string | null;
  readonly requestId?: string | null;
  readonly jobId?: string | null;
  readonly scopeOperation?: string | null;
  readonly resourceType?: string | null;
  readonly resourceId?: string | null;
  readonly usage: Record<string, JsonValue>;
  readonly metadata?: Record<string, JsonValue> | null;
  readonly rawUsage?: Record<string, JsonValue> | null;
}
