export const rule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow raw hex colors outside allowlist; enforce design tokens.' },
    schema: [
      {
        type: 'object',
        properties: {
          allow: { type: 'array', items: { type: 'string' } },
          allowPaletteFiles: { type: 'array', items: { type: 'string' } }
        },
        additionalProperties: false
      }
    ]
  },
  create(context){
    const opts = context.options?.[0] || {};
    const allowList = new Set([
      '#111','#6699CC','#4285F4','#34A853','#FBBC05','#EA4335', // brand/email essentials
      ...(opts.allow || [])
    ]);
    const paletteAllow = new Set(opts.allowPaletteFiles || []);
    const filename = context.getFilename();
    // If file is in palette allow list, skip (lets us migrate gradually)
    if ([...paletteAllow].some(f => filename.endsWith(f))) {
      return { Program(){} };
    }
    const HEX = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
    return {
      Program(node){
        const text = context.sourceCode.getText();
        let m; while((m = HEX.exec(text))){
          const value = m[0];
          if(!allowList.has(value)){
            context.report({ node, loc: context.sourceCode.getLocFromIndex(m.index), message: `Raw hex color ${value} detected. Use design tokens or add to allowlist if justified.` });
          }
        }
      }
    };
  }
};
