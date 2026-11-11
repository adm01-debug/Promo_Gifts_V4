// Shim LOCAL de dorny/paths-filter para o CI local (act).
// O original, em eventos pull_request, pede a lista de arquivos à API do GitHub pelo
// número da PR — localmente não há PR (nem token), então ele falha com "Not Found".
// Este shim mantém o MESMO contrato de entradas/saídas, mas calcula as mudanças com
// `git diff` entre a base do evento e o HEAD. js-yaml e picomatch são copiados do
// node_modules do projeto para ./vendor pelo orquestrador (mesmas libs do original).
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import yaml from './vendor/js-yaml.mjs';

const require = createRequire(import.meta.url);
const picomatch = require('./vendor/picomatch');

const input = (name, def = '') => {
  const v = process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`];
  return v === undefined || v === '' ? def : v;
};
const out = (k, v) => appendFileSync(process.env.GITHUB_OUTPUT, `${k}<<__EOF__\n${v}\n__EOF__\n`);
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();

function changedFiles() {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const head = input('ref') || 'HEAD';
  let base = input('base');
  if (!base) base = event.pull_request?.base?.sha ?? event.before ?? '';
  if (!base || /^0+$/.test(base)) {
    console.log('paths-filter (local): sem base — todos os arquivos rastreados contam como alterados');
    return git('ls-files').split('\n').filter(Boolean).map((f) => ({ filename: f, status: 'added' }));
  }
  // PR: merge-base (equivale ao "files changed" da PR); push: before..after.
  const range = event.pull_request ? `${base}...${head}` : `${base}..${head}`;
  return git('diff', '--name-status', '--no-renames', range)
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [st, ...p] = l.split('\t');
      return { filename: p.join('\t'), status: { A: 'added', M: 'modified', D: 'deleted' }[st[0]] ?? 'modified' };
    });
}

function loadFilters() {
  let raw = input('filters');
  if (raw && !raw.includes('\n') && existsSync(raw)) raw = readFileSync(raw, 'utf8');
  const doc = yaml.load(raw) ?? {};
  const flat = (rules) => [].concat(rules ?? []).flatMap((r) => (Array.isArray(r) ? flat(r) : [r]));
  return Object.entries(doc).map(([name, rules]) => ({
    name,
    rules: flat(rules).map((r) => (typeof r === 'string' ? { status: null, pattern: r } : Object.entries(r).flatMap(([st, pats]) => [].concat(pats).map((pattern) => ({ status: st.split('|'), pattern }))))).flat(),
  }));
}

const files = changedFiles();
const quantifier = input('predicate-quantifier', 'some');
const changes = [];
for (const { name, rules } of loadFilters()) {
  const matchers = rules.map((r) => ({ ...r, isMatch: picomatch(r.pattern, { dot: true }) }));
  const hit = files.filter((f) => {
    const ok = (m) => m.isMatch(f.filename) && (!m.status || m.status.includes(f.status));
    return quantifier === 'every' ? matchers.every(ok) : matchers.some(ok);
  });
  const matched = hit.length > 0;
  if (matched) changes.push(name);
  out(name, String(matched));
  out(`${name}_count`, String(hit.length));
  const fmt = input('list-files', 'none');
  if (fmt !== 'none') {
    const list = hit.map((f) => f.filename);
    out(`${name}_files`, fmt === 'json' ? JSON.stringify(list) : fmt === 'csv' ? list.join(',') : list.join(fmt === 'escape' ? ' ' : '\n'));
  }
  console.log(`paths-filter (local): ${name} = ${matched} (${hit.length} arquivo(s))`);
}
out('changes', JSON.stringify(changes));
