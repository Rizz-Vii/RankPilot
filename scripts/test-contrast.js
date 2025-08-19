// Basic static contrast test for HTML files
const fs = require('fs');
const path = require('path');
const htmlFiles = [
  'public/firebase-welcome.html',
  'public/404.html',
  'user-cleanup-tool.html'
];
const colorRegex = /color:\s*([^;]+);/g;
const bgRegex = /background(?:-color)?:\s*([^;]+);/g;

// Basic token -> hex approximation map (expand as needed)
const tokenMap = {
  '--foreground': 'rgb(26,26,26)',
  '--background': 'rgb(255,255,255)',
  '--primary': 'rgb(59,130,246)',
  '--primary-foreground': 'rgb(255,255,255)',
  '--success': 'rgb(22,163,74)',
  '--success-foreground': 'rgb(255,255,255)',
  '--warning': 'rgb(245,158,11)',
  '--warning-foreground': 'rgb(26,26,26)',
  '--destructive': 'rgb(220,38,38)',
  '--destructive-foreground': 'rgb(255,255,255)',
  '--accent': 'rgb(124,58,237)',
  '--accent-foreground': 'rgb(255,255,255)',
  '--muted': 'rgb(243,243,243)',
  '--muted-foreground': 'rgb(85,85,85)'
};

function resolveColor(val) {
  val = val.trim();
  // Direct hex
  if (/^#/.test(val)) return val;
  // hsl(var(--token)) pattern
  const tokenMatch = val.match(/var\((--[a-z0-9-]+)\)/i);
  if (tokenMatch) {
    const token = tokenMatch[1];
    if (tokenMap[token]) return tokenMap[token];
  }
  // rgb/rgba quick parse
  if (/^rgb/.test(val)) {
    const nums = val.replace(/rgba?\(|\)/g,'').split(',').map(x=>parseFloat(x));
    if (nums.length >=3) {
      return '#' + nums.slice(0,3).map(n=> {
        const h = Math.round(n).toString(16).padStart(2,'0');
        return h;
      }).join('');
    }
  }
  return null; // unresolvable
}
function luminance(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  const rgb = [0, 1, 2].map(i => parseInt(hex.substr(i * 2, 2), 16) / 255);
  return rgb.map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
}
function contrast(l1, l2) {
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
htmlFiles.forEach(file => {
  const content = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  let match, colors = [], bgs = [];
  while ((match = colorRegex.exec(content))) colors.push(match[1]);
  while ((match = bgRegex.exec(content))) bgs.push(match[1]);
  colors.forEach(c => {
    bgs.forEach(b => {
      const rc = resolveColor(c);
      const rb = resolveColor(b);
      if (rc && rb && /^#/.test(rc) && /^#/.test(rb)) {
        const l1 = luminance(rc).reduce((a, b) => a + b) / 3;
        const l2 = luminance(rb).reduce((a, b) => a + b) / 3;
        const ratio = contrast(l1, l2);
        if (ratio < 3) {
          console.warn(`${file}: Contrast ratio too low (${ratio.toFixed(2)}) for ${c} on ${b}`);
        }
      }
    });
  });
});
