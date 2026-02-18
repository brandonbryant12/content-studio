# Jenkins Pipelines For Content Studio

This directory contains example Jenkins pipeline definitions for a spec-driven CI/CD model.

## CI/CD Philosophy

1. The master spec is a gate:
Changes that affect behavior must keep `docs/master-spec.md` and `docs/spec/generated/*` in sync.
2. Fast feedback in PRs, deeper checks on schedules:
PR and main pipelines stay strict; nightly and weekly pipelines catch long-tail issues.
3. Keep production deployment explicit:
Use a dedicated main/CD pipeline with manual approval and a clearly bounded deploy step.
4. Prefer reproducibility:
Pin tool versions and use `pnpm install --frozen-lockfile`.

## Pipeline Files

1. `Jenkinsfile`
Purpose: Primary multibranch CI for pull requests and branches.
Key gates: `spec:check`, `typecheck`, `lint`, `test`, `test:invariants`, `build`.

2. `jenkins/Jenkinsfile.main-cd.groovy`
Purpose: Main branch CI + optional production deploy.
Key gates: Same quality gates as CI, then manual approval + deploy placeholder.

3. `jenkins/Jenkinsfile.nightly-hygiene.groovy`
Purpose: Deep nightly checks.
Key gates: Core gates + `test:db:setup` + `test:e2e`, optional `test:live`.

4. `jenkins/Jenkinsfile.weekly-maintenance.groovy`
Purpose: Repo cleanliness and hygiene drift checks.
Key gates: formatting, spec drift, skill mirror drift, dependency audit/outdated reports.

## Recommended Jenkins Jobs

1. `content-studio-multibranch-ci`
Type: Multibranch Pipeline
Pipeline script path: `Jenkinsfile`
Trigger: PR updates + branch indexing.

2. `content-studio-main-cd`
Type: Pipeline
Pipeline script path: `jenkins/Jenkinsfile.main-cd.groovy`
Trigger: Push to `main` (webhook) or post-merge event.

3. `content-studio-nightly-hygiene`
Type: Pipeline
Pipeline script path: `jenkins/Jenkinsfile.nightly-hygiene.groovy`
Trigger: Cron, example `H 2 * * *`.

4. `content-studio-weekly-maintenance`
Type: Pipeline
Pipeline script path: `jenkins/Jenkinsfile.weekly-maintenance.groovy`
Trigger: Cron, example `H 4 * * 1`.

## Agent Requirements

1. Baseline jobs (`Jenkinsfile`, `main-cd`, `weekly-maintenance`):
- Linux agent
- Node.js 22
- `corepack`

2. Nightly hygiene job:
- Same as baseline
- Docker (required for `pnpm test:db:setup` and `pnpm test:db:down`)

## Secrets / Credentials

1. Baseline CI usually does not need cloud secrets if mock providers are used.
2. For deploy pipeline, configure platform-specific credentials and replace the deploy placeholder step.
3. For `RUN_LIVE_TESTS=true`, configure provider secrets (LLM/TTS/storage) on the nightly job.

## Suggested Rollout Order

1. Enable `content-studio-multibranch-ci`.
2. Enable `content-studio-main-cd` with deploy disabled (`DEPLOY_TO_PRODUCTION=false`).
3. Enable nightly hygiene job.
4. Enable weekly maintenance job.
5. After a stable week, wire the real deploy command in `jenkins/Jenkinsfile.main-cd.groovy`.

## Operational Notes

1. Keep Jenkinsfiles versioned in git and reviewed via PR.
2. Treat failing `spec:check` as behavior-contract drift, not a cosmetic docs issue.
3. Treat invariant failures as policy/safety regressions and fix before merge.
4. Dependency audit is advisory in weekly job by default; upgrade to blocking once baseline debt is manageable.
