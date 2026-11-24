# Linha de base da suíte completa de testes

Etapa **131** da Onda 3 do `docs/qa/04-PLANO.md` (achado ACH-101).

Este arquivo é a régua das etapas 132–136: diz o que **já era vermelho antes** de qualquer correção e, depois,
o que cada etapa realmente resolveu.

## Como reproduzir

```bash
npx vitest run > /tmp/suite.log 2>&1; echo "EXIT=$?"
```

Sem filtro de arquivo, sem reporter especial (`--reporter=basic` não existe
mais nesta versão do vitest e falha com `ERR_LOAD_URL`). O log tem códigos
ANSI; para ler o resumo:

```bash
sed -r 's/\x1b\[[0-9;]*m//g' /tmp/suite.log | grep -E "^ *Test Files|^ *Tests"
```

## Medição

| Campo | Valor |
| --- | --- |
| Commit | `4b02d228` — fix(qa): etapas 072-079 - erro de catalogo, colecoes e templates separados do vazio (#4023) |
| Data | 2026-11-23 |
| `Test Files` | `9 failed | 1741 passed | 131 skipped (1881)` |
| `Tests` | `30 failed | 32886 passed | 1 expected fail | 1148 skipped | 24 todo (34089)` |
| `Duration` | ~737 s |

O plano (`docs/qa/04-PLANO.md:3639`) foi escrito sobre o commit `ded84e9`, com
`7 failed | 1731 passed | 131 skipped` e `26 failed | 32841 passed`. A linha de
base **mudou**: hoje são 9 arquivos e 30 casos. A diferença são dois arquivos
que entraram vermelhos depois daquela medição — `tests/security/rls-ach013-tautologia.test.ts`
e `tests/pages/DiscountRequestDetailPage.test.tsx` — e que **não são** escopo
das etapas 131–136.

## Os 9 arquivos vermelhos, caso a caso

| # | Arquivo | Casos | Mensagem de erro | Dono |
| --- | --- | --- | --- | --- |
| 1 | `tests/components/pages/KitBuilderPage.test.tsx` | 22 | `Error: No QueryClient set, use QueryClientProvider to set one` | etapa 133 (resolvido nesta PR) |
| 2 | `tests/components/kit-builder/FreightEstimator.test.tsx` | suíte | `Failed to resolve import "@/components/kit-builder/FreightEstimator"` | etapa 132 (resolvido nesta PR) |
| 3 | `tests/components/kit-builder/KitBuilderComponents.test.tsx` | suíte | mesmo import quebrado (bloco `describe("FreightEstimator")`) | etapa 132 (resolvido nesta PR) |
| 4 | `tests/components/kit-builder/KitSummary.weight.test.tsx` | 1 | `Error: No QueryClient set, use QueryClientProvider to set one` | etapa 134 (resolvido nesta PR) |
| 5 | `tests/components/QuoteCommentsSection.test.tsx` | 1 | `Unable to find an element with the text: Remova as respostas antes de excluir este comentário.` | etapa 135 (resolvido nesta PR) |
| 6 | `tests/security/rls-ach013-tautologia.test.ts` | 2 | `TAUTOLOGIA DETECTADA: attribute_definitions ainda usa "SELECT attribute_definitions.organization_id FROM profiles"` | etapa 02x — DDL/RPC (Regra 8), **fora desta PR** |
| 7 | `tests/pages/DiscountRequestDetailPage.test.tsx` | 2 | `expected "vi.fn()" to be called with arguments: [ 'id', 'quote-1' ]` | escopo de outra etapa, **fora desta PR** |
| 8 | `tests/pages/legacy-KitBuilder.partial-preservation.test.tsx` | 1 | `expected "vi.fn()" to be called once with arguments: [ { kitState: ... } ]` | escopo de outra etapa, **fora desta PR** |
| 9 | `tests/scripts/drift-baseline.test.mjs` | 1 | `expected [] to deeply equal [ Array(1) ]` | etapa 136 — **não trabalhar**: arquivo da PR aberta #3993 |

## O que esta PR (etapas 131–135) tira da lista

Depois das etapas 132–135, a linha de base passa a ser **4 arquivos / 6 casos**
(os itens 6, 7, 8 e 9 acima), nenhum deles escopo 131–135.

Ver a evidência de cada etapa em `docs/qa/05-PROGRESSO.md`.
