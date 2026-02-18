/*
 * Content Studio - Primary Jenkins Pipeline (PR + Branch CI)
 *
 * Philosophy:
 * - This pipeline is the default quality gate for change validation.
 * - It treats the master spec as an enforceable contract, not optional docs.
 * - It prioritizes fast feedback while still covering the repo's core safety checks.
 *
 * Recommended job type:
 * - Multibranch Pipeline
 *
 * Recommended branch sources:
 * - Pull requests + branch indexing for your Git provider.
 *
 * Agent requirements:
 * - Linux
 * - Node.js 22 available
 * - `corepack` available (bundled with modern Node installations)
 */

pipeline {
  // Keep agent labels explicit so teams can route jobs to the right workers.
  agent { label 'linux && node22' }

  options {
    // Keep logs easy to read and correlate with other systems.
    timestamps()
    ansiColor('xterm')

    // Do not run two builds for the same branch in parallel in this job.
    disableConcurrentBuilds()

    // Keep retention bounded so Jenkins storage stays healthy.
    buildDiscarder(logRotator(numToKeepStr: '40', artifactNumToKeepStr: '20'))
  }

  environment {
    // Standard CI flag helps tools switch to non-interactive behavior.
    CI = 'true'

    // Use a workspace-local pnpm home so each agent run is self-contained.
    PNPM_HOME = "${WORKSPACE}/.pnpm-home"
    PATH = "${PNPM_HOME}:${PATH}"
  }

  stages {
    stage('Checkout') {
      steps {
        // Use the SCM configured in the Jenkins job.
        checkout scm
      }
    }

    stage('Setup Toolchain') {
      steps {
        sh '''
          # Install/activate the exact pnpm version used by the repo.
          corepack enable
          corepack prepare pnpm@10.23.0 --activate

          # Log versions for reproducibility/debugging.
          node --version
          pnpm --version
        '''
      }
    }

    stage('Install Dependencies') {
      steps {
        sh '''
          # Frozen lockfile ensures deterministic dependency graphs.
          pnpm install --frozen-lockfile
        '''
      }
    }

    stage('Spec Drift Gate') {
      steps {
        sh '''
          # This is the spec-driven core guard:
          # if generated spec artifacts drift from code, fail the build.
          pnpm spec:check
        '''
      }
    }

    stage('Static Quality Gates') {
      parallel {
        stage('Typecheck') {
          steps {
            sh 'pnpm typecheck'
          }
        }

        stage('Lint') {
          steps {
            sh 'pnpm lint'
          }
        }
      }
    }

    stage('Behavioral Safety Gates') {
      parallel {
        stage('Test Suite') {
          steps {
            // Runs workspace tests including frontend and backend suites.
            sh 'pnpm test'
          }
        }

        stage('Invariants') {
          steps {
            // Required project safety invariant checks.
            sh 'pnpm test:invariants'
          }
        }
      }
    }

    stage('Build') {
      steps {
        // Build gate catches packaging/transpile breakage before merge.
        sh 'pnpm build'
      }
    }

    stage('Archive Spec Artifacts') {
      steps {
        // Make the exact spec snapshot visible in Jenkins build artifacts.
        archiveArtifacts artifacts: 'docs/master-spec.md,docs/spec/generated/**', fingerprint: true
      }
    }
  }

  post {
    always {
      // Clean workspace to prevent cross-build contamination.
      deleteDir()
    }

    failure {
      echo 'Pipeline failed. Treat failures as contract drift or quality regressions until proven otherwise.'
    }
  }
}
