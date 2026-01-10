# Content Studio EKS Troubleshooting Guide

This guide covers common issues and their solutions when operating Content Studio on EKS.

---

## 1. Common Deployment Issues

### Pod Not Starting - ImagePullBackOff

**Symptoms:**
```bash
kubectl get pods -n content-studio
# NAME                          READY   STATUS             RESTARTS   AGE
# api-7b9f8c6d5-x2k4j           0/1     ImagePullBackOff   0          5m
```

**Diagnosis:**
```bash
# Check pod events
kubectl describe pod <pod-name> -n content-studio | grep -A 10 "Events:"

# Check if the image exists in ECR
aws ecr describe-images --repository-name content-studio-api --image-ids imageTag=<tag>
```

**Common Causes & Solutions:**

1. **Image tag doesn't exist:**
   ```bash
   # List available tags
   aws ecr list-images --repository-name content-studio-api --query 'imageIds[*].imageTag'

   # Update deployment with correct tag
   kubectl set image deployment/api api=<account>.dkr.ecr.<region>.amazonaws.com/content-studio-api:<correct-tag> -n content-studio
   ```

2. **ECR authentication expired:**
   ```bash
   # Refresh ECR credentials
   aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com

   # If using imagePullSecrets, recreate the secret
   kubectl delete secret ecr-registry -n content-studio
   kubectl create secret docker-registry ecr-registry \
     --docker-server=<account>.dkr.ecr.<region>.amazonaws.com \
     --docker-username=AWS \
     --docker-password=$(aws ecr get-login-password --region <region>) \
     -n content-studio
   ```

3. **Node doesn't have ECR access (IRSA issue):**
   ```bash
   # Verify the node IAM role has ECR pull permissions
   kubectl describe node <node-name> | grep "ProviderID"
   # Check the instance role in AWS console for ecr:GetAuthorizationToken and ecr:BatchGetImage permissions
   ```

---

### Pod Not Starting - CrashLoopBackOff

**Symptoms:**
```bash
kubectl get pods -n content-studio
# NAME                          READY   STATUS             RESTARTS   AGE
# api-7b9f8c6d5-x2k4j           0/1     CrashLoopBackOff   5          10m
```

**Diagnosis:**
```bash
# Check current logs
kubectl logs <pod-name> -n content-studio

# Check previous container logs (if restarted)
kubectl logs <pod-name> -n content-studio --previous

# Check pod events
kubectl describe pod <pod-name> -n content-studio
```

**Common Causes & Solutions:**

1. **Missing environment variables:**
   ```bash
   # Check what env vars are set
   kubectl exec <pod-name> -n content-studio -- env | sort

   # Verify ConfigMap exists
   kubectl get configmap -n content-studio

   # Verify Secrets exist
   kubectl get secrets -n content-studio
   ```

2. **Database connection failure on startup:**
   ```bash
   # Test database connectivity from a debug pod
   kubectl run pg-test --rm -it --image=postgres:15 -n content-studio -- \
     psql "postgresql://<user>:<password>@<host>:5432/<database>" -c "SELECT 1"
   ```

3. **Application error - check logs for stack trace:**
   ```bash
   # Get detailed logs with timestamps
   kubectl logs <pod-name> -n content-studio --timestamps=true
   ```

4. **OOM Killed:**
   ```bash
   # Check if container was OOM killed
   kubectl describe pod <pod-name> -n content-studio | grep -i "OOMKilled"

   # Increase memory limits in deployment
   kubectl patch deployment api -n content-studio --type='json' \
     -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value":"1Gi"}]'
   ```

---

### Health Check Failures

**Symptoms:**
```bash
kubectl describe pod <pod-name> -n content-studio
# Warning  Unhealthy  Liveness probe failed: HTTP probe failed with statuscode: 503
# Warning  Unhealthy  Readiness probe failed: Get "http://10.0.1.5:3000/health": context deadline exceeded
```

**Diagnosis:**
```bash
# Check the health endpoint directly
kubectl exec <pod-name> -n content-studio -- curl -v http://localhost:3000/health

# Check if the application is listening on the expected port
kubectl exec <pod-name> -n content-studio -- netstat -tlnp
```

**Solutions:**

1. **Increase probe timeouts:**
   ```yaml
   # In your deployment spec
   livenessProbe:
     httpGet:
       path: /health
       port: 3000
     initialDelaySeconds: 30  # Give app time to start
     timeoutSeconds: 10       # Increase timeout
     periodSeconds: 15
     failureThreshold: 3
   ```

2. **Application slow to start - increase initialDelaySeconds:**
   ```bash
   kubectl patch deployment api -n content-studio --type='json' \
     -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/initialDelaySeconds", "value":60}]'
   ```

3. **Health endpoint depends on external services:**
   - Ensure health endpoint is lightweight and doesn't check all dependencies
   - Consider separate liveness (is app running?) vs readiness (can accept traffic?) probes

---

### Secret Not Found Errors

**Symptoms:**
```bash
kubectl describe pod <pod-name> -n content-studio
# Warning  Failed  Error: secret "database-credentials" not found
```

**Diagnosis:**
```bash
# List all secrets in namespace
kubectl get secrets -n content-studio

# Check if secret exists but in wrong namespace
kubectl get secrets --all-namespaces | grep database-credentials
```

**Solutions:**

1. **Create missing secret:**
   ```bash
   kubectl create secret generic database-credentials \
     --from-literal=username=<user> \
     --from-literal=password=<password> \
     -n content-studio
   ```

2. **Sync from AWS Secrets Manager (if using External Secrets Operator):**
   ```bash
   # Check ExternalSecret status
   kubectl get externalsecret -n content-studio
   kubectl describe externalsecret <name> -n content-studio

   # Force sync
   kubectl annotate externalsecret <name> -n content-studio force-sync=$(date +%s) --overwrite
   ```

3. **Check RBAC for service account:**
   ```bash
   # Verify the pod's service account can access secrets
   kubectl auth can-i get secrets --as=system:serviceaccount:content-studio:api-sa -n content-studio
   ```

---

## 2. Networking Issues

### Ingress Not Working

**Symptoms:**
- 502 Bad Gateway
- 504 Gateway Timeout
- Connection refused from external URL

**Diagnosis:**
```bash
# Check ingress status
kubectl get ingress -n content-studio

# Check ingress details
kubectl describe ingress <ingress-name> -n content-studio

# Check ALB controller logs (if using AWS ALB Ingress Controller)
kubectl logs -n kube-system deployment/aws-load-balancer-controller

# Check if backend service exists and has endpoints
kubectl get svc -n content-studio
kubectl get endpoints -n content-studio
```

**Solutions:**

1. **Service has no endpoints:**
   ```bash
   # Check if pods are running and match service selector
   kubectl get pods -n content-studio --show-labels
   kubectl describe svc api -n content-studio

   # Ensure pod labels match service selector
   ```

2. **Target group health checks failing (AWS ALB):**
   ```bash
   # Check target group health in AWS console or CLI
   aws elbv2 describe-target-health --target-group-arn <arn>

   # Ensure security groups allow health check traffic
   ```

3. **SSL certificate issues:**
   ```bash
   # Check certificate status (if using cert-manager)
   kubectl get certificate -n content-studio
   kubectl describe certificate <name> -n content-studio

   # Check certificate in ACM (if using AWS ACM)
   aws acm describe-certificate --certificate-arn <arn>
   ```

4. **Ingress class not specified:**
   ```yaml
   # Ensure ingress has correct class annotation
   metadata:
     annotations:
       kubernetes.io/ingress.class: alb  # or nginx
   ```

---

### SSE Connections Dropping

**Symptoms:**
- Server-Sent Events disconnect after ~60 seconds
- Real-time updates stop working
- Clients reconnecting frequently

**Diagnosis:**
```bash
# Check current timeout settings on ingress
kubectl get ingress <name> -n content-studio -o yaml | grep -i timeout

# Test SSE connection directly to pod
kubectl port-forward <pod-name> 3000:3000 -n content-studio
# In another terminal:
curl -N http://localhost:3000/api/events
```

**Solutions:**

1. **Increase ALB idle timeout:**
   ```yaml
   # Add annotation to ingress
   metadata:
     annotations:
       alb.ingress.kubernetes.io/load-balancer-attributes: idle_timeout.timeout_seconds=3600
   ```

2. **Increase NGINX timeouts (if using NGINX ingress):**
   ```yaml
   metadata:
     annotations:
       nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
       nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
   ```

3. **Application-level keepalive:**
   - Ensure your SSE implementation sends periodic comments/heartbeats
   - Implement client-side reconnection logic

---

### Redis Connection Failures

**Symptoms:**
```
Error: Redis connection to redis:6379 failed - connect ECONNREFUSED
Error: NOAUTH Authentication required
```

**Diagnosis:**
```bash
# Check Redis pod status
kubectl get pods -n content-studio -l app=redis

# Test Redis connectivity
kubectl run redis-test --rm -it --image=redis:7 -n content-studio -- \
  redis-cli -h redis -p 6379 ping

# If auth required
kubectl run redis-test --rm -it --image=redis:7 -n content-studio -- \
  redis-cli -h redis -p 6379 -a <password> ping
```

**Solutions:**

1. **Redis pod not running:**
   ```bash
   # Check Redis deployment/statefulset
   kubectl get deployment,statefulset -n content-studio | grep redis
   kubectl describe statefulset redis -n content-studio
   ```

2. **Network policy blocking access:**
   ```bash
   # Check network policies
   kubectl get networkpolicy -n content-studio

   # Temporarily delete to test (recreate after)
   kubectl delete networkpolicy <name> -n content-studio
   ```

3. **Wrong Redis host/port in application config:**
   ```bash
   # Check environment variables
   kubectl exec <api-pod> -n content-studio -- env | grep REDIS

   # Verify Redis service exists
   kubectl get svc redis -n content-studio
   ```

4. **Redis requires authentication but password not provided:**
   ```bash
   # Check if Redis is configured with auth
   kubectl exec redis-0 -n content-studio -- redis-cli CONFIG GET requirepass

   # Update application secret with Redis password
   ```

---

## 3. Database Issues

### PostgreSQL Connection Errors

**Symptoms:**
```
Error: connect ECONNREFUSED 10.0.1.100:5432
Error: FATAL: password authentication failed for user "app"
Error: FATAL: too many connections for role "app"
```

**Diagnosis:**
```bash
# Test database connectivity from cluster
kubectl run pg-test --rm -it --image=postgres:15 -n content-studio -- \
  pg_isready -h <db-host> -p 5432 -U <user>

# Check connection with full credentials
kubectl run pg-test --rm -it --image=postgres:15 -n content-studio -- \
  psql "postgresql://<user>:<password>@<host>:5432/<database>" -c "SELECT 1"

# Check current connections (requires db access)
kubectl run pg-test --rm -it --image=postgres:15 -n content-studio -- \
  psql "postgresql://<admin-user>:<password>@<host>:5432/<database>" -c \
  "SELECT count(*) FROM pg_stat_activity WHERE usename = 'app';"
```

**Solutions:**

1. **Security group blocking access:**
   ```bash
   # Get pod IP to verify source
   kubectl get pod <pod-name> -n content-studio -o wide

   # Check RDS security group allows inbound from EKS node/pod CIDR
   ```

2. **Wrong credentials:**
   ```bash
   # Verify credentials in secret
   kubectl get secret database-credentials -n content-studio -o jsonpath='{.data.password}' | base64 -d

   # Test credentials manually
   ```

3. **Connection pool exhausted:**
   ```bash
   # Increase max connections in RDS parameter group
   # Or reduce pool size in application

   # Terminate idle connections
   kubectl run pg-test --rm -it --image=postgres:15 -n content-studio -- \
     psql "postgresql://<admin>:<password>@<host>:5432/<database>" -c \
     "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = 'app' AND state = 'idle' AND state_change < now() - interval '10 minutes';"
   ```

4. **DNS resolution failure:**
   ```bash
   # Test DNS resolution
   kubectl run dns-test --rm -it --image=busybox -n content-studio -- nslookup <db-host>
   ```

---

### Migration Issues

**Symptoms:**
- Migration job failing
- Schema out of sync
- "relation does not exist" errors

**Diagnosis:**
```bash
# Check migration job status
kubectl get jobs -n content-studio | grep migration

# Get migration job logs
kubectl logs job/db-migration -n content-studio

# Check applied migrations (connect to DB)
kubectl run pg-test --rm -it --image=postgres:15 -n content-studio -- \
  psql "postgresql://<user>:<password>@<host>:5432/<database>" -c \
  "SELECT * FROM drizzle_migrations ORDER BY id DESC LIMIT 10;"
```

**Solutions:**

1. **Re-run failed migration:**
   ```bash
   # Delete failed job
   kubectl delete job db-migration -n content-studio

   # Trigger new migration (via Helm upgrade or manual job creation)
   helm upgrade content-studio ./chart -n content-studio --set migrations.enabled=true
   ```

2. **Manual migration intervention:**
   ```bash
   # Port forward to database for direct access
   kubectl port-forward svc/postgres 5432:5432 -n content-studio

   # Run migrations locally
   pnpm db:migrate
   ```

3. **Lock stuck from previous failed migration:**
   ```bash
   # Check for advisory locks
   kubectl run pg-test --rm -it --image=postgres:15 -n content-studio -- \
     psql "postgresql://<user>:<password>@<host>:5432/<database>" -c \
     "SELECT * FROM pg_locks WHERE locktype = 'advisory';"
   ```

---

## 4. Worker Issues

### Jobs Not Processing

**Symptoms:**
- Jobs stuck in queue
- No job completion logs
- Queue size growing

**Diagnosis:**
```bash
# Check worker pods are running
kubectl get pods -n content-studio -l app=worker

# Check worker logs
kubectl logs -l app=worker -n content-studio --tail=100

# Check Redis queue length (using BullMQ)
kubectl run redis-test --rm -it --image=redis:7 -n content-studio -- \
  redis-cli -h redis LLEN bull:content-generation:wait

# Check failed jobs
kubectl run redis-test --rm -it --image=redis:7 -n content-studio -- \
  redis-cli -h redis LLEN bull:content-generation:failed
```

**Solutions:**

1. **Workers not connected to Redis:**
   ```bash
   # Check Redis connection in worker logs
   kubectl logs -l app=worker -n content-studio | grep -i redis

   # Verify REDIS_URL environment variable
   kubectl exec <worker-pod> -n content-studio -- env | grep REDIS
   ```

2. **Workers crashing on job processing:**
   ```bash
   # Check for crash loops
   kubectl get pods -l app=worker -n content-studio -w

   # Increase worker memory if OOM
   kubectl patch deployment worker -n content-studio --type='json' \
     -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value":"2Gi"}]'
   ```

3. **Scale up workers:**
   ```bash
   kubectl scale deployment worker -n content-studio --replicas=5
   ```

4. **Clear stuck/failed jobs:**
   ```bash
   # Remove all failed jobs
   kubectl run redis-test --rm -it --image=redis:7 -n content-studio -- \
     redis-cli -h redis DEL bull:content-generation:failed
   ```

---

### Worker Health Check Failures

**Symptoms:**
```bash
kubectl describe pod <worker-pod> -n content-studio
# Warning  Unhealthy  Readiness probe failed
```

**Solutions:**

1. **Worker doesn't expose HTTP endpoint:**
   ```yaml
   # Use exec probe instead of HTTP
   livenessProbe:
     exec:
       command:
         - node
         - -e
         - "require('net').connect(process.env.HEALTH_PORT || 3001).end()"
     initialDelaySeconds: 30
     periodSeconds: 30
   ```

2. **Worker busy processing long job:**
   - Increase probe timeout and failure threshold
   - Implement dedicated health check thread

---

## 5. Build Issues

### Docker Build Failures

**Symptoms:**
- CI/CD pipeline fails at build step
- Local docker build fails

**Diagnosis:**
```bash
# Check Docker daemon is running
docker info

# Build with verbose output
docker build --progress=plain -t content-studio-api .

# Check Dockerfile syntax
docker build --check .
```

**Common Causes & Solutions:**

1. **npm install fails - memory issues:**
   ```bash
   # Increase Docker memory limit (Docker Desktop settings)
   # Or use multi-stage build to reduce memory usage

   # Add to Dockerfile
   ENV NODE_OPTIONS="--max-old-space-size=4096"
   ```

2. **pnpm workspace issues:**
   ```dockerfile
   # Ensure proper pnpm setup in Dockerfile
   FROM node:20-slim
   RUN corepack enable && corepack prepare pnpm@latest --activate
   COPY pnpm-lock.yaml ./
   RUN pnpm fetch
   COPY . .
   RUN pnpm install --offline
   ```

3. **Platform mismatch (M1/M2 Mac building for linux/amd64):**
   ```bash
   # Build for correct platform
   docker build --platform linux/amd64 -t content-studio-api .

   # Or use buildx
   docker buildx build --platform linux/amd64 -t content-studio-api .
   ```

4. **Layer caching issues:**
   ```bash
   # Build without cache
   docker build --no-cache -t content-studio-api .
   ```

---

### ECR Push Failures

**Symptoms:**
```
denied: Your authorization token has expired. Reauthenticate and try again.
name unknown: The repository with name 'content-studio-api' does not exist
```

**Solutions:**

1. **Re-authenticate with ECR:**
   ```bash
   aws ecr get-login-password --region <region> | \
     docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
   ```

2. **Create missing repository:**
   ```bash
   aws ecr create-repository --repository-name content-studio-api --region <region>
   ```

3. **Check IAM permissions:**
   ```bash
   # Verify user/role has these permissions:
   # - ecr:GetAuthorizationToken
   # - ecr:BatchCheckLayerAvailability
   # - ecr:InitiateLayerUpload
   # - ecr:UploadLayerPart
   # - ecr:CompleteLayerUpload
   # - ecr:PutImage
   ```

4. **Image too large:**
   ```bash
   # Check image size
   docker images content-studio-api

   # Multi-stage build to reduce size
   # Remove dev dependencies
   # Use smaller base image (alpine, distroless)
   ```

---

## 6. Useful Commands

### Checking Pod Logs

```bash
# Current logs
kubectl logs <pod-name> -n content-studio

# Follow logs (tail -f equivalent)
kubectl logs -f <pod-name> -n content-studio

# Previous container logs (after restart)
kubectl logs <pod-name> -n content-studio --previous

# Logs from all pods with label
kubectl logs -l app=api -n content-studio --all-containers=true

# Logs with timestamps
kubectl logs <pod-name> -n content-studio --timestamps=true

# Last 100 lines
kubectl logs <pod-name> -n content-studio --tail=100

# Logs from specific container in multi-container pod
kubectl logs <pod-name> -c <container-name> -n content-studio

# Logs since specific time
kubectl logs <pod-name> -n content-studio --since=1h
kubectl logs <pod-name> -n content-studio --since-time="2024-01-15T10:00:00Z"
```

---

### Describing Resources

```bash
# Describe pod (events, status, containers)
kubectl describe pod <pod-name> -n content-studio

# Describe deployment
kubectl describe deployment api -n content-studio

# Describe service
kubectl describe svc api -n content-studio

# Describe ingress
kubectl describe ingress <name> -n content-studio

# Describe node
kubectl describe node <node-name>

# Get all events in namespace (sorted by time)
kubectl get events -n content-studio --sort-by='.lastTimestamp'

# Watch events in real-time
kubectl get events -n content-studio -w
```

---

### Port Forwarding

```bash
# Forward pod port to localhost
kubectl port-forward <pod-name> 3000:3000 -n content-studio

# Forward service port
kubectl port-forward svc/api 3000:80 -n content-studio

# Forward to different local port
kubectl port-forward <pod-name> 8080:3000 -n content-studio

# Forward database for local access
kubectl port-forward svc/postgres 5432:5432 -n content-studio

# Forward Redis
kubectl port-forward svc/redis 6379:6379 -n content-studio

# Forward with address binding (allow external access)
kubectl port-forward --address 0.0.0.0 <pod-name> 3000:3000 -n content-studio
```

---

### Exec Into Pods

```bash
# Interactive shell
kubectl exec -it <pod-name> -n content-studio -- /bin/sh
kubectl exec -it <pod-name> -n content-studio -- /bin/bash

# Run single command
kubectl exec <pod-name> -n content-studio -- ls -la /app

# Exec into specific container
kubectl exec -it <pod-name> -c <container-name> -n content-studio -- /bin/sh

# Check environment variables
kubectl exec <pod-name> -n content-studio -- env | sort

# Check running processes
kubectl exec <pod-name> -n content-studio -- ps aux

# Check network connectivity
kubectl exec <pod-name> -n content-studio -- curl -v http://api:3000/health

# Check DNS resolution
kubectl exec <pod-name> -n content-studio -- nslookup api
```

---

### Helm Debugging

```bash
# List releases
helm list -n content-studio

# Get release status
helm status content-studio -n content-studio

# Get release history
helm history content-studio -n content-studio

# Get rendered manifests (dry run)
helm template content-studio ./chart -n content-studio

# Get values used in release
helm get values content-studio -n content-studio

# Get all release info
helm get all content-studio -n content-studio

# Debug template rendering
helm template content-studio ./chart -n content-studio --debug

# Rollback to previous release
helm rollback content-studio -n content-studio

# Rollback to specific revision
helm rollback content-studio 3 -n content-studio

# Uninstall release (keep history)
helm uninstall content-studio -n content-studio --keep-history

# Diff before upgrade (requires helm-diff plugin)
helm diff upgrade content-studio ./chart -n content-studio
```

---

### Quick Debugging Pods

```bash
# Run a debug pod with common tools
kubectl run debug --rm -it --image=nicolaka/netshoot -n content-studio -- /bin/bash

# Run curl container
kubectl run curl --rm -it --image=curlimages/curl -n content-studio -- /bin/sh

# Run postgres client
kubectl run pg-client --rm -it --image=postgres:15 -n content-studio -- /bin/bash

# Run redis client
kubectl run redis-client --rm -it --image=redis:7 -n content-studio -- /bin/bash

# Copy files from pod
kubectl cp content-studio/<pod-name>:/app/logs/error.log ./error.log

# Copy files to pod
kubectl cp ./config.json content-studio/<pod-name>:/app/config.json
```

---

### Resource Management

```bash
# Get resource usage
kubectl top pods -n content-studio
kubectl top nodes

# Get pod resource requests/limits
kubectl get pods -n content-studio -o custom-columns=\
"NAME:.metadata.name,CPU_REQ:.spec.containers[*].resources.requests.cpu,CPU_LIM:.spec.containers[*].resources.limits.cpu,MEM_REQ:.spec.containers[*].resources.requests.memory,MEM_LIM:.spec.containers[*].resources.limits.memory"

# Scale deployment
kubectl scale deployment api -n content-studio --replicas=3

# Restart deployment (rolling)
kubectl rollout restart deployment api -n content-studio

# Check rollout status
kubectl rollout status deployment api -n content-studio

# Pause rollout
kubectl rollout pause deployment api -n content-studio

# Resume rollout
kubectl rollout resume deployment api -n content-studio

# Undo last rollout
kubectl rollout undo deployment api -n content-studio
```

---

## Quick Reference Card

| Issue | First Command to Run |
|-------|---------------------|
| Pod not starting | `kubectl describe pod <pod> -n content-studio` |
| Application errors | `kubectl logs <pod> -n content-studio` |
| Can't connect to service | `kubectl get endpoints -n content-studio` |
| Ingress 502/504 | `kubectl describe ingress <name> -n content-studio` |
| Database connection | `kubectl run pg-test --rm -it --image=postgres:15 -n content-studio -- pg_isready -h <host>` |
| Redis connection | `kubectl run redis-test --rm -it --image=redis:7 -n content-studio -- redis-cli -h redis ping` |
| High memory/CPU | `kubectl top pods -n content-studio` |
| Deployment stuck | `kubectl rollout status deployment <name> -n content-studio` |
| Helm issues | `helm status content-studio -n content-studio` |
