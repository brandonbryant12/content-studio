# Task 06: Configure AWS ALB Ingress

## Standards Checklist

Before starting implementation, read and understand:
- [ ] AWS ALB Ingress Controller documentation
- [ ] Task 04 & 05 completion (chart and values must exist)

## Context

Configure AWS Application Load Balancer ingress for EKS deployment. The ALB Ingress Controller creates and manages ALBs based on Kubernetes Ingress resources.

Key requirements:
- HTTPS termination at ALB level (using ACM certificates)
- Proper routing for frontend (/) and backend (/api)
- Health checks for ALB target groups
- Sticky sessions for SSE connections (backup for Redis)
- HTTP to HTTPS redirect

## Key Files

- `infrastructure/helm/content-studio/templates/ingress.yaml` - Ingress template
- `infrastructure/docs/EKS_DEPLOYMENT.md` - Documentation on ALB setup

## Implementation Steps

### 6.1 Create Ingress Template

Create `infrastructure/helm/content-studio/templates/ingress.yaml`:

```yaml
{{- if .Values.ingress.enabled -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "content-studio.fullname" . }}
  labels:
    {{- include "content-studio.labels" . | nindent 4 }}
  annotations:
    {{- with .Values.ingress.annotations }}
    {{- toYaml . | nindent 4 }}
    {{- end }}
spec:
  ingressClassName: {{ .Values.ingress.className }}
  {{- if .Values.ingress.tls }}
  tls:
    {{- range .Values.ingress.tls }}
    - hosts:
        {{- range .hosts }}
        - {{ . | quote }}
        {{- end }}
      secretName: {{ .secretName }}
    {{- end }}
  {{- end }}
  rules:
    - host: {{ .Values.ingress.host | quote }}
      http:
        paths:
          # API routes go to server
          - path: {{ .Values.publicServerApiPath }}
            pathType: Prefix
            backend:
              service:
                name: {{ include "content-studio.fullname" . }}-server
                port:
                  number: {{ .Values.server.service.port }}
          # SSE events endpoint
          - path: {{ .Values.publicServerApiPath }}/events
            pathType: Exact
            backend:
              service:
                name: {{ include "content-studio.fullname" . }}-server
                port:
                  number: {{ .Values.server.service.port }}
          # Auth routes
          - path: {{ .Values.publicServerApiPath }}/auth
            pathType: Prefix
            backend:
              service:
                name: {{ include "content-studio.fullname" . }}-server
                port:
                  number: {{ .Values.server.service.port }}
          # Health check for server
          - path: /healthcheck
            pathType: Exact
            backend:
              service:
                name: {{ include "content-studio.fullname" . }}-server
                port:
                  number: {{ .Values.server.service.port }}
          # Storage routes (if using filesystem provider)
          - path: /storage
            pathType: Prefix
            backend:
              service:
                name: {{ include "content-studio.fullname" . }}-server
                port:
                  number: {{ .Values.server.service.port }}
          # All other routes go to frontend
          - path: /
            pathType: Prefix
            backend:
              service:
                name: {{ include "content-studio.fullname" . }}-web
                port:
                  number: {{ .Values.web.service.port }}
{{- end }}
```

### 6.2 Update Values with ALB Annotations

The ALB annotations are already in the base values.yaml. Key annotations explained:

```yaml
ingress:
  annotations:
    # Use ALB Ingress Controller
    kubernetes.io/ingress.class: alb

    # Internet-facing (public) or internal
    alb.ingress.kubernetes.io/scheme: internet-facing

    # Target type: ip (for VPC CNI) or instance
    alb.ingress.kubernetes.io/target-type: ip

    # ACM certificate for HTTPS (REQUIRED - replace with your cert ARN)
    alb.ingress.kubernetes.io/certificate-arn: "arn:aws:acm:REGION:ACCOUNT:certificate/CERT-ID"

    # Listen on both HTTP and HTTPS
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'

    # Redirect HTTP to HTTPS
    alb.ingress.kubernetes.io/ssl-redirect: "443"

    # Health check configuration
    alb.ingress.kubernetes.io/healthcheck-path: /healthcheck
    alb.ingress.kubernetes.io/healthcheck-interval-seconds: "30"
    alb.ingress.kubernetes.io/healthcheck-timeout-seconds: "5"
    alb.ingress.kubernetes.io/healthy-threshold-count: "2"
    alb.ingress.kubernetes.io/unhealthy-threshold-count: "3"

    # Sticky sessions for SSE (cookie-based)
    alb.ingress.kubernetes.io/target-group-attributes: stickiness.enabled=true,stickiness.lb_cookie.duration_seconds=86400

    # Connection idle timeout (important for SSE)
    alb.ingress.kubernetes.io/load-balancer-attributes: idle_timeout.timeout_seconds=3600

    # WAF integration (optional)
    # alb.ingress.kubernetes.io/wafv2-acl-arn: "arn:aws:wafv2:..."

    # Access logs (optional)
    # alb.ingress.kubernetes.io/load-balancer-attributes: access_logs.s3.enabled=true,access_logs.s3.bucket=my-logs-bucket
```

### 6.3 Document ALB Ingress Controller Prerequisites

Add to `infrastructure/docs/EKS_DEPLOYMENT.md`:

```markdown
## Prerequisites: AWS Load Balancer Controller

Before deploying Content Studio, ensure the AWS Load Balancer Controller is installed in your EKS cluster.

### 1. Create IAM Policy

Download the IAM policy:
```bash
curl -o iam-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam_policy.json
```

Create the policy:
```bash
aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam-policy.json
```

### 2. Create IAM Service Account

```bash
eksctl create iamserviceaccount \
  --cluster=your-cluster-name \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::ACCOUNT:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve
```

### 3. Install the Controller

```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=your-cluster-name \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

### 4. Verify Installation

```bash
kubectl get deployment -n kube-system aws-load-balancer-controller
```

### 5. Create ACM Certificate

Request a certificate in AWS Certificate Manager for your domain:

```bash
aws acm request-certificate \
  --domain-name content-studio.example.com \
  --subject-alternative-names "*.content-studio.example.com" \
  --validation-method DNS
```

Complete DNS validation, then note the certificate ARN for the Helm values.
```

### 6.4 Add SSE-Specific Configuration

For Server-Sent Events, the connection must stay open. Add annotation for extended timeout:

```yaml
# In values for SSE support
ingress:
  annotations:
    # Extended idle timeout for SSE (default is 60s, we need longer)
    alb.ingress.kubernetes.io/load-balancer-attributes: idle_timeout.timeout_seconds=3600

    # Target group deregistration delay (graceful shutdown)
    alb.ingress.kubernetes.io/target-group-attributes: >-
      stickiness.enabled=true,
      stickiness.lb_cookie.duration_seconds=86400,
      deregistration_delay.timeout_seconds=30
```

### 6.5 Test Ingress Configuration

```bash
# Deploy and check ingress status
kubectl get ingress -n content-studio-dev

# Check ALB creation
aws elbv2 describe-load-balancers --names content-studio-dev

# Test endpoints
curl -I https://dev.content-studio.example.com/healthcheck
curl -I https://dev.content-studio.example.com/api/healthcheck
```

## Troubleshooting

Common issues:

1. **ALB not created**: Check controller logs
   ```bash
   kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller
   ```

2. **SSL certificate error**: Verify ACM certificate ARN and that it's validated

3. **404 errors**: Check path routing and service names

4. **SSE disconnects**: Increase idle timeout and verify sticky sessions

## Verification Log

<!-- Agent writes verification results here -->
