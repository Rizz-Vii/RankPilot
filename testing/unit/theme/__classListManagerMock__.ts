const base = new Set(['font-body', 'antialiased', 'h-full', 'lang-en']);
const flags = new Set<string>();
let themeToken = 'theme-light';

function rebuild() {
    const ordered = [...base, ...flags, themeToken];
    if (typeof document !== 'undefined') {
        document.body.className = ordered.join(' ');
    }
}

export function setThemeClass(theme: string, highContrast: boolean) {
    themeToken = `theme-${highContrast ? 'high-contrast' : theme}`;
    rebuild();
}
export function setFlag(flag: string, enabled: boolean) {
    if (enabled) flags.add(flag); else flags.delete(flag);
    rebuild();
}
export function setLanguageClass(code: string) {
    // Replace existing lang-* token
    [...base].forEach(c => { if (c.startsWith('lang-')) base.delete(c); });
    base.add(`lang-${code}`);
    rebuild();
}
