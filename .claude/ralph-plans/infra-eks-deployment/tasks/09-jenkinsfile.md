# Task 09: Create Jenkinsfile Templates

## Standards Checklist

Before starting implementation, read and understand:
- [ ] Jenkins Pipeline syntax
- [ ] Docker build best practices
- [ ] ECR authentication

## Context

Create a comprehensive Jenkins pipeline that:
1. Runs code quality checks (lint, format, typecheck)
2. Runs tests
3. Builds Docker images for server and web
4. Pushes to Amazon ECR
5. Deploys to EKS via Helm

The pipeline should support all three environments (dev, staging, prod) with appropriate gates.

## Key Files

- `Jenkinsfile` - Main pipeline at repo root
- `infrastructure/docs/JENKINS_SETUP.md` - Setup documentation

## Implementation Steps

### 9.1 Create Jenkinsfile

Create `Jenkinsfile` at repository root:

```groovy
pipeline {
    agent {
        kubernetes {
            yaml '''
                apiVersion: v1
                kind: Pod
                spec:
                  containers:
                  - name: node
                    image: node:22-alpine
                    command:
                    - cat
                    tty: true
                    resources:
                      requests:
                        memory: "4Gi"
                        cpu: "2"
                  - name: docker
                    image: docker:24-dind
                    securityContext:
                      privileged: true
                    volumeMounts:
                    - name: docker-socket
                      mountPath: /var/run/docker.sock
                  - name: helm
                    image: alpine/helm:3.14.0
                    command:
                    - cat
                    tty: true
                  volumes:
                  - name: docker-socket
                    emptyDir: {}
            '''
        }
    }

    environment {
        // AWS Configuration
        AWS_REGION = 'us-east-1'
        AWS_ACCOUNT_ID = credentials('aws-account-id')
        ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

        // Image names
        SERVER_IMAGE = "${ECR_REGISTRY}/content-studio-server"
        WEB_IMAGE = "${ECR_REGISTRY}/content-studio-web"

        // Build info
        GIT_COMMIT_SHORT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
        BUILD_TAG = "${env.BRANCH_NAME}-${GIT_COMMIT_SHORT}-${env.BUILD_NUMBER}"

        // pnpm setup
        PNPM_HOME = "${WORKSPACE}/.pnpm-store"
    }

    parameters {
        choice(
            name: 'ENVIRONMENT',
            choices: ['dev', 'staging', 'prod'],
            description: 'Target deployment environment'
        )
        booleanParam(
            name: 'SKIP_TESTS',
            defaultValue: false,
            description: 'Skip test stage (not recommended)'
        )
        booleanParam(
            name: 'DEPLOY',
            defaultValue: true,
            description: 'Deploy after successful build'
        )
    }

    stages {
        stage('Setup') {
            steps {
                container('node') {
                    sh '''
                        # Install pnpm
                        corepack enable
                        corepack prepare pnpm@10.23.0 --activate

                        # Install dependencies
                        pnpm install --frozen-lockfile
                    '''
                }
            }
        }

        stage('Code Quality') {
            parallel {
                stage('Lint') {
                    steps {
                        container('node') {
                            sh 'pnpm lint'
                        }
                    }
                }
                stage('Format Check') {
                    steps {
                        container('node') {
                            sh 'pnpm format'
                        }
                    }
                }
                stage('Type Check') {
                    steps {
                        container('node') {
                            sh 'pnpm typecheck'
                        }
                    }
                }
            }
        }

        stage('Test') {
            when {
                expression { return !params.SKIP_TESTS }
            }
            steps {
                container('node') {
                    sh 'pnpm test'
                }
            }
            post {
                always {
                    // Publish test results if available
                    junit allowEmptyResults: true, testResults: '**/test-results/*.xml'
                }
            }
        }

        stage('Build') {
            steps {
                container('node') {
                    sh 'pnpm build'
                }
            }
        }

        stage('Build Docker Images') {
            parallel {
                stage('Build Server Image') {
                    steps {
                        container('docker') {
                            sh """
                                docker build \
                                    -t ${SERVER_IMAGE}:${BUILD_TAG} \
                                    -t ${SERVER_IMAGE}:${params.ENVIRONMENT} \
                                    -t ${SERVER_IMAGE}:latest \
                                    -f apps/server/Dockerfile \
                                    .
                            """
                        }
                    }
                }
                stage('Build Web Image') {
                    steps {
                        container('docker') {
                            script {
                                def serverUrl = getServerUrl(params.ENVIRONMENT)
                                sh """
                                    docker build \
                                        --build-arg PUBLIC_SERVER_URL=${serverUrl} \
                                        --build-arg PUBLIC_SERVER_API_PATH=/api \
                                        -t ${WEB_IMAGE}:${BUILD_TAG} \
                                        -t ${WEB_IMAGE}:${params.ENVIRONMENT} \
                                        -t ${WEB_IMAGE}:latest \
                                        -f apps/web/Dockerfile \
                                        .
                                """
                            }
                        }
                    }
                }
            }
        }

        stage('Push to ECR') {
            steps {
                container('docker') {
                    withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-credentials']]) {
                        sh """
                            # Login to ECR
                            aws ecr get-login-password --region ${AWS_REGION} | \
                                docker login --username AWS --password-stdin ${ECR_REGISTRY}

                            # Push server image
                            docker push ${SERVER_IMAGE}:${BUILD_TAG}
                            docker push ${SERVER_IMAGE}:${params.ENVIRONMENT}

                            # Push web image
                            docker push ${WEB_IMAGE}:${BUILD_TAG}
                            docker push ${WEB_IMAGE}:${params.ENVIRONMENT}
                        """
                    }
                }
            }
        }

        stage('Deploy to Dev') {
            when {
                allOf {
                    expression { return params.DEPLOY }
                    expression { return params.ENVIRONMENT == 'dev' }
                }
            }
            steps {
                deployToEnvironment('dev')
            }
        }

        stage('Deploy to Staging') {
            when {
                allOf {
                    expression { return params.DEPLOY }
                    expression { return params.ENVIRONMENT == 'staging' }
                }
            }
            steps {
                deployToEnvironment('staging')
            }
        }

        stage('Approval for Production') {
            when {
                allOf {
                    expression { return params.DEPLOY }
                    expression { return params.ENVIRONMENT == 'prod' }
                }
            }
            steps {
                script {
                    timeout(time: 30, unit: 'MINUTES') {
                        input message: 'Deploy to Production?',
                              ok: 'Deploy',
                              submitter: 'admin,devops'
                    }
                }
            }
        }

        stage('Deploy to Production') {
            when {
                allOf {
                    expression { return params.DEPLOY }
                    expression { return params.ENVIRONMENT == 'prod' }
                }
            }
            steps {
                deployToEnvironment('prod')
            }
        }
    }

    post {
        success {
            slackSend(
                channel: '#deployments',
                color: 'good',
                message: "✅ Content Studio ${params.ENVIRONMENT} deployment successful!\nBuild: ${BUILD_TAG}\nCommit: ${GIT_COMMIT_SHORT}"
            )
        }
        failure {
            slackSend(
                channel: '#deployments',
                color: 'danger',
                message: "❌ Content Studio ${params.ENVIRONMENT} deployment failed!\nBuild: ${env.BUILD_URL}"
            )
        }
        cleanup {
            container('docker') {
                sh 'docker system prune -f || true'
            }
        }
    }
}

// Helper functions
def getServerUrl(environment) {
    switch(environment) {
        case 'dev':
            return 'https://api-dev.content-studio.example.com'
        case 'staging':
            return 'https://api-staging.content-studio.example.com'
        case 'prod':
            return 'https://api.content-studio.example.com'
        default:
            return 'https://api-dev.content-studio.example.com'
    }
}

def deployToEnvironment(environment) {
    container('helm') {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-credentials']]) {
            sh """
                # Configure kubectl
                aws eks update-kubeconfig --name content-studio-cluster --region ${AWS_REGION}

                # Deploy with Helm
                helm upgrade --install content-studio \
                    ./infrastructure/helm/content-studio \
                    -f ./infrastructure/helm/content-studio/values-${environment}.yaml \
                    -n content-studio-${environment} \
                    --create-namespace \
                    --set server.image.tag=${BUILD_TAG} \
                    --set web.image.tag=${BUILD_TAG} \
                    --wait \
                    --timeout 10m

                # Verify deployment
                kubectl rollout status deployment/content-studio-server -n content-studio-${environment}
                kubectl rollout status deployment/content-studio-worker -n content-studio-${environment}
                kubectl rollout status deployment/content-studio-web -n content-studio-${environment}
            """
        }
    }
}
```

### 9.2 Create Jenkins Setup Documentation

Create `infrastructure/docs/JENKINS_SETUP.md`:

```markdown
# Jenkins Setup Guide

This guide explains how to configure Jenkins for Content Studio CI/CD.

## Prerequisites

1. Jenkins server with:
   - Pipeline plugin
   - Kubernetes plugin (for dynamic agents)
   - AWS credentials plugin
   - Slack notification plugin (optional)

2. AWS resources:
   - ECR repositories created
   - EKS cluster access
   - IAM user/role with appropriate permissions

## Required Jenkins Credentials

Create the following credentials in Jenkins (Manage Jenkins → Credentials):

### 1. AWS Credentials
- **ID**: `aws-credentials`
- **Type**: AWS Credentials
- **Access Key ID**: Your AWS access key
- **Secret Access Key**: Your AWS secret key

### 2. AWS Account ID
- **ID**: `aws-account-id`
- **Type**: Secret text
- **Secret**: Your 12-digit AWS account ID

### 3. Slack Token (Optional)
- **ID**: `slack-token`
- **Type**: Secret text
- **Secret**: Slack Bot OAuth token

## ECR Repository Setup

Create ECR repositories before first build:

```bash
# Server image repository
aws ecr create-repository \
  --repository-name content-studio-server \
  --region us-east-1

# Web image repository
aws ecr create-repository \
  --repository-name content-studio-web \
  --region us-east-1

# Set lifecycle policy to clean old images
aws ecr put-lifecycle-policy \
  --repository-name content-studio-server \
  --lifecycle-policy-text '{
    "rules": [{
      "rulePriority": 1,
      "description": "Keep last 30 images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 30
      },
      "action": { "type": "expire" }
    }]
  }'
```

## IAM Permissions

The Jenkins IAM user/role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:GetRepositoryPolicy",
        "ecr:DescribeRepositories",
        "ecr:ListImages",
        "ecr:BatchGetImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "eks:DescribeCluster",
        "eks:ListClusters"
      ],
      "Resource": "*"
    }
  ]
}
```

## Pipeline Configuration

### 1. Create Pipeline Job

1. New Item → Pipeline
2. Name: `content-studio`
3. Configure:
   - ✅ GitHub project: `https://github.com/your-org/content-studio`
   - ✅ Build Triggers → GitHub hook trigger for GITScm polling
   - Pipeline:
     - Definition: Pipeline script from SCM
     - SCM: Git
     - Repository URL: `https://github.com/your-org/content-studio.git`
     - Credentials: GitHub credentials
     - Script Path: `Jenkinsfile`

### 2. Webhook Setup

Configure GitHub webhook:
- URL: `https://jenkins.example.com/github-webhook/`
- Content type: `application/json`
- Events: Push, Pull request

## Running the Pipeline

### Manual Trigger

1. Open job → Build with Parameters
2. Select environment (dev/staging/prod)
3. Click Build

### Automatic Triggers

- **Push to main**: Triggers dev deployment
- **Push to release/***: Triggers staging deployment
- **Tag v***: Triggers production deployment (with approval)

## Pipeline Stages

| Stage | Description | Duration |
|-------|-------------|----------|
| Setup | Install pnpm and dependencies | ~2 min |
| Code Quality | Lint, format, typecheck (parallel) | ~3 min |
| Test | Run test suite | ~5 min |
| Build | Build all packages | ~2 min |
| Build Images | Build Docker images (parallel) | ~5 min |
| Push to ECR | Push images to registry | ~2 min |
| Deploy | Helm upgrade to EKS | ~3 min |

**Total**: ~15-20 minutes

## Troubleshooting

### Build fails at Setup
- Verify pnpm version matches `packageManager` in package.json
- Check Node.js version is 22+

### ECR push fails
- Verify AWS credentials are correct
- Check ECR repository exists
- Ensure IAM permissions are correct

### Helm deploy fails
- Verify kubectl can connect to EKS
- Check Helm chart syntax: `helm lint ./infrastructure/helm/content-studio`
- Review pod events: `kubectl describe pod -n content-studio-dev`

### Lint/Format fails
- Run locally: `pnpm lint:fix && pnpm format:fix`
- Commit fixed files
```

### 9.3 Validate Jenkinsfile Syntax

The Jenkinsfile can be validated using Jenkins CLI:

```bash
# Validate Jenkinsfile syntax
java -jar jenkins-cli.jar -s http://jenkins.example.com/ \
  declarative-linter < Jenkinsfile
```

Or use the Jenkins UI: Manage Jenkins → Pipeline Syntax → Declarative Directive Generator

## Verification Log

<!-- Agent writes verification results here -->
