import { Context, Layer } from 'effect';
import type { Role } from './types';

export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: Role;
  readonly impersonatedBy?: string;
}

export class CurrentUser extends Context.Tag('@repo/auth-policy/CurrentUser')<
  CurrentUser,
  User
>() {}

export const CurrentUserLive = (user: User): Layer.Layer<CurrentUser> =>
  Layer.succeed(CurrentUser, user);
