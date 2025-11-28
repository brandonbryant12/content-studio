export const Role = {
  USER: 'user',
  ADMIN: 'admin',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Permission = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  ADMIN: 'admin',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

export interface PolicyRule {
  readonly resource: string;
  readonly action: Permission;
  readonly conditions?: {
    readonly ownership?: boolean;
    readonly roles?: readonly Role[];
  };
}
