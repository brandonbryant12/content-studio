/*
 * Content Studio - Pull Request CI Pipeline
 *
 * Purpose:
 * - Fast, blocking quality gate for all pull requests.
 * - Enforce contract/spec, type, lint, and invariant safety before merge.
 *
 * Recommended job type:
 * - Multibranch Pipeline (GitHub Branch Source / Bitbucket Branch Source)
 * - Trigger: pull request opened/synchronize/reopened
 */

pipeline {
  agent { label 'linux && node22' }

  options {
    timestamps()
    ansiColor('xterm')
    disableConcurrentBuilds()
    timeout(time: 50, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '80', artifactNumToKeepStr: '20'))
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

    stage('Spec Check') {
      steps {
        sh 'pnpm spec:check'
      }
    }

    stage('Quality Gates') {
      steps {
        sh 'pnpm ci:quality-gates'
      }
    }

    stage('Build') {
      steps {
        sh 'pnpm build'
      }
    }
  }

  post {
    always {
      junit testResults: '**/reports/*-junit.xml', allowEmptyResults: true
      archiveArtifacts artifacts: 'docs/master-spec.md,docs/spec/generated/**', allowEmptyArchive: true
      deleteDir()
    }
  }
}
