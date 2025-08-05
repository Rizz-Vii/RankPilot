# Pilotbuddy Documentation Consolidated

**Generated:** 7/26/2025 5:44:01 PM
**Folder:** `docs/pilotbuddy`
**Files Consolidated:** 1
**Source Files:** COPILOT_INSTRUCTION_RANKPILOT.md

---

## Table of Contents

1. [COPILOT INSTRUCTION RANKPILOT](#copilot-instruction-rankpilot)

---

## 1. COPILOT INSTRUCTION RANKPILOT

**Source File:** `pilotbuddy/COPILOT_INSTRUCTION_RANKPILOT.md`
**Last Modified:** 7/25/2025

This file serves as a persistent instruction set for GitHub Copilot and any autonomous AI agent working on the RankPilot (Studio) project. It is derived from the comprehensive project knowledge base and must be referenced for all development, deployment, maintenance, and scaling activities.

---

### I. Project Vision & Strategy

- Product: RankPilot (Studio) is the "Semantic Intelligence Layer" for AI-driven search.
- Target Personas: SEO Consultants, Marketing Managers, Content Writers, Technical SEOs.
- Value Proposition: AI-powered, actionable SEO insights, semantic analysis, and trust scoring.
- Monetization: Subscription tiers; focus on onboarding, actionable insights, and upgrade paths.

### II. Product & Features

- NeuroSEO™ Suite: NeuralCrawler™, SemanticMap™, AI Visibility Engine, TrustBlock™, RewriteGen™.
- Core Features: AI Keyword Tool, Content Analyzer, SEO Competitors, SERP Visualization, Technical SEO Audit, Link View, Dashboard Overview, Actionable Insights.
- UI/UX: Clean, accessible, animated, and workflow-driven. See wireframe and style guidelines.

### III. Technical Architecture & Implementation

- Frontend: Next.js (App Router), React, Tailwind CSS, shadcn/ui.
- Backend: Firebase Cloud Functions (Node.js).
- Database: Firestore (NoSQL).
- Auth: Firebase Auth (Email/Password, Google OAuth).
- AI: OpenAI API (GPT-4o), Playwright/Puppeteer.
- CI/CD: GitHub Actions, Firebase Hosting.
- Code Standards: Hydration-safe forms, accessibility, modular AI flows, no committed secrets.
- Testing: Playwright for E2E, local and CI test commands.

### IV. Project Management & Workflow

- Phases: Foundation, Core MVP, Stabilization, Enhancement, Scaling.
- Protocol: Documentation-first, feature branches, PR reviews, CI/CD pipeline.
- Priorities: Security hardening, monitoring, performance optimization.

### V. Scaling Strategy

- Serverless-first: GCP, Firebase, Cloud Functions, Task Queues.
- Monitoring: Google Cloud Monitoring, alerts.
- Security: Google Secret Manager, regular audits, GDPR/CCPA compliance.
- Documentation: All major changes must be reflected in `/docs/`.

### VI. Tooling & Ecosystem


- **Development Environment**: VS Code, Node.js v20, npm, PowerShell (Windows-optimized).

- **Cloud Services**: Firebase (Auth, Firestore, Functions, Hosting), Google Cloud Platform (Secret Manager, Monitoring).

- **AI Infrastructure**: OpenAI API (GPT-4o), Genkit AI flows, custom NeuroSEO™ engines.

- **Testing Tools**: Playwright for E2E testing, Jest for unit testing.

- **Performance**: Lighthouse, Core Web Vitals, custom monitoring scripts.

- **Frontend Libraries**: Next.js, React, Tailwind CSS, shadcn/ui, framer-motion, Recharts.

- **Backend Services**: Firebase Cloud Functions, Firestore, Task Queues.

- **Payment Processing**: Stripe API, PayPal integration with webhook handling.

- **SEO Analysis**: Custom NeuroSEO™ Suite with 6 specialized engines.

- **Deployment**: GitHub Actions, Firebase Hosting, automated CI/CD pipeline.

- **Monitoring**: Error tracking, performance monitoring, usage analytics.

### VII. Actionable Protocols & Conventions

#### Development Protocols

- Always render form fields; use `useHydration()` hook for disabled state: `disabled={!hydrated || isLoading}`.
- Use `react-hook-form` with Zod validation for all form submissions.
- Normalize URLs with `normalizeUrl()` before processing or storage.
- Ensure all UI elements meet WCAG accessibility standards (minimum 48px touch targets).
- Animate results with `framer-motion`, implement scroll behavior with `useRef`/`useEffect`.
- Import AI flows from `/ai/flows/`, log all actions and results to Firestore.
- Implement tier-based feature gates using the `<FeatureGate>` component with appropriate tier requirements.
- Follow the Enhanced Navigation System for new features with proper tier visibility settings.

#### Documentation Protocols

- Update `/docs/PROJECT_STATUS_AND_NEXT_STEPS.md` after completing major features or releases.
- Document new features in `/docs/AGILE_PRIORITY_PLAN.md` for proper prioritization.
- Maintain and update `/docs/COMPREHENSIVE_INSTRUCTIONS.md` for architectural knowledge.
- Review `/docs/MOBILE_ENHANCEMENT_CHECKLIST.md` for mobile optimization requirements.
- Document API changes in appropriate documentation files with examples.
- Follow the patterns in `/docs/MCP_INSTRUCTION_MAP.md` for tool selection decisions.

#### Security Protocols

- Never commit secrets; use environment variables and Google Secret Manager.
- Check and update `/docs/SECURITY_ROTATION.md` after security-related changes.
- Follow the secret rotation schedule and audit protocols defined in security documentation.
- Implement proper authentication and authorization checks on all API endpoints.
- Use tier-based security rules in Firestore for data access control.
- Follow GDPR/CCPA compliance requirements for user data handling.

#### Performance Protocols

- Use Windows-specific optimizations with `npm run optimize-windows` for development.
- Monitor file handle usage with `npm run emfile:check` to prevent EMFILE errors.
- Use `cross-env NODE_OPTIONS='--max-old-space-size=3072'` for memory management.
- Implement network-aware fetching for mobile optimization.
- Follow Core Web Vitals standards: LCP < 2.5s, CLS < 0.1.
- Use the responsive utilities from `src/lib/mobile-responsive-utils.ts` for mobile optimization.

#### Testing Protocols

- Run comprehensive role-based tests with `npm run test:role-based` before major changes.
- Use the Windows-optimized test runner: `.\scripts\run-role-based-tests.ps1`.
- Test across all 5 user tiers using the predefined test accounts.
- Run performance tests with `npm run test:performance` to validate Core Web Vitals.
- Ensure mobile compatibility with `npm run test:mobile` for viewport testing.
- Verify accessibility standards with `npm run test:accessibility` for WCAG compliance.

---

**This instruction file must be referenced for all RankPilot (Studio) project work. It supersedes generic Copilot behavior and ensures project-specific compliance and excellence.**

---

