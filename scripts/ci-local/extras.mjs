// scripts/ci-local/extras.mjs
// Scripts npm de verificação (test:*, check:*, lint:*, e2e:*, audit:*, typecheck:*, validate:*)
// que NENHUM workflow/hook roda — direta ou indiretamente. Sem isto, esses testes só rodariam
// se alguém lembrasse de chamá-los à mão.
//
// Cobertura considerada (transitiva):
//   • o workflow/hook chama `npm run <script>` (ou bun/pnpm);
//   • o workflow/hook roda o MESMO arquivo (scripts/x.mjs) ou os MESMOS testes;
//   • outro script npm coberto chama este script ou o mesmo arquivo.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CHECK_RE = /^(test|check|lint|verify|validate|audit|typecheck|gate|e2e)\b/;
/** Utilitários manuais por natureza (regravam baseline, abrem UI, modo watch...). */
const UTILITY_RE = /(:update\b|:update:|:watch\b|^test:watch$|headed|:ui$|:ui:|debug|:report$|calibrate|:install$|:seed$|:dry-run$|update-baseline|:scope$)/;
/** Inseguros para rodar sem pedir: carga, stress, fuzz contra serviços vivos, credenciais, produção. */
export const UNSAFE_RE = /(stress|load|massive|live|credentials|fuzz-edge|fuzz:uploads|fuzz:all|fuzz:full|\bprod\b)/i;

const callRe = (name) => new RegExp(`(npm run|npm run-script|bun run|pnpm(?: run)?)\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[\\s"';&|)]|$)`);

function readAll(dir, filter) {
  if (!existsSync(dir)) return '';
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? [readAll(join(dir, e.name), filter)] : filter(e.name) ? [readFileSync(join(dir, e.name), 'utf8')] : []))
    .join('\n');
}

export function findUncovered(root) {
  const scripts = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts ?? {};
  const ciText = [
    readAll(join(root, '.github', 'workflows'), (n) => /\.ya?ml$/.test(n)),
    readAll(join(root, '.github', 'actions'), (n) => /\.ya?ml$/.test(n)),
    readAll(join(root, '.github', 'scripts'), () => true),
    readAll(join(root, '.husky'), (n) => !n.startsWith('_')),
  ].join('\n');

  const filesOf = (body) => [...body.matchAll(/((?:scripts|tests|src|e2e)\/[\w./*-]+)/g)].map((m) => m[1].split('*')[0]);
  const covered = new Map();
  for (const [name, body] of Object.entries(scripts)) {
    if (callRe(name).test(ciText)) covered.set(name, 'workflow/hook chama por nome');
    else {
      const files = filesOf(body);
      if (files.length && files.every((f) => ciText.includes(f))) covered.set(name, 'workflow/hook roda os mesmos arquivos');
    }
  }
  // Fecho transitivo: script coberto que chama outro (por nome ou mesmo arquivo) cobre o outro.
  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, body] of Object.entries(scripts)) {
      if (!covered.has(name)) continue;
      for (const [other, otherBody] of Object.entries(scripts)) {
        if (covered.has(other) || other === name) continue;
        const files = filesOf(otherBody);
        if (callRe(other).test(body) || (files.length && files.every((f) => body.includes(f)))) {
          covered.set(other, `via ${name}`);
          changed = true;
        }
      }
    }
  }
  return Object.entries(scripts)
    .filter(([name]) => CHECK_RE.test(name))
    .map(([name, body]) => {
      if (covered.has(name)) return { name, body, kind: 'coberto', why: covered.get(name) };
      if (UTILITY_RE.test(name)) return { name, body, kind: 'utilitário', why: 'manual por natureza' };
      if (UNSAFE_RE.test(name) || UNSAFE_RE.test(body)) return { name, body, kind: 'inseguro', why: 'carga/serviço vivo/credenciais — só com --unsafe' };
      const browser = /playwright|test:e2e|e2e\//.test(body);
      return { name, body, kind: browser ? 'órfão-e2e' : 'órfão', why: 'nenhum workflow/hook roda' };
    });
}
