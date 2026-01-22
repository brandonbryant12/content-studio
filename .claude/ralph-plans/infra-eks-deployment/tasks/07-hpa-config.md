# Task 07: Configure Horizontal Pod Autoscaler

## Standards Checklist

Before starting implementation, read and understand:
- [ ] Kubernetes HPA documentation
- [ ] Task 04 & 05 completion

## Context

Configure Horizontal Pod Autoscalers for automatic scaling based on resource utilization. Each component has different scaling characteristics:

| Component | Primary Metric | Scale Trigger | Notes |
|-----------|---------------|---------------|-------|
| Server | CPU + Memory | High request load | Scales with API traffic |
| Worker | CPU | Job processing load | Scales with queue depth |
| Web | CPU | Static file requests | Lightweight, scales easily |

## Key Files

- `infrastructure/helm/content-studio/templates/hpa-server.yaml`
- `infrastructure/helm/content-studio/templates/hpa-worker.yaml`
- `infrastructure/helm/content-studio/templates/hpa-web.yaml`

## Implementation Steps

### 7.1 Create Server HPA Template

Create `infrastructure/helm/content-studio/templates/hpa-server.yaml`:

```yaml
{{- if .Values.server.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "content-studio.fullname" . }}-server
  labels:
    {{- include "content-studio.labels" . | nindent 4 }}
    app.kubernetes.io/component: server
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "content-studio.fullname" . }}-server
  minReplicas: {{ .Values.server.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.server.autoscaling.maxReplicas }}
  metrics:
    {{- if .Values.server.autoscaling.targetCPUUtilizationPercentage }}
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.server.autoscaling.targetCPUUtilizationPercentage }}
    {{- end }}
    {{- if .Values.server.autoscaling.targetMemoryUtilizationPercentage }}
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: {{ .Values.server.autoscaling.targetMemoryUtilizationPercentage }}
    {{- end }}
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
        - type: Pods
          value: 1
          periodSeconds: 60
      selectPolicy: Min
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
      selectPolicy: Max
{{- end }}
```

### 7.2 Create Worker HPA Template

Create `infrastructure/helm/content-studio/templates/hpa-worker.yaml`:

```yaml
{{- if .Values.worker.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "content-studio.fullname" . }}-worker
  labels:
    {{- include "content-studio.labels" . | nindent 4 }}
    app.kubernetes.io/component: worker
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "content-studio.fullname" . }}-worker
  minReplicas: {{ .Values.worker.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.worker.autoscaling.maxReplicas }}
  metrics:
    {{- if .Values.worker.autoscaling.targetCPUUtilizationPercentage }}
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.worker.autoscaling.targetCPUUtilizationPercentage }}
    {{- end }}
    {{- if .Values.worker.autoscaling.targetMemoryUtilizationPercentage }}
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: {{ .Values.worker.autoscaling.targetMemoryUtilizationPercentage }}
    {{- end }}
  behavior:
    # Workers can scale down more aggressively since jobs are stateless
    scaleDown:
      stabilizationWindowSeconds: 180
      policies:
        - type: Percent
          value: 25
          periodSeconds: 60
      selectPolicy: Max
    # Scale up quickly when jobs pile up
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 200
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
      selectPolicy: Max
{{- end }}
```

### 7.3 Create Web HPA Template

Create `infrastructure/helm/content-studio/templates/hpa-web.yaml`:

```yaml
{{- if .Values.web.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "content-studio.fullname" . }}-web
  labels:
    {{- include "content-studio.labels" . | nindent 4 }}
    app.kubernetes.io/component: web
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "content-studio.fullname" . }}-web
  minReplicas: {{ .Values.web.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.web.autoscaling.maxReplicas }}
  metrics:
    {{- if .Values.web.autoscaling.targetCPUUtilizationPercentage }}
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.web.autoscaling.targetCPUUtilizationPercentage }}
    {{- end }}
  behavior:
    # Frontend is stateless, can scale aggressively
    scaleDown:
      stabilizationWindowSeconds: 120
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
      selectPolicy: Max
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
      selectPolicy: Max
{{- end }}
```

### 7.4 Ensure Resource Requests Are Set

HPA requires resource requests to calculate utilization. Verify in deployments:

```yaml
# In server-deployment.yaml, worker-deployment.yaml, web-deployment.yaml
resources:
  requests:
    cpu: 250m      # REQUIRED for CPU-based HPA
    memory: 512Mi  # REQUIRED for memory-based HPA
  limits:
    cpu: 1000m
    memory: 1Gi
```

### 7.5 Document HPA Behavior

Add to documentation:

```markdown
## Autoscaling Behavior

### Server Pods
- **Scale Up**: Fast (within 15 seconds) when CPU > 70% or Memory > 80%
- **Scale Down**: Slow (5 minute stabilization) to prevent flapping
- **Min/Max**: Configurable per environment (prod: 3-20)

### Worker Pods
- **Scale Up**: Very fast when CPU high (job backlog)
- **Scale Down**: Moderate (3 minute stabilization)
- **Min/Max**: prod: 3-10

### Web Pods
- **Scale Up**: Fast for traffic spikes
- **Scale Down**: Aggressive (stateless nginx)
- **Min/Max**: prod: 3-20

### Monitoring HPA

```bash
# View HPA status
kubectl get hpa -n content-studio-prod

# Detailed HPA info
kubectl describe hpa content-studio-server -n content-studio-prod

# Watch scaling events
kubectl get events -n content-studio-prod --field-selector reason=SuccessfulRescale
```

### Tuning HPA

If you see oscillation (rapid scale up/down):
1. Increase `stabilizationWindowSeconds`
2. Reduce `targetCPUUtilizationPercentage`
3. Add memory metric for multi-metric scaling

If scaling is too slow:
1. Decrease `stabilizationWindowSeconds`
2. Increase `scaleUp.policies` percentages
```

### 7.6 Prerequisites: Metrics Server

Ensure metrics-server is installed for HPA to work:

```bash
# Check if metrics-server is running
kubectl get deployment metrics-server -n kube-system

# If not installed (EKS usually has it, but verify)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify metrics are available
kubectl top pods -n content-studio-prod
```

## Verification Log

<!-- Agent writes verification results here -->
