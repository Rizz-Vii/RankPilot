# 📐 PROMPT_UI_UX_TESTING.md

## 🧠 Purpose

Use this prompt to guide GitHub Copilot or any LLM-powered assistant in scaffolding automated UI/UX consistency and usability testing strategies for a SaaS product like **RankPilot**. The assistant should:

- Build reusable Playwright or Cypress test suites
- Integrate visual regression testing
- Validate accessibility (WCAG)
- Cross-browser support (BrowserStack, LambdaTest)
- Automate testing across critical flows (e.g., onboarding, audit URL, chatbot)

---

## 📤 Prompt: Full Stack UI/UX Test Architecture for RankPilot

> You are an expert DevOps engineer and QA specialist building a complete UI/UX validation system for the RankPilot SEO SaaS platform. The app is built with React (Next.js) and Firebase (Auth, Firestore, Functions). Use Playwright (or optionally Cypress) to:

### 🔍 1. Visual Consistency Testing

- Take snapshot screenshots of key components:
  - Audit Dashboard (pre/post URL scan)
  - Sidebar and Header layout
  - Chatbot UI interaction thread
- Compare snapshots for regression with pixel diffing
- Include retries and auto-wait until layout is stable

### 🔄 2. End-to-End Functional Testing

- Simulate flows:
  - Register → Login → Start Audit
  - Chatbot reply generation → Firestore write → re-fetch thread
  - Profile updates (password, email)
- Use realistic test data and assert on DOM state and Firestore document sync

### 🌐 3. Cross-Browser & Device Coverage

- Use BrowserStack or LambdaTest configuration to:
  - Run tests on Chrome, Firefox, Safari, Edge
  - Validate responsiveness on mobile and tablet viewports

### ♿ 4. Accessibility & UX Auditing

- Scan all major views with Axe-core
- Assert on:
  - Labeling of inputs and buttons
  - Sufficient color contrast
  - Keyboard navigation flow
- Enforce WCAG 2.1 AA compliance

### 🚦 5. CI/CD Integration

- Generate `playwright.config.ts` with:
  - Screenshot baseline threshold (0.2 diff tolerance)
  - Retry config for flaky networks
  - Integration with GitHub Actions or Vercel

### 🧪 6. Usability Feedback Hooks (Optional)

- Simulate Hotjar-style interaction tracking
- Log click paths, page exit rates, audit cancellations
- Suggest fallback flows when users stall (e.g., chatbot CTA)

---

## 📁 File Structure Copilot Should Generate

```bash
/tests
  /e2e
    dashboard.spec.ts
    chatbot.spec.ts
    login-register.spec.ts
    audit-flow.spec.ts
  /visual
    baseline/
    snapshots/
  /accessibility
    a11y-dashboard.spec.ts
  playwright.config.ts
```

---

## ✅ Validation Checklist for Copilot

- [ ] E2E flows cover 100% of user-critical features
- [ ] Snapshots of all major UIs taken on first run
- [ ] Axe-core violations report fails CI if > 0
- [ ] Tests are grouped logically and reusable
- [ ] Config works on local and CI environment
- [ ] Prompts are fully self-documenting and chainable

---

## 🔁 Bonus Follow-up Prompt

```markdown
Refactor these tests to support language switching and dark/light theme toggling. Make layout-aware assertions (e.g., sidebar visibility, flex-direction). Ensure test retries don’t corrupt Firestore test data.
```

---
