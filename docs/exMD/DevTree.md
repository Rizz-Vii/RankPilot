# 🧠 AI IDE Prompt — RankPilot Project Architecture Awareness

## 🎯 Objective:

You are an advanced AI assistant embedded into a SaaS monorepo for RankPilot — an AI-powered SEO audit and analytics platform. You must *fully understand the entire directory structure* and *use it precisely to inform code completions, enhancements, file placements, and architectural decisions*.

---

## 🗂️ Project Structure Reference

### Root Level

/
├── src/ → Next.js App Router application
│ ├── app/ → App Router pages and layouts
│ ├── components/ → Shared React UI components
│ ├── ai/ → AI audit engine flows and NeuroSEO™ Suite
│ ├── lib/ → Utils (auth, analytics, SEO, Firebase)
│ ├── hooks/ → Custom React hooks
│ └── utils/ → Helper utilities
├── functions/ → Firebase Cloud Functions

### Root Level

/
├── src/ → Next.js App Router application
│ ├── app/ → App Router pages and layouts
│ ├── components/ → Shared React UI components
│ ├── ai/ → AI audit engine flows and NeuroSEO™ Suite
│ ├── lib/ → Utils (auth, analytics, SEO, Firebase)
│ ├── hooks/ → Custom React hooks
│ └── utils/ → Helper utilities
├── functions/ → Firebase Cloud Functions
├── docs/ → Professionally organized documentation hub
│ ├── devnext/ → DevNext implementation phases (Part I, II, III)
│ ├── integrations/ → External service integrations (MCP, Stripe, APIs)
│ ├── analysis/ → Technical analysis and performance reports  
│ ├── status-reports/ → Completion tracking and final reports
│ └── README.md → Master documentation navigation
├── testing/ → Playwright test infrastructure (153 tests)
├── pilotScripts/ → Automation and utility scripts
├── .github/ → CI/CD workflows and GitHub Actions
├── .husky/ → Git hooks (quality gates)
├── scripts/ → Build and deployment scripts
├── firebase.json → Firebase configuration
├── next.config.ts → Next.js configuration
└── package.json → Project dependencies and scripts

yaml
Copy code

---

### Frontend Application Layer (`src/`)

src/
├── app/ → Next.js App Router
│ ├── (app)/ → Protected feature pages
│ ├── (auth)/ → Authentication pages
│ ├── (public)/ → Public marketing pages
│ └── api/ → API routes and endpoints
├── ai/ → AI audit engine flows, NeuroSEO™ Suite
├── components/ → Shared React UI (modals, cards, forms)
├── lib/ → Utilities and services
│ ├── auth/ → Authentication logic
│ ├── firebase/ → Firebase configuration and services
│ ├── neuroseo/ → NeuroSEO™ Suite implementation
│ └── utils/ → Helper functions
├── hooks/ → Custom React hooks (Firestore, UI, auth)
├── context/ → React context providers
├── constants/ → Application constants
├── styles/ → Global styles and Tailwind config
└── utils/ → Additional utility functions

yaml
Copy code

---

## 🧠 Usage Instructions

Use this directory map to:

- 🧩 **Place new features** in their logical module (`features/`, `ai/`, `services/`)
- 📥 **Import logic from correct shared layers** (`hooks`, `lib`, `types`)
- 🧠 **Understand separation of concerns**: DB vs Logic vs UI vs AI
- 🔄 **Write file-aware and colocated code suggestions**
- 🔍 **Detect architectural anti-patterns or misplaced logic**
- 🔧 **Follow convention-driven scaffolding & naming**

---

## ✅ AI Guidance

### ☑ When writing new code:

- Ask: “Where would this live based on the structure?”
- Use: consistent foldering, logical file placement, type sharing

### ☑ When enhancing code:

- Suggest shared utility refactoring to `lib/` or `hooks/`
- Co-locate atomic UI with components, not feature logic

### ☑ When generating documentation:

- Use structure map to create `/docs/` guides and README anchors
- Prefer file-aware autocomplete and JSDoc-level completion

---

## ⚠️ Important Rules

- NEVER generate logic outside of this architecture
- ALWAYS colocate feature files (UI + logic + hooks)
- Prefer prompt-driven AI suggestions with directory context
- Flag file or structure smells (e.g. coupling, bloated files, etc.)

---

## 🧪 Validation

Test project structure consistency by running:

```bash
pnpm lint:structure
pnpm check:types
pnpm test:integration
✅ You are now aware of the RankPilot codebase structure.
Use this information for all completions, refactors, documentation, and prompt interactions.
