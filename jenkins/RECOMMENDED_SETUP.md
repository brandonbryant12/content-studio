# Recommended Jenkins Setup (Maintenance + Delivery)

This document defines the recommended Jenkins pipeline model for maintaining and releasing Content Studio.

## Goals

1. Catch regressions early on pull requests.
2. Keep `main` releasable at all times.
3. Run deeper/long-tail checks on schedules without slowing PR feedback loops.
4. Keep production deploy controlled and auditable.

## Pipeline Portfolio

1. `content-studio-pr-ci` (blocking)
   Pipeline: [`jenkins/Jenkinsfile.pr-ci.groovy`](./Jenkinsfile.pr-ci.groovy)
   Trigger: PR opened/synchronize/reopened
   Purpose: Fast merge gate

2. `content-studio-main-cd` (blocking)
   Pipeline: [`jenkins/Jenkinsfile.main-cd.groovy`](./Jenkinsfile.main-cd.groovy)
   Trigger: push/merge to `main`
   Purpose: Validate branch head, optionally deploy with manual approval

3. `content-studio-nightly-hygiene` (scheduled)
   Pipeline: [`jenkins/Jenkinsfile.nightly-hygiene.groovy`](./Jenkinsfile.nightly-hygiene.groovy)
   Trigger: cron `H 2 * * *`
   Purpose: Deep daily checks (`e2e`, optional live tests)

4. `content-studio-weekly-maintenance` (scheduled)
   Pipeline: [`jenkins/Jenkinsfile.weekly-maintenance.groovy`](./Jenkinsfile.weekly-maintenance.groovy)
   Trigger: cron `H 4 * * 1`
   Purpose: Hygiene drift and dependency maintenance checks

## Gate Timing Matrix

| Gate                             | PR CI    | Main CD  | Nightly                          | Weekly   |
| -------------------------------- | -------- | -------- | -------------------------------- | -------- |
| `pnpm install --frozen-lockfile` | Required | Required | Required                         | Required |
| `pnpm spec:check`                | Required | Required | Required                         | Required |
| `pnpm typecheck`                 | Required | Required | Required                         | Optional |
| `pnpm lint`                      | Required | Required | Required                         | Optional |
| `pnpm test`                      | Required | Required | Required                         | Optional |
| `pnpm test:invariants`           | Required | Required | Required                         | Optional |
| `pnpm build`                     | Required | Required | Required                         | Optional |
| `pnpm test:e2e`                  | Skip     | Optional | Required                         | Skip     |
| `pnpm test:live`                 | Skip     | Skip     | Optional (`RUN_LIVE_TESTS=true`) | Skip     |
| `pnpm format`                    | Skip     | Skip     | Skip                             | Required |
| `pnpm audit --prod`              | Skip     | Skip     | Optional                         | Advisory |
| `pnpm outdated --recursive`      | Skip     | Skip     | Skip                             | Advisory |

## Recommended Jenkins Job Types

1. PR CI: Multibranch Pipeline job (PR event aware)
2. Main CD: Pipeline job pinned to `main`
3. Nightly/Weekly: Pipeline jobs on `main` with cron triggers

## Branch Protection Mapping

Mark these checks as required before merge:

1. `content-studio-pr-ci / Spec Check`
2. `content-studio-pr-ci / Quality Gates`
3. `content-studio-pr-ci / Build`

Keep these non-blocking but alerting:

1. `content-studio-nightly-hygiene`
2. `content-studio-weekly-maintenance`

## Deployment Guardrails

1. Keep deploy manual (`DEPLOY_TO_PRODUCTION=true` + approval step).
2. Keep deploy command in `main-cd` explicit and environment-specific.
3. For EKS, prefer Helm release commands in deploy step:
   `helm upgrade --install ... --atomic --wait`.

## Agent and Runtime Baseline

1. Linux agent with Node.js 22 and `corepack`.
2. `pnpm` pinned to `10.23.0`.
3. Docker-capable agents for PR CI, main CD, and nightly hygiene because `pnpm test` uses Testcontainers and `pnpm test:e2e` uses Docker Compose-backed services.
4. Workspace-local cache directories for pnpm/turbo where possible.

## Secrets and Credentials

1. PR CI: no production secrets.
2. Main CD: deploy credentials only.
3. Nightly live tests: provider/storage credentials only when `RUN_LIVE_TESTS=true`.
4. Prefer Jenkins Credentials + scoped environment injection, never hardcoded secrets.

## Rollout Plan

1. Enable `content-studio-pr-ci` first.
2. Enable `content-studio-main-cd` with deploy disabled.
3. Enable nightly hygiene.
4. Enable weekly maintenance.
5. After stable signal quality, wire production deploy command in `main-cd`.
