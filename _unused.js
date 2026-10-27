// node _unused.js <eslint-json-report>  -> removes imports lint reports as never used
const fs = require("fs");
const ts = require("typescript");
const report = require(require("path").resolve(process.argv[2]));
let files = 0, removed = 0;
for (const entry of report) {
  const unused = entry.messages.filter((m) => m.ruleId === "@typescript-eslint/no-unused-vars" && /is defined but never used/.test(m.message));
  if (!unused.length) continue;
  const text = fs.readFileSync(entry.filePath, "utf8");
  const src = ts.createSourceFile(entry.filePath, text, ts.ScriptTarget.Latest, true, entry.filePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const dead = new Set(unused.map((m) => src.getPositionOfLineAndCharacter(m.line - 1, m.column - 1)));
  const edits = [];
  for (const stmt of src.statements) {
    if (!ts.isImportDeclaration(stmt) || !stmt.importClause) continue;
    const clause = stmt.importClause;
    const keep = [];
    let dropDefault = false, dropped = 0;
    if (clause.name && dead.has(clause.name.getStart())) dropDefault = true;
    const b = clause.namedBindings;
    if (b && ts.isNamedImports(b)) {
      for (const el of b.elements) (dead.has(el.name.getStart()) ? dropped++ : keep.push(el.getText()));
    } else if (b && ts.isNamespaceImport(b) && dead.has(b.name.getStart())) dropped = 1;
    if (!dropDefault && !dropped) continue;
    const hasDefault = clause.name && !dropDefault;
    const hasNamed = b && ts.isNamedImports(b) && keep.length > 0;
    removed += (dropDefault ? 1 : 0) + dropped;
    if (!hasDefault && !hasNamed) { edits.push([stmt.getStart(), stmt.getEnd(), ""]); continue; }
    const parts = [];
    if (hasDefault) parts.push(clause.name.getText());
    if (hasNamed) parts.push(`{ ${keep.join(", ")} }`);
    edits.push([stmt.getStart(), clause.getEnd(), `import ${clause.isTypeOnly ? "type " : ""}${parts.join(", ")}`]);
  }
  if (!edits.length) continue;
  let out = text;
  for (const [a, b2, r] of edits.sort((x, y) => y[0] - x[0])) out = out.slice(0, a) + r + out.slice(b2);
  fs.writeFileSync(entry.filePath, out);
  files++;
}
console.log(`edited ${files} files, removed ${removed} unused imports`);
