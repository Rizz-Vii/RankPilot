#!/usr/bin/env node
/**
 * prune-unused-params.js
 * Safe unused parameter codemod (dry-run unless APPLY=1):
 *  - For each function/method/arrow/function expression in .ts/.tsx files under src
 *  - Identify parameters that are never referenced in the function body.
 *  - If such a parameter is the last positional parameter, remove it; otherwise rename to _<name>.
 *  - Skip params already starting with '_' (assumed intentionally ignored)
 *  - Skip destructured params, rest params, params with initializers (complex / possibly public API)
 *  - Skip React component first param (heuristic): file is .tsx AND function name starts with uppercase OR body contains JSX.
 *  - Idempotent: repeated runs cause no further changes.
 *  - Outputs JSON summary at end.
 */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const APPLY = process.env.APPLY === "1";
const root = process.cwd();

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        [
          "node_modules",
          ".next",
          "dist",
          "out",
          "coverage",
          "functions",
        ].includes(entry.name)
      )
        continue;
      walk(full, out);
      continue;
    }
    if (/\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.endsWith(".d.ts"))
      out.push(full);
  }
  return out;
}

function isUppercaseStart(name) {
  return !!name && /[A-Z]/.test(name[0]);
}

function hasJSX(node) {
  let found = false;
  function visit(n) {
    if (found) return;
    if (
      n.kind === ts.SyntaxKind.JsxElement ||
      n.kind === ts.SyntaxKind.JsxSelfClosingElement ||
      n.kind === ts.SyntaxKind.JsxFragment
    ) {
      found = true;
      return;
    }
    ts.forEachChild(n, visit);
  }
  if (node.body) ts.forEachChild(node.body, visit);
  return found;
}

function collectUnusedParams(sf) {
  const edits = [];

  function paramName(node) {
    if (!node.name) return null;
    if (ts.isIdentifier(node.name)) return node.name.text;
    return null; // skip destructured
  }

  function isReactComponent(funcNode, filePath) {
    const ext = path.extname(filePath);
    // Named function or variable assigned arrow with uppercase name OR JSX in body in TSX file
    let name = undefined;
    if (ts.isFunctionDeclaration(funcNode) && funcNode.name)
      name = funcNode.name.text;
    else if (ts.isFunctionExpression(funcNode) && funcNode.name)
      name = funcNode.name.text;
    else if (
      ts.isMethodDeclaration(funcNode) &&
      funcNode.name &&
      ts.isIdentifier(funcNode.name)
    )
      name = funcNode.name.text;
    else if (ts.isArrowFunction(funcNode)) {
      // Attempt to infer variable name from parent
      if (
        ts.isVariableDeclaration(funcNode.parent) &&
        ts.isIdentifier(funcNode.parent.name)
      )
        name = funcNode.parent.name.text;
      else if (
        ts.isPropertyAssignment(funcNode.parent) &&
        ts.isIdentifier(funcNode.parent.name)
      )
        name = funcNode.parent.name.text;
    }
    if (ext === ".tsx") {
      if (name && isUppercaseStart(name)) return true;
      if (hasJSX(funcNode)) return true;
    }
    return false;
  }

  function identifierUsed(name, bodyNode) {
    let used = false;
    function visit(n) {
      if (used) return;
      if (ts.isIdentifier(n) && n.text === name) {
        used = true;
        return;
      }
      ts.forEachChild(n, visit);
    }
    if (bodyNode) ts.forEachChild(bodyNode, visit);
    return used;
  }

  function visit(node) {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node) ||
      ts.isMethodDeclaration(node)
    ) {
      const params = node.parameters;
      if (!params.length) return ts.forEachChild(node, visit);

      // React component heuristic skip for first param modifications
      const component = isReactComponent(node, sf.fileName);

      // Determine usage for each param
      const unusedStatus = params.map((p) => {
        if (p.dotDotDotToken) return false; // rest param skip
        const name = paramName(p);
        if (!name) return false; // destructured skip
        if (name.startsWith("_")) return false; // already ignored
        if (p.initializer) return false; // keep stable signature
        const used = identifierUsed(name, node.body);
        return !used;
      });

      // Iterate params for edits (tail removal rule)
      for (let i = params.length - 1; i >= 0; i--) {
        const p = params[i];
        const name = paramName(p);
        if (!name) continue;
        if (!unusedStatus[i]) continue;
        if (component && i === 0) continue; // skip props param in components

        if (i === params.length - 1) {
          // Remove last parameter
          // Determine removal slice boundaries
          const prev = params[i - 1];
          let start = p.getFullStart();
          let end = p.getEnd();
          const text = sf.getFullText();
          if (prev) {
            // Remove comma preceding last param
            // Adjust start to previous end, trimming spaces/newlines in between
            start = prev.getEnd();
            // Also include any trailing commas/spaces after param (unlikely) -> extend end to include following optional whitespace
            while (end < text.length && /[\s]/.test(text[end])) end++;
          } else {
            // Only parameter: remove inside parentheses content; rely on caller to have parsed function
            // We'll trust start/end as is; minor formatting leftover acceptable
          }
          edits.push({ type: "remove", start, end, name });
        } else {
          // Rename param to _<name>
          const idNode = p.name;
          if (ts.isIdentifier(idNode)) {
            edits.push({
              type: "rename",
              start: idNode.getStart(),
              end: idNode.getEnd(),
              name,
              newName: "_" + name,
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
  return edits;
}

const files = walk(path.join(root, "src"));
let filesModified = 0,
  paramsRemoved = 0,
  paramsRenamed = 0;

for (const file of files) {
  const code = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const edits = collectUnusedParams(sf);
  if (!edits.length) continue;
  // Apply edits to source text
  let newCode = code;
  // Sort edits descending by start to avoid offset shifts
  edits.sort((a, b) => b.start - a.start);
  for (const e of edits) {
    if (e.type === "remove") {
      newCode = newCode.slice(0, e.start) + newCode.slice(e.end);
      paramsRemoved++;
    } else if (e.type === "rename") {
      // Avoid double underscore if already applied by previous run
      const current = newCode.slice(e.start, e.end);
      if (!current.startsWith("_")) {
        newCode = newCode.slice(0, e.start) + e.newName + newCode.slice(e.end);
        paramsRenamed++;
      }
    }
  }
  if (newCode !== code) {
    filesModified++;
    if (APPLY) fs.writeFileSync(file, newCode, "utf8");
    console.log(
      `[unused-params] ${APPLY ? "updated" : "would update"} ${path.relative(root, file)} (${edits.length} edits)`
    );
  }
}

console.log(
  JSON.stringify({
    apply: APPLY,
    filesScanned: files.length,
    filesModified,
    paramsRemoved,
    paramsRenamed,
  })
);
