# Technical Infrastructure Stack Architecture

**RankPilot Technical Infrastructure & Deployment Stack**

```
┌─────────────────────────────────────────────────────────────────┐
│                   Technical Infrastructure                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Frontend Layer  │  │ Backend Services│  │ External APIs   │ │
│  │ - Next.js 15.4.1│  │ - Firebase      │  │ - OpenAI GPT-4o │ │
│  │ - React 19      │  │ - Cloud Functions│  │ - 11 MCP Servers│ │
│  │ - TypeScript    │  │ - Firestore     │  │ - Stripe        │ │
│  │ - Tailwind CSS  │  │ - Auth          │  │ - Analytics     │ │
│  │ - shadcn/ui     │  │ - Node.js v20   │  │ - Sentry        │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼────────┐    ┌────────▼────────┐    ┌────────▼────────┐
│ Development     │    │ Production      │    │ CI/CD Pipeline  │
│ Environment     │    │ Environment     │    │ & Monitoring    │
│ - Local Dev     │    │ - Firebase Host │    │ - GitHub Actions│
│ - VS Code       │    │ - Australia-SE2 │    │ - Automated Test│
│ - Hot Reload    │    │ - Global CDN    │    │ - Deploy Gates  │
│ - Debug Tools   │    │ - Auto-scaling  │    │ - Performance   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Infrastructure Components

### Frontend Layer

**Next.js 15.4.1 Framework**

- App Router with server components
- React 19 with concurrent features
- TypeScript strict mode compilation
- 3072MB memory allocation for AI-heavy components

**UI & Styling**

- Tailwind CSS with responsive utilities
- shadcn/ui component library (110+ components)
- Framer Motion for animations
- Mobile-first design with 48px touch targets

### Backend Services

**Firebase Infrastructure**

- **Project**: rankpilot-h3jpc (australia-southeast2)
- **Cloud Functions**: Node.js v20 runtime
- **Firestore**: 887K+ documents across 15 collections
- **Authentication**: 5-tier subscription system
- **Storage**: Secure file handling with CDN

**Performance Optimizations**

- Edge function deployment
- Automatic scaling configuration
- Connection pooling
- Caching layers (client, CDN, server)

### External API Integration

**MCP Server Network (11 Servers)**

- **Firecrawl**: Web scraping & SEO analysis
- **Sentry**: Error monitoring & AI agent tracking  
- **HuggingFace**: ML models & conversational AI
- **Sequential Thinking**: Complex problem analysis
- **Stripe**: Payment & subscription management
- **Zapier**: Workflow automation
- **GitHub**: Repository management

**AI Services**

- **OpenAI GPT-4o**: Primary language model
- **Claude 3.5 Sonnet**: Alternative processing
- **Gemini Pro**: Multi-modal capabilities

## Deployment Architecture

### Development Environment

**Local Development**

- **Command**: `npm run dev-no-turbopack`
- **Port**: 3000 with hot reload
- **Memory**: 6144MB for AI components
- **Tools**: VS Code with GitHub Copilot

**Testing Infrastructure**

- **Playwright**: 153 tests across 8 categories
- **Configurations**: 12 specialized test configs
- **Mobile Testing**: Device emulation & touch validation
- **Performance**: Core Web Vitals monitoring

### Production Environment

**Hosting & CDN**

- **Primary**: Firebase Hosting (australia-southeast2)
- **CDN**: Global edge distribution
- **SSL**: Automatic certificate management
- **Domains**: Custom domain with DNS optimization

**Scaling Configuration**

- **Auto-scaling**: Based on CPU and memory usage
- **Load Balancing**: Multi-region distribution
- **Database**: Firestore with regional replication
- **Monitoring**: Real-time performance tracking

### CI/CD Pipeline

**GitHub Actions Workflow**

- **Trigger**: Push to master branch
- **Build**: TypeScript compilation validation
- **Test**: Automated test suite execution
- **Deploy**: Firebase deployment with rollback capability

**Quality Gates**

- **TypeScript**: Zero compilation errors
- **Testing**: 98.2% pass rate requirement
- **Performance**: Lighthouse score > 90
- **Security**: Vulnerability scanning

## Configuration Management

### Environment Variables

**Development**

```bash
NEXT_PUBLIC_FIREBASE_PROJECT_ID=rankpilot-h3jpc
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=rankpilot-h3jpc.firebaseapp.com
NODE_OPTIONS=--max-old-space-size=6144
```

**Production**

```bash
FIREBASE_PROJECT_ID=rankpilot-h3jpc
FIREBASE_REGION=australia-southeast2
NODE_ENV=production
```

### Build Optimization

**Next.js Configuration**

- **Bundle Size**: Optimized with tree shaking
- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js Image component
- **Font Optimization**: Google Fonts with preloading

**Emergency Configurations**

- **ESLint Fallback**: `eslint.config.emergency.mjs`
- **Build Emergency**: `scripts/build-skip-typecheck.js`
- **Memory Management**: High-memory test configurations

## Performance Metrics

### Current Status

✅ **Build Success**: 100% TypeScript compilation  
✅ **Lighthouse Score**: 94/100 average  
✅ **Core Web Vitals**: Optimized for mobile  
✅ **Test Coverage**: 98.2% pass rate  
✅ **Deployment**: Automated with zero downtime  

### Scaling Targets

- **Concurrent Users**: 10,000+ with auto-scaling
- **Response Time**: <500ms at 95th percentile
- **Uptime**: 99.99% with multi-region failover
- **Database Performance**: <50ms average query time

---

*Architecture Reference: COMPREHENSIVE_SYSTEM_ARCHITECTURE.md*  
*Last Updated: July 30, 2025*
