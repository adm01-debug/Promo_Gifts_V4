// Shim local de actions/upload-artifact (mesmas entradas/saídas usadas no repo).
import { STORE, cpSync, existsSync, globSync, input, isAbsolute, join, mkdirSync, output, readIndex, relative, resolve, sep, statSync, workspace, writeIndex } from './artifact-store.mjs';

const ws = workspace();
const name = input('name', 'artifact');
const lines = input('path').split('\n').map((l) => l.trim()).filter(Boolean);
const include = lines.filter((l) => !l.startsWith('!'));
const exclude = lines.filter((l) => l.startsWith('!')).map((l) => l.slice(1));
const abs = (p) => (isAbsolute(p) ? p : resolve(ws, p));
const files = new Set();
for (const pat of include) {
  const p = abs(pat);
  if (!/[*?[{]/.test(pat) && existsSync(p) && statSync(p).isDirectory()) {
    for (const f of globSync('**/*', { cwd: p })) if (statSync(join(p, f)).isFile()) files.add(join(p, f));
  } else if (!/[*?[{]/.test(pat)) {
    if (existsSync(p) && statSync(p).isFile()) files.add(p);
  } else {
    for (const f of globSync(pat, { cwd: ws })) if (statSync(abs(f)).isFile()) files.add(abs(f));
  }
}
const excluded = new Set(exclude.flatMap((pat) => globSync(pat, { cwd: ws }).map(abs)));
const list = [...files].filter((f) => !excluded.has(f));
if (!list.length) {
  const mode = input('if-no-files-found', 'warn');
  const msg = `Nenhum arquivo encontrado em: ${include.join(', ')}`;
  if (mode === 'error') {
    console.log(`::error::${msg}`);
    process.exit(1);
  }
  if (mode === 'warn') console.log(`::warning::${msg}`);
  process.exit(0);
}
// Raiz = maior ancestral comum dos caminhos de inclusão (mesma regra do upload-artifact).
const roots = include.map((pat) => {
  const p = abs(pat.split(/[*?[{]/)[0] || '.');
  return existsSync(p) && statSync(p).isDirectory() ? p : resolve(p, '..');
});
let root = roots[0];
for (const r of roots.slice(1)) while (!(r + sep).startsWith(root + sep) && root !== sep) root = resolve(root, '..');
const dest = join(STORE, name);
mkdirSync(dest, { recursive: true });
for (const f of list) {
  const to = join(dest, relative(root, f));
  mkdirSync(resolve(to, '..'), { recursive: true });
  cpSync(f, to);
}
const idx = readIndex();
const id = idx.nextId++;
idx.artifacts[id] = name;
writeIndex(idx);
output('artifact-id', String(id));
output('artifact-url', `file://${dest}`);
output('artifact-digest', '');
console.log(`upload-artifact (local): ${list.length} arquivo(s) → ${name} (id ${id})`);
