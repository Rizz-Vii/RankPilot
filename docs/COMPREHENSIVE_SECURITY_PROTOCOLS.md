# COMPREHENSIVE SECURITY PROTOCOLS

**Generated:** 7/26/2025
**Consolidation Status:** Comprehensive merger of 3 related documents
**Source Files:** comprehensive/SECURITY_AND_GITIGNORE_COMPREHENSIVE.md, security/SECURITY_ROTATION.md, security/GITIGNORE_STRATEGY.md

---

## 1. SECURITY AND GITIGNORE COMPREHENSIVE

**Source:** `comprehensive/SECURITY_AND_GITIGNORE_COMPREHENSIVE.md`

## Table of Contents

1. [GitIgnore Strategy](#gitignore-strategy)
   - [Structure](#structure)
   - [Main Project .gitignore](#main-project-gitignore)
   - [Firebase Functions .gitignore](#firebase-functions-gitignore)
   - [Tests .gitignore](#tests-gitignore)
   - [Best Practices](#gitignore-best-practices)
2. [Security Rotation](#security-rotation)
   - [Firebase Service Account Rotation](#firebase-service-account-rotation)
   - [API Keys Rotation](#api-keys-rotation)
   - [Test Account Security](#test-account-security)
   - [After Rotation](#after-rotation)

---

## GitIgnore Strategy

### Overview

This section outlines the comprehensive `.gitignore` strategy for RankPilot (Studio), designed to handle all aspects of the modern AI-first SEO SaaS platform development.

### Structure

#### Main Project `.gitignore`

**Location:** `/.gitignore`  
**Purpose:** Primary ignore file for the entire project  
**Categories:**

- Node.js dependencies and package managers
- Next.js build artifacts
- TypeScript compilation outputs
- Testing and coverage reports
- Firebase and cloud services
- AI framework (Genkit) files
- Environment variables and secrets
- Development tools and IDEs
- OS-generated files
- Logs and debugging
- Cache and temporary files
- Performance monitoring data

#### Firebase Functions `.gitignore`

**Location:** `/functions/.gitignore`  
**Purpose:** Specific ignores for Firebase Cloud Functions  
**Categories:**

- TypeScript compilation output
- Node.js dependencies
- Firebase-specific logs
- AI and caching for serverless functions
- Temporary files

#### Tests `.gitignore`

**Location:** `/tests/.gitignore`  
**Purpose:** Test-specific ignores  
**Categories:**

- Test artifacts and screenshots
- Performance testing results
- Test coverage reports
- Authentication test artifacts

### Implementation

```bash
# Main .gitignore (root directory)
# Node dependencies
node_modules/
package-lock.json

# Next.js build output
.next/
out/
build/
dist/

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Testing
coverage/
.nyc_output/
test-results/
playwright-report/
e2e-results/

# Firebase
firebase-debug.log
firestore-debug.log
ui-debug.log
.firebase/
.firebaserc

# Genkit AI
.genkit/
genkit-cache/
ai-output/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env*.local
!.env.example

# Editor directories and files
.idea/
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
*.sublime-workspace

# OS files
.DS_Store
Thumbs.db
ehthumbs.db
Desktop.ini

# Logs and debugging
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
debug.log*

# Cache and temp
.cache/
.temp/
.tmp/
tmp/
temp/
.eslintcache
.stylelintcache
.prettiercache

# Performance
.lighthouse/
.pagespeed/
.performance/
```

### GitIgnore Best Practices

1. **Environment Variables**: Never commit `.env` files except for `.env.example`
2. **Dependencies**: Always ignore `node_modules` and lock files unless necessary
3. **IDE Config**: Commit useful IDE configurations but ignore workspace files
4. **Build Artifacts**: Never commit build outputs or compilation artifacts
5. **Testing**: Ignore test results but commit test configuration files
6. **Firebase**: Ignore all Firebase debug and local emulator files
7. **AI Components**: Ignore AI cache and temporary generation files

---

## Security Rotation

### Overview

This section provides step-by-step instructions for secure rotation of credentials and API keys for RankPilot.

### Firebase Service Account Rotation

1. Go to [Firebase Console](https://console.firebase.google.com/project/rankpilot-h3jpc/settings/serviceaccounts/adminsdk)
2. Click "Generate New Private Key"
3. Save the new JSON file temporarily
4. Update .env.test with the new credentials
5. Delete the JSON file after updating

### API Keys Rotation

#### Firebase Web API Key

1. Go to [Firebase Console](https://console.firebase.google.com/project/rankpilot-h3jpc/settings/general)
2. Under "Your apps", find the Web app
3. Click "..." and select "Configure"
4. Copy the new API key
5. Update FIREBASE_API_KEY in .env.test

#### OpenAI API Key

1. Go to [OpenAI API Dashboard](https://platform.openai.com/api-keys)
2. Create a new API key
3. Update OPENAI_API_KEY in .env.test and .env.local
4. Revoke the old API key

#### Genkit Keys

1. Go to [Genkit Dashboard](https://app.genkit.ai/api-keys)
2. Generate a new API key
3. Update GENKIT_API_KEY in .env.test
4. Delete the old key

### Test Account Security

1. Rotate all test account passwords:
   - test@rankpilot.ai
   - agency@rankpilot.ai
   - enterprise@rankpilot.ai
   - admin@rankpilot.ai
2. Update the test account passwords in .env.test
3. Update test fixtures in `/tests/fixtures/auth.js`

### After Rotation

1. Run `npm run test:security` to verify all keys are working
2. Update the rotation date in SECURITY_ROTATION.md
3. Commit only the rotation date update, not any keys or credentials
4. Notify team members via secure channel about the rotation

### Rotation Schedule

| Credential Type | Rotation Frequency | Last Rotated | Next Rotation |
|-----------------|-------------------|--------------|--------------|
| Firebase Service Account | Quarterly | July 9, 2025 | October 9, 2025 |
| Firebase API Key | Quarterly | July 9, 2025 | October 9, 2025 |
| OpenAI API Key | Monthly | July 9, 2025 | August 9, 2025 |
| Genkit API Key | Monthly | July 9, 2025 | August 9, 2025 |
| Test Accounts | Quarterly | July 9, 2025 | October 9, 2025 |

---

## Integration

### Security & GitIgnore Integration

The security rotation process integrates with our gitignore strategy:

1. **Secret Protection**: Our gitignore ensures all `.env` files are excluded
2. **Temporary Files**: Any downloaded credential files are excluded
3. **Log Files**: Authentication logs are properly excluded
4. **Test Fixtures**: Test fixtures with authentication are specifically included with dummy data
5. **Exception Handling**: The `.env.example` file is explicitly included

### Automated Security Checks

```typescript
// security/verify-key-rotation.ts
import { checkAPIKeyAge } from './utils/key-utils';
import { notifyTeam } from './utils/notification';

export async function verifyKeyRotation() {
  const results = await Promise.all([
    checkAPIKeyAge('firebase', 90), // 90 days for Firebase
    checkAPIKeyAge('openai', 30),   // 30 days for OpenAI
    checkAPIKeyAge('genkit', 30)    // 30 days for Genkit
  ]);
  
  const expiredKeys = results.filter(r => r.needsRotation);
  
  if (expiredKeys.length > 0) {
    await notifyTeam({
      subject: 'API Keys Need Rotation',
      keys: expiredKeys.map(k => k.name),
      lastRotated: expiredKeys.map(k => k.lastRotated)
    });
    
    return {
      status: 'warning',
      message: `${expiredKeys.length} keys need rotation`,
      details: expiredKeys
    };
  }
  
  return {
    status: 'success',
    message: 'All keys are current'
  };
}
```

## Best Practices

### Security

1. **Never Commit Secrets**: Always use environment variables
2. **Rotation Schedule**: Adhere strictly to the rotation schedule
3. **After Rotation**: Always run tests to verify functionality
4. **Documentation**: Update the rotation date in this document
5. **Secure Storage**: Use secure password manager for team access

### GitIgnore

1. **Regular Updates**: Update gitignore patterns as project evolves
2. **Check Before Commits**: Always check git status before committing
3. **Global Patterns**: Use global gitignore for developer-specific files
4. **Comments**: Maintain comments for each section in gitignore files
5. **Verification**: Periodically verify no sensitive files are committed

---

## 2. SECURITY ROTATION

**Source:** `security/SECURITY_ROTATION.md`

(See original SECURITY_ROTATION.md for content.)

---

## 3. GITIGNORE STRATEGY

**Source:** `security/GITIGNORE_STRATEGY.md`

(See original GITIGNORE_STRATEGY.md for content.)

---

