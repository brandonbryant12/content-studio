pipeline {
    agent any

    parameters {
        choice(
            name: 'ENVIRONMENT',
            choices: ['dev', 'staging', 'prod'],
            description: 'Target deployment environment'
        )
        string(
            name: 'IMAGE_TAG',
            defaultValue: '',
            description: 'Docker image tag (defaults to BUILD_NUMBER if empty)'
        )
        booleanParam(
            name: 'DEPLOY_ONLY',
            defaultValue: false,
            description: 'Skip build steps and deploy existing images'
        )
    }

    environment {
        AWS_REGION = 'us-east-1'
        ECR_REGISTRY = credentials('ecr-registry-url')
        SERVER_ECR_REPO = "${ECR_REGISTRY}/content-studio-server"
        WEB_ECR_REPO = "${ECR_REGISTRY}/content-studio-web"
        EFFECTIVE_IMAGE_TAG = "${params.IMAGE_TAG ?: env.BUILD_NUMBER}"
        HELM_RELEASE_NAME = 'content-studio'
        HELM_CHART_PATH = './helm/content-studio'
    }

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timeout(time: 60, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    env.GIT_BRANCH_NAME = sh(
                        script: 'git rev-parse --abbrev-ref HEAD',
                        returnStdout: true
                    ).trim()
                }
                echo "Building commit: ${env.GIT_COMMIT_SHORT} on branch: ${env.GIT_BRANCH_NAME}"
            }
        }

        stage('Install Dependencies') {
            when {
                expression { return !params.DEPLOY_ONLY }
            }
            steps {
                sh 'corepack enable'
                sh 'pnpm install --frozen-lockfile'
            }
        }

        stage('Lint') {
            when {
                expression { return !params.DEPLOY_ONLY }
            }
            steps {
                sh 'pnpm lint'
            }
        }

        stage('Typecheck') {
            when {
                expression { return !params.DEPLOY_ONLY }
            }
            steps {
                sh 'pnpm typecheck'
            }
        }

        stage('Test') {
            when {
                expression { return !params.DEPLOY_ONLY }
            }
            steps {
                sh 'pnpm test'
            }
            post {
                always {
                    junit(
                        testResults: '**/test-results/**/*.xml',
                        allowEmptyResults: true
                    )
                }
            }
        }

        stage('Build Images') {
            when {
                expression { return !params.DEPLOY_ONLY }
            }
            parallel {
                stage('Build Server Image') {
                    steps {
                        script {
                            docker.build(
                                "${SERVER_ECR_REPO}:${EFFECTIVE_IMAGE_TAG}",
                                "-f ./apps/server/Dockerfile ."
                            )
                        }
                    }
                }
                stage('Build Web Image') {
                    steps {
                        script {
                            docker.build(
                                "${WEB_ECR_REPO}:${EFFECTIVE_IMAGE_TAG}",
                                "-f ./apps/web/Dockerfile ."
                            )
                        }
                    }
                }
            }
        }

        stage('Push to ECR') {
            when {
                expression { return !params.DEPLOY_ONLY }
            }
            steps {
                script {
                    withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-ecr-credentials']]) {
                        sh """
                            aws ecr get-login-password --region ${AWS_REGION} | \
                            docker login --username AWS --password-stdin ${ECR_REGISTRY}
                        """

                        sh "docker push ${SERVER_ECR_REPO}:${EFFECTIVE_IMAGE_TAG}"
                        sh "docker push ${WEB_ECR_REPO}:${EFFECTIVE_IMAGE_TAG}"

                        // Tag and push as latest for the current environment
                        sh "docker tag ${SERVER_ECR_REPO}:${EFFECTIVE_IMAGE_TAG} ${SERVER_ECR_REPO}:${params.ENVIRONMENT}-latest"
                        sh "docker tag ${WEB_ECR_REPO}:${EFFECTIVE_IMAGE_TAG} ${WEB_ECR_REPO}:${params.ENVIRONMENT}-latest"
                        sh "docker push ${SERVER_ECR_REPO}:${params.ENVIRONMENT}-latest"
                        sh "docker push ${WEB_ECR_REPO}:${params.ENVIRONMENT}-latest"
                    }
                }
            }
        }

        stage('Publish Build Artifacts') {
            when {
                expression { return !params.DEPLOY_ONLY }
            }
            steps {
                archiveArtifacts(
                    artifacts: '**/dist/**/*',
                    allowEmptyArchive: true,
                    fingerprint: true
                )
            }
        }

        stage('Deploy to Dev') {
            when {
                expression { return params.ENVIRONMENT == 'dev' }
            }
            steps {
                script {
                    deployToEnvironment('dev')
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                expression { return params.ENVIRONMENT == 'staging' }
            }
            steps {
                script {
                    input(
                        message: 'Deploy to Staging?',
                        ok: 'Deploy',
                        submitter: 'admin,release-managers'
                    )
                    deployToEnvironment('staging')
                }
            }
        }

        stage('Deploy to Prod') {
            when {
                expression { return params.ENVIRONMENT == 'prod' }
            }
            steps {
                script {
                    input(
                        message: 'Deploy to Production?',
                        ok: 'Deploy to Production',
                        submitter: 'admin,release-managers',
                        parameters: [
                            string(
                                name: 'APPROVAL_REASON',
                                defaultValue: '',
                                description: 'Reason for production deployment'
                            )
                        ]
                    )
                    deployToEnvironment('prod')
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline completed successfully for ${params.ENVIRONMENT} environment"
            script {
                if (params.ENVIRONMENT == 'prod') {
                    slackSend(
                        channel: '#deployments',
                        color: 'good',
                        message: "Production deployment successful: ${env.JOB_NAME} #${env.BUILD_NUMBER} (${EFFECTIVE_IMAGE_TAG})"
                    )
                }
            }
        }
        failure {
            echo "Pipeline failed for ${params.ENVIRONMENT} environment"
            script {
                slackSend(
                    channel: '#deployments',
                    color: 'danger',
                    message: "Deployment failed: ${env.JOB_NAME} #${env.BUILD_NUMBER} for ${params.ENVIRONMENT}"
                )
            }
        }
        cleanup {
            cleanWs()
            sh "docker rmi ${SERVER_ECR_REPO}:${EFFECTIVE_IMAGE_TAG} || true"
            sh "docker rmi ${WEB_ECR_REPO}:${EFFECTIVE_IMAGE_TAG} || true"
        }
    }
}

def deployToEnvironment(String environment) {
    def clusterContexts = [
        'dev': 'arn:aws:eks:us-east-1:ACCOUNT_ID:cluster/content-studio-dev',
        'staging': 'arn:aws:eks:us-east-1:ACCOUNT_ID:cluster/content-studio-staging',
        'prod': 'arn:aws:eks:us-east-1:ACCOUNT_ID:cluster/content-studio-prod'
    ]

    def namespaces = [
        'dev': 'content-studio-dev',
        'staging': 'content-studio-staging',
        'prod': 'content-studio-prod'
    ]

    def valuesFiles = [
        'dev': 'helm/values/dev.yaml',
        'staging': 'helm/values/staging.yaml',
        'prod': 'helm/values/prod.yaml'
    ]

    def clusterContext = clusterContexts[environment]
    def namespace = namespaces[environment]
    def valuesFile = valuesFiles[environment]

    withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-eks-credentials']]) {
        sh """
            aws eks update-kubeconfig --region ${AWS_REGION} --name content-studio-${environment}
            kubectl config use-context ${clusterContext}
        """

        // Deploy using Helm with atomic flag for automatic rollback on failure
        sh """
            helm upgrade ${HELM_RELEASE_NAME} ${HELM_CHART_PATH} \
                --install \
                --namespace ${namespace} \
                --create-namespace \
                --values ${valuesFile} \
                --set server.image.repository=${SERVER_ECR_REPO} \
                --set server.image.tag=${EFFECTIVE_IMAGE_TAG} \
                --set web.image.repository=${WEB_ECR_REPO} \
                --set web.image.tag=${EFFECTIVE_IMAGE_TAG} \
                --set deployment.timestamp="${new Date().format('yyyyMMddHHmmss')}" \
                --atomic \
                --timeout 10m \
                --wait
        """

        // Verify deployment
        sh """
            kubectl rollout status deployment/${HELM_RELEASE_NAME}-server -n ${namespace} --timeout=5m
            kubectl rollout status deployment/${HELM_RELEASE_NAME}-web -n ${namespace} --timeout=5m
        """

        echo "Deployment to ${environment} completed successfully"
        echo "Server image: ${SERVER_ECR_REPO}:${EFFECTIVE_IMAGE_TAG}"
        echo "Web image: ${WEB_ECR_REPO}:${EFFECTIVE_IMAGE_TAG}"
    }
}

def rollback(String environment) {
    def namespaces = [
        'dev': 'content-studio-dev',
        'staging': 'content-studio-staging',
        'prod': 'content-studio-prod'
    ]

    def namespace = namespaces[environment]

    withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-eks-credentials']]) {
        sh """
            aws eks update-kubeconfig --region ${AWS_REGION} --name content-studio-${environment}
        """

        // Rollback to previous revision
        sh """
            helm rollback ${HELM_RELEASE_NAME} -n ${namespace} --wait --timeout 5m
        """

        echo "Rollback completed for ${environment}"
    }
}
