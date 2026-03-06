import { getCurrentUser, type User } from '@repo/auth/policy';
import { Effect } from 'effect';
import {
  annotateUseCaseSpan,
  withUseCaseSpan,
  type UseCaseSpanAttributes,
  type UseCaseSpanResourceInput,
} from './safety-primitives';

export type AuthedUseCaseSpanInput = UseCaseSpanResourceInput & {
  readonly attributes?: UseCaseSpanAttributes;
};

type AnnotateUseCaseSpanEffect = ReturnType<typeof annotateUseCaseSpan>;

export interface DefineAuthedUseCaseSpanContext<Input> {
  readonly input: Input;
  readonly user: User;
}

export interface DefineAuthedUseCaseContext<Input>
  extends DefineAuthedUseCaseSpanContext<Input> {
  readonly annotateSpan: (
    input: AuthedUseCaseSpanInput,
  ) => AnnotateUseCaseSpanEffect;
}

export interface DefineAuthedUseCaseOptions<Input, A, E, R> {
  readonly name: string;
  readonly span?: (
    context: DefineAuthedUseCaseSpanContext<Input>,
  ) => AuthedUseCaseSpanInput;
  readonly run: (
    context: DefineAuthedUseCaseContext<Input>,
  ) => Effect.Effect<A, E, R>;
}

/**
 * Thin wrapper for authenticated media use-cases.
 * Keeps the auth + span contract centralized while leaving business logic explicit.
 */
export const defineAuthedUseCase =
  <Input>() =>
  <A, E, R>(options: DefineAuthedUseCaseOptions<Input, A, E, R>) =>
  (input: Input) =>
    Effect.gen(function* () {
      const user = yield* getCurrentUser;
      const annotateSpan = (spanInput: AuthedUseCaseSpanInput) =>
        annotateUseCaseSpan({
          userId: user.id,
          ...spanInput,
        });

      if (options.span) {
        yield* annotateSpan(options.span({ input, user }));
      }

      return yield* options.run({
        input,
        user,
        annotateSpan,
      });
    }).pipe(withUseCaseSpan(options.name));
