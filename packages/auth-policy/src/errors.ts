import { Schema } from 'effect';

export class Unauthorized extends Schema.TaggedError<Unauthorized>()('Unauthorized', {
  message: Schema.String,
}) {}

export class Forbidden extends Schema.TaggedError<Forbidden>()('Forbidden', {
  message: Schema.String,
  resource: Schema.optional(Schema.String),
  action: Schema.optional(Schema.String),
}) {}

export class PolicyError extends Schema.TaggedError<PolicyError>()('PolicyError', {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {}
