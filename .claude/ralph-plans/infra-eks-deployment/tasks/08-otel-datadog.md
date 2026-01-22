# Task 08: Add OpenTelemetry Datadog Integration

## Standards Checklist

Before starting implementation, read and understand:
- [ ] OpenTelemetry SDK documentation
- [ ] Datadog OTLP ingestion documentation
- [ ] Existing OTEL setup in codebase (packages use @opentelemetry/*)

## Context

The codebase already uses OpenTelemetry for instrumentation. We need to:
1. Configure OTEL exporters to send to Datadog agent
2. Deploy Datadog agent as DaemonSet in the cluster
3. Set up proper service naming and environment tags

Current OTEL dependencies in the codebase:
- `@opentelemetry/api`
- `@opentelemetry/sdk-trace-base`
- `@opentelemetry/sdk-trace-node`
- `@opentelemetry/resources`
- `@opentelemetry/semantic-conventions`

## Key Files

- `infrastructure/helm/content-studio/templates/datadog-agent.yaml` - DaemonSet
- `apps/server/src/telemetry/` - OTEL configuration (may need updates)
- `infrastructure/docs/OBSERVABILITY.md` - Documentation

## Implementation Steps

### 8.1 Create Datadog Agent DaemonSet

Create `infrastructure/helm/content-studio/templates/datadog-agent.yaml`:

```yaml
{{- if .Values.observability.datadog.enabled }}
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: {{ include "content-studio.fullname" . }}-datadog-agent
  labels:
    {{- include "content-studio.labels" . | nindent 4 }}
    app.kubernetes.io/component: datadog-agent
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: datadog-agent
      app.kubernetes.io/instance: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app.kubernetes.io/name: datadog-agent
        app.kubernetes.io/instance: {{ .Release.Name }}
    spec:
      serviceAccountName: {{ include "content-studio.fullname" . }}-datadog
      containers:
        - name: agent
          image: {{ .Values.observability.datadog.image }}
          imagePullPolicy: IfNotPresent
          ports:
            # OTLP gRPC
            - containerPort: 4317
              hostPort: 4317
              protocol: TCP
              name: otlp-grpc
            # OTLP HTTP
            - containerPort: 4318
              hostPort: 4318
              protocol: TCP
              name: otlp-http
            # Datadog APM
            - containerPort: 8126
              hostPort: 8126
              protocol: TCP
              name: apm
            # StatsD
            - containerPort: 8125
              hostPort: 8125
              protocol: UDP
              name: statsd
          env:
            - name: DD_API_KEY
              valueFrom:
                secretKeyRef:
                  name: {{ .Values.secrets.existingSecret | default (printf "%s-secrets" (include "content-studio.fullname" .)) }}
                  key: DD_API_KEY
            - name: DD_SITE
              value: {{ .Values.observability.datadog.site | default "datadoghq.com" }}
            - name: DD_ENV
              value: {{ .Values.environment }}
            - name: DD_KUBERNETES_KUBELET_NODENAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            # Enable APM
            - name: DD_APM_ENABLED
              value: {{ .Values.observability.datadog.apmEnabled | quote }}
            - name: DD_APM_NON_LOCAL_TRAFFIC
              value: "true"
            # Enable OTLP ingestion
            - name: DD_OTLP_CONFIG_RECEIVER_PROTOCOLS_GRPC_ENDPOINT
              value: "0.0.0.0:4317"
            - name: DD_OTLP_CONFIG_RECEIVER_PROTOCOLS_HTTP_ENDPOINT
              value: "0.0.0.0:4318"
            # Enable logs
            - name: DD_LOGS_ENABLED
              value: {{ .Values.observability.datadog.logsEnabled | quote }}
            - name: DD_LOGS_CONFIG_CONTAINER_COLLECT_ALL
              value: "true"
            # Kubernetes integration
            - name: DD_KUBERNETES_POD_LABELS_AS_TAGS
              value: '{"app.kubernetes.io/component": "component"}'
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          volumeMounts:
            - name: dockersocket
              mountPath: /var/run/docker.sock
              readOnly: true
            - name: procdir
              mountPath: /host/proc
              readOnly: true
            - name: cgroups
              mountPath: /host/sys/fs/cgroup
              readOnly: true
      volumes:
        - name: dockersocket
          hostPath:
            path: /var/run/docker.sock
        - name: procdir
          hostPath:
            path: /proc
        - name: cgroups
          hostPath:
            path: /sys/fs/cgroup
---
# Service Account for Datadog Agent
apiVersion: v1
kind: ServiceAccount
metadata:
  name: {{ include "content-studio.fullname" . }}-datadog
  labels:
    {{- include "content-studio.labels" . | nindent 4 }}
---
# ClusterRole for Datadog Agent
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: {{ include "content-studio.fullname" . }}-datadog
rules:
  - apiGroups: [""]
    resources:
      - nodes
      - nodes/metrics
      - nodes/spec
      - nodes/proxy
      - pods
      - services
      - endpoints
      - events
      - configmaps
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources:
      - deployments
      - replicasets
      - daemonsets
      - statefulsets
    verbs: ["get", "list", "watch"]
  - nonResourceURLs:
      - /metrics
      - /healthz
    verbs: ["get"]
---
# ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: {{ include "content-studio.fullname" . }}-datadog
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: {{ include "content-studio.fullname" . }}-datadog
subjects:
  - kind: ServiceAccount
    name: {{ include "content-studio.fullname" . }}-datadog
    namespace: {{ .Release.Namespace }}
{{- end }}
```

### 8.2 Create Datadog Agent Service

Add to the same file or create separate:

```yaml
{{- if .Values.observability.datadog.enabled }}
---
# Service to expose Datadog agent to pods
apiVersion: v1
kind: Service
metadata:
  name: datadog-agent
  labels:
    {{- include "content-studio.labels" . | nindent 4 }}
spec:
  selector:
    app.kubernetes.io/name: datadog-agent
    app.kubernetes.io/instance: {{ .Release.Name }}
  ports:
    - name: otlp-grpc
      port: 4317
      targetPort: 4317
      protocol: TCP
    - name: otlp-http
      port: 4318
      targetPort: 4318
      protocol: TCP
    - name: apm
      port: 8126
      targetPort: 8126
      protocol: TCP
  clusterIP: None  # Headless service - pods connect to local agent
{{- end }}
```

### 8.3 Update Application OTEL Configuration

If not already configured, add/update OTEL setup in `apps/server/src/telemetry/`:

```typescript
// apps/server/src/telemetry/setup.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';

export const initTelemetry = () => {
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

  const sdk = new NodeSDK({
    resource: new Resource({
      [SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'content-studio',
      [SEMRESATTRS_SERVICE_VERSION]: process.env.DD_VERSION || '1.0.0',
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.DD_ENV || 'development',
    }),
    traceExporter: new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
    }),
    // Uncomment if using metrics
    // metricReader: new PeriodicExportingMetricReader({
    //   exporter: new OTLPMetricExporter({
    //     url: `${otlpEndpoint}/v1/metrics`,
    //   }),
    // }),
  });

  sdk.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown().then(() => console.log('OTEL SDK shut down'));
  });
};
```

### 8.4 Update ConfigMap with OTEL Environment Variables

Already in configmap.yaml from Task 04:

```yaml
# OpenTelemetry
OTEL_SERVICE_NAME: "content-studio"
OTEL_EXPORTER_OTLP_ENDPOINT: {{ .Values.observability.otlpEndpoint | quote }}
DD_ENV: {{ .Values.environment | quote }}
DD_SERVICE: "content-studio"
DD_VERSION: {{ .Chart.AppVersion | quote }}
```

### 8.5 Update Values for Datadog

Already in values.yaml:

```yaml
observability:
  # OTLP endpoint - points to local Datadog agent
  otlpEndpoint: "http://datadog-agent:4318"

  datadog:
    enabled: true
    image: gcr.io/datadoghq/agent:latest
    site: datadoghq.com  # or datadoghq.eu, etc.
    apmEnabled: true
    logsEnabled: true
```

### 8.6 Document Datadog Setup

Create `infrastructure/docs/OBSERVABILITY.md`:

```markdown
# Observability Setup

Content Studio uses OpenTelemetry for instrumentation, with Datadog as the observability backend.

## Architecture

```
┌─────────────────┐     OTLP      ┌─────────────────┐     API      ┌─────────────┐
│  Application    │──────────────►│  Datadog Agent  │─────────────►│   Datadog   │
│  (OTEL SDK)     │    :4318      │   (DaemonSet)   │              │   Cloud     │
└─────────────────┘               └─────────────────┘              └─────────────┘
```

## Setup Requirements

1. **Datadog API Key**: Obtain from Datadog console → Organization Settings → API Keys
2. **Add to Kubernetes Secret**:
   ```bash
   kubectl create secret generic content-studio-secrets \
     --from-literal=DD_API_KEY=your-api-key \
     -n content-studio-prod
   ```

## Traces

All HTTP requests are automatically traced. Custom spans can be added:

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('content-studio');

const span = tracer.startSpan('custom-operation');
try {
  // ... your code
} finally {
  span.end();
}
```

## Metrics

Custom metrics can be sent via OTEL SDK or Datadog StatsD:

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('content-studio');
const counter = meter.createCounter('jobs.processed');
counter.add(1, { type: 'podcast' });
```

## Logs

Logs are collected automatically from stdout/stderr. Structured logging recommended:

```typescript
console.log(JSON.stringify({
  level: 'info',
  message: 'Job completed',
  jobId: '123',
  duration: 5000,
}));
```

## Datadog Dashboards

After deployment, create dashboards for:
- Request latency (p50, p95, p99)
- Error rates
- Job processing times
- Pod resource utilization
- Queue depth

## Troubleshooting

### No traces appearing
1. Verify Datadog agent is running: `kubectl get pods -l app.kubernetes.io/name=datadog-agent`
2. Check agent logs: `kubectl logs -l app.kubernetes.io/name=datadog-agent`
3. Verify OTEL endpoint in app: `OTEL_EXPORTER_OTLP_ENDPOINT`

### High latency in traces
1. Check network between app and agent
2. Verify agent has sufficient resources
3. Consider sampling for high-volume services
```

## Verification Log

<!-- Agent writes verification results here -->
