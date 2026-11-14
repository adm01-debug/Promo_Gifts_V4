# Relatório das PRs abertas — rodada 2026-11-13/14 (sessão claude_pink/lucid-franklin-mjhkyc)

Snapshot inicial: 32 PRs abertas em 2026-11-13 21:35Z sobre o `main` fe64be35. Dossiês individuais em `analise-prs/dossies/pr-<n>.md`; dados em `analise-prs/prs.json`; linha de base em `analise-prs/baseline/main.json`. Regras: `.claude/commands/merge-prs.md`.

## Contagem por veredito (análise)

- DUPLICADA: 1
- JA_IMPLEMENTADA: 3
- SUPERSEDIDA: 2
- AGUARDANDO_HUMANO: 11
- MERGEAR: 6
- CORRIGIR+MERGEAR: 8
- DESCARTAR: 1

## Tabela PR × veredito × ação

| PR | Título | Veredito | Toca | Ação / estado |
| --- | --- | --- | --- | --- |
| adm01-debug/Promo_Gifts_V4#3333 | chore(deps)(deps): Bump framer-motion from 14.10.0 to 14.11.1 | DUPLICADA | — | DUPLICADA de #3523 — fechar |
| adm01-debug/Promo_Gifts_V4#3339 | test: alinhar regressões da suíte ao Kit Builder | JA_IMPLEMENTADA | — | JÁ IMPLEMENTADA (#3346, 1696c5a5d) — fechar |
| adm01-debug/Promo_Gifts_V4#3390 | fix(app): restaurar contratos e preservar implementações do Gate 1 | SUPERSEDIDA | workflow, migration | SUPERSEDIDA (main: recovery/src-legacy + #3517→#3548) — fechar |
| adm01-debug/Promo_Gifts_V4#3411 | fix(db): P09 revisada não registra no ledger versões com objetos ausen | AGUARDANDO_HUMANO | migration | AGUARDANDO HUMANO — migration (ledger P09) |
| adm01-debug/Promo_Gifts_V4#3412 | feat(db): índices nas FKs de estoque e índices de desempenho que falta | AGUARDANDO_HUMANO | migration | AGUARDANDO HUMANO — migration (índices FK estoque) |
| adm01-debug/Promo_Gifts_V4#3416 | chore(ci): repassa E2E_SELLER_EMAIL/PASSWORD aos specs de vendedor | AGUARDANDO_HUMANO | workflow | AGUARDANDO HUMANO — workflow (segredos E2E_SELLER) |
| adm01-debug/Promo_Gifts_V4#3417 | chore(ci): update-snapshots gera baselines autenticados nos 3 navegado | AGUARDANDO_HUMANO | workflow | AGUARDANDO HUMANO — workflow (update-snapshots) |
| adm01-debug/Promo_Gifts_V4#3432 | fix(db): corrige 11 telas que falham por permissão ou RPC ausente no b | AGUARDANDO_HUMANO | migration | AGUARDANDO HUMANO — migration (11 telas / RPCs) |
| adm01-debug/Promo_Gifts_V4#3454 | fix(e2e): spec de busca do estoque usa o estado vazio e a ordem de foc | MERGEAR | — | MERGEAR (branch atrás do main → substituta ao chegar a vez; strict) |
| adm01-debug/Promo_Gifts_V4#3457 | fix(ci): fallback de E2E_SELLER_* para o usuário vendedor de E2E_USER | AGUARDANDO_HUMANO | workflow | AGUARDANDO HUMANO — workflow (segredos E2E em 5 workflows) |
| adm01-debug/Promo_Gifts_V4#3494 | test: reforça testes que deixavam mutantes vivos (ledger, migrations,  | SUPERSEDIDA | — | SUPERSEDIDA por #3516 — fechar |
| adm01-debug/Promo_Gifts_V4#3501 | fix(edge): corrige domínio de e-mail Resend promogifts → promobrindes | JA_IMPLEMENTADA | edge, edge_r2 | JÁ IMPLEMENTADA (idêntica à #3521 mergeada) — fechar |
| adm01-debug/Promo_Gifts_V4#3508 | docs: prod-readiness atualizado após o lote do dono e a nova queda do  | MERGEAR | — | coberta por #3543 (relatório novo) |
| adm01-debug/Promo_Gifts_V4#3516 | test: reforça testes que deixavam mutantes vivos (porta da #3494 sem a | MERGEAR | — | MERGEAR (branch atrás do main → substituta ao chegar a vez; strict) |
| adm01-debug/Promo_Gifts_V4#3517 | fix: resgata da #3390 o que ainda faltava na main (kit-builder, orçame | CORRIGIR+MERGEAR | — | CORRIGIR+MERGEAR → substituta #3548 (precisa label large-pr-approved) |
| adm01-debug/Promo_Gifts_V4#3518 | fix(security): CRM — vendedor vê os dele + os sem dono | AGUARDANDO_HUMANO | edge, edge_r2 | AGUARDANDO HUMANO — edge CRM + mudança de permissão (vendedor vê registros sem dono) |
| adm01-debug/Promo_Gifts_V4#3520 | fix(ci): pula workflows em PRs criados por github-actions[bot] | AGUARDANDO_HUMANO | workflow | AGUARDANDO HUMANO — workflow (bot PRs) |
| adm01-debug/Promo_Gifts_V4#3521 | fix(edge): remetente de e-mail Resend passa a usar o domínio verificad | JA_IMPLEMENTADA | edge, edge_r2 | MERGEADA por outro ator (835fee0c, 22:02Z) — JÁ IMPLEMENTADA |
| adm01-debug/Promo_Gifts_V4#3523 | chore(deps): atualiza framer-motion de 14.10.0 para 14.11.1 | MERGEAR | — | MERGEAR (branch atrás do main → substituta ao chegar a vez; strict) |
| adm01-debug/Promo_Gifts_V4#3524 | chore(main): release 1.2.0 | DESCARTAR | release_please | DESCARTAR (release-please regenerou PR fechada em #3503) — fechar |
| adm01-debug/Promo_Gifts_V4#3525 | ci: enxuga workflows (checagens estáticas, agendados, quebrados e Lova | AGUARDANDO_HUMANO | workflow | AGUARDANDO HUMANO — workflows (limpeza, remove environment Production do ACL gate) |
| adm01-debug/Promo_Gifts_V4#3526 | fix(catalog): aba Marketing grava nos vínculos reais e separa endomark | AGUARDANDO_HUMANO | migration | AGUARDANDO HUMANO — migration (aba Marketing) |
| adm01-debug/Promo_Gifts_V4#3527 | docs: recibo de deploy de edge function(s) — run 43434568067 (E66) | CORRIGIR+MERGEAR | — | coberta por #3546 |
| adm01-debug/Promo_Gifts_V4#3528 | fix(pdp): limite de tempo na busca do produto e prefetch na mesma chav | MERGEAR | — | MERGEAR (branch atrás do main → substituta ao chegar a vez; strict) |
| adm01-debug/Promo_Gifts_V4#3530 | docs: recibo de deploy de edge function(s) — run 43453995769 (E66) | CORRIGIR+MERGEAR | — | coberta por #3546 |
| adm01-debug/Promo_Gifts_V4#3531 | fix(csp): libera o <style> fixo do vaul (gaveta do kit) | CORRIGIR+MERGEAR | — | CORRIGIR+MERGEAR — 1) Branch nova a partir de pr/3531 (claude/fix-csp-vaul-hash-<AAMMDD-HHMM>), git rebase origin/main (merge-tree sem conf |
| adm01-debug/Promo_Gifts_V4#3532 | fix(csp): trava o fundo com modal ou menu aberto (trava de rolagem do  | AGUARDANDO_HUMANO | — | AGUARDANDO HUMANO — UX (inverte revert c556f235) + draft |
| adm01-debug/Promo_Gifts_V4#3533 | docs: recibo de deploy de edge function(s) — run 43456171090 (E66) | CORRIGIR+MERGEAR | — | coberta por #3546 |
| adm01-debug/Promo_Gifts_V4#3534 | fix(simulador): busca clientes do CRM pelas colunas reais (ramo_ativid | CORRIGIR+MERGEAR | — | CORRIGIR+MERGEAR — 1) Branch nova a partir de pr/3534 (claude/fix-simulador-colunas-crm-rebase-<AAMMDD-HHMM>), git rebase origin/main (triv |
| adm01-debug/Promo_Gifts_V4#3535 | fix(busca): atalhos de teclado usam a lista que está na tela | CORRIGIR+MERGEAR | — | CORRIGIR+MERGEAR — 1) Branch nova a partir de pr/3535 (claude/fix-busca-teclado-lista-atual-<AAMMDD-HHMM>) e `git rebase origin/main` (sem  |
| adm01-debug/Promo_Gifts_V4#3537 | docs: recibo de deploy de edge function(s) — run 43467481887 (E66) | MERGEAR | — | coberta por #3546 |
| adm01-debug/Promo_Gifts_V4#3539 | docs: recibo de deploy de edge function(s) — run 43487464383 (E66) | CORRIGIR+MERGEAR | — | coberta por #3546 |

## AGUARDANDO HUMANO (1 linha cada)

- adm01-debug/Promo_Gifts_V4#3411 — migration (ledger P09)
- adm01-debug/Promo_Gifts_V4#3412 — migration (índices FK estoque)
- adm01-debug/Promo_Gifts_V4#3416 — workflow (segredos E2E_SELLER)
- adm01-debug/Promo_Gifts_V4#3417 — workflow (update-snapshots)
- adm01-debug/Promo_Gifts_V4#3432 — migration (11 telas / RPCs)
- adm01-debug/Promo_Gifts_V4#3457 — workflow (segredos E2E em 5 workflows)
- adm01-debug/Promo_Gifts_V4#3518 — edge CRM + mudança de permissão (vendedor vê registros sem dono)
- adm01-debug/Promo_Gifts_V4#3520 — workflow (bot PRs)
- adm01-debug/Promo_Gifts_V4#3525 — workflows (limpeza, remove environment Production do ACL gate)
- adm01-debug/Promo_Gifts_V4#3526 — migration (aba Marketing)
- adm01-debug/Promo_Gifts_V4#3532 — UX (inverte revert c556f235) + draft

## PRs a fechar (com evidência nos dossiês)

- #3521 (mergeada 835fee0c), #3501 (idêntica), #3339 (#3346), #3390 (main por outro caminho + #3548), #3494 (= #3516), #3333 (= #3523), #3524 (release-please regenerada; dono fechou #3503), #3527/#3530/#3533/#3537/#3539/#3542/#3545 (cobertas por #3546), #3508 (coberta por #3543).

## PRs novas desta sessão

- #3541 fix ci-security-drift do main (código) · #3543 relatório (docs) · #3546 recibos E66 (docs) · #3547 asia-ingestion BOM/CRLF (edge, só codificação) · #3548 substituta da #3517 · #3549 UI pela-metade · #3552 dados simulados · #3553 páginas QA só DEV · #3544 REVOKE net/supabase_functions (migration — dono) · #3550 índice created_at (migration — dono) · #3551 carga do catálogo (UX — dono) · #3554 crons noturnos (migration — dono).

## Estado dos merges

_(atualizado ao fim da sessão — ver docs/prod-readiness.md §9/§11)_

## NÃO VERIFICADO / fora de escopo

- Checks "Supabase Preview" (integração Vercel×Supabase) cancelados por limite de preview branches — externo ao repo.
- Workflows das PRs do bot ficam em `action_required` (github.token) — tratado por #3520 (dono).
- Bundle-size report mostra deltas em todas as PRs (`kit-builder`, `sentry-vendor`) — baseline do main defasada; o gate bloqueante usa limite absoluto e passa.
