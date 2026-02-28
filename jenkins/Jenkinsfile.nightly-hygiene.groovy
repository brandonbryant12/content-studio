/*
 * Content Studio - Nightly Hygiene Pipeline
 *
 * Philosophy:
 * - Keep main healthy by running deeper checks outside developer inner loops.
 * - Catch cross-system regressions (DB + E2E) before they become production incidents.
 * - Keep results actionable: fail hard on correctness regressions, mark unstable on optional suites.
 *
 * Recommended schedule:
 * - Nightly (example): H 2 * * *
 */

pipeline {
  agent { label 'linux && node22' }

  options {
    timestamps()
    ansiColor('xterm')
    disableConcurrentBuilds()
    timeout(time: 90, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '30', artifactNumToKeepStr: '20'))
  }

  parameters {
    // Live tests usually need external credentials and can be flaky by nature.
    booleanParam(
      name: 'RUN_LIVE_TESTS',
      defaultValue: false,
      description: 'Run live provider tests (requires secrets and network access).'
    )
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
        '''
      }
    }

    stage('Install Dependencies') {
      steps {
        sh 'pnpm install --frozen-lockfile'
      }
    }

    stage('Core Gates') {
      steps {
        sh '''
          # Nightly still includes core guarantees.
          pnpm spec:check
          pnpm typecheck
          pnpm lint
          pnpm test
          pnpm test:invariants
        '''
      }
    }

    stage('Build') {
      steps {
        sh 'pnpm build'
      }
    }

    stage('E2E') {
      steps {
        sh 'pnpm test:e2e'
      }
    }

    stage('Optional Live Tests') {
      when {
        expression { return params.RUN_LIVE_TESTS }
      }
      steps {
        // If live tests fail, mark the stage unstable instead of blocking all nightly output.
        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
          sh 'pnpm test:live'
        }
      }
    }
  }

  post {
    always {
      junit testResults: '**/reports/*-junit.xml', allowEmptyResults: true

      // Archive E2E artifacts for triage. Paths are optional by design.
      archiveArtifacts artifacts: 'apps/web/playwright-report/**,apps/web/test-results/**', allowEmptyArchive: true

      deleteDir()
    }
  }
}
