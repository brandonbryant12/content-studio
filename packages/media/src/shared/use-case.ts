import {
  getCurrentUser,
  requireRole,
  type Role,
  type User,
} from '@repo/auth/policy';
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

export interface DefineRoleUseCaseOptions<Input, A, E, R>
  extends DefineAuthedUseCaseOptions<Input, A, E, R> {
  readonly role: Role;
}

const runDefinedUseCase = <Input, A, E, R>(
  input: Input,
  user: User,
  options: DefineAuthedUseCaseOptions<Input, A, E, R>,
) =>
  Effect.gen(function* () {
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
  });

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
      return yield* runDefinedUseCase(input, user, options);
    }).pipe(withUseCaseSpan(options.name));

/**
 * Role-gated wrapper for media use-cases.
 * Enforces the required role before span annotation so unauthorized attempts
 * do not enter the use-case body.
 */
export const defineRoleUseCase =
  <Input>() =>
  <A, E, R>(options: DefineRoleUseCaseOptions<Input, A, E, R>) =>
  (input: Input) =>
    Effect.gen(function* () {
      const user = yield* requireRole(options.role);
      return yield* runDefinedUseCase(input, user, options);
    }).pipe(withUseCaseSpan(options.name));
