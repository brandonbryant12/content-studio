# Task 04: Create Helm Chart Structure

## Standards Checklist

Before starting implementation, read and understand:
- [ ] Helm best practices: https://helm.sh/docs/chart_best_practices/

## Context

Create a Helm chart for deploying Content Studio to Kubernetes. The chart should support:
- Server deployment (API)
- Worker deployment (job processing)
- Web deployment (frontend static files)
- Redis subchart for SSE scaling
- Configurable ingress, HPA, and secrets

## Key Files

- `infrastructure/helm/content-studio/Chart.yaml` - Chart metadata
- `infrastructure/helm/content-studio/values.yaml` - Default values
- `infrastructure/helm/content-studio/templates/` - Kubernetes manifests
- `infrastructure/helm/content-studio/templates/_helpers.tpl` - Template helpers

## Implementation Steps

### 4.1 Create Chart.yaml

Create `infrastructure/helm/content-studio/Chart.yaml`:

```yaml
apiVersion: v2
name: content-studio
description: A Helm chart for Content Studio - AI-powered podcast generation platform
type: application
version: 0.1.0
appVersion: "1.0.0"

keywords:
  - content-studio
  - podcast
  - ai

maintainers:
  - name: Content Studio Team

dependencies:
  - name: redis
    version: "18.x.x"
    repository: "https://charts.bitnami.com/bitnami"
    condition: redis.enabled
```

### 4.2 Create Template Helpers

Create `infrastructure/helm/content-studio/templates/_helpers.tpl`:

```yaml
{{/*
Expand the name of the chart.
*/}}
{{- define "content-studio.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "content-studio.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "content-studio.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "content-studio.labels" -}}
helm.sh/chart: {{ include "content-studio.chart" . }}
{{ include "content-studio.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "content-studio.selectorLabels" -}}
app.kubernetes.io/name: {{ include "content-studio.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Server selector labels
*/}}
{{- define "content-studio.server.selectorLabels" -}}
{{ include "content-studio.selectorLabels" . }}
app.kubernetes.io/component: server
{{- end }}

{{/*
Worker selector labels
*/}}
{{- define "content-studio.worker.selectorLabels" -}}
{{ include "content-studio.selectorLabels" . }}
app.kubernetes.io/component: worker
{{- end }}

{{/*
Web selector labels
*/}}
{{- define "content-studio.web.selectorLabels" -}}
{{ include "content-studio.selectorLabels" . }}
app.kubernetes.io/component: web
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "content-studio.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "content-studio.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Redis URL helper
*/}}
{{- define "content-studio.redisUrl" -}}
{{- if .Values.redis.enabled }}
{{- printf "redis://%s-redis-master:6379" .Release.Name }}
{{- else }}
{{- .Values.externalRedis.url }}
{{- end }}
{{- end }}
```

### 4.3 Create Namespace Template

Create `infrastructure/helm/content-studio/templates/namespace.yaml`:

```yaml
{{- if .Values.namespace.create }}
apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Values.namespace.name | default (printf "%s-%s" (include "content-studio.fullname" .) .Values.environment) }}
  labels:
    {{- include "content-studio.labels" . | nindent 4 }}
    environment: {{ .Values.environment }}
{{- end }}
```

### 4.4 Create ConfigMap Template

Create `infrastructure/helm/content-studio/templates/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "content-studio.fullname" . }}-config
  labels:
    {{- include "content-studio.labels" . | nindent 4 }}
data:
  SERVER_HOST: "0.0.0.0"
  SERVER_PORT: {{ .Values.server.port | quote }}
  PUBLIC_SERVER_URL: {{ .Values.publicServerUrl | quote }}
  PUBLIC_SERVER_API_PATH: {{ .Values.publicServerApiPath | default "/api" | quote }}
  PUBLIC_WEB_URL: {{ .Values.publicWebUrl | quote }}
  STORAGE_PROVIDER: {{ .Values.storage.provider | default "s3" | quote }}
  {{- if eq .Values.storage.provider "s3" }}
  S3_BUCKET: {{ .Values.storage.s3.bucket | quote }}
  S3_REGION: {{ .Values.storage.s3.region | quote }}
  {{- if .Values.storage.s3.endpoint }}
  S3_ENDPOINT: {{ .Values.storage.s3.endpoint | quote }}
  {{- end }}
  {{- end }}
  SSE_ADAPTER: {{ .Values.sse.adapter | default "redis" | quote }}
  USE_MOCK_AI: {{ .Values.useMockAI | default "false" | quote }}
  # OpenTelemetry
  OTEL_SERVICE_NAME: "content-studio"
  OTEL_EXPORTER_OTLP_ENDPOINT: {{ .Values.observability.otlpEndpoint | quote }}
  DD_ENV: {{ .Values.environment | quote }}
  DD_SERVICE: "content-studio"
  DD_VERSION: {{ .Chart.AppVersion | quote }}
```

### 4.5 Create Secrets Template

Create `infrastructure/helm/content-studio/templates/secrets.yaml`:

```yaml
{{- if .Values.secrets.create }}
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "content-studio.fullname" . }}-secrets
  labels:
    {{- include "content-studio.labels" . | nindent 4 }}
type: Opaque
stringData:
  SERVER_AUTH_SECRET: {{ .Values.secrets.authSecret | quote }}
  SERVER_POSTGRES_URL: {{ .Values.secrets.postgresUrl | quote }}
  GEMINI_API_KEY: {{ .Values.secrets.geminiApiKey | quote }}
  {{- if eq .Values.storage.provider "s3" }}
  S3_ACCESS_KEY_ID: {{ .Values.secrets.s3AccessKeyId | quote }}
  S3_SECRET_ACCESS_KEY: {{ .Values.secrets.s3SecretAccessKey | quote }}
  {{- end }}
  {{- if .Values.observability.datadog.enabled }}
  DD_API_KEY: {{ .Values.secrets.datadogApiKey | quote }}
  {{- end }}
{{- end }}
```

### 4.6 Create Server Deployment Template

Create `infrastructure/helm/content-studio/templates/server-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "content-studio.fullname" . }}-server
  labels:
    {{- include "content-studio.labels" . | nindent 4 }}
    app.kubernetes.io/component: server
spec:
  replicas: {{ .Values.server.replicas }}
  selector:
    matchLabels:
      {{- include "content-studio.server.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "content-studio.server.selectorLabels" . | nindent 8 }}
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
        checksum/secret: {{ include (print $.Template.BasePath "/secrets.yaml") . | sha256sum }}
    spec:
      serviceAccountName: {{ include "content-studio.serviceAccountName" . }}
      containers:
        - name: server
          image: "{{ .Values.server.image.repository }}:{{ .Values.server.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.server.image.pullPolicy }}
          args: ["--mode=server"]
          ports:
            - name: http
              containerPort: {{ .Values.server.port }}
              protocol: TCP
          envFrom:
            - configMapRef:
                name: {{ include "content-studio.fullname" . }}-config
            - secretRef:
                name: {{ .Values.secrets.existingSecret | default (printf "%s-secrets" (include "content-studio.fullname" .)) }}
          env:
            - name: REDIS_URL
              value: {{ include "content-studio.redisUrl" . }}
          livenessProbe:
            httpGet:
              path: /healthcheck
              port: http
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /healthcheck
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            {{- toYaml .Values.server.resources | nindent 12 }}
      {{- with .Values.server.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
```

### 4.7 Create Server Service Template

Create `infrastructure/helm/content-studio/templates/server-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ include "content-studio.fullname" . }}-server
  labels:
    {{- include "content-studio.labels" . | nindent 4 }}
    app.kubernetes.io/component: server
spec:
  type: {{ .Values.server.service.type }}
  ports:
    - port: {{ .Values.server.service.port }}
      targetPort: http
      protocol: TCP
      name: http
  selector:
    {{- include "content-studio.server.selectorLabels" . | nindent 4 }}
```

### 4.8 Create Worker Deployment Template

Create `infrastructure/helm/content-studio/templates/worker-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "content-studio.fullname" . }}-worker
  labels:
    {{- include "content-studio.labels" . | nindent 4 }}
    app.kubernetes.io/component: worker
spec:
  replicas: {{ .Values.worker.replicas }}
  selector:
    matchLabels:
      {{- include "content-studio.worker.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "content-studio.worker.selectorLabels" . | nindent 8 }}
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
        checksum/secret: {{ include (print $.Template.BasePath "/secrets.yaml") . | sha256sum }}
    spec:
      serviceAccountName: {{ include "content-studio.serviceAccountName" . }}
      containers:
        - name: worker
          image: "{{ .Values.server.image.repository }}:{{ .Values.server.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.server.image.pullPolicy }}
          args: ["--mode=worker"]
          envFrom:
            - configMapRef:
                name: {{ include "content-studio.fullname" . }}-config
            - secretRef:
                name: {{ .Values.secrets.existingSecret | default (printf "%s-secrets" (include "content-studio.fullname" .)) }}
          env:
            - name: REDIS_URL
              value: {{ include "content-studio.redisUrl" . }}
          livenessProbe:
            exec:
              command:
                - sh
                - -c
                - test -f /tmp/worker-health && [ $(($(date +%s) - $(cat /tmp/worker-health))) -lt 60 ]
            initialDelaySeconds: 10
            periodSeconds: 30
          resources:
            {{- toYaml .Values.worker.resources | nindent 12 }}
      {{- with .Values.worker.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
```

### 4.9 Create Web Deployment Template

Create `infrastructure/helm/content-studio/templates/web-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "content-studio.fullname" . }}-web
  labels:
    {{- include "content-studio.labels" . | nindent 4 }}
    app.kubernetes.io/component: web
spec:
  replicas: {{ .Values.web.replicas }}
  selector:
    matchLabels:
      {{- include "content-studio.web.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "content-studio.web.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: web
          image: "{{ .Values.web.image.repository }}:{{ .Values.web.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.web.image.pullPolicy }}
          ports:
            - name: http
              containerPort: 80
              protocol: TCP
          livenessProbe:
            httpGet:
              path: /healthcheck
              port: http
            initialDelaySeconds: 5
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /healthcheck
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            {{- toYaml .Values.web.resources | nindent 12 }}
```

### 4.10 Create Web Service Template

Create `infrastructure/helm/content-studio/templates/web-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ include "content-studio.fullname" . }}-web
  labels:
    {{- include "content-studio.labels" . | nindent 4 }}
    app.kubernetes.io/component: web
spec:
  type: {{ .Values.web.service.type }}
  ports:
    - port: {{ .Values.web.service.port }}
      targetPort: http
      protocol: TCP
      name: http
  selector:
    {{- include "content-studio.web.selectorLabels" . | nindent 4 }}
```

### 4.11 Validate Chart

```bash
# Lint the chart
helm lint infrastructure/helm/content-studio

# Template with default values
helm template content-studio infrastructure/helm/content-studio

# Template with specific values file
helm template content-studio infrastructure/helm/content-studio -f infrastructure/helm/content-studio/values-dev.yaml
```

## Verification Log

<!-- Agent writes verification results here -->
