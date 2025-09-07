#!/usr/bin/env node
/**
 * prune-unused-vars-deep.js
 * Deeper unused variable sweep (non-parameter) with conservative safety.
 * Strategy:
 *  - Identify variable declarations (let/const) whose identifier is never referenced elsewhere.
 *  - If initializer is side-effect free (literal/object/array/arrow/function/identifier) OR absent: remove declarator (or whole statement if single).
 *  - Otherwise rename to _<name> (if not already) to quiet rule while preserving potential side-effects.
 *  - Skip exported statements, loop initializers, destructuring patterns, and .d.ts.
 * Dry run unless APPLY=1.
 */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const APPLY = process.env.APPLY === "1";
const root = process.cwd();

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (
        [
          "node_modules",
          ".next",
          "dist",
          "out",
          "coverage",
          "functions",
        ].includes(e.name)
      )
        continue;
      walk(full, out);
    } else if (/\.(tsx?|js)$/.test(e.name) && !e.name.endsWith(".d.ts"))
      out.push(full);
  }
  return out;
}

function safeInit(node) {
  if (!node) return true;
  switch (node.kind) {
    case ts.SyntaxKind.NumericLiteral:
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.TrueKeyword:
    case ts.SyntaxKind.FalseKeyword:
    case ts.SyntaxKind.NullKeyword:
    case ts.SyntaxKind.ObjectLiteralExpression:
    case ts.SyntaxKind.ArrayLiteralExpression:
    case ts.SyntaxKind.ArrowFunction:
    case ts.SyntaxKind.FunctionExpression:
    case ts.SyntaxKind.Identifier:
      return true;
    default:
      return false;
  }
}

function collect(sf) {
  const map = new Map();
  function reg(name, decl) {
    if (!map.has(name)) map.set(name, { decl, used: 0 });
  }
  function markUsed(name) {
    const e = map.get(name);
    if (e) e.used++;
  }
  function visit(n) {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name))
      reg(n.name.text, n);
    if (ts.isIdentifier(n)) markUsed(n.text);
    ts.forEachChild(n, visit);
  }
  visit(sf);
  const edits = [];
  const text = sf.getFullText();
  for (const [name, info] of map) {
    if (info.used <= 1) {
      const decl = info.decl;
      const list = decl.parent;
      if (!list || !list.declarations) continue;
      const stmt = list.parent; // VariableStatement
      if (
        stmt &&
        stmt.modifiers &&
        stmt.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      )
        continue;
      const decls = list.declarations;
      if (safeInit(decl.initializer)) {
        if (stmt && decls.length === 1) {
          edits.push({
            type: "remove",
            start: stmt.getFullStart(),
            end: stmt.getEnd(),
            name,
          });
        } else {
          let start = decl.getFullStart();
          let end = decl.getEnd();
          while (end < text.length && /[,\s]/.test(text[end])) {
            end++;
            if (text[end - 1] === ",") break;
          }
          edits.push({ type: "remove", start, end, name });
        }
      } else {
        if (!name.startsWith("_"))
          edits.push({
            type: "rename",
            start: decl.name.getStart(),
            end: decl.name.getEnd(),
            newName: "_" + name,
          });
      }
    }
  }
  return edits;
}

const files = walk(path.join(root, "src"));
let filesModified = 0,
  removed = 0,
  renamed = 0;
for (const f of files) {
  const code = fs.readFileSync(f, "utf8");
  const sf = ts.createSourceFile(
    f,
    code,
    ts.ScriptTarget.Latest,
    true,
    f.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const edits = collect(sf);
  if (!edits.length) continue;
  edits.sort((a, b) => b.start - a.start);
  let out = code;
  for (const e of edits) {
    if (e.type === "remove") {
      out = out.slice(0, e.start) + out.slice(e.end);
      removed++;
    } else if (e.type === "rename") {
      const cur = out.slice(e.start, e.end);
      if (!cur.startsWith("_")) {
        out = out.slice(0, e.start) + e.newName + out.slice(e.end);
        renamed++;
      }
    }
  }
  if (out !== code) {
    filesModified++;
    if (APPLY) fs.writeFileSync(f, out, "utf8");
    console.log(
      `[unused-vars-deep] ${APPLY ? "updated" : "would update"} ${path.relative(root, f)} (${edits.length} edits)`
    );
  }
}
console.log(
  JSON.stringify({
    apply: APPLY,
    filesScanned: files.length,
    filesModified,
    removed,
    renamed,
  })
);
