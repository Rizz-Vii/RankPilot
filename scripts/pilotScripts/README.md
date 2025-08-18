# PilotScripts Directory

This directory contains collaborative scripts developed during PilotBuddy sessions with the RankPilot (Studio) project.

## Directory Structure

```
pilotScripts/
├── documentation/          # Documentation-related scripts
│   └── cleanup-consolidated-docs.ps1
├── testing/               # Testing automation scripts
├── deployment/            # Deployment and build scripts  
├── optimization/          # Performance and optimization scripts
├── utilities/             # General utility scripts
└── automation/            # Automated recurring tasks
```

## Usage Guidelines

### Running Scripts

All scripts should be executed from the project root directory:

```powershell
# Example: Run documentation cleanup
.\pilotScripts\documentation\cleanup-consolidated-docs.ps1 -DryRun

# Example: Run with verbose output
.\pilotScripts\documentation\cleanup-consolidated-docs.ps1 -Verbose
```

### Script Standards

- **PowerShell-First**: Primary scripting language for Windows environment
- **Safety Features**: Include dry-run modes and confirmation prompts
- **Logging**: Comprehensive logging to `logs/` directory
- **Error Handling**: Graceful error handling with meaningful messages
- **Documentation**: Clear usage instructions and parameter descriptions

## Current Scripts

### Documentation Scripts

#### cleanup-consolidated-docs.ps1

- **Purpose**: Safely removes consolidated source files after documentation consolidation
- **Safety Features**: Dry-run mode, comprehensive file verification, user confirmation
- **Usage**: `.\pilotScripts\documentation\cleanup-consolidated-docs.ps1 -DryRun`
- **Created**: July 22, 2025

#### consolidate-documentation.ps1

- **Purpose**: Automated consolidation of scattered documentation files into comprehensive guides
- **Features**: Automated TOC generation, cross-reference linking, backup creation
- **Usage**: `.\pilotScripts\documentation\consolidate-documentation.ps1`
- **Status**: Under maintenance (PowerShell syntax fix needed)
- **Created**: July 2025

### Cloud Development Scripts

#### GitHub Codespace Setup (Automated)

- **Purpose**: Rapid cloud development environment deployment for performance-constrained machines
- **Features**: 4-core VM, pre-configured Node.js, VS Code integration, port forwarding
- **Commands**: 

  ```powershell
  gh codespace create --repo Rizz-Vii/studio --branch feature/performance-optimization-mobile-enhancement --machine standardLinux32gb
  gh codespace code --codespace [codespace-id]
  ```

- **Benefits**: Eliminates local performance issues, maintains full GitHub Copilot integration
- **Implemented**: July 26, 2025

#### consolidate-documentation.ps1

- **Purpose**: Automates the entire documentation consolidation process
- **Features**: Content merging, TOC generation, backup creation, source cleanup
- **Safety Features**: Dry-run mode, backup creation, rollback capabilities
- **Usage**: `.\pilotScripts\documentation\consolidate-documentation.ps1 -DryRun -Verbose`
- **Created**: July 22, 2025

## Development Protocol

When creating new scripts during PilotBuddy sessions:

1. **Categorize**: Place script in appropriate subdirectory
2. **Document**: Include header with purpose, author, and date
3. **Test**: Verify script works with dry-run modes
4. **Log**: Update this README with new script descriptions

- **Examples**:
  - `auto-markdown-lint.ps1` - Automatic markdown linting on changes
  - `auto-test-runner.js` - Automated testing workflows
  - `auto-build-validator.ts` - Build validation automation

### `/solutions/`

**Purpose**: Scripts generated from solved problems for future reuse

- **File Pattern**: `solution-{problem-category}-{id}.{ext}`
- **Examples**:
  - `solution-eslint-compatibility-001.js` - ESLint fallback configuration
  - `solution-mobile-performance-002.ts` - Mobile optimization scripts
  - `solution-auth-testing-003.ps1` - Authentication testing utilities

### `/utilities/`

**Purpose**: General-purpose utility scripts for development efficiency

- **File Pattern**: `util-{function-name}.{ext}`
- **Examples**:
  - `util-file-organizer.ps1` - File organization utilities
  - `util-metric-tracker.js` - Development metrics tracking
  - `util-dependency-checker.ts` - Dependency validation tools

## Script Naming Convention

### Automation Scripts

```
auto-{task-name}-{version}.{ext}
Example: auto-markdown-lint-v1.ps1
```

### Solution Scripts

```
solution-{category}-{identifier}-{version}.{ext}
Example: solution-eslint-config-001-v2.js
```

### Utility Scripts

```
util-{function}-{variant}.{ext}
Example: util-file-organizer-batch.ps1
```

## Integration with PilotBuddy

### Auto-Generation Triggers

1. **Problem Solved**: When PilotBuddy identifies a solved problem that can be scripted
2. **Pattern Recognition**: When recurring manual tasks are detected
3. **Solution Validation**: When a solution is proven effective across multiple uses

### Script Metadata

Each script includes header with:

```javascript
/**
 * @pilotbuddy-script
 * @category: {automation|solution|utility}
 * @problem: Brief description of solved problem
 * @usage: How to execute the script
 * @generated: Auto-generated timestamp
 * @pattern-id: Reference to PilotBuddy learning pattern
 */
```

## File Organization Rules

### Version Control

- Scripts are versioned: `v1`, `v2`, etc.
- Previous versions retained for rollback capability
- Change log maintained in script header

### Cross-Reference System

- Each script tagged with problem pattern ID
- Solutions linked to original problem documentation
- Usage examples included in script headers

### Automation Integration

- Scripts integrated with npm package.json commands
- PowerShell scripts optimized for Windows development
- Node.js scripts for cross-platform compatibility

---

**Status**: ✅ **STRUCTURE READY**  
**Next**: PilotBuddy will auto-populate with generated scripts
