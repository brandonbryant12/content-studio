import { Schema } from 'effect';

export class SvgNotFoundError extends Schema.TaggedError<SvgNotFoundError>()(
  'SvgNotFoundError',
  { svgId: Schema.String },
) {
  static readonly httpStatus = 404;
  static readonly httpCode = 'SVG_NOT_FOUND';
  static readonly httpMessage = 'SVG not found';
  static readonly logLevel = 'info' as const;
}

export class SvgGenerationInProgressError extends Schema.TaggedError<SvgGenerationInProgressError>()(
  'SvgGenerationInProgressError',
  { svgId: Schema.String },
) {
  static readonly httpStatus = 409;
  static readonly httpCode = 'SVG_GENERATION_IN_PROGRESS';
  static readonly httpMessage = 'SVG generation already in progress';
  static readonly logLevel = 'info' as const;
}
