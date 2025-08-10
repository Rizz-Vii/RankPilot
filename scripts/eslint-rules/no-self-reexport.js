// Custom ESLint rule: no-self-reexport
// Prevents files from re-exporting themselves (directly) which can create infinite import loops in bundlers.

/** @type {import('eslint').Rule.RuleModule} */
export const rule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow self-referential re-exports that resolve to the current module' },
    schema: [],
    messages: {
      selfReexport: 'Self-referential re-export detected: {{specifier}} re-exports the current file. Point to the concrete implementation (e.g. ./file.tsx) or remove.',
    },
  },
  create(context) {
    const filename = context.getFilename();
    if (filename === '<input>' || filename.includes('node_modules')) return {};
    const path = require('path');
    const stem = path.basename(filename).replace(/\.[^.]+$/, '');
    function check(sourceValue, node){
      if (!sourceValue) return;
      if (!sourceValue.startsWith('./') && !sourceValue.startsWith('../')) return;
      const importedStem = path.basename(sourceValue).replace(/\.[^.]+$/, '');
      if (importedStem === stem) {
        context.report({ node, messageId: 'selfReexport', data: { specifier: sourceValue } });
      }
    }
    return {
      ExportAllDeclaration(node){ check(node.source && node.source.value, node); },
      ExportNamedDeclaration(node){ if (node.source) check(node.source.value, node); },
    };
  }
};

export default rule;
