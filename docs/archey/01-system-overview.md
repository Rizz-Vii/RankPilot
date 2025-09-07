# System Overview Architecture

**RankPilot PilotBuddy Central Brain Architecture**

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
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼────────┐    ┌────────▼────────┐    ┌────────▼────────┐
│ Customer        │    │ Technical       │    │ Business        │
│ Support AI      │    │ Operations AI   │    │ Operations AI   │
│ - FAQ Handling  │    │ - Monitoring    │    │ - Content Gen   │
│ - SEO Education │    │ - Bug Detection │    │ - Email Automation│
│ - User Guidance │    │ - Health Checks │    │ - Subscription  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Architecture Overview

### Central Brain Components

**Knowledge Base**

- **Source Code**: Complete codebase embeddings (110+ components)
- **Documentation**: 113 files consolidated into 16 categories
- **Live Data**: Real-time access to 887K+ Firestore documents

**MCP Orchestrator**

- **LLM Router**: Intelligent model selection (GPT-4, Claude, Gemini)
- **Task Queue**: Async processing with background job management
- **Automation**: Integration with 88 npm scripts + pilotScripts framework

**Context Manager**

- **Session State**: Persistent conversation memory
- **User Context**: 5-tier subscription awareness (Free→Admin)
- **Role Permissions**: RBAC integration with Firebase Auth

### Specialized AI Agents

**Customer Support AI**

- Automated FAQ handling using knowledge base
- SEO education and concept explanation
- User guidance with step-by-step tutorials
- Smart escalation to human support

**Technical Operations AI**

- Real-time system monitoring and health checks
- Automated bug detection and diagnosis
- Performance optimization recommendations
- Proactive maintenance automation

**Business Operations AI**

- AI-powered SEO content generation
- Smart email campaigns and user engagement
- Subscription optimization and churn prevention
- Business analytics and insights

## Key Features

- **Unified Intelligence**: Single brain coordinating all AI operations
- **Context Awareness**: Full project understanding with role-based access
- **Scalable Design**: Modular agents deployable incrementally
- **MCP Integration**: Leverages existing 11 MCP server infrastructure
- **Security First**: 5-tier RBAC with comprehensive audit logging

## Implementation Status

✅ **Foundation Ready**: MCP infrastructure operational  
✅ **Knowledge Base**: Comprehensive documentation consolidated  
✅ **Security Layer**: 5-tier authentication system implemented  
🔄 **Agent Deployment**: Ready for Phase 1 implementation

---

_Source: DevAgents.md PilotBuddy AI Assistant Implementation Framework_  
_Last Updated: July 30, 2025_
