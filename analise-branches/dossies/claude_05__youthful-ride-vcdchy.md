# origin/claude_05/youthful-ride-vcdchy

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** nada direto no sistema — e a pasta de anotacoes de uma auditoria interna que revisou ~50 pedidos de mudanca (PRs) em 8 e 9 de novembro; o unico conserto de verdade que ela trazia (horario dos robos agendados) ja esta na main, e ~97 arquivos dessas anotacoes nunca chegaram la.
- **Tip / merge-base / main:** tip `7d6a177ac50a1bf30e580ffc92b35cb4eecb24a4` / merge-base `986a1efbf862ee022e72ba8469f5d8695a3f99e1` / main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Pelos 77 commits (todos com assunto `docs(analise-prs):` / `chore(analise-prs):`), o agente queria **documentar, PR por PR, o que podia ser mergeado sozinho e o que precisava do dono**. Produziu dossies por PR, um relatorio consolidado (`RELATORIO_PRS.md`), planilhas de controle (`prs.json`, `prs.csv`, `progresso.json`), baselines de teste/typecheck e um documento de regras de negocio extraidas do codigo.

Dois commits fogem desse escopo e sao o unico conteudo de codigo proprio da branch:
- `f68a60594e` (2026-11-08) — cria `supabase/migrations/20261101220000_cron001_stagger_schedules.sql` (CRON-001: escalonar horarios dos jobs agendados).
- `6cb1174806` (2026-11-01) — regera o snapshot de `NegotiationMarkupCard`.

**Fato que muda a leitura dos 38 arquivos de codigo/doc que diferem:** eles **nao sao trabalho da branch**. Vieram do merge `8ef5800a62` ("chore: merge main (986a1efb PR#2575) into entregaveis rev28"), cuja resolucao descartou o lado da main. `git log 986a1efb..7d6a177a -- src supabase` lista apenas 4 commits, sendo 2 deles merges — ou seja, nenhum commit proprio da branch editou `src/` depois do merge-base.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Migration CRON-001 (escalonar jobs agendados) | **ESTA**, identica | `git diff 7d6a177a e4ab7f85 -- supabase/migrations/20261101220000_cron001_stagger_schedules.sql` → vazio; entrou por `58242ce1bb 2026-11-01 fix(cron): escalonar schedules para eliminar job startup timeout — CRON-001` |
| Achado "regressao `!showScrollTop` invertido" (PR #3245) | **ESTA resolvido** — a main nao tem o defeito | `src/components/products/VirtualizedProductGrid.tsx:491` → `{showScrollTop && (` (nao invertido) |
| `analise-prs/regras-de-negocio.md` | **PARCIAL** — a main tem um arquivo com o mesmo nome, de outra sessao (2026-10-28), com 11 secoes diferentes; as secoes de Kit Builder, isolamento de tenant e orcamentos/carrinhos da branch NAO ESTAO | `git show e4ab7f85:analise-prs/regras-de-negocio.md \| grep '^## '` vs `git show 7d6a177a:...` — titulos nao coincidem; diff 102+/87- |
| 97 arquivos de `analise-prs/` (dossies PR-2558..PR-3287, baselines, `progresso-sessao6.json`) | **NAO ESTAO**, em nenhum caminho | `comm -23` entre `git ls-tree -r e4ab7f85 analise-prs/` e o da branch → 97 linhas; `git log origin/main -- analise-prs/dossies/PR-2940.md` → vazio (nunca existiu na main); `git ls-tree -r e4ab7f85 \| grep -E "2940\|3217\|3144"` → nenhum dossie |
| Snapshot `NegotiationMarkupCard.visualA11y.test.tsx.snap` | **NAO ESTA — e nao deve estar** | branch tem 1243 linhas e **4 chaves**, duas delas obsoletas (`snapshot em 'desktop' (1440 px)` com aspas); main tem 623 linhas e as 2 chaves corretas, atualizadas em `f6ffe3710b 2026-10-29`. E lixo de `vitest -u` rodado em arvore defasada |
| `src/services/notificationService.ts` (+240) e `src/lib/auth/auth-audit.ts` (+27) | **NAO ESTAO — removidos de proposito** | `521450d9d2 2026-10-25 chore: remove servicos orfaos notificationService e orderService` e `5d480cde9e 2026-10-25 chore: remove auth-audit.ts (dead code — RPC check_auth_config_status inexistente)`. `git diff 521450d9d2^ 7d6a177a -- <arquivos>` → **vazio**: a branch carrega copia byte a byte do pre-remocao |
| `src/services/orderService.ts` + teste | **ESTA na main, em versao melhor** | `a03adc3548 2026-11-15 feat(orders): resgata conferencia do total do pedido contra a soma dos itens (#3667)`; a versao da branch e identica a do pre-remocao de 2026-10-25 |
| 9 arquivos de `src/components/kit-builder/`, `src/components/bi/BIAiCopilot.tsx`, `src/pages/kit-builder/KitBuilderPage.tsx` | **ESTAO na main, mais novos** — a branch carrega estados antigos | teste de identidade de blob: conteudo da branch bate exatamente com estados da main de 2026-07-24 a 2026-09-27 (ex.: `BoxSelector.tsx == main@506be8ef5c 2026-09-27`, `KitBuilderHeader.tsx == main@c6a7d2d361 2026-09-23`) |
| `src/components/layout/Header.tsx` | **ESTA na main, mais nova** — branch = `main@9be832a355 2026-10-25` | `git diff 7d6a177a e4ab7f85 -- src/components/layout/Header.tsx`: a main extraiu o menu para `UserMenuShortcutItems` e voltou o "reiniciar tour"; a branch tem tudo inline (versao antiga) |
| `.github/workflows/contract-tests.yml`, `PENDENCIAS.md`, `RELATORIO_CI.md`, `docs/ci/SEGREDOS.md`, `docs/estado/backlog/*`, `.as-assertions-baseline.json`, `.file-size-baseline.json`, `audit/supabase-reference-catalog.temporary.json`, `scripts/migration-ledger-remote-only-allowlist.json`, 2 migrations `20261022*` | **ESTAO na main, mais novos** — branch = estados da main de 2026-06-11 a 2026-10-25 | mesmo teste de blob: `contract-tests.yml == main@ac0f4e10fc 2026-10-22`; `PENDENCIAS.md` e `RELATORIO_CI.md == main@479f221948 2026-10-25`; `banco_migrations_460.tsv == main@15e10fd882 2026-10-25` |
| `src/components/layout/UserMenuShortcutItems.tsx`, `supabase/rollbacks/20261022195616_rollback.sql`, `supabase/rollbacks/20261022203935_rollback.sql` | **ESTAO na main; a branch os APAGA** | existem no merge-base e na main com o mesmo blob; ausentes na branch (`git cat-file -e 7d6a177a:<arq>` falha) |

Resumo: dos 191 arquivos que diferem, **153 sao de `analise-prs/`** e **38 sao defasagem/reversao** sem uma linha de autoria da branch.

## A resgatar

1. **`analise-prs/regras-de-negocio.md` — secoes que so existem aqui.** Secoes 1 (isolamento de tenant org_id/supplier_id, com Gate 1.13 e 1.13.2), 3 e 4 (Kit Builder: validacao pre-orcamento e navegacao por etapas) e 9 (orcamentos e carrinhos). **Por que importa:** e o unico lugar onde as regras do Kit Builder estao escritas; sem isso o proximo agente reimplementa por adivinhacao. **Nao sobrescrever** o arquivo da main (que tem 11 secoes proprias): costurar as secoes faltantes.
2. **Os 97 arquivos de `analise-prs/` que nunca chegaram a main.** Em especial `dossies/PR-3144-evidencias.md` (167 linhas: ponte do CRM, tabela `crm_seller_identity_links`, breaking change de AAL2), `dossies/PR-3220.md` (Sentinel Regra 6 + cabecalho de rollback da migration E15) e `dossies/PR-3144.md`. **Por que importa:** sao a trilha de auditoria de por que cada PR foi barrada, e dois deles descrevem exatamente pendencias que ainda estao abertas na lista do dono (SHA errado na allowlist do sentinel; recibos E15).
3. **`analise-prs/baseline/merge-tests-v2.txt` e `analise-prs/progresso-sessao6.json`.** **Por que importa:** registram qual PR dava conflito contra qual main; evita refazer o teste de merge PR por PR.

## Risco de fechar esta branch

- **Risco de apagar: baixo, mas nao zero.** Perde-se permanentemente a trilha de auditoria de ~50 pedidos de mudanca de 8–9/11 (97 arquivos) e as regras de negocio do Kit Builder escritas ali. Nada do sistema em producao deixa de funcionar: o unico conserto real (horario dos robos agendados) ja esta na main desde 1/11, e a correcao do pedido/soma dos itens foi resgatada na main em 15/11 pela PR #3667.
- **Risco de MERGEAR: alto. Esta branch nao pode ser mergeada como esta.** O merge apagaria da main, sem conflito, o arquivo `src/components/layout/UserMenuShortcutItems.tsx`, que a main importa em `src/components/layout/Header.tsx:50` e usa na linha 533 — **o site para de compilar**. Apagaria tambem os dois arquivos de desfazer (`rollback`) das migrations de 22/10, que sao exigencia de governanca do banco. E devolveria para tras: o menu do usuario, a tela do Kit Builder, o copiloto de BI, a função `categories-api`, o workflow `contract-tests.yml`, os baselines de CI e tres arquivos de codigo morto que a main removeu de proposito em 25/10.
- **Recomendacao:** resgatar os 3 itens acima numa PR de documentacao (so `analise-prs/`, docs-only, sem gates de codigo) e **so depois** apagar a branch. Nunca abrir PR desta branch inteira.

## Nao verificado

- **111 arquivos de `analise-prs/` nao foram lidos linha a linha.** O pacote de evidencia truncou em 40 arquivos (`!!! TRUNCADO: 190 arquivos no total, so os 40 primeiros vieram com diff`) e os restantes foram classificados por presenca/ausencia na main (`git ls-tree` + `comm`) e por amostragem de 3 dossies. A classificacao "existe/nao existe na main" e certa; o **valor individual** de cada um dos 97 dossies faltantes nao foi julgado um por um.
- **Nao rodei teste nem build.** A afirmacao de que o merge quebraria a compilacao vem da leitura do import em `Header.tsx:50` e da ausencia do arquivo na branch, nao de um `npm run build` executado.
- **Nao consultei o estado atual das PRs no GitHub** (abertas/fechadas/mergeadas). Se as PRs #2558–#3292 ja estiverem todas encerradas, o valor dos dossies e so historico — o que reforca "resgatar como documentacao", nao "completar".
