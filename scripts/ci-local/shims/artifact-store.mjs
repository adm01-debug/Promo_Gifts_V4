// Armazenamento local de artefatos do CI local: diretório montado em TODOS os contêineres
// de jobs do act (CI_LOCAL_ARTIFACTS, via --container-options), compartilhado entre jobs
// de uma mesma execução. Substitui o servidor de artefatos do act, que não fala o
// protocolo novo usado por actions/upload-artifact v4+ ("Unexpected end of JSON input").
import { appendFileSync, cpSync, existsSync, globSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export const STORE = process.env.CI_LOCAL_ARTIFACTS || '/ci-local-artifacts';
export const input = (name, def = '') => {
  const v = process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`];
  return v === undefined || v === '' ? def : v.trim();
};
export const output = (k, v) => appendFileSync(process.env.GITHUB_OUTPUT, `${k}<<__EOF__\n${v}\n__EOF__\n`);
const indexFile = () => join(STORE, 'index.json');
export function readIndex() {
  try {
    return JSON.parse(readFileSync(indexFile(), 'utf8'));
  } catch {
    return { nextId: 1, artifacts: {} };
  }
}
export function writeIndex(idx) {
  mkdirSync(STORE, { recursive: true });
  writeFileSync(indexFile(), JSON.stringify(idx, null, 2));
}
export function workspace() {
  return process.env.GITHUB_WORKSPACE || process.cwd();
}
export { appendFileSync, cpSync, dirname, existsSync, globSync, isAbsolute, join, mkdirSync, readdirSync, relative, resolve, sep, statSync };
