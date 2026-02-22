/*
 * Content Studio - Weekly Maintenance / Repo Cleanliness Pipeline
 *
 * Philosophy:
 * - "Clean repo" means no hidden drift in formatting, generated specs, or mirrored skill trees.
 * - Weekly maintenance should surface long-tail hygiene issues without blocking every PR.
 * - Security and dependency checks should be visible; teams can decide whether they are blocking.
 *
 * Recommended schedule:
 * - Weekly (example): H 4 * * 1
 */

pipeline {
  agent { label 'linux && node22' }

  options {
    timestamps()
    ansiColor('xterm')
    disableConcurrentBuilds()
    timeout(time: 60, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '20'))
  }

  environment {
    CI = 'true'
    PNPM_HOME = "${WORKSPACE}/.pnpm-home"
    PATH = "${PNPM_HOME}:${PATH}"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Setup Toolchain') {
      steps {
        sh '''
          corepack enable
          corepack prepare pnpm@10.23.0 --activate
          node --version
          pnpm --version
          mkdir -p reports
        '''
      }
    }

    stage('Install Dependencies') {
      steps {
        sh 'pnpm install --frozen-lockfile'
      }
    }

    stage('Formatting Check') {
      steps {
        // Fail fast if formatting drift exists anywhere in the workspace.
        sh 'pnpm format'
      }
    }

    stage('Spec Drift Check') {
      steps {
        sh 'pnpm spec:check'
      }
    }

    stage('Skills Mirror Drift Check') {
      steps {
        sh '''
          # Keep the mirrored skill directories aligned with .agents/skills.
          bash agentic-harness-framework/scripts/sync-skills.sh

          # If sync produced changes, fail with a clear message.
          if ! git diff --quiet -- .agent/skills .agents/skills .claude/skills .github/skills; then
            echo "Skill mirror drift detected. Commit synced skill links/content."
            git status --short -- .agent/skills .agents/skills .claude/skills .github/skills
            exit 1
          fi
        '''
      }
    }

    stage('Dependency Audit (Advisory)') {
      steps {
        // Mark the stage unstable on audit findings, but keep the rest of the report flowing.
        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
          sh '''
            pnpm audit --prod --json > reports/pnpm-audit.json
            pnpm audit --prod
          '''
        }
      }
    }

    stage('Dependency Outdated Report (Advisory)') {
      steps {
        // Generate a machine-readable report for weekly triage.
        sh '''
          pnpm outdated --recursive --format json > reports/pnpm-outdated.json || true
        '''
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'reports/**,docs/master-spec.md,docs/spec/generated/**', allowEmptyArchive: true
      deleteDir()
    }
  }
}
