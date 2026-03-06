import { Schema } from 'effect';

export class AdminUserNotFound extends Schema.TaggedError<AdminUserNotFound>()(
  'AdminUserNotFound',
  {
    userId: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'USER_NOT_FOUND' as const;
  static readonly httpMessage = (e: AdminUserNotFound) =>
    e.message ?? `User ${e.userId} not found`;
  static readonly logLevel = 'silent' as const;
  static getData(e: AdminUserNotFound) {
    return { userId: e.userId };
  }
}
