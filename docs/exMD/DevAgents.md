# PilotBuddy AI Assistant Implementation Framework

*Comprehensive Setup Guide for RankPilot SEO SaaS - Based on workshop/performance Branch*

## Executive Summary

This framework establishes the complete AI assistant ecosystem for RankPilot, implementing the PilotBuddy Intelligence System as documented in `docs/COMPREHENSIVE_PILOTBUDDY_INTELLIGENCE.md`. The system creates specialized AI assistants that integrate with your existing codebase, live data, and operational workflows to support customer service, technical operations, marketing automation, and financial management.

Note (2025-08-12): For the latest production deltas see `archey/ADDENDUM_2025-08-12.md`. Canonical chatmode profile is `.github/chatmodes/pilotBuddy.chatmode.md`.

## Document Scope & Boundaries

- Scope: This document is the root implementation guide for building in‑app AI agents that serve users (Customer Support AI, Technical Operations AI, Business Operations AI) within RankPilot.
- Not in scope: It is not the VS Code coding agent profile. For repository editing behavior and IDE automation, see `.github/chatmodes/pilotBuddy.chatmode.md` and `.github/chatmodes/copilot-instructions.md`.
- How they work together: Use this guide to design/ship product agents and their APIs. Use the chatmode + copilot instructions to perform deterministic repo edits and complete engineering tasks.

## Architecture Foundation

### Core System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    PilotBuddy Central Brain                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Knowledge Base  │  │ MCP Orchestrator│  │ Context Manager │ │
│  │ - Source Code   │  │ - LLM Router    │  │ - Session State │ │
│  │ - Documentation │  │ - Task Queue    │  │ - User Context  │ │
│  │ - Live Data     │  │ - Automation    │  │ - Role Perms    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
        │                       │                       │
┌───────▼────────┐    ┌────────▼────────┐    ┌────────▼────────┐
│ Customer        │    │ Technical       │    │ Business        │
│ Support AI      │    │ Operations AI   │    │ Operations AI   │
│ - FAQ Handling  │    │ - Monitoring    │    │ - Content Gen   │
│ - SEO Education │    │ - Bug Detection │    │ - Email Automation│
│ - User Guidance │    │ - Health Checks │    │ - Subscription  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Reference Documents (canonical):**

- Implementation Workflow: `docs/COMPREHENSIVE_DEVELOPMENT_WORKFLOW.md`
- Testing Strategy: `docs/COMPREHENSIVE_TESTING_INFRASTRUCTURE.md`
- Performance & Mobile: `docs/COMPREHENSIVE_MOBILE_PERFORMANCE.md`
- System Architecture: `docs/COMPREHENSIVE_SYSTEM_ARCHITECTURE.md`
- Security & Secrets: `docs/COMPREHENSIVE_SECURITY_PROTOCOLS.md`
- Configuration Hub: `docs/CONFIGURATION_COMPREHENSIVE.md`
- Firestore Schemas: `docs/FIRESTORE_SCHEMAS.md`
- Change Log (governance): `docs/CHANGE_LOG.md`
- Incomplete Code Audit (open gaps): `docs/INCOMPLETE_CODE_AUDIT.md`
- PilotBuddy Intelligence (agent design): `docs/COMPREHENSIVE_PILOTBUDDY_INTELLIGENCE.md`
- Canonical Agent Profile: `.github/chatmodes/pilotBuddy.chatmode.md`
- Copilot Instructions: `.github/chatmodes/copilot-instructions.md`
- Latest Production Addendum: `archey/ADDENDUM_2025-08-12.md`

## Phase 1: Foundation Setup 

### 1.1 Knowledge Base Infrastructure

Implementation Priority: CRITICAL

Objective: Create unified knowledge base following the consolidated documentation structure

Technical Requirements:

```python
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.document_loaders import DirectoryLoader, TextLoader

# High-signal sources only; avoid noisy or generated outputs.
SOURCE_PATHS = {
    'docs': 'docs/',                                # Comprehensive docs (COMPREHENSIVE_*)
    'addendum': 'archey/ADDENDUM_2025-08-12.md',    # Latest production deltas
    'chatmodes': '.github/chatmodes/',              # Canonical chatmode + instructions
    'src': 'src/',                                  # Application source (components, lib, etc.)
    'api': 'src/app/api/',                          # API routes (contracts, schemas)
    'functions': 'functions/src/',                  # Cloud Functions (scheduled, webhooks, AI adapters)
    'schemas': 'docs/FIRESTORE_SCHEMAS.md',         # Firestore schema source-of-truth
    'changelog': 'docs/CHANGE_LOG.md'               # Governance and rollback plans
}

# Exclusions to reduce noise and index size
EXCLUDE_DIRS = [
    'node_modules', '.next', '.turbo', 'dist', 'build', 'coverage', '.git'
]
EXCLUDE_FILES = [
    '*.png', '*.jpg', '*.jpeg', '*.gif', '*.svg', '*.ico', '*.pdf', '*.xlsx', '*.csv'
]

def create_knowledge_base():
    # Example: load directories with DirectoryLoader and individual files with TextLoader
    docs_loader = DirectoryLoader(SOURCE_PATHS['docs'], glob='**/*.md', recursive=True)
    chatmodes_loader = DirectoryLoader(SOURCE_PATHS['chatmodes'], glob='**/*.md', recursive=True)
    src_loader = DirectoryLoader(SOURCE_PATHS['src'], glob='**/*.*', recursive=True)
    api_loader = DirectoryLoader(SOURCE_PATHS['api'], glob='**/*.*', recursive=True)
    functions_loader = DirectoryLoader(SOURCE_PATHS['functions'], glob='**/*.*', recursive=True)
    addendum_docs = [TextLoader(SOURCE_PATHS['addendum'])]
    schema_docs = [TextLoader(SOURCE_PATHS['schemas'])]
    changelog_docs = [TextLoader(SOURCE_PATHS['changelog'])]

    # TODO: apply EXCLUDE_DIRS/EXCLUDE_FILES via custom filtering in loaders if supported,
    # or filter documents post-load before splitting/embedding.

    # Load comprehensive documents and chunk
    # Return vector_db
    return None  # language-agnostic pseudo; implement in TS/Node for this repo
```

Documentation References (canonical):

- Implementation Workflow: `docs/COMPREHENSIVE_DEVELOPMENT_WORKFLOW.md`
- Testing Strategy: `docs/COMPREHENSIVE_TESTING_INFRASTRUCTURE.md`
- Performance & Mobile: `docs/COMPREHENSIVE_MOBILE_PERFORMANCE.md`
- System Architecture: `docs/COMPREHENSIVE_SYSTEM_ARCHITECTURE.md`
- Security & Secrets: `docs/COMPREHENSIVE_SECURITY_PROTOCOLS.md`
- Configuration Hub: `docs/CONFIGURATION_COMPREHENSIVE.md`
- Firestore Schemas: `docs/FIRESTORE_SCHEMAS.md`
- Change Log (governance): `docs/CHANGE_LOG.md`
- Incomplete Code Audit (open gaps): `docs/INCOMPLETE_CODE_AUDIT.md`
- PilotBuddy Intelligence (agent design): `docs/COMPREHENSIVE_PILOTBUDDY_INTELLIGENCE.md`
- Canonical Agent Profile: `.github/chatmodes/pilotBuddy.chatmode.md`
- Copilot Instructions: `.github/chatmodes/copilot-instructions.md`
- Latest Production Addendum: `archey/ADDENDUM_2025-08-12.md`

### 1.2 MCP Orchestration Layer

Implementation Priority: HIGH

Objective: Establish MCP integration as documented in PilotBuddy Intelligence

Core Components:

```javascript
const MCPRouter = {
  customer_support: { model: 'gpt-4-turbo', temperature: 0.3, max_tokens: 1000 },
  tech_operations:  { model: 'gpt-4',        temperature: 0.1, max_tokens: 2000 },
  business_ops:     { model: 'gpt-4-turbo',  temperature: 0.4, max_tokens: 1500 }
};
```

Security Implementation: per `docs/COMPREHENSIVE_SECURITY_PROTOCOLS.md`

- 5-tier RBAC, API rate limiting, data sanitization, audit logging

### 1.3 Data Exposure Layer

Implementation Priority: HIGH

Objective: Safe views/endpoints per System Architecture

Reference: `docs/COMPREHENSIVE_SYSTEM_ARCHITECTURE.md`

```sql
-- Example safe views (adapt to actual DB)
CREATE VIEW ai_customer_data AS SELECT user_id, anonymized_queries FROM customers WHERE privacy_consent = true;
CREATE VIEW ai_system_metrics AS SELECT timestamp, resource_utilization FROM system_logs WHERE timestamp > NOW() - INTERVAL '24 hours';
CREATE VIEW ai_billing_data AS SELECT subscription_id, feature_access FROM subscriptions s JOIN billing_events b ON s.id = b.subscription_id;
```

## Phase 2: Core Function Implementation

- Customer Support AI: FAQ, SEO education, product docs, troubleshooting
- Technical Operations AI: health checks, bug triage, perf tuning, gated fixes
- Business Operations AI: content gen, email automation, subscription support

## Phase 3: Integration & Deployment 

### Frontend Integration

```javascript
class PilotBuddyWidget { /* minimal sample; see doc for full version */ }
window.initAIAssistant = (config) => new PilotBuddyWidget(config);
```

### API Architecture

```python
# FastAPI example stub; adapt to Next.js API routes as needed
class ChatRequest(BaseModel):
    message: str
    assistant_type: str
```

## Operational Notes (2025-08-12)

- Provenance is universal across dashboards/visualizations/billing APIs.
- `/api/table-data` is Firestore-backed with deterministic fallback and CSV export.
- Scheduled runner for due automations added; manual `/api/automation/run-due` is 410.
- AI adapter (`functions/src/lib/ai-memory-manager.ts`) is a mock; implement env-driven provider + keep mock fallback.
- Finance pages use mock metrics; gate or wire to real data.
- `/api/health` includes KPIs and alerts (rateLimitRejectionRate, routesP95 map, etc.).

See `archey/ADDENDUM_2025-08-12.md` for details and next steps.
