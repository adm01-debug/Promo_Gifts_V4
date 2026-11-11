/**
 * resolveCredential() devolve um objeto { value, source, … } (Promise<CredentialResolution>).
 * Atribuir o retorno inteiro a uma variável e usá-la como string produz "Bearer [object Object]"
 * (bug real em process-scheduled-reports, que mandava esse header ao Resend).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const FUNCTIONS = join(ROOT, 'supabase/functions');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (name === 'node_modules') return [];
    return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx|mjs|js)$/.test(name) ? [full] : [];
  });
}

describe('resolveCredential: nunca usar o objeto de retorno como string', () => {
  // Atribuição sem desestruturar É aceitável quando a variável só é usada via propriedade
  // (`res.value`, `res.source`); é bug quando o objeto inteiro é usado (template, argumento, if).
  const usedAsWholeObject = (source, name, from) => {
    const re = new RegExp(`(?<![\\w$.])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w$])(?!\\s*\\??\\.)`, 'g');
    re.lastIndex = from;
    return re.test(source);
  };
  const offenders = walk(FUNCTIONS)
    .filter((file) => !file.includes('/_shared/credentials'))
    .flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return [...source.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*await\s+resolveCredential\s*\(/g)]
        .filter((m) => usedAsWholeObject(source, m[1], m.index + m[0].length))
        .map((m) => `${relative(ROOT, file)}: ${m[1]}`);
    });

  it('todas as chamadas desestruturam { value }', () => {
    expect(offenders).toEqual([]);
  });

  it('detector pega o padrão quebrado e aceita o correto', () => {
    const bad = 'const key = await resolveCredential("X");';
    const good = 'const { value: key } = await resolveCredential("X");';
    const re = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*await\s+resolveCredential\s*\(/g;
    expect([...bad.matchAll(re)]).toHaveLength(1);
    expect([...good.matchAll(re)]).toHaveLength(0);
  });
});
