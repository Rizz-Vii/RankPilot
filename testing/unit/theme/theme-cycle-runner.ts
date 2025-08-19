// Minimal standalone runner to validate ThemeSystem cycle without mocha.
import path from 'path';
import Module from 'module';

// Mock classListManager alias resolution before importing theme system
const originalResolve = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (request: string, parent: any, isMain: boolean, options: any) {
    if (request === '@/lib/dom/classListManager') {
        return path.join(process.cwd(), 'testing/unit/theme/__classListManagerMock__.ts');
    }
    return originalResolve.call(this, request, parent, isMain, options);
};

// Provide minimal DOM if absent
if (typeof document === 'undefined') {
    const styleStore: Record<string, string> = {};
    const style = { setProperty: (k: string, v: string) => { styleStore[k] = v; } };
    const classSet = new Set<string>();
    const body: any = {
        className: '',
        classList: {
            add: (c: string) => { classSet.add(c); body.className = Array.from(classSet).join(' '); },
            remove: (c: string) => { classSet.delete(c); body.className = Array.from(classSet).join(' '); },
            contains: (c: string) => classSet.has(c)
        }
    };
    // @ts-ignore
    global.document = { documentElement: { style }, body } as any;
    // @ts-ignore
    global.__styleStore = styleStore;
    // Mock localStorage & document.cookie for persistence calls
    // @ts-ignore
    global.localStorage = { _s: {} as Record<string, string>, getItem(k: string) { return this._s[k] || null; }, setItem(k: string, v: string) { this._s[k] = v; }, removeItem(k: string) { delete this._s[k]; } };
    // @ts-ignore
    global.document.cookie = '';
}

// Ensure body exists before importing theme system
if (typeof document !== 'undefined' && !document.body) {
    // @ts-ignore
    document.body = { className: '', classList: { add() { }, remove() { }, contains() { return false; } } };
}
// Force load theme system (which will then call applyTheme when constructed)
import type { ThemeMode } from '../../../src/lib/themes/theme-system';
import { themeSystem } from '../../../src/lib/themes/theme-system';

function assert(cond: any, msg: string) { if (!cond) throw new Error(msg); }

try {
    const order: ThemeMode[] = ['light', 'dark', 'high-contrast', 'auto'];
    // Kick initial application
    themeSystem.setTheme('light');
    for (const mode of order) {
        themeSystem.setTheme(mode);
        const bodyClass = document.body.className;
        console.log('After setTheme', mode, '->', bodyClass);
        if (!/theme-(light|dark|high-contrast)/.test(bodyClass)) {
            throw new Error(`Missing theme-* class after setting ${mode}: ${bodyClass}`);
        }
        if (mode === 'dark') {
            assert(themeSystem.isDark(), 'isDark() should be true in dark mode');
        }
        if (mode === 'high-contrast') {
            assert(themeSystem.isHighContrast(), 'isHighContrast() should be true');
            assert(!themeSystem.isDark(), 'isDark() must be false in high-contrast');
        }
    }
    // Basic CSS var check
    // @ts-ignore
    const vars = global.__styleStore as Record<string, string> | undefined;
    if (vars) {
        assert(Object.keys(vars).some(k => k === '--background'), 'Expected --background variable to be set');
    }
    console.log('Theme cycle runner: PASS');
} catch (e: any) {
    console.error('Theme cycle runner: FAIL ->', e.message);
    process.exitCode = 1;
}
