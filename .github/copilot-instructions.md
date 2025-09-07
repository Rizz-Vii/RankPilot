# GitHub Copilot Instructions for RankPilot

## Project Overview

RankPilot is an AI-first SEO/marketing SaaS platform built with Next.js 15 + TypeScript 5.7 + Firebase (Hosting, Firestore, Functions). It features a 5-tier subscription model with strict role-based access control and feature gating.

## Core Architecture Patterns

### Feature Gating

Always wrap new pages/features with FeatureGate:

```tsx
import { FeatureGate } from "@/components/subscription/FeatureGate";

<FeatureGate feature="your_feature_key" requiredTier="starter" showUpgrade>
  {/* Your feature content */}
</FeatureGate>;
```

- Feature keys defined in `FEATURE_KEYS.md`
- Tiers: `starter` | `agency` | `enterprise`
- Use `canAccessFeature()` and `canAccessEntitlement()` for backend logic

### Structured Logging

Use the unified app logger for all logging:

```ts
import { getLogger } from "@/lib/logging/app-logger";

const logger = getLogger("component-name");
logger.info("operation completed", { userId, duration: 150 });
logger.error("operation failed", { error: err.message, userId });
logger.audit("security event", { action: "login", userId }); // For compliance
logger.degraded("fallback mode", { reason: "api_down" }); // For observability
```

### Firebase Integration

Use the connection manager singleton:

```ts
import { db, auth, functions, storage } from "@/lib/firebase";
// These are concrete instances in browser, lazy getters on server
```

### AI Client Patterns

Use the unified AI client with fallbacks:

```ts
import { chatComplete } from "@/lib/ai/aiClient";

const response = await chatComplete({
  messages: [{ role: "user", content: "Hello" }],
  maxTokens: 800,
  temperature: 0.2,
});
```

- Primary: OpenAI → Secondary: Gemini → Fallback: static message
- Embeddings: OpenAI only (consistent vector space)

### Rate Limiting & Probe Tokens

Middleware automatically handles rate limiting:

- API routes limited by `RL_API_MAX_REQUESTS` (default: 50/60s in prod)
- Use `x-probe-token` header for automated testing: `8ab3b3a95a0d9cf1b5bb2b61be5e3981`
- Crawlers inject this header globally via `extraHTTPHeaders`

## Development Workflows

### Essential Commands

```bash
npm run dev-no-turbopack   # Development server (stable)
npm run typecheck          # Type checking
npm run lint:flat:all      # Linting (comprehensive)
npm run test:unit          # Testing
npm run build              # Build for production
npm run deploy:prod        # Deploy (with secrets)
```

### Brain Operations

```bash
npm run brain:plan-only       # Generate plan only
npm run brain:execute         # Execute single batch
npm run brain:auto            # Iterative execution with budget control
npm run brain:two-agent:auto  # Supervisor + reviewer cycle
```

### Code Quality

- Keep commits <200 lines, <15 files
- Detect → Classify → Resolve → Verify
- Avoid `any`; prefer domain types or minimal interfaces
- Always `await` or `void promise.catch()`

## Key Directories & Files

- `src/app/` Next.js App Router (pages, API routes)
- `src/lib/` Core utilities (ai, firebase, logging, middleware)
- `components/` Reusable UI components
- `scripts/` Automation & utilities (brain, delegation, crawler)
- `AGENTS.md`, `FEATURE_KEYS.md`, `CHANGE_LOG.md`, `.env.local`, `middleware.ts`

## Environment & Secrets

```bash
NEXT_PUBLIC_FIREBASE_PROJECT_ID=rankpilot-h3jpc
FIREBASE_ADMIN_PRIVATE_KEY=... # Service account key
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
CRAWL_PROBE_TOKEN=8ab3b3a95a0d9cf1b5bb2b61be5e3981
NEXT_PUBLIC_ALLOW_FINANCE_MOCKS=true  # For development
# Twilio (enable real outbound/inbound voice)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+15551234567        # E.164 format
# Set base URL for webhook callbacks in dev/prod
PUBLIC_BASE_URL=http://localhost:3000  # or your deployed hostname
```

Deploy:

```bash
npm run secrets:set
firebase deploy --only hosting,functions --project rankpilot-h3jpc
```

## Patterns & Conventions

- Error handling with `getLogger()`; rethrow for caller handling
- Data fetching with SWR/React Query patterns
- Styling: design tokens, avoid raw hex colors
- API routes: structured logs, 500 on error with generic message

## Testing & Quality

```bash
npm run quality:full  # Lint + typecheck + functions typecheck
npm run lint:fix      # Lint with auto-fix
npm run typecheck     # TS only
```

## Performance & Monitoring

- Lazy load heavy components; leverage code splitting
- Cache headers; bundle analysis via `build:analyze`
- Use `/api/health` for metrics; Sentry for errors

## Security & Compliance

- CSP in `middleware.ts`
- Firebase Auth with custom claims; RBAC
- Secrets via env; never in code
- Audit logs for critical operations

## Pitfalls

- Don’t commit secrets, skip gates, or ignore lints/types
- Don’t make large commits or use raw hex colors

## Getting Help

- `AGENTS.md` handbook
- `docs/` documentation
- `CHANGE_LOG.md` recent changes
- Team chat for complex decisions

## See also

- `.github/instructions/user-journey-contract.md`
- `.github/instructions/agent-playbooks.md`
- `.github/instructions/copilot-delta-guide.md`

### Master execution prompt

For a single, non-interactive prompt that hardens billing, webhooks, Firestore rules, a11y/performance, and CI—use:

- `.github/prompts/copilot-master-execution.md`

Remember: This is a production SaaS platform. Quality, security, and user experience are paramount. When in doubt, follow established patterns and ask for clarification.
