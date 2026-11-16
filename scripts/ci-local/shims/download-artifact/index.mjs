// Shim local de actions/download-artifact (name | artifact-ids | pattern, merge-multiple).
import { STORE, cpSync, existsSync, input, join, mkdirSync, output, readIndex, readdirSync, resolve, workspace } from './artifact-store.mjs';

const ws = workspace();
const dest = resolve(ws, input('path', '.'));
const idx = readIndex();
const name = input('name');
const ids = input('artifact-ids').split(/[\s,]+/).filter(Boolean);
const pattern = input('pattern');
const merge = input('merge-multiple', 'false') === 'true';
const all = existsSync(STORE) ? readdirSync(STORE).filter((d) => d !== 'index.json') : [];
let names;
if (name) names = [name];
else if (ids.length) names = ids.map((i) => idx.artifacts[i]).filter(Boolean);
else if (pattern) {
  const re = new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
  names = all.filter((n) => re.test(n));
} else names = all;
const missing = names.filter((n) => !existsSync(join(STORE, n)));
if (name && missing.length) {
  console.log(`::error::Artifact not found: ${name}`);
  process.exit(1);
}
mkdirSync(dest, { recursive: true });
const single = Boolean(name) || (ids.length === 1 && names.length === 1);
for (const n of names.filter((x) => !missing.includes(x))) {
  cpSync(join(STORE, n), single || merge ? dest : join(dest, n), { recursive: true });
}
output('download-path', dest);
console.log(`download-artifact (local): ${names.length - missing.length} artefato(s) → ${dest}`);
