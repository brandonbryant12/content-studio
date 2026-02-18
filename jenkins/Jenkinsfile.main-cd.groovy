/*
 * Content Studio - Main Branch CI/CD Pipeline
 *
 * Philosophy:
 * - Only deploy artifacts that already passed the same quality gates as PRs.
 * - Keep deployment explicit and auditable (manual approval + clear command boundary).
 * - Preserve spec-driven behavior guarantees at the branch head.
 *
 * Recommended job type:
 * - Pipeline job pointing to this file path
 * - Branch: main
 */

pipeline {
  agent { label 'linux && node22' }

  options {
    timestamps()
    ansiColor('xterm')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '60', artifactNumToKeepStr: '30'))
  }

  parameters {
    // Deployment is opt-in so this job can run as CI-only on some executions.
    booleanParam(
      name: 'DEPLOY_TO_PRODUCTION',
      defaultValue: false,
      description: 'When true, run the production deployment stage after all gates pass.'
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

    stage('Spec + Quality Gates') {
      steps {
        sh '''
          # Keep this sequence aligned with repository guardrails.
          pnpm spec:check
          pnpm typecheck
          pnpm lint
          pnpm test
          pnpm test:invariants
          pnpm build
        '''
      }
    }

    stage('Archive Build Inputs') {
      steps {
        // Archive docs/spec outputs so deployment records contain contract evidence.
        archiveArtifacts artifacts: 'docs/master-spec.md,docs/spec/generated/**', fingerprint: true
      }
    }

    stage('Manual Approval') {
      when {
        expression { return params.DEPLOY_TO_PRODUCTION }
      }
      steps {
        // Human checkpoint before production rollout.
        input message: 'Deploy this main commit to production?', ok: 'Deploy'
      }
    }

    stage('Deploy (Replace Placeholder)') {
      when {
        expression { return params.DEPLOY_TO_PRODUCTION }
      }
      steps {
        sh '''
          echo "Replace this block with your real deployment command."
          echo "Examples:"
          echo "  - flyctl deploy"
          echo "  - kubectl apply -f k8s/"
          echo "  - terraform apply -auto-approve"
          exit 0
        '''
      }
    }
  }

  post {
    always {
      deleteDir()
    }
  }
}
