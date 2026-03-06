# Microsoft SSO Recommendation

Status: conditional plan, not current architecture.

This document records the preferred future simplification path for Microsoft
SSO if tenant admins can support app-role assignment in Entra. It may never be
implemented.

For the current implemented auth model, use:

- [`docs/architecture/access-control.md`](../architecture/access-control.md)
- [`docs/architecture/security.md`](../architecture/security.md)

## Current Decision

Keep the current model for now:

1. Keep bearer-based app auth for the browser and API.
2. Keep Better Auth session resolution on the server.
3. Keep Microsoft Graph group lookup during SSO callback because that is how
   role authorization currently works.
4. Do not force a JWT-first rewrite.

The future target, if tenant admins can support it, is:

1. Keep using Entra groups operationally.
2. Assign those groups to app roles in the Enterprise App.
3. Read `roles` claims from the token instead of calling Microsoft Graph.
4. Remove the Graph role-sync path and likely remove the need to persist
   Microsoft provider tokens for authorization.

## Why The Current Model Stays

Today the system must answer:

"Which enterprise groups is this user in, and how do those groups map to our
internal app role?"

Right now the app answers that question itself during sign-in by calling
Microsoft Graph. That is why the Graph permission scope and role-sync code
exist.

Relevant current code:

- [`packages/auth/src/server/auth.ts`](../../packages/auth/src/server/auth.ts)
- [`packages/auth/src/server/microsoft-role-sync.ts`](../../packages/auth/src/server/microsoft-role-sync.ts)
- [`packages/auth/src/server/session.ts`](../../packages/auth/src/server/session.ts)
- [`apps/web/src/shared/lib/auth-token.ts`](../../apps/web/src/shared/lib/auth-token.ts)

## Why This Is Not A JWT Project

The main auth complexity is Microsoft authorization via groups, not session
transport.

Switching to a JWT-first design right now would add:

- JWKS and key rotation concerns
- token claim staleness concerns
- more explicit revocation strategy
- no real simplification of the Graph-based role problem

The worthwhile simplification path is claim-based role mapping, not a transport
rewrite.

## Trigger For This Plan

This plan becomes viable only if tenant admins can:

1. define app roles such as `admin` and `user`
2. assign existing Entra groups to those app roles
3. ensure the `roles` claim is emitted during sign-in

If those prerequisites are not available, this document remains a plan only.

## Recommended Simplifications Without Switching Models

These are safe improvements even if the plan is never implemented:

1. Make session timing explicit in
   [`packages/auth/src/server/auth.ts`](../../packages/auth/src/server/auth.ts).
2. Keep the group-to-role contract documented in one runbook.
3. Keep browser bearer token storage in memory.
4. Keep production in `sso-only`.
5. Keep Microsoft role resolution centralized in the callback path.

## Future Switch Plan

If the prerequisites are met later, the repo change set would be:

1. Remove Graph-specific scopes from
   [`packages/auth/src/server/auth.ts`](../../packages/auth/src/server/auth.ts).
   Likely candidates:
   - `GroupMember.Read.All`
   - `offline_access` if refresh tokens are no longer needed for authorization
2. Remove the Graph role-sync hook from
   [`packages/auth/src/server/auth.ts`](../../packages/auth/src/server/auth.ts).
3. Replace Graph-based role resolution with direct `roles` claim mapping during
   sign-in.
4. Delete
   [`packages/auth/src/server/microsoft-role-sync.ts`](../../packages/auth/src/server/microsoft-role-sync.ts)
   if no longer needed.
5. Reassess whether Microsoft provider tokens need to be stored.
6. Update the canonical architecture docs:
   - [`docs/architecture/access-control.md`](../architecture/access-control.md)
   - [`docs/architecture/security.md`](../architecture/security.md)

## Validation Checklist

Before deleting the Graph path:

1. An enterprise admin user receives the expected `roles` claim.
2. A standard user receives the expected `roles` claim.
3. A user in neither group is denied or downgraded according to policy.
4. Role changes in Entra are reflected on the next sign-in.
5. Tests cover claim-based role mapping instead of Graph lookup.

## Decision

Until app-role assignment is supported by tenant admins:

- keep the current bearer auth model
- keep the current Graph group lookup model
- simplify documentation and session policy, not the core authorization path

If the prerequisites become available later, the first worthwhile auth
simplification is Entra app roles assigned from existing groups, not a JWT-first
rewrite.
