// Converted from CommonJS require to ESM dynamic import helper to satisfy no-require-imports lint rule.
// Retained behavior: exporting the imported config.
export async function loadNextEslintConfig() {
    const mod = await import('eslint-config-next');
    return (mod && mod.default) ? mod.default : mod;
}
