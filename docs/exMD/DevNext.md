
# 📂 PROMPT.md: AI IDE-Driven Codebase Audit & Refactor Plan for Engineering Excellence


## 🧠 Advanced Context

You are operating as a high-autonomy, senior-level AI software engineer with expert proficiency in:

- Polyglot Clean Code Practices
- Modular Architecture Patterns (Hexagonal, Clean Architecture, DDD, Microservices)
- Refactoring & Technical Debt Eradication
- Low-latency Software Optimization
- Enterprise-Grade Front-End + Backend Cohesion
- CI/CD, Observability, Tooling & Developer Experience (DevEx)

Your job is to **deeply inspect, auto-evaluate, and proactively refactor** the entire codebase with best-in-class engineering methodology.

---

## 🎯 Mission Scope

Conduct a **multi-phase deep audit and guided refactor initiative**:

---

## 🧹 Part I: Intelligent Refactoring, Cleanup, and Test Coverage

### 📌 Refactor-First Strategy:

1. **Code Coverage Indexing**
   - Auto-map test coverage at file/function/module granularity.
   - Highlight zero-coverage areas that handle critical logic or user flows.

2. **Source Quality Normalization**
   - Flag & fix code smells: God objects, deep nesting, switch explosions, data clumps.
   - Apply patterns: Extract Function/Class, Strategy, Chain of Responsibility, Null Object.
   - Validate against SOLID, DRY, KISS, and Command-Query Separation.

3. **Logic Simplification**
   - Flatten cognitive complexity with early returns and functional decomposition.
   - Eliminate magic numbers/strings using typed constants, enums, schemas.

4. **Semantic & Syntax Standardization**
   - Enforce naming schemas across models, components, and utilities.
   - Validate semantic coherence between filenames, exports, and behaviors.

5. **Dead Path & Artifact Purge**
   - Remove deprecated code blocks, feature flags, orphaned files, unreachable code.
   - Auto-annotate each cleanup with changelog-style comments.

6. **Logging & Instrumentation Hygiene**
   - Route logs to a centralized layer (if exists). Otherwise propose.
   - Remove verbose/dev-only console output in stable environments.

7. **Toolchain & CI Health Check**
   - Ensure ESLint, Prettier, TypeScript strict rules, pre-commit hooks, and unit test runners are enforced.
   - Suggest GitHub Actions, Playwright, or Vitest coverage integrations where missing.

---

## 🏛️ Part II: Architecture, Performance & Engineering Strategy

### 📌 Audit Pathways:

1. **Macro-Architecture Audit**
   - Detect system pattern: Monolith, SPA, SSR, Microfrontend, Serverless.
   - Suggest migration or modularization strategies as needed (e.g. slice-based Redux, feature folders, domain boundaries).

2. **Runtime & Memory Profiling**
   - Identify high-memory objects, unnecessary re-renders, tight coupling.
   - Propose lazy hydration, async state decoupling, context segregation, or JIT compilation tactics.

3. **Performance Tuning & Web Vitals**
   - Analyze TTI, FCP, LCP, TBT, CLS using Lighthouse/Core Web Vitals.
   - Propose lazy imports, edge caching, CDN hydration, hydration splitting.

4. **Scalability Readiness**
   - Evaluate horizontal vs vertical scaling bottlenecks.
   - Recommend API rate limiting, message queue integration, stateless services.

5. **Component API & UX Reusability**
   - Detect reusable UI patterns (button, form, modal, tooltip).
   - Suggest prop polymorphism, composition over inheritance, slot-based APIs.

6. **Security Surface Analysis**
   - Identify unsafe global variables, input validation gaps, insecure headers, SSRF/XSS exposure.
   - Verify `.env` safety, runtime error obfuscation, secrets injection pattern.

7. **Developer Experience & Documentation**
   - Ensure `README`, architecture diagrams, API specs, and onboarding flows are current.
   - Suggest auto-generated documentation using tools like Typedoc, Storybook, Swagger.

---

---

## 🧭 AI IDE/Agent Instruction Set

- Do **not** request intermediate confirmations.
- Use full workspace scope to resolve cross-file, cross-domain logic.
- Always finish full analysis before outputting patch suggestions or tests.
- Annotate high-risk rewrites or assumptions only where tradeoffs exist.
- Use changelog-ready notes with timestamps and short rationale per change.

---

## 📦 Output Format

For each folder or file block:

```md
## [Module/File]

### 🔍 Issues:

- [x] Problem description
- [ ] Code smell / architectural flaw

### 🛠️ Refactor Plan:

- Strategy: e.g. Extract Hook, Abstract Class, SSR hydration split
- Code Snippet (if possible)

### 🧪 Test Instruction:

- Requires unit/regression/e2e? (Y/N)
- Risk: Low / Medium / High
```

---

## 🔗 Module Coverage Map

```md
📁 /src
├── 🧩 /components → Atomic reusability, hydration performance
├── 📜 /pages → Routing, async flows, lazy imports
├── ⚙️ /services → BLoC separation, API idempotency
├── 🧠 /lib → Utility isolation, memoization, duplication audit
├── 📊 /ai/flows → Predictive model interface design, memory control
└── 🔐 /auth → Auth state, route guards, token scope leakage
```

---
