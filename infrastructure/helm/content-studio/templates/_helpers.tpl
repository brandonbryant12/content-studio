{{/*
Expand the name of the chart.
*/}}
{{- define "content-studio.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
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
Returns the Redis URL, either from the subchart or external configuration
*/}}
{{- define "content-studio.redisUrl" -}}
{{- if .Values.redis.enabled }}
{{- printf "redis://%s-redis-master:6379" .Release.Name }}
{{- else }}
{{- .Values.externalRedis.url }}
{{- end }}
{{- end }}

{{/*
Server image name
*/}}
{{- define "content-studio.server.image" -}}
{{- printf "%s:%s" .Values.server.image.repository (.Values.server.image.tag | default .Chart.AppVersion) }}
{{- end }}

{{/*
Worker image name - defaults to server image
*/}}
{{- define "content-studio.worker.image" -}}
{{- $repo := .Values.worker.image.repository | default .Values.server.image.repository }}
{{- $tag := .Values.worker.image.tag | default .Values.server.image.tag | default .Chart.AppVersion }}
{{- printf "%s:%s" $repo $tag }}
{{- end }}

{{/*
Web image name
*/}}
{{- define "content-studio.web.image" -}}
{{- printf "%s:%s" .Values.web.image.repository (.Values.web.image.tag | default .Chart.AppVersion) }}
{{- end }}

{{/*
Secret name helper
*/}}
{{- define "content-studio.secretName" -}}
{{- .Values.secrets.existingSecret | default (printf "%s-secrets" (include "content-studio.fullname" .)) }}
{{- end }}
