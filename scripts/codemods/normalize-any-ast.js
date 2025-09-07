#!/usr/bin/env node
/**
 * normalize-any-ast.js
 * Second-pass AST normalization of remaining explicit `any` usages to `unknown` where safe.
 * Targets:
 *  - TypeReference/TypeAnnotation nodes that are the `any` keyword.
 *  - TypeParameter defaults: <T = any> -> <T = unknown>
 *  - Type aliases: type Foo = any; -> type Foo = unknown;
 *  - Union / Intersection members: bare `any` keyword -> `unknown`.
 *  - Generic type arguments: Foo<any> -> Foo<unknown>
 * Exclusions: comments, strings, JSDoc. Idempotent.
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
      continue;
    }
    if (/\.(tsx?|js)$/.test(e.name) && !e.name.endsWith(".d.ts"))
      out.push(full);
  }
  return out;
}

function transform(code, filePath) {
  const kind = filePath.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : filePath.endsWith(".ts")
      ? ts.ScriptKind.TS
      : ts.ScriptKind.JS;
  const sf = ts.createSourceFile(
    filePath,
    code,
    ts.ScriptTarget.Latest,
    true,
    kind
  );
  const edits = []; // {start,end}
  function visit(node) {
    // any keyword types
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      edits.push({ start: node.getStart(), end: node.getEnd() });
    }
    // type alias = any
    if (
      ts.isTypeAliasDeclaration(node) &&
      node.type.kind === ts.SyntaxKind.AnyKeyword
    ) {
      edits.push({ start: node.type.getStart(), end: node.type.getEnd() });
    }
    // type parameter default
    if (
      ts.isTypeParameterDeclaration(node) &&
      node.default &&
      node.default.kind === ts.SyntaxKind.AnyKeyword
    ) {
      edits.push({
        start: node.default.getStart(),
        end: node.default.getEnd(),
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  if (!edits.length) return { changed: false, code };
  edits.sort((a, b) => b.start - a.start);
  let out = code;
  for (const e of edits) {
    out = out.slice(0, e.start) + "unknown" + out.slice(e.end);
  }
  const beforeAny = (code.match(/\bany\b/g) || []).length;
  const afterAny = (out.match(/\bany\b/g) || []).length;
  if (beforeAny === afterAny) return { changed: false, code };
  return { changed: true, code: out, reduced: beforeAny - afterAny };
}

const files = walk(path.join(root, "src"));
let filesModified = 0,
  anyReduced = 0;
for (const f of files) {
  const orig = fs.readFileSync(f, "utf8");
  const { changed, code, reduced = 0 } = transform(orig, f);
  if (changed) {
    filesModified++;
    anyReduced += reduced;
    if (APPLY) fs.writeFileSync(f, code, "utf8");
    console.log(
      `[any-ast] ${APPLY ? "updated" : "would update"} ${path.relative(root, f)} (-${reduced} any)`
    );
  }
}
console.log(
  JSON.stringify({
    apply: APPLY,
    filesScanned: files.length,
    filesModified,
    anyReduced,
  })
);
