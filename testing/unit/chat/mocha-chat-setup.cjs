// Register ts-node with JSX support and alias resolution for @/
require('ts-node').register({ transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'CommonJS', moduleResolution: 'node10', baseUrl: '.', paths: { "@/*": ["src/*"] } } });
// Alias fallback for runtime resolver
const Module = require('module');
const path = require('path');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options){
  if(request.startsWith('@/')){
    const p = path.join(process.cwd(), 'src', request.slice(2));
    return origResolve.call(this, p, parent, isMain, options);
  }
  return origResolve.call(this, request, parent, isMain, options);
};
// jsdom baseline
require('../../mocha-jsdom-setup.cjs');
