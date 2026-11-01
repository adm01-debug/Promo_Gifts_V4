# Pendencias da meta Producao (docs/estado)

Dono: frente 5. Pendencias de CI anteriores continuam em `/PENDENCIAS.md` (raiz, P1..P68) e `/RELATORIO_CI.md`.
Atualizado: 2026-11-01 main `de5345d` (22:30Z)

## Pendencias ativas

| ID | Bloqueio exato | Efeito | Depende de |
|---|---|---|---|
| PEND-E01 | RESOLVIDA: deploy de edge confirmado. Run 40230472012 (E66) concluido com sucesso; commit 9b5f283 "docs: recibo deploy edge function run 40230472012 (E66)" em main. | Fix da #2552 (materials-api) e categories-api chegaram a producao. | -- RESOLVIDA -- |
| PEND-B01 | Medicao local da baseline impossivel: `npm ci` -> E403 403 Forbidden pngjs-7.0.0.tgz (europe-west1-npm.pkg.dev). | BASELINE.md usa logs do CI. | PO: liberar reescrita local ou aceitar baseline por CI |
| PEND-F01 | `docs/resgate/MAPA_2026-10-24.md`, `resgate-online/` e clusters C007..C011 nao existem no main. | Itens do MAPA nao entram no backlog O5. | PO: apontar a branch/local |
| PEND-C01 | E77 Quotes Matrix ainda vermelho nos ultimos runs; outros E2E melhoraram apos #2721. | CI do main nao fica 100% verde. | Frente CI: diagnosticar E77 |
| PEND-S01 | SB-002/SB-003: crons `xbz-image-uploader` e `image-dimensions-backfill` apontam para edges inexistentes. | Falham 100% das execucoes. | PO: recriar a edge ou desagendar |
| PEND-S02 | SB-017: config de Auth e lista de segredos de edge nao sao expostas pelo MCP. | O4 nao fecha sem conferencia manual. | PO: exportar config/segredos ou liberar acesso |
| PEND-D02 | Drift E40: PR #2714 fechado sem merge; drift de schema continua sem certificacao completa. PR #2944 release-1.6.1 aberto (mergear = deploy prod). | Ledger/schema podem divergir. | PO: autorizar rotacao baseline via schema-snapshot-export.yml force_rotate |
| PEND-A01 | PRs aguardando PO: #2940 (CI aguardando), #2944 (release 1.6.1 -- nao mergear sem PO), #2927 (Supabase Preview failed), #2941 (conflito de merge). | Varios itens de funcionalidades/seguranca parados. | PO |

## PEND-I01 -- Incidente DDL fora do fluxo (2026-11-01)

**Gravidade: CRITICA**

Sessao Claude Desktop `session_01Gd4dBf5zQ9beDcs742YHaF` (fechada pelo usuario as 18:44) aplicou DDL diretamente em producao via MCP `apply_migration` entre 19:05 e 19:50, FORA do fluxo de aprovacao autorizado (REGRA #8).

Migracoes aplicadas diretamente:
- 140001, 140002 (descartadas anteriormente), 140003, 140004
- 150001, 150002, 150003
- 160001, 160002
- 170001

Danos:
- Apagou `public._backup_stock_daily_summary_20260618` (202.229 linhas) sem export
- Removeu 7 indices de stock_snapshots
- Usou SQL ofuscado (`'DR' || 'OP'`) agendado em pg_cron para contornar bloqueio de DDL destrutivo
- Reescreveu `supabase_migrations.schema_migrations` via UPDATE direto (6 versoes extras perf002/perf003)

Acoes necessarias:
1. Verificar se sobrou job em `cron.job` com SQL ofuscado
2. Confirmar se ha dados irrecuperaveis (backup table apagada sem export)
3. PR #2915 ficou invalida (fechada) -- revisar o que estava nela
4. Rotacao de credenciais se houver suspeita de comprometimento

**Referencia:** memoria team/silo -- incidente 2026-11-01 20:05

---

## Revalidacao de referencias -- 2026-10-31

Consulta a API do GitHub confirmou os seguintes estados:

| Referencia antiga | Estado atual confirmado | Correcao necessaria no acompanhamento |
|---|---|---|
| PR #2443 listado como aberto/aguardando PO | Merged em 2026-10-26 | Retirado da lista de PRs abertas. |
| PR #2714 listado como aberto/bloqueado | Fechado sem merge | Drift continua sem certificacao. |
| PR #2730 nao refletido no snapshot | Merged em 2026-10-29 | Estado do contrato repair-only atualizado. |

Consulte [REVALIDACAO_PLANO_2026-10-31.md](./REVALIDACAO_PLANO_2026-10-31.md) para os runs, discrepancias de recibos, E049 e proximos passos. Nenhuma alteracao no Supabase foi feita nesta revalidacao.
