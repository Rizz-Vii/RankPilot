module.exports = {
  rules: {
    'no-inline-hex-colors': {
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value === 'string' && /#[0-9a-fA-F]{3,6}/.test(node.value)) {
              context.report({
                node,
                message: 'Inline hex color usage is forbidden. Use CSS tokens from globals.css.'
              });
            }
          }
        };
      }
    }
  }
};
