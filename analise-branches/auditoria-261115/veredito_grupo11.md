# Veredito — grupo 11 (5 branches)

Repo: /home/user/Promo_Gifts_V4 (adm01-debug/Promo_Gifts_V4). Somente leitura. Nenhuma escrita no GitHub.
Referência de comparação: `origin/main`.

Resumo: **5 INCORPORADA, 0 APROVEITAR, 0 DESCARTAR, 0 DECISAO_HUMANA.**
Nenhum trabalho de produção se perde ao apagar estas 5 branches.

---

## 1. `e15-receipt-20261114031000-43634805809` — sha `a7721f0d8a` — INCORPORADA

- merge-base `7b327f9366`; 1 commit `docs(migrations-log): recibo E15 — aplicação de 20261114031000`.
- Diff: 1 arquivo, `supabase/MIGRATIONS_SYNC_LOG.md`, +1 linha. Nenhum arquivo de código, nenhuma
  migration SQL, nenhum workflow, nenhum segredo.
- Conteúdo: linha de recibo da migration `20261114031000`, hash
  `76b1497b85e289d3de69f01308f325d454436e5a03a59f2f77b5e50a6f1287b6`, run 43634805809.
- **Prova:** `origin/main:supabase/MIGRATIONS_SYNC_LOG.md:1167` já registra a mesma version com o mesmo
  hash (`20261114031000` / `76b1497b85e2…1287b6`, "db-apply-migration.yml run 43634805809",
  "aplicada em produção"). Mesmo fato, redação diferente — equivalente.
  A mesma version também aparece em `:1596` na tabela de controle.
- Negócio: era só o recibo (comprovante) de uma migration já aplicada. Já está no log da main.

## 2. `e15-receipt-20261114170845-43646998992` — sha `6d0918741b` — INCORPORADA

- merge-base `1a9cc9a4f9`; 1 commit de recibo. 1 arquivo, `supabase/MIGRATIONS_SYNC_LOG.md`, +1 linha.
- **Prova:** `origin/main:supabase/MIGRATIONS_SYNC_LOG.md:1169` tem a linha da version `20261114170845`
  com o hash idêntico `594d31966a784f02c6a69faf144adc3422ab75369a5643a258fc2a7779c7eac4`, run
  43646998992, "22:14:43 UTC", "aplicada". A própria linha da main declara: "recibo do job 4 veio na
  PR #3632, que ficou em conflito no log — dados copiados dela" — ou seja, o dado desta branch foi
  copiado para a main de propósito.
- Negócio: recibo de migration já aplicada, já consolidado na main.

## 3. `e15-receipt-20261114170921-43647154042` — sha `e6f480f1f0` — INCORPORADA

- merge-base `1a9cc9a4f9`; 1 commit de recibo. 1 arquivo, `supabase/MIGRATIONS_SYNC_LOG.md`, +1 linha.
- **Prova:** `origin/main:supabase/MIGRATIONS_SYNC_LOG.md:1170` tem a version `20261114170921` com o
  hash idêntico `5b87f587d338b1016e5dce6f36b7f18c488baaa2e0422ac3ea5c23a91d4af9f4`, run 43647154042,
  "22:16:55 UTC", "aplicada", e o texto "recibo do job 4 veio na PR #3633, que ficou em conflito no log
  — dados copiados dela".
- Negócio: idem — recibo já consolidado na main.

## 4. `fix/p200-quote-summary-fuzz-source-20261031` — sha `4b9fbf59f7` — INCORPORADA

- merge-base `554ef41b44`; 1 commit `test(quotes): aponta fuzz para componente extraído`.
- Diff: 1 arquivo, `src/components/quotes/__tests__/QuoteBuilderSummaryAlignment.fuzz.test.ts`, +2/-2.
  Duas mudanças: (a) a linha que lê o source do componente passa de
  `../QuoteBuilderSummaryColumn.tsx` para `../QuoteBuilderSummaryItems.tsx`; (b) o texto do
  `describe(...)` muda de "QuoteBuilderSummaryColumn" para "QuoteBuilderSummaryItems".
- **Prova:** a mudança que importa (a) já está na main —
  `origin/main:src/components/quotes/__tests__/QuoteBuilderSummaryAlignment.fuzz.test.ts:19`:
  `const SRC = readFileSync(resolve(__dirname, '../QuoteBuilderSummaryItems.tsx'), 'utf8');`
  O componente `src/components/quotes/QuoteBuilderSummaryItems.tsx` existe na main (`git ls-tree`).
- Único resto: na main a string do `describe` (linha 70) ainda diz "QuoteBuilderSummaryColumn".
  É rótulo de teste, sem efeito em execução ou em produção — cosmético, não é trabalho perdido.
- Negócio: o teste de fuzz do alinhamento do resumo do orçamento já aponta para o arquivo certo na main.

## 5. `importado/vps-fabrica/v2/fix-overlay-de-geracao-do-mockup-sem-pro-2610081919` — sha `41ed083975` — INCORPORADA

- merge-base `c194982c5f`; 1 commit `fix(mockup): overlay de geração indeterminado, sem progresso
  fictício nem menção a IA`. 3 arquivos, +78/-138.
- Trabalho da branch (em linguagem de negócio): a tela "Gerando Mockup" mostrava uma barra de
  porcentagem falsa e uma lista de etapas inventadas, incluindo "Gerando com IA", movida só por
  cronômetro. A branch troca isso por um spinner e uma barra indeterminada, sem percentual e sem
  menção a IA, e respeita "reduzir animações" (`motion-safe:`).
- **Prova 1 — `src/components/mockup/GeneratingOverlay.tsx`: byte x byte idêntico à main.**
  `git diff --quiet 41ed083975 origin/main -- src/components/mockup/GeneratingOverlay.tsx` → sem
  diferença. Na main: `Loader2` com `data-testid="generating-spinner"` (linhas 39-43), barra
  indeterminada `role="progressbar"` sem `aria-valuenow` (linhas 56-64), texto "Compondo o mockup..."
  (linha 52), classes `motion-safe:` (linhas 29, 36, 40, 63) e o comentário-doc (linhas 10-16).
- **Prova 2 — `src/components/mockup/__tests__/GeneratingOverlay.test.tsx`:** os 5 testes da branch
  estão todos na main, com os mesmos títulos ("não renderiza quando não está gerando", "mostra estado
  indeterminado, sem percentual inventado", "não menciona IA nem etapas fictícias", "não avança por
  cronômetro", "animações só com motion-safe"). Única diferença: na main o `setTimeout` do 4º teste
  está envolto em chaves (`origin/main:…/GeneratingOverlay.test.tsx:31-33`) — ajuste de lint feito
  depois, na main. Nada da branch falta.
- **Prova 3 — `src/hooks/mockup/__tests__/mockup-audit.test.ts`:** a branch substituiu três asserções
  de ícones antigos (`CurrentIcon`, `Check`, `StepIcon`) por uma única do spinner. Essa asserção está
  na main, idêntica, em `origin/main:src/hooks/mockup/__tests__/mockup-audit.test.ts:1501-1502`:
  `it('icone do spinner tem aria-hidden', …) expect(src).toMatch(/<Loader2[^>]*aria-hidden="true"/s)`.
- Observação (não é trabalho perdido): a branch ainda carrega ~200 linhas do bloco "T7 —
  getTechniquePrompt" nesse mesmo arquivo de teste, que a main já removeu depois (branch 2289 linhas,
  main 1945). É estado antigo da main, não contribuição da branch.
- Negócio: a correção do overlay do mockup está completa e em produção na main.

---

## Ruído identificado
Nada neste grupo é lockfile, arquivo gerado, `graphify-out/`, `dist/` ou dossiê markdown de análise.
As três branches `e15-receipt-*` tocam só o livro-caixa `supabase/MIGRATIONS_SYNC_LOG.md` — é
documentação de recibo, não DDL; não há migration SQL, workflow nem segredo em nenhuma das 5 branches,
por isso nenhum item virou DECISAO_HUMANA.
