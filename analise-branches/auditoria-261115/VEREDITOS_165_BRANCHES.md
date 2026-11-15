# Resgates identificados (agentes P1..P7 + PR 3548)
## P3-claude-a
- ALTA fix-e2e-kit-builder-etapas-261114-0735: data-testid="wizard-next" em KitBuilderPage (4 linhas, clean) -> trem resgates
- ALTA PARCIAL fix-email-remetente-resend-261112-0034: process-scheduled-reports falhar sem RESEND_API_KEY / sendRes.ok (hunk f0595eb5c) -> edge, trem resgates (deploy edge)
- ALTA PARCIAL fix-migrations-acesso-rpcs-261112-1050: migration 20261112121000 fn_market_intelligence_macro + hook useMarketIntelligenceMacro + catálogo + recibo -> DB; verificar motivo exclusão na #3584
- MEDIA infra-inventario-semanal-261102-1120: workflow inventario-estado-semanal.yml novo (+codeql paths, SEGREDOS.md) -> decisão dono (novo agendado)
- MEDIA chore-e2e-modules-matrix-261102-2115: e2e-modules.yml consolidando 16 e2e-* -> decisão dono (C2)
- DECISAO static-checks-supersede-3525 -> coberto pelo agente wf (branch infra-workflows-supersede-3525)
- BAIXA analise-merge-prs-abertas-shh8ez: 13 dossiês PR-2834..2853 + baseline -> docs trem final
- BAIXA chore-analise-prs-261030-1600: PR-2833/2834/2836 + 2 baselines -> docs trem final
## P7-outros-b
- ALTA PARCIAL codex/fix-gate1-kit-pdf-types-261109-2252 (#3390): funcionalidades vivas ausentes (onMarkApproved, Restaurar rascunho, cópia fiel de template + erros RLS, useDeviceDetection, SortableCartItem accent, MockupHistoryPanel techniques, safe filenames, buildCustomKitInsert overrides, guardas useKitBuilderPageState, memo BridgeStatusBanner/useDevGate); migration 20261110022404 recria tabela apagada de propósito -> NÃO aplicar. Cruzar com dossiê PR-3548.
- MEDIA RESGATAR codex/fix-e2e-relevance-261107-1148: detector e2e-relevance.mjs + paths de 8 workflows + teste; conflito trivial e2e-flows.yml/package.json -> workflow (dono/autorizado)
- MEDIA PARCIAL fix/e2e-url-state-defaults-20261030: StockDashboard.tsx stockTabDefault (+16/-2, clean) -> trem resgates; rollback 20261101140001 (doc); teste fixAvailable=false
- BAIXA cond fix/gate-e40-cron-seed-261028: seed xbz-image-uploader só se replay E40 falhar; branch corrompe regex -> não aplicar inteira
- BAIXA dependabot/development-all-bec0ad7abb: 4 bumps minor seguros + 6 major (decisão dono)
- release-please #3566: decisão dono (numeração 1.9.0->1.1.0 rebaixada em 13/11)
## fn_market_intelligence_macro (P3 item 3): excluída da #3584 por performance (seq scan 69-108s > timeout 30s). Completar = migration índice CONCURRENTLY (summary_date, supplier_id) INCLUDE(...) + migration função + hook + recibo. DB autorizado pelo dono.
## P1-importado-a (todos BAIXA, docs)
- docs/FABRICA_VPS_FAQ.md (branch docs-criar-docs-fabrica-vps-faq-md-com-p-2610081318) -> docs trem final
- docs/MOCKUP_RETENCAO.md: corrigir cron-config.sql:67-77 -> 67-78 em 3 lugares -> docs trem final
- docs/POSMORTEM_COMMITS_LOCAIS_2026-09-17.md (backup-20261028/claude/audit-gaps-20260915) -> docs/arquivo/2026-09/ no trem final
- docs/AUDITORIA_CANDIDATAS_FORA_BASELINE_E06_2026-10-07.md (importado/local/...) -> docs/arquivo/2026-10/ no trem final
## PR-3548 (dossiê PR-3548.md) -> RESGATAR PARCIAL executado no trem resgates: useQuoteTemplates (created_by + cópia fiel), useMagicUpState.helpers (url_cdn), useDeviceDetection Boolean(data), product-types/product-sorting, downloadMockupAsPdf hunk, 2 testes. Depois fechar #3548 como supersedida. Opcional: ligar onMarkApproved em QuotesListPage.tsx:296.
## P4-claude-b
- ALTA fix-email-resend-status-261115-0040 (= fix-email-remetente-261114-2300): mesma correção já no trem via f0595eb5c + 2 testes -> adicionar testes ao trem
- DECISAO fix-e2e-fora-do-banco-de-producao-261114-1003: E2E em projeto Supabase de staging (var/secret novos; custo) -> dono
- (feitos) FT-129 #3653, cores por área #3653, BOM #3658, snapshots #3658
- MEDIA wf fix-bot-pr-approval-261113-1030: `if: github.actor != 'github-actions[bot]'` em 4 jobs (check-no-prod-leak, required-checks-guard) -> trem workflows 2
- MEDIA wf fix-attest-provenance-sigstore-261107-1500: continue-on-error no step Attest build provenance (deploy-gates.yml) -> trem workflows 2
- MEDIA fix-ledger-allowlist-p2027-261113-0705: 20261104100000 no allowlist remote_only -> verificar (drift-check passou hoje 09:33)
- BAIXA fix-kit-maker-publicados-261101-2202: card LibraryStat "Publicados" (não aplicar filtro)
- BAIXA fix-ft-ux-batch4-261101-2215: maxColors={selectedTechnique?.maxColors ?? undefined} em MockupConfigPanel.tsx
- BAIXA fix-ft-ux-batch5-261101-2222: copy CNPJ no catch de useNewSupplierForm.ts:424-430 (NÃO aplicar loginSchema min 6->8: decisão dono)
- BAIXA fix-ft004-ft033-pptx-mock-labels-261101-2212: rótulos "Dados (parcialmente) simulados" slides 3 e 4 pptxGenerator.ts
- BAIXA fix-e125-mockup-casts-261030: 2 casts em mockupGenerationService.ts:340,:401 (NÃO aplicar baselines)
## P2-importado-b (mockup/magic-up)
- ALTA DECISAO mockup-assistant-tests-int: edge function nova mockup-assistant + manifesto + 5 testes; sem tela -> dono (edge nova, custo IA)
- MEDIA refazer-2c328ea8: teste integração magic-up-score contra handler real (12/12 verde) -> trem mockup
- MEDIA s37+n64: useClientMockups + 23 testes; ligar em "Meus mockups" -> trem mockup (completar wiring)
- MEDIA refazer-1da3ac33: cabeçalho de trabalho do gerador (cliente/Trocar cliente/Meus mockups) + Voltar; passar props em MockupGenerator -> trem mockup
- MEDIA n11: editor de logo centralizar + proporção (9/9) -> trem mockup
- MEDIA n52: bloco de erro técnicas/produtos com retry (conflita; ligar props) -> trem mockup
- MEDIA s71: 3 indicadores de conclusão MockupResultCard (conflita; ligar props) -> trem mockup
- MEDIA n67/n68: varredura axe MockupGenerator/MagicUp -> corrigir violações reais do main + adicionar testes -> trem mockup
- MEDIA n28: teste generate-mockup handler real (esbuild npm:zod) -> retrabalho; avaliar
- PARCIAL s24: adaptador histórico paginação/busca/exclusão SSOT (decisão 10 últimos vs 200)
- PARCIAL s36: teto de corpo 413 no generate-mockup (edge) -> dono/autorizado backend
- PARCIAL s75: estados sem produto/skeleton/alerta sem foto -> trem mockup
- DECISAO s51: recusar geração sem dimensões (422) vs fallback legado -> dono
- BAIXA docs: refazer-04c25ae0 (MOCKUP_OPERACAO §1/§3/§4), refazer-0b0b9032 (Magic Up §3/§4), s69 (proposta SQL snapshot -> outro nome) -> docs trem final
- BAIXA refazer-3bc83637: substituir testes estáticos do mockup-audit por comportamental (import SaveTemplateDialog quebrado) -> retrabalho
- BAIXA fix-remover-atalhos: 3 testes negativos; n03: confirmação antes de "Remover empresa" -> trem mockup
## P6-outros-a
- DECISAO bot/schema-snapshot: baseline W45 pós-incidente PEND-I01 -> dono (regerar via workflow)
- ALTA PARCIAL codex/fix-db-migration-preflight-261107: rollback 20261101202000_rollback.sql do main re-GRANTa EXECUTE PUBLIC/anon em cleanup_expired_auth_sessions (SECDEF) — adotar versão fail-closed + tests/security/security-definer-acl-gate.test.ts; 20261101190101_fn_global_search_clamp_limit sem recibo/rollback (branch tem hardened + rollback) -> DB decisão; validateRemoteOnlyAllowlist (reimplementar)
- MEDIA codex/e23-required-secrets-20261030: dependabot[bot] nas condições Gate 1.13 (deploy-gates.yml:326,332) + supabase-security-gate + fail_if_missing — verificar se PR do Dependabot falha hoje
- MEDIA codex/fix-e2e-ci-pressure-261107-0238: 7 specs e2e determinísticos (revalidar) ; Tooltip ListItemActions (UI)
- MEDIA claude_pink/lucid-franklin-mjhkyc: 32 dossiês pr-3333..3539 + 17 evidências + baseline -> analise-prs/2026-11-14/ (revisar PII)
- MEDIA claude_pink/peaceful-planck-q4ee1i: aviso em auditoria-supabase/correcoes.md §C3 (credentials.ts lê secret_value; DROP COLUMN quebraria edges)
- BAIXA codex/fix-e2e-cleanup-rollback-header-261108: normalização BOM em scripts/drift-baseline.mjs::sanitizeReplayMigration + teste (clean)
- BAIXA docs: dossiês de claude_04/optimistic-bohr (87), optimistic-lovelace (6 commits), claude_05/serene-clarke (9), youthful-ride (93), claude_pink/sleepy-cannon (61) -> arquivar como analise-prs/<data>/ (NÃO aplicar baselines dessas branches)
## P5-claude-c
- (feito) fix-teste-busca-ramo-atividade -> #3653
- ALTA verify-logo-cores-261114-2359 (= fix-logo-cores-tecnica): maxColors no <LogoColorAnalyzer> (MockupConfigPanel.tsx:389-394) + teste 114 linhas -> trem resgates
- ALTA fix-mockup-geometria-wysiwyg-261115-0045 (= fix-mockup-logo-tamanho-real): edge generate-mockup geometry.ts + 422 missing_dimensions + 158 testes -> trem edge/backend (autorizado) — ATENÇÃO conflita com decisão s51 (recusar sem dimensões) -> alinhar
- ALTA infra-workflows-supersede-3525 -> branch do agente wf (claude/infra-wf-limpeza-supersede-3525-261115-1220, commit dbd09f59) -> PR após #3658
- MEDIA fix-pptx-mock-badges-261101-2315: badge "Dados simulados" slides 2-5 (+18 clean) -> trem resgates (cobre fix-ft004-ft033)
- MEDIA fix-sentinel-e2e-pdf: SENTINEL_SHA_ALLOWLIST typo -> 9d9dd2a7b502ab7e5ff42691d40b95a822c21d6b -> trem workflows 2
- MEDIA fix-sync-e2e-vite-port-isolation: reescrita 04r-undo-toast-a11y-keyboard.spec.ts para harness /__test/undo-toast -> trem resgates (manual)
- MEDIA fix-release-manifest-versao-real: manifest 1.1.0 -> 1.8.1 + remove release-type duplicado -> decisão dono (1.8.1 vs 1.9.0)
- MEDIA fix-sec001-revoke-anon-trigger-funcs: REVOKE EXECUTE FROM PUBLIC em 106 trigger funcs; renumerar version (colide sb0007) -> trem DB
- MEDIA perf-cron004, perf-cron005, perf-idx-sds-restock-counts: 3 migrations 14/11 -> trem DB
- MEDIA laughing-cori: migration 20261102063000 repair kill_switch anon rate guard (confirmar no banco) -> trem DB
- BAIXA fix-links-publicos-mortos: specs colecao-publica/comparar-publica testam rota inexistente; badge Share2 -> trem resgates
- BAIXA fix-pr3305-duplicate-ref: guard try/catch e2e/helpers/auth.ts route.continue -> trem resgates
- BAIXA fix-ts-gate1: guard anti-falso-positivo scripts/check-select-columns.mjs -> trem resgates
- BAIXA fix-rollback-e38-e47-e37 (3 rollbacks set), fix-stock-notes-rollback-header (só rollback file), fix-schema-snapshot-export-cancelled-skip (if:) -> trem DB docs / workflows 2

## Vereditos dos lotes 01 e 02 (2026-11-15, auditoria exaustiva das 165 branches existentes)

### APROVEITAR — módulo de mockup (família importado/vps-fabrica/v2/*)
| branch | o que é | arquivos | estado |
|---|---|---|---|
| importado/vps-fabrica/v2/s41-2610081949 | edge `mockup-assistant` (assistente Matheus: orientação de aplicação de logo) | supabase/functions/mockup-assistant/* + manifest, ~399 l | backend completo, sem UI, sem deploy |
| importado/vps-fabrica/v2/mockup-assistant-tests-int | testes da edge acima + registro no manifesto de authz | 6 arq, +617 l | falta verify_jwt no config.toml |
| importado/vps-fabrica/v2/s44-2610081949 | teste de contrato HTTP 401/422/429/502 do assistente | tests/edge-functions/integration/mockup-assistant.test.ts +288 | só com s41 |
| claude/fix-mockup-geometria-wysiwyg-261115-0045 | logo no tamanho real no mockup (WYSIWYG) + recusa 422 sem medidas | generate-mockup/geometry.ts + index.ts + teste, ~347 l | servidor completo |
| importado/vps-fabrica/v2/s36-2610081947 | tetos de entrada no servidor: corpo gigante → 413, lote > 6 áreas recusado | limits.ts + index.ts + teste, ~294 l | parcial: teto de imagem já na main (fetch-guard.ts) |
| importado/vps-fabrica/v2/s71-2610081948 | 3 estados de conclusão separados + resultado anterior preservado em falha | MockupCompletionStates.tsx + MockupResultCard.tsx + teste, ~305 l | props sem chamador |
| importado/vps-fabrica/v2/n67-2610082251 | teste a11y (axe/WCAG AA) do gerador, 3 estados × 375/1280px | tests/pages/MockupGenerator.a11y.test.tsx +323 | só teste, não executado |
| importado/vps-fabrica/v2/n68-2610082251 | teste a11y da página do Magic Up, 3 estados | tests/pages/MagicUp.a11y.test.tsx +330 | só teste, não executado |

### APROVEITAR — já resgatado na PR #3664 (não precisa restaurar)
- importado/vps-fabrica/v2/refazer-1da3ac33 → cabeçalho do gerador + Voltar no wizard
- importado/vps-fabrica/v2/n64-2610082251 + s37-2610081949 → useClientMockups + testes

### APROVEITAR — segurança
- codex/fix-db-migration-preflight-261107: rollback 20261101202000 fail-closed (~40 l). A main tem 3 GRANT EXECUTE TO anon/authenticated/PUBLIC nesse rollback; produção está fechada. Rodar o rollback da main reabriria acesso.

### DECISAO_HUMANA
- claude/chore-e2e-modules-matrix-261102-2115: matriz e2e-modules.yml (+489) substituiria 16 workflows mas não os apaga → dobraria custo de CI
- codex/e23-required-secrets-20261030: excluir Dependabot dos gates que leem o banco ao vivo (3 workflows + 3 testes)
- codex/fix-e2e-relevance-261107-1148: hoje mudança em workflow/migration/edge/config não aciona E2E (+46/+109 e paths de 8 workflows)
- claude/fix-sec001-revoke-anon-trigger-funcs-261101-2230: REVOKE EXECUTE público em 106 funções internas; versão 20261101210000 já ocupada na main, precisa renumerar
- codex/fix-e2e-ci-pressure-261107-0238: particionar E2E; conflita com comentário explícito em ListItemActions.tsx:41 da main

### DESCARTAR (prova por hash de blob ou conteúdo gerado)
refazer-f753ee81 (= n64) · refazer-f5f7f446 (= s37) · claude/fix-mockup-logo-tamanho-real-261114-2200 (= geometria-wysiwyg) · s51-2610081948 (versão mais fraca da geometria) · claude_pink/sleepy-cannon-h000nc · claude/chore-analise-prs-261030-1600 · claude_05/serene-clarke-1o02ey · claude_04/optimistic-lovelace-n960f7 · dependabot/npm_and_yarn/development-all-bec0ad7abb

### INCORPORADA
recuperado/chore-workflows-snapshot-261108-2230 · claude/laughing-cori-o9w35e · recuperado/chore/graphify-sql-map-20261029 · fix/e2e-url-state-defaults-20261030 · claude/fix-sync-e2e-vite-port-isolation-261030-1430

## Vereditos dos lotes 00 e 05

### APROVEITAR
| branch | o que é | arquivos | cuidado |
|---|---|---|---|
| claude_05/youthful-ride-vcdchy | conferência do total do pedido contra a soma dos itens (checkoutConsistent) | src/services/orderService.ts + teste, ~180 l | completo e testado, SEM tela que chame |
| claude_05/youthful-ride-vcdchy | src/lib/auth/auth-audit.ts (27 l) que a main cita como call site sem ter o arquivo | | NÃO mergear a branch inteira: ela apaga UserMenuShortcutItems.tsx, remove data-testid de SelectedItemsBadges.tsx e apaga 2 rollbacks |

### DECISAO_HUMANA (lotes 00 e 05)
- codex/fix-gate1-kit-pdf-types-261109-2252: recriar a tabela `quote_comments` que a main dropou e hoje proíbe por gate (scripts/check-no-quote-comments.mjs)
- claude/fix-schema-snapshot-export-cancelled-skip-261101-2344: 7 linhas no `if` do job de export (workflow)
- claude/fix-stock-notes-rollback-header-261101-2151: rollback faltante + cabeçalho em migration já aplicada (muda sha256 do ledger)
- claude/fix-ft-ux-batch5-261101-2222: senha mínima do login 6→8 (travaria conta legada; a main mantém 6 de propósito)
- claude/fix-ledger-allowlist-p2027-261113-0705: 1 versão na allowlist do gate do ledger (DB-008, marcado AGUARDANDO APROVAÇÃO)
- claude/fix-release-manifest-versao-real-261114-0305: package.json 1.1.0→1.8.1 + remover release-type do workflow — MESMO assunto da PR #3566

### INCORPORADA (lote 05: 42 branches, prova arquivo:linha no dossiê)
inclui as 9 branches `e15-receipt-*` (recibos já no MIGRATIONS_SYNC_LOG.md), toda a família s15/s52/s78/s77-*/s80/refazer-* e os 3 fixes de e-mail do remetente.

### DESCARTAR (lotes 00 e 05)
bot/schema-snapshot (snapshot auto-gerado) · claude_pink/lucid-franklin-mjhkyc · claude/analise-merge-prs-abertas-shh8ez · claude_04/optimistic-bohr-qplx94 · importado/vps-fabrica/v2/s48b-2610081950

### Dois fatos da main que explicam o indicador alto em muitas branches
- `5dd9b949d` (11/11) moveu 316 arquivos obsoletos de `src/` para `recovery/src-legacy/`
- PR #3631 (14/11) resgatou a claude/resgate-3390 arquivo por arquivo, com as 13 exclusões em docs/coordenacao/conflitos-semanticos.md:31

## Vereditos dos lotes 03 e 04

### APROVEITAR (lote 03)
| branch | o que é | arquivos | estado |
|---|---|---|---|
| importado/vps-fabrica/v2/n52-2610082250 | aviso + "Tentar novamente" quando produtos/técnicas falham no painel do mockup | MockupConfigPanelLoadError.tsx (novo) + MockupConfigPanel.tsx + teste, ~280 l | completo |
| importado/vps-fabrica/v2/s76-2610081949 | cabeçalho do gerador (cliente, trocar cliente, Meus mockups, Voltar) | MockupToolbar + MockupWizard + teste, ~292 l | completo — MESMO escopo da PR #3664 |
| importado/vps-fabrica/v2/refazer-2c328ea8 | teste que roda o handler REAL do magic-up-score (o da main valida o próprio mock e afirma contrato que a função não tem) | 268 l | completo |
| importado/vps-fabrica/v2/n11-2610082244 | editor de logo: rótulos Horizontal/Ambos/Vertical, Girar, largura/altura proporcionais, cm em Ajustes avançados | 2 componentes + teste, ~250 l | completo |
| importado/vps-fabrica/v2/n28-2610082246 | teste que roda o handler REAL do generate-mockup via bundle esbuild (a main diz no cabeçalho que é impossível) | +172 l | completo |
| claude/fix-rollback-e38-e47-e37-261101-2200 | 3 rollbacks que faltam para migrations de cron já aplicadas | 106 l | completo |

### DECISAO_HUMANA (lotes 03 e 04) — com evidência de produção
- claude/perf-cron005-refresh-all-mvs-diario-261114-1002: refresh diário das views materializadas morre em 120 s, falha em 100% das execuções hoje (~31 l + rollback)
- claude/perf-idx-sds-restock-counts-261114-1006: índice parcial para o sino de estoque do Header, ~25,7 mil chamadas/dia a 522 ms de média; índice não existe em produção (~30 l)
- claude/perf-cron004-reduz-jobs-ociosos-261114-1001: 7 tarefas automáticas ociosas, 648 → 97 execuções/dia; é a peça que falta da série (main tem cron001-003)
- claude/fix-migrations-acesso-rpcs-261112-1050: falta `fn_market_intelligence_macro`; hoje o gráfico de inteligência de mercado mostra MOCK como dado real (useMarketIntelligenceMacro.ts:60)
- recuperado/fix-p06-p15-security-20261101-1000: security_invoker em 8 views + revogar leitura anônima do mapa de cores, aprovado pelo PO em 01/11 e nunca aplicado
- claude/fix-e2e-fora-do-banco-de-producao-261114-1003: E2E do CI ainda bate no banco de PRODUÇÃO (e2e-cart.yml:82); exige projeto de staging e 2 segredos
- claude/fix-attest-provenance-sigstore-261107-1500: 1 linha para um 500 do Sigstore não reprovar o deploy
- claude/infra-inventario-semanal-261102-1120: workflow semanal do inventário; a main diz que espera o dono (inventario/estado/README.md:22)
- importado/vps-fabrica/v2/s69-2610081946: proposta de DDL de snapshot/revisões em generated_mockups

### NÃO MERGEAR (incorporadas mas com regressão embutida)
- claude/infra-workflows-supersede-3525-261114-1740: reverteria a remoção do gate `environment: production`
- fix/gate-e40-cron-seed-261028: corrompe 4 regex do parser de dollar-quote em scripts/drift-baseline.mjs
- claude/fix-pr3305-duplicate-ref-261109-0623: tira acentos das mensagens ao usuário
