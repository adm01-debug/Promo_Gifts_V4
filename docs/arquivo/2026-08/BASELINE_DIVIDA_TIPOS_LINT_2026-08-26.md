# Baseline de dívida de tipos e lint — Etapa 32

**Data/hora do retrato:** 2026-08-26T16:23:02-03:00
**Branch/worktree:** `codex/stabilization-100` em `/tmp/promo-gifts-codex-stabilization-20260826`
**HEAD:** `0660b3ef9`
**Ferramentas:** Node `v24.19.0`, npm `11.17.0`, ripgrep `14.1.0`, TypeScript do lockfile
**Natureza:** inventário somente leitura; nenhum baseline, gate, fonte ou configuração foi alterado.

> Este é um retrato da worktree concorrente, que tinha 82 paths modificados ou não rastreados no instante da medição. Portanto, os números são o baseline candidato desta integração, não uma autorização para regenerar `.eslint-baseline.json` ou `.any-type-baseline.json`. Reexecute os comandos deste documento imediatamente antes do merge.

## 1. Resultado executivo

Foram inspecionados **2.098 arquivos TypeScript/TSX de runtime**: 1.934 em `src/` e 164 em `supabase/functions/`. Testes, specs, stories e diretórios explícitos de teste foram excluídos; arquivos `.d.ts` de `src/` permaneceram no escopo porque participam da compilação.

| Categoria | App `src/` | Edge Functions | Total | Arquivos afetados | Situação do gate atual |
|---|---:|---:|---:|---:|---|
| Cast literal `as any` | 1 | 38 | **39** | incluído nos 42 arquivos com `any` explícito | Gate enxerga apenas o 1 de `src/` |
| Outros tokens explícitos `any` | 9 | 113 | **122** | incluído nos 42 arquivos com `any` explícito | Parcialmente invisível ao gate regex |
| Todo `any` explícito | **10** | **151** | **161** | **42** | Edge integralmente fora do gate |
| Diretivas `eslint-disable*` | 177 | 1 | **178** | **127** | Não existe ratchet dedicado |
| `@ts-ignore` / `@ts-expect-error` | 1 | 1 | **2** | **2** | App coberto indiretamente; Edge ignorado pelo ESLint |
| Chamadas diretas `console.*(...)` | 47 | 341 | **388** | **105** | `warn/error` permitidos no app; Edge fora do ESLint |
| Usos de membro `console.*`, inclusive referência/mutação | 54 | 341 | **395** | **106** | 7 usos não são chamadas |

Leitura principal:

- O baseline oficial de `any` continua registrando **1**, mas o runtime possui **161 tokens `any` explícitos**. A diferença não é drift pequeno: é uma fronteira de escopo e de detector.
- O ESLint principal ignora `supabase/functions/**`; assim, **151 `any`**, um `@ts-ignore` e 341 chamadas de `console` na camada server-side não participam desse gate.
- As 178 diretivas de desativação estão fortemente concentradas em hooks React: 107 suprimem `react-hooks/exhaustive-deps`.
- Nem todo `console.warn/error` é dívida funcional. O alvo correto é **zero uso direto fora de sinks/limites explicitamente permitidos**, e não apagar telemetria operacional.

## 2. Escopo e semântica da contagem

### Incluído

- `src/**/*.{ts,tsx}`, inclusive `.d.ts`;
- `supabase/functions/**/*.{ts,tsx}` como superfície Edge potencialmente implantável;
- código DEV/diagnóstico dentro dessas árvores, separado na interpretação, pois continua sendo fonte versionada e pode ser empacotado ou implantado.

### Excluído

- diretórios `test`, `tests`, `__tests__`;
- arquivos `*.test.ts(x)`, `*.spec.ts(x)`, `*.stories.ts(x)` e `*_test.ts(x)`;
- `tests/`, `e2e/`, `scripts/`, migrations e documentação: são dívida de suporte, mas não runtime desta etapa.

### Regras de contagem

- `as any`: `AnyKeyword` cujo pai sintático é `AsExpression`/type assertion;
- outros `any`: qualquer outro `AnyKeyword`, incluindo aliases, parâmetros, arrays e argumentos genéricos;
- `eslint-disable*` e `@ts-*`: ocorrências em comentários-fonte; o inventário por regra confirmou que todas as ocorrências têm formato de diretiva real;
- `console`: AST, contando chamadas reais, não menções em strings ou comentários;
- `console` ruidoso: `log`, `info`, `debug` e `trace`; operacional: `warn` e `error`.

## 3. Distribuição por domínio do app

Os domínios abaixo são mecânicos: primeiro segmento depois de `src/`. Domínios sem qualquer ocorrência foram omitidos.

| Domínio | Arquivos no escopo | Arquivos com dívida | `any` explícito | `eslint-disable*` | `@ts-*` | `console` ruidoso | `console.warn/error` |
|---|---:|---:|---:|---:|---:|---:|---:|
| `components` | 1.063 | 52 | 0 | 71 | 0 | 5 | 2 |
| `hooks` | 319 | 31 | 3 | 51 | 0 | 0 | 1 |
| `lib` | 211 | 20 | 4 | 15 | 0 | 5 | 15 |
| `pages` | 223 | 22 | 0 | 30 | 1 | 0 | 4 |
| `audit-debug.ts` | 1 | 1 | 0 | 1 | 0 | 6 | 4 |
| `integrations` | 9 | 3 | 3 | 1 | 0 | 0 | 3 |
| `utils` | 30 | 4 | 0 | 3 | 0 | 1 | 1 |
| `contexts` | 10 | 2 | 0 | 3 | 0 | 0 | 0 |
| `types` | 28 | 2 | 0 | 2 | 0 | 0 | 0 |
| **Total app** | **1.934** | **137** | **10** | **177** | **1** | **17** | **30** |

Observações:

- `src/audit-debug.ts` não possui referência encontrada por `rg` fora do próprio arquivo. Isso o classifica como candidato a diagnóstico isolado, **não como lixo autorizado para remoção**.
- Os 7 usos de `console.*` que não são chamadas estão em `src/lib/console-filter.ts` (6, captura/mutação de métodos) e `useMagazineReaderState.ts` (1, teste de existência).

## 4. Hotspots por domínio Edge

Os 15 primeiros domínios estão ordenados pelo volume agregado das quatro categorias. A linha “outros” preserva o fechamento matemático do inventário.

| Edge/domain | `any` explícito | `eslint-disable*` | `@ts-*` | `console` ruidoso | `console.warn/error` |
|---|---:|---:|---:|---:|---:|
| `expert-chat` | 47 | 0 | 0 | 16 | 12 |
| `_shared` | 10 | 0 | 0 | 6 | 46 |
| `crm-db-bridge` | 6 | 0 | 0 | 11 | 15 |
| `materials-api` | 11 | 0 | 0 | 1 | 8 |
| `cleanup-novelties` | 0 | 0 | 0 | 9 | 8 |
| `visual-search` | 6 | 0 | 0 | 4 | 7 |
| `product-visual-search` | 5 | 0 | 0 | 5 | 5 |
| `categories-api` | 5 | 0 | 0 | 8 | 1 |
| `sync-quote-bitrix` | 4 | 0 | 0 | 0 | 9 |
| `generate-ad-image` | 2 | 0 | 0 | 6 | 3 |
| `quote-sync` | 0 | 1 | 0 | 2 | 8 |
| `semantic-search` | 2 | 0 | 0 | 4 | 5 |
| `generate-mockup` | 3 | 0 | 0 | 1 | 5 |
| `product-webhook` | 0 | 0 | 0 | 3 | 6 |
| `rls-audit` | 8 | 0 | 0 | 0 | 0 |
| Outros 56 domínios | 42 | 0 | 1 | 22 | 105 |
| **Total Edge** | **151** | **1** | **1** | **98** | **243** |

## 5. Diretivas ESLint por regra

As **178 diretivas** representam **198 supressões de regra**, pois uma diretiva pode listar mais de uma regra.

| Regra suprimida | Referências | Interpretação |
|---|---:|---|
| `react-hooks/exhaustive-deps` | 107 | Maior lote; exige revisão semântica hook a hook |
| `eqeqeq` | 19 | Pareado com `no-eq-null` em checagens intencionais de nulo |
| `no-eq-null` | 19 | Idem |
| `no-console` | 14 | Loggers, diagnóstico e callsites diretos |
| `@typescript-eslint/naming-convention` | 9 | Inclui contratos/declarações externas |
| `@typescript-eslint/no-explicit-any` | 6 | Fronteiras Supabase, lazy React e novidades |
| `@typescript-eslint/no-invalid-void-type` | 5 | Callbacks/contratos React |
| `@typescript-eslint/no-unused-vars` | 3 | 2 no app e 1 em Edge |
| Três regras com 2 ocorrências cada | 6 | A11y, classes e otimização React |
| Dez regras com 1 ocorrência cada | 10 | Cauda longa |
| **Total de referências** | **198** | **178 diretivas** |

Distribuição dominante de `react-hooks/exhaustive-deps`: 48 em `components`, 36 em `hooks`, 21 em `pages` e 2 em `contexts`. Remover essas diretivas mecanicamente é perigoso: pode provocar loops, requisições duplicadas, closures obsoletas ou alteração de UX. Cada redução precisa de teste de contrato do hook/fluxo.

## 6. Supressões TypeScript

| Arquivo | Diretiva | Avaliação |
|---|---|---|
| `src/pages/dev/TabSkipHarness.tsx:148` | `@ts-expect-error` para `inert` | DEV-only; revalidar após React 19, pois o tipo pode agora existir |
| `supabase/functions/e2e-cleanup/index.ts:14` | `@ts-ignore` para runtime Deno | Edge fora do ESLint; substituir por contrato/tipo ou justificativa verificável |

Meta recomendada: **2 → 1 → 0**, sem converter `@ts-ignore` em cast inseguro apenas para zerar a métrica.

## 7. Console por método

| Método | App | Edge | Total |
|---|---:|---:|---:|
| `console.log` | 9 | 97 | 106 |
| `console.info` | 4 | 1 | 5 |
| `console.debug` | 4 | 0 | 4 |
| `console.trace` | 0 | 0 | 0 |
| `console.warn` | 17 | 69 | 86 |
| `console.error` | 13 | 174 | 187 |
| **Chamadas** | **47** | **341** | **388** |

Hotspots do app:

- `src/audit-debug.ts`: 10 chamadas, sendo 6 ruidosas;
- `src/lib/telemetry/structuredLogger.ts`: 8 chamadas, sink deliberado;
- `src/lib/logger.ts`: 5 chamadas, sink deliberado;
- `OptimizedImage.tsx`: 3 `console.info`;
- `EnhancedErrorBoundary.tsx`: 2 `console.error`, limite de falha intencional;
- `src/integrations/supabase/client.ts`: 2 chamadas de boot/SSOT; arquivo protegido.

Política correta para o ratchet:

1. congelar chamadas por arquivo e método;
2. proibir novos callsites fora de uma allowlist mínima de sinks/boot boundaries;
3. migrar callsites para logger estruturado, preservando `warn/error` operacional;
4. medir separadamente `log/info/debug/trace` e `warn/error` para não incentivar a remoção de evidência de falha;
5. chegar a **zero console direto não encapsulado**, aceitando apenas sinks aprovados e testados.

## 8. Fronteiras críticas

| Fronteira | `as any` | Outros `any` | ESLint disables | `@ts-*` | Console ruidoso | Console warn/error | Risco |
|---|---:|---:|---:|---:|---:|---:|---|
| `src/integrations/supabase/client.ts` | 0 | 0 | 0 | 0 | 0 | 2 | SSOT protegido; não refatorar por métrica |
| `src/integrations/supabase/gold.ts` | 0 | 3 | 1 | 0 | 0 | 0 | Escape hatch da camada Gold |
| `src/lib/supabase-untyped.ts` | 0 | 3 | 1 | 0 | 0 | Escape hatch central de schema |
| `useSellerCarts.ts` | 1 | 0 | 6 | 0 | 0 | 1 | Carrinho, ordenação e RPC |
| `novelty-core.ts` + `useNovelties.ts` | 0 | 2 | 2 | 0 | 0 | 0 | Pipeline de novidades duplicou alias `any` |
| Edge `_shared/auth.ts` | 2 | 0 | 0 | 0 | 0 | 1 | Autenticação compartilhada |
| Edge `verify-2fa-token` | 0 | 1 | 0 | 0 | 0 | 4 | MFA e cliente admin |
| Edge `rls-audit` | 8 | 0 | 0 | 0 | 0 | 0 | Auditoria de autorização |
| Edge `crm-db-bridge` | 2 | 4 | 0 | 0 | 11 | 15 | Ponte externa e escrita CRM |
| Edge `receive-crm-callback` | 5 | 0 | 0 | 0 | 0 | 0 | Ingestão de callback externo |
| Edge `expert-chat` | 3 | 44 | 0 | 0 | 16 | 12 | Maior hotspot; IA + CRM + catálogo |

Ordem de tratamento por risco, não apenas volume:

1. auth/MFA/RLS e callbacks/bridges externos;
2. integração Supabase tipada e RPCs de carrinho;
3. `expert-chat`, dividindo contratos de CRM, catálogo e resposta de IA;
4. hooks com `exhaustive-deps`, sempre acompanhados por testes de contrato;
5. console ruidoso fora dos sinks.

## 9. Estado dos gates e gaps objetivos

### Gate `any`

- `.any-type-baseline.json`: baseline oficial **1**, em `src/hooks/products/useSellerCarts.ts`;
- o comando do gate falhou nesta sandbox com `spawnSync /bin/sh EPERM`, pois o script usa `execSync()` com `grep` via shell;
- a reprodução direta e equivalente encontrou exatamente o mesmo 1;
- o gate só percorre `src/`, não `supabase/functions/`;
- os padrões `as any` e `: any` não capturam `type X = any`, `Generic<any>` nem todos os `any[]`;
- o filtro de testes não exclui `*.spec.ts(x)`;
- o gate conta por linha/padrão, enquanto o baseline proposto conta tokens sintáticos.

### Gate ESLint

- `.eslint-baseline.json` declara `totalErrors: 0`, mas conserva um par file:rule de warning (`safeAuthCall.ts`/naming convention);
- `eslint.config.js` ignora explicitamente `supabase/functions/**` e `src/integrations/supabase/types.ts`;
- `no-console` no app é warning, permitindo `warn` e `error`;
- `@typescript-eslint/no-explicit-any` é error no app;
- uma execução `--full --json`, concluída às 16:17 antes da última rodada concorrente, retornou **131 erros, 4 warnings, delta de regressão +134 e exit 1**;
- 114 das 134 regressões agregadas daquela execução estavam concentradas em `VirtualizedProductGrid.tsx` e `MockupDeletion.test.tsx`; como esses arquivos continuaram mudando, o dado é diagnóstico, não baseline aceito.

### Graphify

O grafo existente (29.262 nós) ligou `check-any-type-baseline.mjs`, `check-eslint-baseline.mjs`, `Quality Gate`, `supabase/types.ts`, `client.ts`, `Auth()` e `production-readiness.test.ts`. A conexão reforça que a maior lacuna não está no frontend isolado: está na passagem entre quality gates, tipos Supabase e runtime Edge.

## 10. Baseline decrescente proposto

Não atualizar os baselines oficiais antes de corrigir as regressões atuais e estabilizar a worktree. Depois disso, criar ratchets separados para app e Edge; uma redução em um lado nunca deve mascarar regressão no outro.

| Métrica bloqueante | M0: congelar | M1 | M2 | M3 | Meta final |
|---|---:|---:|---:|---:|---:|
| `any` explícito no app | 10 | 8 | 5 | 2 | **0** |
| `any` explícito em Edge | 151 | 120 | 75 | 35 | **0** |
| `eslint-disable*` no app | 177 | 150 | 120 | 80 | **0** |
| `eslint-disable*` em Edge | 1 | 0 | 0 | 0 | **0** |
| `@ts-ignore` + `@ts-expect-error` | 2 | 1 | 0 | 0 | **0** |
| `console.log/info/debug/trace` | 115 | 90 | 60 | 30 | **0 fora de sinks aprovados** |
| Todo `console.*` direto | 395 usos | 320 | 220 | 120 | **0 fora de allowlist aprovada** |

Regras do ratchet:

- teto por **arquivo + categoria**, além do teto global;
- novo arquivo nasce com teto zero;
- remoção reduz automaticamente o teto; nunca elevar baseline para acomodar regressão;
- baseline gerado de AST, com ordenação determinística;
- exceção precisa de owner, motivo, teste e prazo; comentário sozinho não é allowlist;
- `react-hooks/exhaustive-deps` deve ter fila própria e validação comportamental;
- sinks de logger e boot boundaries protegidos devem ser listados explicitamente, não excluídos por glob amplo;
- Edge deve ter parser/config próprios para Deno, sem simplesmente remover o ignore atual do ESLint do app.

## 11. Comandos exatos e resultados

### Identidade do retrato

```bash
date -Iseconds
git rev-parse --short HEAD
node --version
npm --version
rg --version | sed -n '1p'
git status --porcelain=v1 | wc -l
```

Resultado:

```text
2026-08-26T16:23:02-03:00
0660b3ef9
v24.19.0
11.17.0
ripgrep 14.1.0
82
```

### Gate oficial de `any`

```bash
node scripts/check-any-type-baseline.mjs
```

Resultado nesta sandbox:

```text
❌ Erro ao rodar grep: spawnSync /bin/sh EPERM
```

Reprodução direta da mesma lógica e mesmo escopo:

```bash
rg -n -P '\bas\s+any\b|:\s*any\b' src \
  -g '*.{ts,tsx}' \
  -g '!**/*.test.ts' -g '!**/*.test.tsx' \
  -g '!**/__tests__/**' -g '!src/tests/**' |
awk '{
  line=$0
  sub(/^[^:]+:[0-9]+:/,"",line)
  sub(/^[[:space:]]+/,"",line)
  if (line !~ /^\/\// && line !~ /^\*/) print $0
}'
```

Resultado:

```text
src/hooks/products/useSellerCarts.ts:726:      const { error } = await (supabase.rpc as any)('fn_batch_update_cart_item_sort_order', {
```

### Diretivas brutas

Aplicar aos dois comandos os mesmos globs de exclusão:

```bash
rg -o 'eslint-disable(?:-next-line|-line)?\b' src supabase/functions \
  -g '*.{ts,tsx}' \
  -g '!**/*.test.ts' -g '!**/*.test.tsx' \
  -g '!**/*.spec.ts' -g '!**/*.spec.tsx' \
  -g '!**/*.stories.ts' -g '!**/*.stories.tsx' \
  -g '!**/*_test.ts' -g '!**/__tests__/**' -g '!**/tests/**' \
  -g '!src/test/**' -g '!src/tests/**' | wc -l

rg -o '@ts-(?:ignore|expect-error)\b' src supabase/functions \
  -g '*.{ts,tsx}' \
  -g '!**/*.test.ts' -g '!**/*.test.tsx' \
  -g '!**/*.spec.ts' -g '!**/*.spec.tsx' \
  -g '!**/*.stories.ts' -g '!**/*.stories.tsx' \
  -g '!**/*_test.ts' -g '!**/__tests__/**' -g '!**/tests/**' \
  -g '!src/test/**' -g '!src/tests/**' | wc -l
```

Resultado: `178` e `2`. Formas ESLint: 170 `next-line`, 2 `line` e 6 blocos/arquivo.

### Inventário sintático reproduzível

O comando abaixo imprime o fechamento por escopo. Ele usa o parser TypeScript do projeto e evita falsos positivos de comentários/strings para `any` e `console`.

```bash
node --input-type=module <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const roots = ['src', 'supabase/functions'];
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = path.posix.join(dir, entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});
const files = roots.flatMap(walk).filter((file) =>
  /\.(ts|tsx)$/.test(file) &&
  !/(^|\/)(__tests__|tests?|test)(\/|$)/.test(file) &&
  !/\.(test|spec|stories)\.(ts|tsx)$/.test(file) &&
  !/_test\.(ts|tsx)$/.test(file));

const rows = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const count = {
    asAny: 0,
    otherAny: 0,
    eslint: (text.match(/eslint-disable(?:-next-line|-line)?\b/g) || []).length,
    tsSuppress: (text.match(/@ts-(?:ignore|expect-error)\b/g) || []).length,
    consoleNoisy: 0,
    consoleWarnError: 0,
    consoleNonCall: 0,
  };
  const visit = (node) => {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      const isCast =
        (ts.isAsExpression(node.parent) || ts.isTypeAssertionExpression(node.parent)) &&
        node.parent.type === node;
      count[isCast ? 'asAny' : 'otherAny'] += 1;
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'console'
    ) {
      if (ts.isCallExpression(node.parent) && node.parent.expression === node) {
        if (['warn', 'error'].includes(node.name.text)) count.consoleWarnError += 1;
        else count.consoleNoisy += 1;
      } else {
        count.consoleNonCall += 1;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  rows.push({ scope: file.startsWith('src/') ? 'app' : 'edge', ...count });
}
const keys = [
  'asAny', 'otherAny', 'eslint', 'tsSuppress',
  'consoleNoisy', 'consoleWarnError', 'consoleNonCall',
];
for (const scope of ['app', 'edge']) {
  const selected = rows.filter((row) => row.scope === scope);
  const totals = Object.fromEntries(
    keys.map((key) => [key, selected.reduce((sum, row) => sum + row[key], 0)]),
  );
  console.log(scope, selected.length, totals);
}
NODE
```

Resultado:

```text
app 1934 {
  asAny: 1, otherAny: 9, eslint: 177, tsSuppress: 1,
  consoleNoisy: 17, consoleWarnError: 30, consoleNonCall: 7
}
edge 164 {
  asAny: 38, otherAny: 113, eslint: 1, tsSuppress: 1,
  consoleNoisy: 98, consoleWarnError: 243, consoleNonCall: 0
}
```

### Estado do ESLint baseline

```bash
node scripts/check-eslint-baseline.mjs --full --json
```

Resultado resumido: exit `1`; baselineErrors `0`; currentErrors `131`; currentWarnings `4`; regressionsDelta `134`; improvementsDelta `0`.

## 12. Checklist de aceite da etapa 32

- [x] Escopo de produção definido e exclusões documentadas.
- [x] `as any` literal contado por AST.
- [x] Demais formas explícitas de `any` contadas por AST.
- [x] Diretivas ESLint contadas por forma, regra e domínio.
- [x] `@ts-ignore` e `@ts-expect-error` localizados individualmente.
- [x] `console` separado por método, chamada e referência/mutação.
- [x] App e Edge medidos separadamente.
- [x] Fronteiras de auth, RLS, Supabase, CRM, carrinho e IA destacadas.
- [x] Gaps dos gates atuais documentados.
- [x] Baseline decrescente proposto sem elevar os baselines oficiais.
- [x] Nenhum source, script, config, package, baseline ou workflow alterado.
- [ ] Reexecutar o inventário quando a worktree concorrente estabilizar, antes do merge.
- [ ] Implementar novos ratchets somente em etapa autorizada de código/CI.
