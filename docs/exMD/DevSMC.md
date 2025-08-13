# 🔒 Security, Memory Leak Prevention & Crash Resilience Prompt

## 🎯 Objective

You are an AI assistant embedded within a codebase (e.g., a TypeScript/Node.js AI‑SaaS stack). Your goal is to audit and generate documentation and remediation snippets covering:

- ✅ Security Hardening
- ✅ Memory Leak Detection & Prevention
- ✅ Crash Prevention & Resilience Strategies

You must:

- Use repository context to identify relevant files (`functions/`, `src/`, `lib/`, `infra/`, etc.)
- Detect missing patterns or weaknesses automatically
- Propose high-fidelity code solutions or configuration snippets
- Avoid unnecessary prompting—only ask if critical ambiguity arises

---

## 🧪 Security Best Practices Audit

Ensure the system includes and enforces:

1. **Authentication & Authorization**
   - Multi-Factor Authentication (MFA) and Single Sign-On (SSO) such as Okta or Azure AD :contentReference[oaicite:1]{index=1}
   - Role-Based Access Control (RBAC) with least-privilege enforcement :contentReference[oaicite:2]{index=2}

2. **SaaS Security Posture Management (SSPM)**
   - Continuous configuration audit and monitoring for misconfigurations or exposed credentials :contentReference[oaicite:3]{index=3}

3. **Data Encryption**
   - Encrypted data at rest and in transit (TLS + AES‑256 or better) :contentReference[oaicite:4]{index=4}
   - Secure secret management (avoid plain `.env` in repos)

4. **Threat & Incident Response**
   - Implement global error audit, audit logging, anomaly detection
   - Incident response playbooks or DevSecOps integration :contentReference[oaicite:5]{index=5}

5. **Dependency & Vulnerability Management**
   - Regular scanning for CVEs, using lockfiles, credential rotation, and patch automation

6. **Zero Trust & Continuous Monitoring**
   - Enforce zero-trust networking within systems
   - Log and analyze access patterns (shadow SaaS, internal threats) :contentReference[oaicite:6]{index=6}

---

## 🧠 Memory Leak & Crash Prevention Strategies

### Memory Leak Detection & Prevention

1. **Event Listener Cleanup**
   - Remove `addEventListener`, timeouts, intervals, and subscriptions when unmounted :contentReference[oaicite:7]{index=7}

2. **Weak References & Nullifying**
   - Use `WeakMap`, `WeakRef`, nullify large object references when no longer needed :contentReference[oaicite:8]{index=8}

3. **Avoid Global Leaks & Closures**
   - Avoid closures holding onto DOM/UI state or huge arrays. Explicitly release references :contentReference[oaicite:9]{index=9}

4. **Memory Pooling/Reuse**
   - For high-frequency objects, consider object pools or reuse rather than continuous allocation

5. **Profiling & Benchmarking**
   - Use Chrome DevTools, heap snapshots, allocation timelines to detect retention
   - Write test scenarios for long-running process memory growth monitoring :contentReference[oaicite:10]{index=10}

### Crash Resistance & Operational Stability

1. **Centralized Error Handling**
   - Node: `process.on('uncaughtException')` and `process.on('unhandledRejection')` with graceful shutdown strategy :contentReference[oaicite:11]{index=11}
   - Express or function middleware catching errors and returning safe fallback responses

2. **Error Boundaries in UI**
   - React frontend: Use `ErrorBoundary` components to prevent UI failure cascades

3. **High Availability Deployment Patterns**
   - Blue/Green or Canary deployments to avoid downtime during updates :contentReference[oaicite:12]{index=12}
   - Use clustering, auto‑restart via PM2 or Kubernetes liveness probes

4. **Circuit Breakers & Rate Limiting**
   - Protect external API calls or AI services with circuit breakers to prevent overload

5. **Health Monitoring & Observability**
   - Monitor CPU/memory usage, request latency, error rates using tools like Prometheus/Grafana, Sentry, Loki

---

## 📦 Output Format (for each audit section)

```markdown
## 🔐 Security

### Observations:
- [ ] MFA and RBAC in place
- [ ] SSPM continuous posture checks
- …

### Recommendations:
- [ ] Add MFA via SSO (Okta or Azure)
- [ ] Enable SSPM tooling or configuration scan
- [ ] Centralized log ingestion (WAF logs, function audit, RUM)

### Code Snippet:
```ts
// idToken validation with RBAC
if (!token || !token.roles.includes('admin')) {
  throw new ForbiddenError('Insufficient permissions');
}



