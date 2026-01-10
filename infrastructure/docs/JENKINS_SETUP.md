# Jenkins Setup Guide

This guide covers configuring Jenkins for Content Studio CI/CD pipelines.

## Required Jenkins Plugins

Install the following plugins via **Manage Jenkins > Plugins > Available plugins**:

### Core Pipeline Plugins

| Plugin | Description |
|--------|-------------|
| Pipeline | Core pipeline functionality |
| Pipeline: Stage View | Visualize pipeline stages |
| Pipeline: Declarative | Declarative pipeline syntax |
| Git | Git SCM integration |
| GitHub | GitHub integration and webhooks |

### AWS and Kubernetes Plugins

| Plugin | Description |
|--------|-------------|
| AWS Credentials | AWS credential binding |
| Docker Pipeline | Docker build/push support |
| Kubernetes CLI | kubectl command execution |

### Utility Plugins

| Plugin | Description |
|--------|-------------|
| Slack Notification | Slack deployment notifications |
| Timestamper | Add timestamps to console output |
| JUnit | Test result reporting |
| Workspace Cleanup | Clean workspace after builds |

### Install via CLI

```bash
jenkins-plugin-cli --plugins \
  workflow-aggregator \
  pipeline-stage-view \
  git \
  github \
  aws-credentials \
  docker-workflow \
  kubernetes-cli \
  slack \
  timestamper \
  junit \
  ws-cleanup
```

---

## Credentials Configuration

Navigate to **Manage Jenkins > Credentials > System > Global credentials** and add:

### 1. ECR Registry URL

| Field | Value |
|-------|-------|
| Kind | Secret text |
| ID | `ecr-registry-url` |
| Secret | `123456789012.dkr.ecr.us-east-1.amazonaws.com` |
| Description | ECR Registry URL |

### 2. AWS Credentials for ECR

| Field | Value |
|-------|-------|
| Kind | AWS Credentials |
| ID | `aws-ecr-credentials` |
| Access Key ID | Your AWS access key |
| Secret Access Key | Your AWS secret key |
| Description | AWS credentials for ECR push |

### 3. AWS Credentials for EKS

| Field | Value |
|-------|-------|
| Kind | AWS Credentials |
| ID | `aws-eks-credentials` |
| Access Key ID | Your AWS access key |
| Secret Access Key | Your AWS secret key |
| Description | AWS credentials for EKS deployment |

**Note**: For production, use separate IAM users/roles with least-privilege permissions:
- ECR credentials: Only `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:GetDownloadUrlForLayer`, `ecr:BatchGetImage`, `ecr:PutImage`, etc.
- EKS credentials: Only `eks:DescribeCluster`, `eks:UpdateClusterConfig`, etc.

### 4. Slack Webhook (Optional)

| Field | Value |
|-------|-------|
| Kind | Secret text |
| ID | `slack-webhook-url` |
| Secret | `https://hooks.slack.com/services/xxx/yyy/zzz` |
| Description | Slack webhook for deployment notifications |

---

## Pipeline Parameters

The Jenkinsfile exposes these parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `ENVIRONMENT` | Choice | `dev` | Target environment: `dev`, `staging`, `prod` |
| `IMAGE_TAG` | String | (empty) | Docker image tag. Defaults to `BUILD_NUMBER` if empty |
| `DEPLOY_ONLY` | Boolean | `false` | Skip build steps and deploy existing images |

### Example Usage

#### Deploy to Development

```
ENVIRONMENT: dev
IMAGE_TAG: (leave empty for auto-generated)
DEPLOY_ONLY: false
```

#### Redeploy Existing Image to Staging

```
ENVIRONMENT: staging
IMAGE_TAG: 42
DEPLOY_ONLY: true
```

#### Production Deployment

```
ENVIRONMENT: prod
IMAGE_TAG: v1.2.3
DEPLOY_ONLY: false
```

---

## Running Builds

### From Jenkins UI

1. Navigate to the pipeline job
2. Click **Build with Parameters**
3. Select the environment and set parameters
4. Click **Build**

### Triggering via API

```bash
# Trigger build with parameters
curl -X POST "https://jenkins.example.com/job/content-studio/buildWithParameters" \
  --user "username:api-token" \
  --data "ENVIRONMENT=dev" \
  --data "IMAGE_TAG=abc1234" \
  --data "DEPLOY_ONLY=false"
```

### Webhook Triggers

Configure GitHub webhook to trigger builds on push:

1. In GitHub repo settings, add webhook:
   - Payload URL: `https://jenkins.example.com/github-webhook/`
   - Content type: `application/json`
   - Events: Push events

2. In Jenkins job configuration:
   - Enable "GitHub hook trigger for GITScm polling"

---

## Deployment Workflow

### Standard Build and Deploy Flow

```
┌─────────────┐    ┌──────────────────┐    ┌───────────┐
│   Checkout  │───>│ Install Deps     │───>│   Lint    │
└─────────────┘    └──────────────────┘    └───────────┘
                                                  │
                                                  v
┌─────────────┐    ┌──────────────────┐    ┌───────────┐
│   Deploy    │<───│  Push to ECR     │<───│   Test    │
└─────────────┘    └──────────────────┘    └───────────┘
```

### Pipeline Stages

| Stage | Description | Skip with DEPLOY_ONLY |
|-------|-------------|-----------------------|
| Checkout | Clone repository, get git commit info | No |
| Install Dependencies | Run `pnpm install --frozen-lockfile` | Yes |
| Lint | Run `pnpm lint` | Yes |
| Typecheck | Run `pnpm typecheck` | Yes |
| Test | Run `pnpm test` with JUnit reporting | Yes |
| Build Images | Build server and web Docker images in parallel | Yes |
| Push to ECR | Authenticate and push images to ECR | Yes |
| Publish Build Artifacts | Archive dist files | Yes |
| Deploy to [Environment] | Helm upgrade to target environment | No |

### Environment-Specific Deployment

| Environment | Approval Required | Cluster |
|-------------|-------------------|---------|
| dev | No | `content-studio-dev` |
| staging | Yes (admin, release-managers) | `content-studio-staging` |
| prod | Yes (with reason) | `content-studio-prod` |

### Deployment Steps

For each environment, the pipeline:

1. Updates kubeconfig for the target cluster
2. Runs `helm upgrade --install` with:
   - Environment-specific values file
   - Image repository and tag overrides
   - `--atomic` flag for automatic rollback on failure
   - `--wait` for deployment completion
3. Verifies rollout status for server and web deployments

---

## Troubleshooting

### Build Failures

#### Dependency Installation Fails

```bash
# Check if pnpm is available
pnpm --version

# Verify lockfile is up to date
pnpm install --frozen-lockfile

# Clear pnpm cache if needed
pnpm store prune
```

#### Docker Build Fails

```bash
# Check Docker daemon is running
docker info

# Check disk space
df -h

# Clean up Docker resources
docker system prune -f
```

#### ECR Push Fails

```bash
# Verify credentials are configured
aws sts get-caller-identity

# Re-authenticate to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Check ECR repository exists
aws ecr describe-repositories --repository-names content-studio-server
```

### Deployment Failures

#### kubectl Connection Issues

```bash
# Verify AWS credentials
aws sts get-caller-identity

# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name content-studio-dev

# Test connection
kubectl get nodes
```

#### Helm Deployment Fails

```bash
# Check Helm release status
helm status content-studio -n content-studio-dev

# View release history
helm history content-studio -n content-studio-dev

# Get Helm debug output
helm upgrade content-studio ./helm/content-studio \
  --namespace content-studio-dev \
  --debug --dry-run
```

#### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n content-studio-dev

# Describe failing pod
kubectl describe pod <pod-name> -n content-studio-dev

# Check pod logs
kubectl logs <pod-name> -n content-studio-dev

# Check events
kubectl get events -n content-studio-dev --sort-by='.lastTimestamp'
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `no basic auth credentials` | ECR login expired | Re-run ECR login command |
| `ImagePullBackOff` | Image not found in ECR | Verify image tag exists |
| `Insufficient cpu/memory` | Node resources exhausted | Scale cluster or reduce requests |
| `context deadline exceeded` | Helm timeout | Increase `--timeout` value |
| `UPGRADE FAILED: another operation in progress` | Concurrent Helm operation | Wait or run `helm rollback` |

### Checking Pipeline Logs

1. Open the failed build in Jenkins
2. Click on the failed stage
3. Click **Logs** to view stage-specific output
4. For full output, click **Console Output**

### Manual Rollback

If deployment fails and automatic rollback doesn't work:

```bash
# View release history
helm history content-studio -n content-studio-dev

# Rollback to previous version
helm rollback content-studio -n content-studio-dev

# Or rollback to specific revision
helm rollback content-studio 5 -n content-studio-dev
```

---

## Jenkins Agent Requirements

Ensure your Jenkins agent has:

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 22.x | Application build |
| pnpm | 9.x | Package management |
| Docker | 24.x+ | Image builds |
| AWS CLI | 2.x | ECR/EKS access |
| kubectl | 1.27+ | Kubernetes deployment |
| Helm | 3.x | Chart installation |

### Agent Setup Script

```bash
# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Enable corepack for pnpm
corepack enable

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### Docker-in-Docker Setup

If using Docker-in-Docker on the agent:

```bash
# Add jenkins user to docker group
sudo usermod -aG docker jenkins

# Restart Jenkins agent
sudo systemctl restart jenkins-agent
```

---

## Security Best Practices

### Credential Management

1. **Use IAM Roles** instead of static credentials when possible
2. **Rotate credentials** regularly (every 90 days)
3. **Scope permissions** to minimum required for each credential
4. **Audit credential usage** via CloudTrail

### Pipeline Security

1. **Use `--frozen-lockfile`** to prevent dependency tampering
2. **Scan images** for vulnerabilities before push
3. **Require approval** for staging/production deployments
4. **Clean workspace** after builds to remove sensitive data

### Network Security

1. **Run Jenkins in private subnet** with VPN/bastion access
2. **Use HTTPS** for all Jenkins endpoints
3. **Restrict security groups** to known IP ranges
4. **Enable audit logging** for Jenkins operations

---

## Slack Integration

Configure Slack notifications in Jenkins:

1. Install the **Slack Notification** plugin
2. Go to **Manage Jenkins > System > Slack**
3. Configure:
   - Workspace: Your Slack workspace
   - Credential: Add bot token or webhook URL
   - Default channel: `#deployments`

The pipeline sends notifications on:
- **Success** (prod only): Green message with build details
- **Failure** (all environments): Red message with failure info

### Customize Notifications

Edit the `post` block in Jenkinsfile:

```groovy
post {
    success {
        slackSend(
            channel: '#deployments',
            color: 'good',
            message: "Deployed to ${params.ENVIRONMENT}: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        )
    }
    failure {
        slackSend(
            channel: '#deployments',
            color: 'danger',
            message: "Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER} - ${env.BUILD_URL}"
        )
    }
}
```
