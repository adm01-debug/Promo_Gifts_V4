# Resgate: comentarios em orcamento (`quote_comments`) — ATIVO, PLANO JA EXECUTADO

**Estado: reativado e em producao desde 2026-11-20 (PR #3944). Nao ha mais nada para ligar.**

> Aviso de 26/11/2026. Este README descrevia um resgate **inerte** enquanto a feature estava
> cancelada. O dono reverteu o cancelamento e o roteiro do fim deste arquivo foi executado ao pe
> da letra na PR #3944. Quem ler este documento a partir de agora deve trata-lo como **rastro
> historico**, nao como instrucao. Reconferido contra a `main` `20eb648e89`:

| Peca | Onde esta na main hoje |
|---|---|
| Hook | `src/hooks/useQuoteComments.ts` |
| Componente | `src/components/quotes/QuoteCommentsSection.tsx` |
| Montagem | `src/pages/quotes/QuoteViewPage.tsx:41` (import) e `:542` (`{id && <QuoteCommentsSection key={id} quoteId={id} />}`) |
| Migration aplicada | `supabase/migrations/20261120180000_restore_quote_comments_scoped_threads.sql` |
| Testes | `tests/hooks/useQuoteComments.test.ts`, `tests/components/QuoteCommentsSection.test.tsx` |

Prova byte a byte de que a migration aplicada e o SQL desta pasta sao o mesmo arquivo: sha256 do
arquivo da main `aec27e3458b5d54992901ca205415ed05fb711893e5b0a8ec783982672327514`; sha256 do SQL
daqui `ffafbad5c04e75167e425c7684e42a97403591210834b8aabaea944f10eb73cd`. O unico diff entre os
dois e a linha `-- Rollback:`, que passou a apontar para `20261120180000_rollback.sql`. Versao
nova, como o roteiro exigia.

Por que o resto deste texto fala em "cancelada": a decisao de 27/06/2026 e o cancelamento
continuam historicos. O que mudou foi a decisao do dono, em 20/11/2026.

## Por que a feature esta cancelada

A main cancelou a feature em 27/06/2026, no commit `3413dd136`, com justificativa escrita. No
mesmo dia criou a trava `scripts/check-no-quote-comments.mjs`, acionada pelo workflow
`.github/workflows/ci-security-drift.yml`, para impedir que ela voltasse sozinha por auto-import,
merge ou regeneracao de `types.ts`.

Estado do banco de producao (`doufsxqlfjyuvxuezpln`), medido em 17/11/2026 por `execute_sql`
read-only contra o `pg_catalog`:

| Objeto | Contagem |
|---|---|
| tabela `public.quote_comments` | 0 |
| funcao `public.enforce_quote_comment_mutation` | 0 |
| policies em `quote_comments` | 0 |
| versao `20261110022404` no ledger `supabase_migrations.schema_migrations` | 0 |

A migration de DROP registrou 0 linhas apagadas: nenhum comentario real foi perdido no
cancelamento.

## Por que o SQL esta aqui e NAO em `supabase/migrations/`

Um arquivo em `supabase/migrations/` pode ser aplicado em producao por um `workflow_dispatch` do
`db-apply-migration.yml` — basta alguem escolher a versao na lista. Colocar o SQL la deixaria uma
migration pronta para ser aplicada por engano, o que contraria a decisao de manter a feature
desligada. Prefixar o nome para "esconder" nao resolve: a versao continua selecionavel.

Por isso o SQL vive em `sql/` como documento. Ele nao esta no diretorio de migrations, nao esta no
ledger, nao tem recibo em `MIGRATIONS_SYNC_LOG.md` e nao e alcancavel por nenhum workflow. Os
gates de migration (`check-migration-filename-contract`, `check-migrations-sync-log-gate`) so
olham `supabase/migrations/`, entao esta pasta nao os aciona — e, por simetria, o SQL daqui
tambem nao ganha as garantias que eles dao. Ele volta a ser uma migration de verdade no passo 2
do roteiro, e nao antes.

O mesmo raciocinio vale para o codigo: ele esta em `docs/`, nao em `src/`, porque nada em `docs/`
entra no grafo de build do Vite, no `tsconfig.app.json` (que inclui so `src`), no ESLint (que roda
so sobre `src`) nem na coleta do Vitest. Codigo aqui e texto. E `docs/` tambem esta fora dos
caminhos varridos pela trava do dono, que olha `src/`, `scripts/`, `e2e/` e `tests/` — ou seja, o
resgate nao acorda o gate nem pede excecao a ele.

## Inventario: o que entrou, o que foi adaptado, o que ficou fora

Material de origem: `origin/codex/fix-gate1-kit-pdf-types-261109-2252`.

### Entrou como esta (copia byte a byte)

| Arquivo aqui | Origem na branch |
|---|---|
| `codigo/useQuoteComments.ts` | `src/hooks/useQuoteComments.ts` |
| `codigo/QuoteCommentsSection.tsx` | `src/components/quotes/QuoteCommentsSection.tsx` |
| `sql/20261110022404_restore_quote_comments_scoped_threads.sql` | mesma versao em `supabase/migrations/` |
| `sql/20261110022404_rollback.sql` | mesma versao em `supabase/rollbacks/` |
| `testes/QuoteCommentsSection.test.tsx` | `tests/components/QuoteCommentsSection.test.tsx` |
| `testes/useQuoteComments.test.ts` | `tests/hooks/useQuoteComments.test.ts` |
| `testes-sql/fixture.sql`, `testes-sql/run-tests.py` | `tests/sql/quote-comments/` |

SHA-256 do SQL principal: `ffafbad5c04e75167e425c7684e42a97403591210834b8aabaea944f10eb73cd` —
o mesmo hash que a propria branch documentava, o que confirma que a copia nao foi alterada.

### Entrou adaptado

- `montagem-QuoteViewPage.patch` — as 2 linhas de montagem, reapontadas da pagina morta
  `src/pages/QuoteViewPage.tsx` para a pagina viva `src/pages/quotes/QuoteViewPage.tsx`, com os
  numeros de linha conferidos contra a main.
- `testes-sql/README-original.md` — texto original preservado; so os caminhos relativos foram
  reapontados para esta pasta.

### Ficou fora, de proposito

- **`src/pages/QuoteViewPage.tsx` (+73 linhas na branch)** — essa pagina nao existe mais na main.
  A rota viva e `src/routes/quote-routes.tsx` -> `src/pages/quotes/QuoteViewPage.tsx`. Resgatar o
  arquivo morto seria ressuscitar codigo morto.
- **`src/integrations/supabase/types.ts` (+53 linhas na branch)** — diff artesanal, escrito a mao e
  envelhecido. Nao foi copiado. `types.ts` e gerado: ele se regenera depois que a tabela existir
  (passo 3 do roteiro).
- **A troca de `QUOTE_STATUS_CONFIG` por `quote-view-status-config`** — vinha no mesmo commit da
  branch, mas nao tem relacao com comentarios.
- **Qualquer recibo em `supabase/MIGRATIONS_SYNC_LOG.md`** — nao ha aplicacao para registrar. O
  `README-original.md` fala de uma "entrada pendente" no log; essa entrada nao existe na main, foi
  recusada junto com a feature.
- **O que a main ja tem** — `fetch-all-pages`, `AuthContext`, `logger`, `ConfirmDialog`. O hook e o
  componente importam esses modulos de `@/`; nada foi duplicado.

### A trava anti-comentarios foi REMOVIDA — nao a recrie

Os tres arquivos abaixo existiam para manter a feature desligada. A PR #3944 os removeu porque,
com o codigo de volta em `src/`, a trava passava a reprovar a propria `main`:

- `scripts/check-no-quote-comments.mjs` — removido por `cfd7f833bb` (101 linhas deletadas).
- `e2e/routes/quotes/view-no-comments-network.spec.ts` — removido pelo mesmo commit (39 linhas).
- `.github/workflows/ci-security-drift.yml` — segue na main, mas **nao aciona mais** essa trava
  (o passo saiu junto; hoje ele chama `check-tsc-baseline.mjs`, `check-invoke-direct-calls.mjs` e
  o teste de `check-file-size-baseline`).

**Recriar a trava, afrouxar ou adicionar excecao a ela quebra a CI da main** — ela passaria a
reprovar `src/hooks/useQuoteComments.ts` e `src/components/quotes/QuoteCommentsSection.tsx`, que
hoje sao producao. Se voce precisa do texto original por curiosidade historica:
`git show cfd7f833bb^:scripts/check-no-quote-comments.mjs`.

## O que o codigo faz (para a decisao de negocio)

- Comentarios por orcamento, com threads de **1 nivel** (comentario raiz + respostas; resposta de
  resposta e recusada no banco).
- Autor pode editar e excluir o proprio comentario; marca "(editado)" automatica.
- Comentario raiz **com respostas nao pode ser excluido** (`ON DELETE RESTRICT`) — a UI desabilita
  o botao e explica.
- Excluir o orcamento apaga os comentarios dele (`ON DELETE CASCADE`).
- RLS com `FORCE ROW LEVEL SECURITY`, `anon` sem nenhum grant; a visibilidade herda a RLS de
  `quotes` (organizacao, vendedor, criador, responsavel).
- Trigger de imutabilidade: `id`, `quote_id`, `user_id`, `parent_id` e `created_at` nao mudam
  depois do insert; `updated_at` e `is_edited` sao do servidor, nao do cliente.
- Notifica os outros participantes do orcamento via `workspace_notifications`, com
  `idempotency_key` para nao duplicar.
- Limite de 5000 caracteres, validado no banco e na UI.

**Ponto que ainda precisa da decisao do dono:** a exclusao e fisica (`DELETE`), nao soft-delete.
A branch pediu uma excecao fora da lista da politica de soft-delete e deixou isso explicito para
revisao. Veja `testes-sql/README-original.md`.

## Roteiro que ja foi executado (rastro, nao instrucao)

**Executado na PR #3944, em 20/11/2026.** O dono decidiu reverter o cancelamento (passo 1), o SQL
foi copiado para `supabase/migrations/` com versao nova `20261120180000` (passo 2), `types.ts` foi
regenerado (passo 3), o codigo foi para `src/` (passo 4), a montagem entrou na pagina viva
(passo 5), os testes foram para `tests/` (passo 6) e a trava foi decidida — removida (passo 7).
Os passos abaixo ficam como registro do que era esperado de cada etapa.

1. **Decidir reverter o cancelamento.** Nada abaixo deve ser feito sem isso. O cancelamento de
   27/06 tinha justificativa escrita; convem reler antes.

2. **Aplicar a migration pelo caminho oficial.** Copiar
   `sql/20261110022404_restore_quote_comments_scoped_threads.sql` para `supabase/migrations/`,
   **com uma versao nova** (timestamp maior que a ultima do diretorio — em 17/11/2026 a ultima era
   `20261115230000`; conferir na hora), e o rollback para `supabase/rollbacks/` com a mesma versao.
   O header `-- Rollback:` precisa apontar para o novo nome. Isso vai numa PR propria; a aplicacao
   em producao e **so** pelo workflow `db-apply-migration.yml`, nunca por MCP e nunca por
   `supabase db push`. Fechar com o recibo em `supabase/MIGRATIONS_SYNC_LOG.md`, como manda
   `docs/agentes/banco-migrations.md`.

3. **Regenerar `src/integrations/supabase/types.ts`** depois que a tabela existir — e so depois.
   O diff de `types.ts` da branch foi descartado de proposito; nao reaproveite. O fluxo com os
   gates de inventario (`check:types-inventory` antes, `check:types-inventory-drift` depois) esta
   em `docs/agentes/banco-migrations.md`, REGRA #4. Sem este passo o `Tables<'quote_comments'>` do
   hook nao resolve e o typecheck quebra.

4. **Mover o codigo para `src/`:**
   - `codigo/useQuoteComments.ts` -> `src/hooks/useQuoteComments.ts`
   - `codigo/QuoteCommentsSection.tsx` -> `src/components/quotes/QuoteCommentsSection.tsx`

5. **Montar na pagina viva.** Em `src/pages/quotes/QuoteViewPage.tsx`, duas linhas, exatamente como
   em `montagem-QuoteViewPage.patch`:
   - o `import { QuoteCommentsSection } ...` logo depois do import de `QuoteHistoryPanel`
     (linha 41 na main de 17/11/2026);
   - o `{id && <QuoteCommentsSection key={id} quoteId={id} />}` logo antes do
     `{id && <QuoteVersionHistory ... />}` (linha 511 na mesma data).

   Conferir os anchors antes: a pagina muda com frequencia e os numeros envelhecem.

6. **Mover os testes:**
   - `testes/useQuoteComments.test.ts` -> `tests/hooks/useQuoteComments.test.ts`
   - `testes/QuoteCommentsSection.test.tsx` -> `tests/components/QuoteCommentsSection.test.tsx`
   - `testes-sql/` -> `tests/sql/quote-comments/` (o `run-tests.py` roda a migration contra um
     Postgres 17 em container descartavel, sem rede e sem credencial de producao)

   Depois: `npm run qa:typecheck`, `npm run lint`, `npx vitest run tests/hooks/useQuoteComments.test.ts tests/components/QuoteCommentsSection.test.tsx`.

7. **Decidir o que fazer com a trava de CI — isso e so dele.** Com o codigo em `src/`, o
   `check-no-quote-comments.mjs` passa a reprovar: e exatamente a funcao dele. As opcoes sao
   remover a trava e o spec `e2e/routes/quotes/view-no-comments-network.spec.ts`, ou mante-la e
   nao ligar a feature. **Nenhum agente deve alterar, afrouxar ou adicionar excecao a essa trava**
   — ela e a decisao escrita do dono, e so ele a desfaz. Enquanto ela existir, a feature fica
   desligada, e e assim que esta hoje.

Os passos 2 a 6 nao cabem numa PR so: o passo 2 e DDL em producao e vai sozinho, com revisao do
dono (Git 7).
