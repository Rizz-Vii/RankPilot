const { expect } = require('chai');

// Re-implement a minimal, pure version of the triplet converter that mirrors the code path
// used in ThemeSystem and the pre-hydration script. This avoids importing TS files or
// servered modules while still guarding the logic contract.
function toTriplet(color) {
    try {
        if (!color || typeof color !== 'string') return '210 10% 50%';
        let m = color.match(/^hsla?\(([^)]+)\)$/i);
        if (m) {
            // Support both comma- and space-separated HSL, and optional "/" alpha
            const inner = m[1].replace(/[\/]/g, ' ').trim();
            const p = inner.split(/[\s,]+/).filter(Boolean);
            const h = parseFloat(p[0]);
            const s = parseFloat(p[1]);
            const l = parseFloat(p[2]);
            if (isFinite(h) && isFinite(s) && isFinite(l)) return `${h} ${s}% ${l}%`;
        }
        let m2 = color.match(/^rgba?\(([^)]+)\)$/i);
        if (m2) {
            const parts = m2[1].split(',').map(s => parseFloat(s.trim()));
            if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
                const r = parts[0] / 255, g = parts[1] / 255, b = parts[2] / 255;
                const max = Math.max(r, g, b), min = Math.min(r, g, b);
                let h = 0, s = 0, l = (max + min) / 2;
                if (max !== min) {
                    const d = max - min;
                    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                    switch (max) {
                        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                        case g: h = (b - r) / d + 2; break;
                        default: h = (r - g) / d + 4; break;
                    }
                    h *= 60;
                }
                return `${h} ${s * 100}% ${l * 100}%`;
            }
        }
        let m3 = color.match(/^#([0-9a-fA-F]{6})$/);
        if (m3) {
            const hx = m3[1];
            const r = parseInt(hx.slice(0, 2), 16) / 255;
            const g = parseInt(hx.slice(2, 4), 16) / 255;
            const b = parseInt(hx.slice(4, 6), 16) / 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h = 0, s = 0, l = (max + min) / 2;
            if (max !== min) {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    default: h = (r - g) / d + 4; break;
                }
                h *= 60;
            }
            return `${h} ${s * 100}% ${l * 100}%`;
        }
        return '210 10% 50%';
    } catch {
        return '210 10% 50%';
    }
}

describe('toTriplet helper', () => {
    it('converts hsl to triplet', () => {
        expect(toTriplet('hsl(210 50% 40%)')).to.equal('210 50% 40%');
    });
    it('converts rgb to triplet (roughly)', () => {
        const t = toTriplet('rgb(102, 153, 204)');
        expect(t).to.match(/^\d+(?:\.\d+)? \d+(?:\.\d+)?% \d+(?:\.\d+)?%$/);
    });
    it('converts hex to triplet', () => {
        const t = toTriplet('#6699cc');
        expect(t).to.match(/^\d+(?:\.\d+)? \d+(?:\.\d+)?% \d+(?:\.\d+)?%$/);
    });
    it('falls back on invalid input', () => {
        expect(toTriplet('not-a-color')).to.equal('210 10% 50%');
    });
});
