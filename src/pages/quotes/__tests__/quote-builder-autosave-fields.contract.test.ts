/**
 * Contrato: todo campo que `applyDraftToBuilder` sabe RESTAURAR tem de ser um
 * campo que o QuoteBuilderPage GRAVA no rascunho.
 *
 * Em 2026-11-18 as duas metades estavam desencontradas: o lado que aplica já
 * tratava `companyInfo`, `contactInfo`, `validityDays`, `deliveryMode` e
 * `deliveryDate` — cobertura herdada do QuoteBuilderDraftRecovery escrito por
 * outro agente —, mas a página não mandava nenhum dos cinco para o QuoteAutoSave.
 * Resultado: aquele trecho de restauração nunca podia rodar, e o vendedor que
 * recuperava um rascunho perdia empresa, contato, validade e data de entrega.
 *
 * Este teste lê os dois arquivos como texto de propósito: o bug não é de tipo
 * (o objeto `data` do QuoteAutoSave é `unknown`), então o typecheck não o pega.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = join(import.meta.dirname, '..', '..', '..', '..');

function lerArquivo(caminhoRelativo: string): string {
  return readFileSync(join(RAIZ, caminhoRelativo), 'utf8');
}

/** Campos lidos do rascunho dentro do corpo de `applyDraftToBuilder`. */
function camposQueAplicacaoLe(): Set<string> {
  const fonte = lerArquivo('src/hooks/quotes/quoteDraftApply.ts');
  const inicio = fonte.indexOf('export function applyDraftToBuilder');
  expect(inicio, 'applyDraftToBuilder não encontrado').toBeGreaterThan(-1);
  const corpo = fonte.slice(inicio).split('\n}')[0];
  const campos = new Set<string>();
  for (const [, campo] of corpo.matchAll(/draft\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
    campos.add(campo);
  }
  return campos;
}

/** Chaves do objeto `data` que a página entrega ao QuoteAutoSave. */
function camposQuePaginaGrava(): Set<string> {
  const fonte = lerArquivo('src/pages/quotes/QuoteBuilderPage.tsx');
  const inicio = fonte.indexOf('<QuoteAutoSave');
  expect(inicio, '<QuoteAutoSave não encontrado').toBeGreaterThan(-1);
  const trecho = fonte.slice(inicio);
  const abre = trecho.indexOf('data={{');
  expect(abre, 'prop data={{ não encontrada').toBeGreaterThan(-1);
  const bloco = trecho.slice(abre, trecho.indexOf('}}', abre));
  const campos = new Set<string>();
  for (const [, campo] of bloco.matchAll(/^\s{2,}([A-Za-z_][A-Za-z0-9_]*):/gm)) {
    campos.add(campo);
  }
  return campos;
}

describe('rascunho do orçamento: gravação x restauração', () => {
  it('a página grava todo campo que a restauração sabe aplicar', () => {
    const aplicados = camposQueAplicacaoLe();
    const gravados = camposQuePaginaGrava();
    expect(aplicados.size, 'nenhum campo lido — regex quebrou?').toBeGreaterThan(10);
    const semGravacao = [...aplicados].filter((campo) => !gravados.has(campo)).sort();
    expect(
      semGravacao,
      'estes campos são restaurados mas nunca gravados, logo a restauração deles é código morto',
    ).toEqual([]);
  });

  it('grava os cinco campos que faltavam: empresa, contato, validade e entrega', () => {
    const gravados = camposQuePaginaGrava();
    for (const campo of [
      'companyInfo',
      'contactInfo',
      'validityDays',
      'deliveryMode',
      'deliveryDate',
    ]) {
      expect(gravados.has(campo), `campo ausente do rascunho: ${campo}`).toBe(true);
    }
  });
});
