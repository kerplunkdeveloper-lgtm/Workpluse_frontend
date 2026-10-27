// Usage: node _split.js config.json
// config: { file, moves: [{ to: "X.tsx", names: ["A","B"] }] }
// Moves the named top-level declarations into new files beside `file`, exports them, and wires the imports.
const fs = require("fs"), path = require("path"), ts = require("typescript");
const cfg = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const src = fs.readFileSync(cfg.file, "utf8");
const crlf = src.includes("\r\n");
const text = src.replace(/\r\n/g, "\n");
const sf = ts.createSourceFile(cfg.file, text, 99, true, cfg.file.endsWith("x") ? 4 : 3);
const dir = path.dirname(cfg.file);

const imports = sf.statements.filter(ts.isImportDeclaration);
const importsText = imports.map((i) => i.getText()).join("\n");
const declName = (s) => {
  if (ts.isFunctionDeclaration(s) || ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s) || ts.isClassDeclaration(s)) return s.name && s.name.text;
  if (ts.isVariableStatement(s)) return s.declarationList.declarations[0].name.getText();
  return null;
};
const top = new Map();
for (const s of sf.statements) {
  const n = declName(s);
  if (n) top.set(n, s);
}
const fullText = (s) => text.slice(s.getFullStart(), s.getEnd()).replace(/^\n+/, "");
const isDefault = (s) => (ts.getCombinedModifierFlags ? false : false) || (s.modifiers || []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
const exportIt = (t) => (/^\s*(\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*export\b/.test(t) ? t : t.replace(/(^|\n)((?:async\s+)?(?:function|const|let|interface|type|class)\b)/, "$1export $2"));
const usesName = (body, name) => new RegExp(`(^|[^A-Za-z0-9_$.])${name}([^A-Za-z0-9_$]|$)`).test(body);

const location = new Map(); // name -> file base (without ext)
for (const m of cfg.moves) for (const n of m.names) {
  if (!top.has(n)) throw new Error("not found: " + n);
  location.set(n, m.to.replace(/\.tsx?$/, ""));
}

const removed = new Set();
const written = [];
for (const m of cfg.moves) {
  const bodies = m.names.map((n) => exportIt(fullText(top.get(n))));
  const body = bodies.join("\n\n");
  const own = new Set(m.names);
  const extra = [];
  for (const [n, f] of location) {
    if (own.has(n) || f === m.to.replace(/\.tsx?$/, "")) continue;
    if (usesName(body, n)) extra.push([n, f]);
  }
  // names that stay behind in the original file and are used here would need moving too
  for (const [n, s] of top) {
    if (location.has(n) || isDefault(s)) continue;
    if (usesName(body, n)) console.warn(`WARNING: ${m.to} uses ${n}, which stays in ${path.basename(cfg.file)}`);
  }
  const byFile = {};
  for (const [n, f] of extra) (byFile[f] = byFile[f] || []).push(n);
  const extraImports = Object.entries(byFile).map(([f, ns]) => `import { ${ns.join(", ")} } from "./${f}";`).join("\n");
  const head = (text.startsWith('"use client"') ? '"use client";\n\n' : "") + importsText + (extraImports ? "\n" + extraImports : "");
  fs.writeFileSync(path.join(dir, m.to), (head + "\n\n" + body + "\n").replace(/\n/g, crlf ? "\r\n" : "\n"));
  written.push(m.to);
  m.names.forEach((n) => removed.add(n));
}

// rebuild the original: drop moved statements, import what is still used
let out = "";
let cursor = 0;
for (const s of sf.statements) {
  const n = declName(s);
  if (n && removed.has(n)) {
    out += text.slice(cursor, s.getFullStart());
    cursor = s.getEnd();
  }
}
out += text.slice(cursor);
const remaining = out;
const byFile = {};
for (const [n, f] of location) if (usesName(remaining, n)) (byFile[f] = byFile[f] || []).push(n);
const importLines = Object.entries(byFile).map(([f, ns]) => `import { ${ns.join(", ")} } from "./${f}";`).join("\n");
const lastImport = imports[imports.length - 1].getEnd();
const shift = out.length - remaining.length; // 0
out = out.slice(0, lastImport) + "\n" + importLines + out.slice(lastImport);
out = out.replace(/\n{4,}/g, "\n\n\n");
fs.writeFileSync(cfg.file, out.replace(/\n/g, crlf ? "\r\n" : "\n"));
console.log("wrote", written.join(", "), "| original now", out.split("\n").length, "lines");
