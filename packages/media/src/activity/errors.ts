import { Schema } from 'effect';

export class ActivityLogNotFound extends Schema.TaggedError<ActivityLogNotFound>()(
  'ActivityLogNotFound',
  {
    id: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'NOT_FOUND' as const;
  static readonly httpMessage = (e: ActivityLogNotFound) =>
    e.message ?? `Activity log ${e.id} not found`;
  static readonly logLevel = 'silent' as const;
}
