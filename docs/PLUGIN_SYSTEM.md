# Plugin System Documentation

## Overview

The PilotBuddy Central Brain includes a flexible plugin system that allows extending functionality through custom runners and validators. The plugin system dynamically loads plugins from the `scripts/brain/plugins/` directory and integrates them into the core system.

## Plugin Architecture

### Plugin Structure

A plugin is a TypeScript or JavaScript file with the naming pattern `*.plugin.ts` or `*.plugin.js` that exports:

- `runners`: An array of `ToolRunner` objects
- `validators`: An array of validator functions

### Example Plugin

```typescript
import type { ToolRunner } from '../../../types/brain';

export const ExampleEchoRunner: ToolRunner = {
    name: 'ExampleEchoRunner',
    supports: () => true,
    run: async () => ({ ok: true, note: 'echo:ok' })
};

export async function ExamplePluginValidator(ctx: any) {
    return { name: 'ExamplePluginValidator', status: 'skip', note: 'example plugin validator' };
}

// Export for system integration
export const runners = [ExampleEchoRunner];
export const validators = [ExamplePluginValidator];
```

## Creating a Plugin

### 1. Create Plugin File

Create a new file in `scripts/brain/plugins/` with the naming pattern `yourplugin.plugin.ts`:

```typescript
import type { ToolRunner } from '../../../types/brain';

// Define your custom runner
export const CustomRunner: ToolRunner = {
    name: 'CustomRunner',
    supports: (domain: string) => domain === 'your-domain',
    run: async (plan: any, opts: any) => {
        // Your custom logic here
        return { ok: true, note: 'custom runner executed' };
    }
};

// Define your custom validator
export async function CustomValidator(ctx: any) {
    // Your validation logic here
    return {
        name: 'CustomValidator',
        status: 'pass', // 'pass', 'fail', 'skip', 'error'
        note: 'validation completed'
    };
}

// Required exports
export const runners = [CustomRunner];
export const validators = [CustomValidator];
```

### 2. ToolRunner Interface

Your runners must implement the `ToolRunner` interface:

```typescript
interface ToolRunner {
    name: string;                           // Unique name for the runner
    supports(domain: string): boolean;      // Which domains this runner supports
    run(plan: any, opts: any): Promise<any>; // Execute the runner logic
}
```

### 3. Validator Function

Validators should follow this signature:

```typescript
type ValidatorFunction = (ctx: any) => Promise<{
    name: string;           // Validator name
    status: string;         // 'pass', 'fail', 'skip', 'error'
    note?: string;          // Optional details
}>;
```

## Configuration

### Plugin Configuration Options

Add plugin configuration to your `brain.config.json`:

```json
{
    "plugins": {
        "enabled": true,        // Enable/disable all plugins
        "loadPlugins": true     // Control plugin loading
    }
}
```

### Default Configuration

Plugins are enabled by default with these settings:

```typescript
{
    plugins: {
        enabled: true,
        loadPlugins: true
    }
}
```

### Disabling Plugins

To disable plugins entirely:

```json
{
    "plugins": {
        "enabled": false
    }
}
```

Or to prevent plugin loading:

```json
{
    "plugins": {
        "loadPlugins": false
    }
}
```

## Plugin Loading Process

1. **Discovery**: System scans `scripts/brain/plugins/` for `*.plugin.ts` and `*.plugin.js` files
2. **Filtering**: Excludes `index.ts` and `index.js` files
3. **Loading**: Requires each plugin file and extracts runners/validators
4. **Integration**: Merges plugin runners into tool registry and validators into validation system
5. **Error Handling**: Failed plugin loads are tracked but don't break the system

## Integration Points

### Tool Registry

Plugin runners are automatically merged into the core tool registry:

```typescript
// In toolRegistry.ts
export function getRegistry(cfg?: any): ToolRunner[] {
    const base = [/* core runners */];
    try {
        const plugins = loadPlugins(cfg);
        if (plugins.runners.length) return [...base, ...plugins.runners];
    } catch { }
    return base;
}
```

### Validation System

Plugin validators are integrated into the validation pipeline:

```typescript
// In validators.ts
if (ctx.plugins?.validators?.length) {
    for (const v of ctx.plugins.validators) {
        try { 
            pluginResults.push(await v(ctx)); 
        } catch (e: any) { 
            pluginResults.push({ 
                name: 'plugin-error', 
                status: 'error', 
                note: e?.message || 'error' 
            }); 
        }
    }
}
```

## Best Practices

### 1. Error Handling

Always implement proper error handling in your plugins:

```typescript
export const SafeRunner: ToolRunner = {
    name: 'SafeRunner',
    supports: () => true,
    run: async (plan, opts) => {
        try {
            // Your logic here
            return { ok: true, note: 'success' };
        } catch (error) {
            return { ok: false, note: `Error: ${error.message}` };
        }
    }
};
```

### 2. Domain Support

Be specific about which domains your runner supports:

```typescript
export const SpecificRunner: ToolRunner = {
    name: 'SpecificRunner',
    supports: (domain: string) => ['frontend', 'docs'].includes(domain),
    run: async (plan, opts) => {
        // Implementation
    }
};
```

### 3. Validation Status

Use appropriate validation statuses:

- `'pass'`: Validation succeeded
- `'fail'`: Validation failed (should block execution)
- `'skip'`: Validation was skipped (not applicable)
- `'error'`: Validation encountered an error

## Testing

### Plugin Detection Test

Test that your plugin is detected:

```javascript
const { loadPlugins } = require('./scripts/brain/plugins');
const plugins = loadPlugins();
assert(plugins.names.includes('yourplugin'));
```

### Configuration Test

Test plugin configuration:

```javascript
const plugins = loadPlugins({ plugins: { enabled: false } });
assert(plugins.names.includes('disabled'));
```

## Troubleshooting

### Plugin Not Loading

1. Check file naming: Must end with `.plugin.ts` or `.plugin.js`
2. Verify exports: Must export `runners` and `validators` arrays
3. Check syntax: TypeScript compilation errors prevent loading
4. Review configuration: Ensure plugins are enabled

### Plugin Errors

Check the plugin names array for error entries:

```javascript
const plugins = loadPlugins();
const errors = plugins.names.filter(name => name.startsWith('error:'));
console.log('Plugin errors:', errors);
```

### Missing Directory

The system gracefully handles missing plugin directories by returning empty arrays.

## Advanced Usage

### Dynamic Plugin Loading

Plugins can be conditionally loaded based on environment or configuration:

```typescript
export const ConditionalRunner: ToolRunner = {
    name: 'ConditionalRunner',
    supports: (domain: string) => {
        // Only support in development
        return process.env.NODE_ENV === 'development' && domain === 'dev';
    },
    run: async (plan, opts) => {
        // Development-only logic
    }
};
```

### Plugin Dependencies

Ensure your plugin handles dependencies gracefully:

```typescript
export async function DependentValidator(ctx: any) {
    try {
        const dependency = require('optional-dependency');
        // Use dependency
        return { name: 'DependentValidator', status: 'pass' };
    } catch (e) {
        return { 
            name: 'DependentValidator', 
            status: 'skip', 
            note: 'Optional dependency not available' 
        };
    }
}
```

## Security Considerations

- Plugins run with the same permissions as the brain system
- Validate all inputs in your plugin code
- Avoid executing untrusted code
- Consider sandboxing for third-party plugins

## Future Enhancements

- Plugin versioning and compatibility checks
- Plugin dependency management
- Hot reloading of plugins
- Plugin marketplace integration
- Remote plugin loading