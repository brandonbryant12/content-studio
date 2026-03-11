# Jenkins Job Setup Quickstart

This quickstart is the copy/paste guide to create the recommended Content Studio Jenkins jobs quickly.

## Prerequisites

1. Jenkins agent label available: `linux && node22`
2. Docker available on agents that will run PR CI, main CD, or nightly hygiene
3. Required plugins:
   `Pipeline`, `Git`, `GitHub Branch Source` (or equivalent SCM branch-source plugin), `Credentials Binding`, `AnsiColor`, `Timestamper`, `JUnit`
4. Repo credential in Jenkins:
   `content-studio-scm-read` (or your equivalent ID)

## Job Creation Matrix

| Job Name                            | Job Type             | Branch  | Jenkinsfile Path                                | Trigger                    |
| ----------------------------------- | -------------------- | ------- | ----------------------------------------------- | -------------------------- |
| `content-studio-pr-ci`              | Multibranch Pipeline | PR refs | `jenkins/Jenkinsfile.pr-ci.groovy`              | PR webhook + periodic scan |
| `content-studio-main-cd`            | Pipeline (from SCM)  | `main`  | `jenkins/Jenkinsfile.main-cd.groovy`            | Push/merge webhook         |
| `content-studio-nightly-hygiene`    | Pipeline (from SCM)  | `main`  | `jenkins/Jenkinsfile.nightly-hygiene.groovy`    | Cron `H 2 * * *`           |
| `content-studio-weekly-maintenance` | Pipeline (from SCM)  | `main`  | `jenkins/Jenkinsfile.weekly-maintenance.groovy` | Cron `H 4 * * 1`           |

## Step-By-Step

### 1) Create `content-studio-pr-ci` (Multibranch)

1. New Item -> `content-studio-pr-ci` -> `Multibranch Pipeline`
2. Branch source:
   GitHub/SCM source pointing to this repository with credential `content-studio-scm-read`
3. Build discovery:
   enable PR discovery strategy (merge or head policy per your org standard)
4. Script Path:
   `jenkins/Jenkinsfile.pr-ci.groovy`
5. Scan trigger:
   enable webhook scan trigger, plus periodic fallback scan (for example every 1 day)
6. Save and run an initial repository scan

### 2) Create `content-studio-main-cd` (Main CI/CD)

1. New Item -> `content-studio-main-cd` -> `Pipeline`
2. Definition:
   `Pipeline script from SCM`
3. SCM:
   Git repository URL + credential `content-studio-scm-read`
4. Branch Specifier:
   `*/main`
5. Script Path:
   `jenkins/Jenkinsfile.main-cd.groovy`
6. Trigger:
   enable SCM webhook trigger for push/merge events
7. Parameters:
   keep `DEPLOY_TO_PRODUCTION=false` by default

### 3) Create `content-studio-nightly-hygiene`

1. New Item -> `content-studio-nightly-hygiene` -> `Pipeline`
2. Definition:
   `Pipeline script from SCM`
3. Branch Specifier:
   `*/main`
4. Script Path:
   `jenkins/Jenkinsfile.nightly-hygiene.groovy`
5. Build trigger:
   `Build periodically` with `H 2 * * *`
6. Optional parameter:
   set `RUN_LIVE_TESTS=true` only after provider credentials are configured

### 4) Create `content-studio-weekly-maintenance`

1. New Item -> `content-studio-weekly-maintenance` -> `Pipeline`
2. Definition:
   `Pipeline script from SCM`
3. Branch Specifier:
   `*/main`
4. Script Path:
   `jenkins/Jenkinsfile.weekly-maintenance.groovy`
5. Build trigger:
   `Build periodically` with `H 4 * * 1`

## Recommended Branch Protection Checks

Require these statuses before merge:

1. `content-studio-pr-ci / Spec Check`
2. `content-studio-pr-ci / Quality Gates`
3. `content-studio-pr-ci / Build`

## Post-Creation Verification

1. Run each job once manually to validate SCM credentials and agent labels.
2. Confirm `pnpm` bootstraps correctly (`corepack prepare pnpm@10.23.0` in logs).
3. Confirm Docker-backed test steps can start Testcontainers / Compose services.
4. Confirm PR/main/nightly logs run `pnpm ci:quality-gates` for the shared `typecheck`/`lint`/`test`/`test:invariants` gate instead of separate commands.
5. Confirm test reports and artifacts are archived.
6. Confirm PR status checks report back to your SCM provider.
