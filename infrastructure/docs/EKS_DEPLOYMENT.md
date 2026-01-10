# EKS Deployment Guide

This guide covers deploying Content Studio to Amazon EKS.

## Prerequisites

### Required Tools

```bash
# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify installations
aws --version
kubectl version --client
helm version
```

### EKS Cluster Requirements

- EKS cluster running Kubernetes 1.27+
- AWS Load Balancer Controller installed
- Metrics Server installed (for HPA)
- kubectl configured with cluster access

### Configure kubectl Access

```bash
# Update kubeconfig for your cluster
aws eks update-kubeconfig --region us-east-1 --name content-studio-dev

# Verify access
kubectl get nodes
kubectl cluster-info
```

---

## Creating ECR Repositories

Create ECR repositories for the server and web images:

```bash
# Set your AWS account ID and region
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1

# Create server repository
aws ecr create-repository \
  --repository-name content-studio-server \
  --image-scanning-configuration scanOnPush=true \
  --region $AWS_REGION

# Create web repository
aws ecr create-repository \
  --repository-name content-studio-web \
  --image-scanning-configuration scanOnPush=true \
  --region $AWS_REGION

# Set lifecycle policy to clean up old images (optional)
aws ecr put-lifecycle-policy \
  --repository-name content-studio-server \
  --lifecycle-policy-text '{"rules":[{"rulePriority":1,"description":"Keep last 20 images","selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":20},"action":{"type":"expire"}}]}'

aws ecr put-lifecycle-policy \
  --repository-name content-studio-web \
  --lifecycle-policy-text '{"rules":[{"rulePriority":1,"description":"Keep last 20 images","selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":20},"action":{"type":"expire"}}]}'
```

---

## Building and Pushing Images

### Authenticate to ECR

```bash
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

### Build Images

```bash
# From repository root
export IMAGE_TAG=$(git rev-parse --short HEAD)

# Build server image
docker build -t content-studio-server:$IMAGE_TAG -f apps/server/Dockerfile .

# Build web image (with build args for API URL)
docker build \
  --build-arg PUBLIC_SERVER_URL=https://api.dev.content-studio.example.com \
  --build-arg PUBLIC_SERVER_API_PATH=/api \
  -t content-studio-web:$IMAGE_TAG \
  -f apps/web/Dockerfile .
```

### Push Images to ECR

```bash
# Tag images for ECR
docker tag content-studio-server:$IMAGE_TAG \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/content-studio-server:$IMAGE_TAG

docker tag content-studio-web:$IMAGE_TAG \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/content-studio-web:$IMAGE_TAG

# Push images
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/content-studio-server:$IMAGE_TAG
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/content-studio-web:$IMAGE_TAG

# Optionally tag as latest
docker tag content-studio-server:$IMAGE_TAG \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/content-studio-server:dev-latest
docker tag content-studio-web:$IMAGE_TAG \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/content-studio-web:dev-latest

docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/content-studio-server:dev-latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/content-studio-web:dev-latest
```

---

## Creating Kubernetes Secrets

### Option 1: Create Secret from Literal Values

```bash
# Set environment
export NAMESPACE=content-studio-dev

# Create namespace if it doesn't exist
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Create secret
kubectl create secret generic content-studio-dev-secrets \
  --namespace=$NAMESPACE \
  --from-literal=SERVER_AUTH_SECRET='your-jwt-secret-here' \
  --from-literal=SERVER_POSTGRES_URL='postgresql://user:password@host:5432/dbname' \
  --from-literal=GEMINI_API_KEY='your-gemini-api-key' \
  --from-literal=DD_API_KEY='your-datadog-api-key' \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Option 2: Create Secret from File

Create a file `secrets.env` (DO NOT commit to git):

```bash
SERVER_AUTH_SECRET=your-jwt-secret-here
SERVER_POSTGRES_URL=postgresql://user:password@host:5432/dbname
GEMINI_API_KEY=your-gemini-api-key
DD_API_KEY=your-datadog-api-key
```

Apply the secret:

```bash
kubectl create secret generic content-studio-dev-secrets \
  --namespace=$NAMESPACE \
  --from-env-file=secrets.env \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Option 3: Using AWS Secrets Manager (Recommended for Production)

For production, use the AWS Secrets Manager CSI Driver or External Secrets Operator to sync secrets from AWS Secrets Manager.

```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets --create-namespace

# Create SecretStore (example)
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: content-studio-prod
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
EOF
```

---

## Installing the Helm Chart

### Update Helm Dependencies

```bash
cd infrastructure/helm/content-studio
helm dependency update
```

### Install for Development

```bash
export NAMESPACE=content-studio-dev
export IMAGE_TAG=abc1234  # Your image tag

helm upgrade content-studio ./infrastructure/helm/content-studio \
  --install \
  --namespace $NAMESPACE \
  --create-namespace \
  --values ./infrastructure/helm/content-studio/values-dev.yaml \
  --set server.image.repository=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/content-studio-server \
  --set server.image.tag=$IMAGE_TAG \
  --set web.image.repository=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/content-studio-web \
  --set web.image.tag=$IMAGE_TAG \
  --wait
```

### Install for Staging

```bash
export NAMESPACE=content-studio-staging
export IMAGE_TAG=abc1234

helm upgrade content-studio ./infrastructure/helm/content-studio \
  --install \
  --namespace $NAMESPACE \
  --create-namespace \
  --values ./infrastructure/helm/content-studio/values-staging.yaml \
  --set server.image.repository=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/content-studio-server \
  --set server.image.tag=$IMAGE_TAG \
  --set web.image.repository=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/content-studio-web \
  --set web.image.tag=$IMAGE_TAG \
  --atomic \
  --timeout 10m \
  --wait
```

### Install for Production

```bash
export NAMESPACE=content-studio-prod
export IMAGE_TAG=v1.0.0  # Use semantic version for production

helm upgrade content-studio ./infrastructure/helm/content-studio \
  --install \
  --namespace $NAMESPACE \
  --create-namespace \
  --values ./infrastructure/helm/content-studio/values-prod.yaml \
  --set server.image.repository=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/content-studio-server \
  --set server.image.tag=$IMAGE_TAG \
  --set web.image.repository=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/content-studio-web \
  --set web.image.tag=$IMAGE_TAG \
  --atomic \
  --timeout 10m \
  --wait
```

---

## Environment-Specific Configuration

### Values Files

| Environment | Values File | Namespace |
|-------------|-------------|-----------|
| Development | `values-dev.yaml` | `content-studio-dev` |
| Staging | `values-staging.yaml` | `content-studio-staging` |
| Production | `values-prod.yaml` | `content-studio-prod` |

### Required Configuration Per Environment

Before deploying, update these values in the environment-specific values file:

1. **Image repositories**: Replace `<AWS_ACCOUNT_ID>` and `<REGION>` placeholders
2. **ACM certificate ARN**: Set `ingress.annotations.alb.ingress.kubernetes.io/certificate-arn`
3. **Ingress hosts**: Update `ingress.hosts[].host` with your domain
4. **S3 bucket**: Set `storage.s3.bucket`
5. **Service account role**: Update `serviceAccount.annotations.eks.amazonaws.com/role-arn`
6. **External Redis URL** (prod): Set `externalRedis.url` for ElastiCache

---

## Verifying Deployment

### Check Deployment Status

```bash
# View all resources in namespace
kubectl get all -n $NAMESPACE

# Check deployment rollout status
kubectl rollout status deployment/content-studio-server -n $NAMESPACE
kubectl rollout status deployment/content-studio-worker -n $NAMESPACE
kubectl rollout status deployment/content-studio-web -n $NAMESPACE

# Check pod status
kubectl get pods -n $NAMESPACE -o wide

# View pod logs
kubectl logs -f deployment/content-studio-server -n $NAMESPACE
kubectl logs -f deployment/content-studio-worker -n $NAMESPACE
kubectl logs -f deployment/content-studio-web -n $NAMESPACE
```

### Check Ingress and ALB

```bash
# Get ingress details
kubectl get ingress -n $NAMESPACE

# Get ALB DNS name
kubectl get ingress content-studio -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

### Verify Health Endpoints

```bash
# Get the ALB hostname
ALB_HOST=$(kubectl get ingress content-studio -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Check API health
curl -s https://$ALB_HOST/api/healthcheck

# Check web health
curl -s https://$ALB_HOST/healthcheck
```

### Check HPA Status

```bash
kubectl get hpa -n $NAMESPACE
kubectl describe hpa content-studio-server-hpa -n $NAMESPACE
```

---

## Updating Deployments

### Rolling Update with New Image

```bash
export NEW_IMAGE_TAG=def5678

helm upgrade content-studio ./infrastructure/helm/content-studio \
  --namespace $NAMESPACE \
  --reuse-values \
  --set server.image.tag=$NEW_IMAGE_TAG \
  --set web.image.tag=$NEW_IMAGE_TAG \
  --wait
```

### Update Configuration Only

```bash
helm upgrade content-studio ./infrastructure/helm/content-studio \
  --namespace $NAMESPACE \
  --values ./infrastructure/helm/content-studio/values-dev.yaml \
  --reuse-values \
  --wait
```

### Rollback Deployment

```bash
# View release history
helm history content-studio -n $NAMESPACE

# Rollback to previous release
helm rollback content-studio -n $NAMESPACE

# Rollback to specific revision
helm rollback content-studio 3 -n $NAMESPACE --wait
```

### Force Pod Restart (without image change)

```bash
kubectl rollout restart deployment/content-studio-server -n $NAMESPACE
kubectl rollout restart deployment/content-studio-worker -n $NAMESPACE
kubectl rollout restart deployment/content-studio-web -n $NAMESPACE
```

---

## Troubleshooting

### Common Issues

#### Pods in Pending State

```bash
# Check pod events
kubectl describe pod <pod-name> -n $NAMESPACE

# Check node resources
kubectl describe nodes | grep -A 5 "Allocated resources"
```

#### Image Pull Errors

```bash
# Verify ECR repository exists
aws ecr describe-repositories --repository-names content-studio-server

# Check if image exists
aws ecr describe-images --repository-name content-studio-server --image-ids imageTag=$IMAGE_TAG

# Verify node can pull from ECR (check instance profile)
kubectl describe pod <pod-name> -n $NAMESPACE | grep -A 10 "Events"
```

#### ALB Not Creating

```bash
# Check AWS Load Balancer Controller logs
kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller

# Verify ingress class exists
kubectl get ingressclass

# Check ingress events
kubectl describe ingress content-studio -n $NAMESPACE
```

#### Secrets Not Found

```bash
# List secrets in namespace
kubectl get secrets -n $NAMESPACE

# Verify secret content (base64 encoded)
kubectl get secret content-studio-dev-secrets -n $NAMESPACE -o yaml
```

### Useful Debug Commands

```bash
# Execute shell in running pod
kubectl exec -it deployment/content-studio-server -n $NAMESPACE -- sh

# Port forward to test locally
kubectl port-forward svc/content-studio-server 3000:3000 -n $NAMESPACE

# View recent events
kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | tail -20

# Check resource usage
kubectl top pods -n $NAMESPACE
kubectl top nodes
```

---

## IRSA (IAM Roles for Service Accounts)

For S3 access without static credentials, configure IRSA:

### Create IAM Role

```bash
# Create trust policy
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::$AWS_ACCOUNT_ID:oidc-provider/oidc.eks.$AWS_REGION.amazonaws.com/id/EXAMPLED539D4633E53DE1B716D3041E"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.$AWS_REGION.amazonaws.com/id/EXAMPLED539D4633E53DE1B716D3041E:sub": "system:serviceaccount:content-studio-dev:content-studio"
        }
      }
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name content-studio-dev-role \
  --assume-role-policy-document file://trust-policy.json

# Attach S3 policy
aws iam attach-role-policy \
  --role-name content-studio-dev-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

The Helm chart automatically configures the service account annotation when you set:

```yaml
serviceAccount:
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::<AWS_ACCOUNT_ID>:role/content-studio-dev-role
```
