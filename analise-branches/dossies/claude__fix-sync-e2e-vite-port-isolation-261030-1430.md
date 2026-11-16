# origin/claude/fix-sync-e2e-vite-port-isolation-261030-1430

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Fez os testes automaticos de tela (vitrine de Novidades/Reposicao, lista de Orcamentos e o aviso "Desfazer") pararem de falhar por culpa da propria esteira de testes — tudo isso ja esta valendo no sistema em producao hoje.
- **Tip / merge-base / main:** tip `85311e8b956c6af7d3250579927b4bef56215320` · merge-base `cba9944d12a61699a3ca855388e5842c5d6948b3` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

13 commits, todos de esteira de teste/CI e documentacao de status. Nenhum commit mexe em
regra de negocio, tela de usuario, banco ou edge function. Pelas mensagens, a intencao era:

1. `91cf6bf495 fix(e2e): isola servidor Vite no CI de paridade` — o teste de paridade visual
   subia (ou reaproveitava) um servidor Vite em porta compartilhada e colidia com outros jobs.
   Queria porta fixa e dedicada (`127.0.0.1:8081`, `--strictPort`) e proibir reaproveitar
   servidor alheio.
2. `9336e0520a fix(e2e): evita falso positivo em erro 500` — a verificacao literal de "500"
   casava com o texto de catalogo "6.500 produtos" e reprovava uma pagina saudavel.
3. `7e3bfebecc` + `7c5f525996` — o teste do aviso "Desfazer" pedia duracao de 500 ms, mas o
   componente aplica minimo de 1.000 ms; e o teste dependia de login real e do tour de
   onboarding. Queria usar o harness DEV (`/__test/undo-toast?interactive=1`) e a duracao real.
4. `e0c76a1ede test(e2e): valida alinhamento dos cards por linha` — trocar a assercao de
   "altura absoluta fixa do card" (que era falsa: card de Reposicao tem sparkline extra) por
   "cards alinhados dentro da mesma linha do grid virtualizado".
5. `b0b066634e` + `9c921e8d38` — o teste da coluna Expiracao de Orcamentos lia a tabela antes
   dela montar e dependia de dado real no Supabase de producao. Queria esperar o cabecalho e
   isolar o teste do banco.
6. `b0206929ee fix(e2e): aciona o link interno do card de revista` — o clique caia no
   `<article>` externo, fora do alvo navegavel, e a rota ficava em `/magazine`.
7. `48926a9da6`, `7f4b4fe44e`, `5a2e578a26`, `c4d41bd0f7`, `6bb8816530` — somente snapshots de
   auditoria em `PENDENCIAS.md` e `RELATORIO_CI.md` (estado de CI de 2026-10-29).

Contexto importante: a PR [#2717](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2717)
desta branch foi **fechada sem merge** em 2026-10-30 (`merged_at: null`,
`mergeable_state: dirty`). Mesmo assim o conteudo chegou a main por outras PRs — por isso
nenhum commit da branch e ancestral da main (`git merge-base --is-ancestor 9336e0520a
origin/main` → NAO) e ainda assim o comportamento esta lado.

## Item por item: esta na main?

| Item | Onde esta na main (ou NAO ESTA) | Evidencia |
|---|---|---|
| Porta dedicada + `--strictPort` no servidor local de teste | `playwright.config.ts` — presente e **ampliado** (main acrescentou modo `preview`) | `git show origin/main:playwright.config.ts` linhas 7, 12, 14, 17: `const forceStartServer = process.env.E2E_FORCE_START_SERVER === '1'`; `` `npm run dev -- --port ${localServerPort} --strictPort` `` |
| Nao reaproveitar servidor externo quando forcado | `playwright.config.ts` na main: `reuseExistingServer = !forceStartServer && (...)` | linha 10-11 do mesmo arquivo na main |
| Variaveis de CI `E2E_BASE_URL=http://127.0.0.1:8081` e `E2E_FORCE_START_SERVER='1'` | `.github/workflows/replenishment-quality.yml` na main | `git show origin/main:.github/workflows/replenishment-quality.yml` linhas 47-48 |
| Fim do falso positivo "500" vs "6.500 produtos" | `e2e/flows/26-catalog-to-kit-flow.spec.ts` — arquivo **identico** ao da branch hoje | `git diff 85311e8b origin/main -- e2e/flows/26-catalog-to-kit-flow.spec.ts` → vazio; main linhas 12-13: comentario "que contem a sequencia \"500\" (por exemplo, \"6.500 produtos\")" + regex `SERVER_ERROR_MESSAGE` |
| Teste "Desfazer" sem login real, via harness DEV | `e2e/flows/04r-undo-toast-a11y-keyboard.spec.ts` na main | linhas 75-77: `gotoAndSettle(page, "/__test/undo-toast?interactive=1")` + `expect(page.getByTestId("harness-ready")).toHaveAttribute("data-harness-mode", ...)`; imports reduzidos a `test, expect` + `gotoAndSettle` (linhas 21-22), sem `dismissOnboardingTour`/`installMockAuth` — exatamente a remocao que a branch fez |
| Duracao real de 1.000 ms no cenario de expiracao | `04r-...spec.ts` na main, linha 154: `await showUndoToastInBrowser(page, 1000)`; comentario na main: "1s e a duracao minima aplicada pelo componente (`Math.max(1000, duration)`)" | mesma leitura acima. A main **evoluiu** em cima disso: voltou a exercer o clique pos-expiracao, mas usando o `waitForFunction` em `data-expired`, nao o sleep de 700 ms que era a causa da falha |
| Harness interativo do toast | `src/pages/dev/UndoToastHarness.tsx` — **identico** ao da branch | `git diff 85311e8b origin/main -- src/pages/dev/UndoToastHarness.tsx` → vazio; main linhas 37/42/46: `interactive = params.get('interactive') === '1'`, `data-testid="harness-ready"`, `data-harness-mode` |
| Alinhamento por linha do grid (em vez de altura absoluta) | `e2e/catalog/novidades-reposicao-card-parity.spec.ts` na main — **logica identica** | `git show origin/main:...card-parity.spec.ts` linha 396: `` test(`cards alinhados por linha em viewport ...`) ``; linhas 413 (`element.closest('[data-index]')`), 420-424 (`heightsByRow`), 427-437 (`rowSpreads` + asserção por linha) |
| Espera do cabecalho antes de conferir ordem das colunas de Orcamentos | `e2e/flows/04p-quotes-expiration-column.spec.ts` na main | linhas 431 e 436: `expect(page.getByTestId('quotes-col-header-expiration')).toBeVisible({ timeout: 10_000 })` antes e depois do reload |
| Isolar do Supabase o teste de layout de Orcamentos | Na main, **superado por versao mais forte**: a branch usava `installMockAuth` + mock so da rota `/rest/v1/quotes`; a main implementa `installLayoutSupabaseMock` (intercepta todo o host Supabase, auth, RPC, realtime via `routeWebSocket`, bloqueia escrita com 405 e verifica isolamento com `assertIsolated`), alem de separar `requireLiveDatabaseAuth` para os testes que precisam de banco real | main linhas 16, 98, 257, 268, 405, 410, 438 do mesmo arquivo |
| Clique no link interno do card de revista | `e2e/flows/magazine-header-align.spec.ts` na main, linha 49: `firstCard.getByRole("link", { name: /^Abrir revista / }).click()` — exatamente a correcao da branch (comentario reescrito) | `git show origin/main:e2e/flows/magazine-header-align.spec.ts` linhas 38-49. Observacao: o commit `b0206929ee` foi revertido **dentro da propria branch** (`git diff cba9944d 85311e8b -- e2e/flows/magazine-header-*.spec.ts` → vazio), e os dois arquivos estao identicos a main hoje |
| Snapshots de auditoria de CI de 2026-10-29 em `PENDENCIAS.md` e `RELATORIO_CI.md` | NAO ESTA — e **nao deve** estar: a main tem a geracao seguinte dos mesmos dois documentos, de 2026-11-08/09 | main `PENDENCIAS.md` linha 1-4: "Gerado em: 2026-11-08 ... P-19 adicionado"; 1.090 linhas na main vs 596 na branch. `RELATORIO_CI.md` na main: "Data: 2026-11-08", 1.193 linhas vs 602. `AGENTS.md` classifica `PENDENCIAS.md` como "historico, nao ordem" |

## A resgatar

Nada. Os 7 itens de codigo/CI da branch estao na main, 4 deles com texto praticamente identico
e 3 em versao mais completa. Os 2 arquivos restantes sao fotografias de status de CI de
2026-10-29 que a main ja substituiu por fotografias de 2026-11-08/09 — reinserir o texto antigo
seria regredir a documentacao.

## Risco de fechar esta branch

Praticamente nulo. A PR #2717 desta branch ja foi fechada sem merge em 2026-10-30 — fechar a
branch nao fecha nenhuma PR viva nem retira nada do ar. Nenhuma linha dela toca banco de dados,
permissao, preco, regra fiscal ou tela de cliente: e tudo esteira de teste, e a esteira de teste
que esta valendo hoje na main ja contem essas correcoes (e, em tres pontos, versoes melhores).

O unico efeito e perder o acesso rapido ao relato de auditoria de 29-30/10/2026 que estava em
`PENDENCIAS.md`/`RELATORIO_CI.md` da branch. Dos pontos abertos que aquele relato listava, os
que ainda importam ja estao registrados em outro lugar: divergencia do ledger de migrations do
Supabase, divergencia das edge functions em producao e o teste do cabecalho de Revista constam da
lista de pendencias ativa da sessao. Se o dono quiser guardar o relato historico, basta nao
apagar a branch; nao ha motivo tecnico para mante-la.

## Nao verificado

- Nao foi executado nenhum teste nem workflow nesta analise (tarefa somente leitura). A
  afirmacao "esta na main" e por presenca do comportamento no codigo da main, com arquivo:linha,
  nao por run verde de CI.
- Nao foi auditado, item por item, se cada pendencia listada nos snapshots de 2026-10-29 da
  branch ja esta coberta na `PENDENCIAS.md` de 2026-11-08 da main. Foram conferidos por amostra
  os tres itens de maior impacto (ledger Supabase, edge functions, Magazine Header).
- `arquivos_nao_lidos = 0`: o pacote de evidencia nao veio truncado e os 7 arquivos divergentes
  foram lidos, mais os 2 que a branch tocou e que hoje sao identicos a main.
