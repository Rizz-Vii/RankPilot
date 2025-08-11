export const rule = {
  meta: { type: 'suggestion', docs: { description: 'Disallow raw hex colors outside allowlist; enforce design tokens.' }, schema: [] },
  create(context){
    const allow = new Set(['#111','#6699CC','#4285F4','#34A853','#FBBC05','#EA4335']); // allow brand/email essentials
    const HEX = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
    return {
      Program(node){
        const text = context.sourceCode.getText();
        let m; while((m = HEX.exec(text))){
          const value = m[0];
            if(!allow.has(value)){
              context.report({ node, loc: context.sourceCode.getLocFromIndex(m.index), message: `Raw hex color ${value} detected. Use design tokens or add to allowlist if justified.` });
            }
        }
      }
    };
  }
};
