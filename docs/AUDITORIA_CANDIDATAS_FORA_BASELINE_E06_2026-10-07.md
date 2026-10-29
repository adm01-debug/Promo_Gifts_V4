# Auditoria de migrations fora do baseline E06 — 2026-10-07

## Escopo e conclusão

Auditoria somente de leitura do ledger `supabase_migrations.schema_migrations`
do projeto canônico `doufsxqlfjyuvxuezpln`, comparado ao manifesto E06 capturado
em 2026-08-28 e aos arquivos `supabase/migrations/` no commit local sincronizado
com `origin/main` (`9660159b3`). A consulta leu apenas versões/nomes do ledger;
nenhum dado operacional de clientes ou produtos foi copiado.

O detector encontrou **20 candidatas locais sem linha no ledger** e nenhuma
candidata nova de ledger sem arquivo local. “Candidata” é deliberado: ausência
no ledger não prova se o SQL foi executado fora de banda, se foi substituído,
ou se permanece apenas proposta. A classificação abaixo usa ledger, arquivo,
catálogo vivo e documentação; não autoriza aplicar, reparar ou reverter DDL.

## Classificação

| Versão | Classificação evidenciada | Tratamento seguro |
|---|---|---|
| `20260511235900` | Correção de reconstrução/shadow DB para espelhar `categories.bitrix_id`, que já existia fora de banda. A triagem Onda 0 diz que aguarda E15. | **Pendente de execução controlada**; não marcar como aplicada apenas porque é no-op esperado no canônico. |
| `20260916181609` | Arquivo-espelho do efeito já presente da versão legada não canônica `20260623_fix_google_provider_secret_name`; a entrada legada existe no ledger e o valor vivo já era `GEMINI_API_KEY`. O registro de reconciliação exige decisão PO para reparar o ledger. | **Espelho/proveniência**, não reaplicar o `UPDATE`; resolver separadamente a entrada não canônica. A nota “arquivo ainda não criado” em `MIGRATIONS_SYNC_LOG.md` está desatualizada. |
| `20260916193000` | E25: criação/automação de partições e crons para histórico de fornecedor; documentação pede aprovação explícita. | **Proposta não aplicada; requer decisão PO**. |
| `20260916200000` | E17: revogação de execução pública em função do superfiltro; o pacote E18 a lista como ação de segurança preparada. | **Proposta de ACL; requer aprovação e verificação de consumidores**. |
| `20260916201000` | E19: comentários/allowlist para tabelas intencionalmente sem policy; documento pede aprovação explícita. | **Proposta de metadados/segurança; requer decisão PO**. |
| `20260916202000` | E23: `FORCE RLS` e revogações em tabelas de segredos; documento pede aprovação explícita. | **Proposta de hardening; requer decisão PO**. |
| `20260916210000` | Arquivo-espelho para `20260916155725`, que existe no ledger canônico; função viva `zapp_catalog_stats()` já contém os campos descritos. | **Reconciliação de proveniência**, não executar como nova migration; verificar hash/corpo e registrar vínculo sem duplicar DDL. |
| `20260916211500` | E30: nova tabela `ops.table_size_history` e capacidade/cron; depende de decisão sobre novo schema/tabela. | **Proposta não aplicada; requer aprovação por objeto**. |
| `20260917060000` | E18: revoga execução autenticada de `mcp_kv_get`; pacote de segurança aguarda aprovação. | **Proposta de ACL; requer aprovação e verificação de consumidores**. |
| `20260917061500` | E18: revogações adicionais em funções `SECURITY DEFINER`; pacote de segurança aguarda aprovação. | **Proposta de ACL; requer aprovação e verificação de consumidores**. |
| `20260917070000` | E38: desagenda dois crons inativos/obsoletos; documentação aguarda PO. | **Proposta operacional não aplicada; requer aprovação**. |
| `20260917080000` | E35: otimização do backfill de reposição; preparada e aguardando aprovação PO. | **Proposta de função/performance; requer aprovação**. |
| `20260917090000` | E47: separa statements do cron `schema-drift-check`; preparada e aguardando aprovação PO. | **Proposta operacional; requer aprovação**. |
| `20260917100000` | E37: separa crons multistatement; documentação marca `[REQUER-PO]`. | **Proposta operacional; requer aprovação**. |
| `20260917110000` | E45: corrige apenas comentário de `products`; documentação aguarda aprovação PO. | **Proposta de metadados; requer aprovação**. |
| `20260917150000` | E40: cria histórico SLO em `ops`; depende de E30 e de aprovação separada. | **Proposta não aplicada; dependência E30 + aprovação por objeto**. |
| `20260917160000` | E33: monitoramento de wraparound em `ops`; depende de E30 e de aprovação separada. | **Proposta não aplicada; dependência E30 + aprovação por objeto**. |
| `20260920120000` | Correção inicial de `handle_new_user`, explicitamente substituída pela alternativa `20260922170000`; a versão substituta está no ledger canônico. | **Supersedida**; não aplicar a versão antiga. |
| `20260928212000` | Back-link `products.padronizacao_id` e atualização de `fn_promote_padronizacao`; sync log registra explicitamente não aplicada/aguardando E15. | **Pendente E15**, não executar fora do workflow aprovado. |
| `20260928213000` | Backfill de `products.main_category_id`; sync log registra explicitamente não aplicada/aguardando E15. | **Pendente E15**, não executar fora do workflow aprovado. |

## Próximas decisões

1. Resolver os arquivos-espelho (`20260916181609`, `20260916210000`) como
   proveniência/ledger, sem replay de efeitos já presentes.
2. Para as migrations marcadas como propostas, obter aprovação PO por objeto e
   seguir somente o workflow E15, após preflight e revisão do SQL.
3. Manter `20260920120000` supersedida e não aplicar.
4. Não usar `supabase db push`, não fazer `migration repair` em lote e não
   tocar em linhas operacionais.

## Evidências relacionadas

- `docs/ONDA0_TRIAGEM_EMERGENCIA_2026-09-20.md` — `20260511235900` e
  `20260920120000`.
- `docs/PACOTE_APROVACAO_1_2026-09-16.md` e
  `supabase/MIGRATIONS_SYNC_LOG.md` — mirrors de IDs legados e `20260916181609`.
- `docs/E25_PARTICOES_SUPPLIER_HISTORY_2026-09-16.md`,
  `docs/E19_RLS_SEM_POLICY_2026-09-16.md`,
  `docs/E23_FORCE_RLS_SEGREDO_2026-09-16.md` — propostas E25/E19/E23.
- `docs/E18_SECDEF_AUTHENTICATED_2026-09-17.md` e
  `docs/E18_MCP_KV_GET_ACHADO_CRITICO_2026-09-17.md` — propostas E17/E18.
- `docs/E30_PLANO_CAPACIDADE_2026-09-16.md`, `docs/E35_REPOSICAO_BACKFILL_LENTO_2026-09-17.md`,
  `docs/E37_CRON_MULTISTATEMENT_2026-09-17.md`,
  `docs/E38_CRON_JOBS_DESLIGADOS_2026-09-17.md`,
  `docs/E40_BASELINE_DESEMPENHO_SLO_2026-09-17.md`,
  `docs/E33_MONITOR_WRAPAROUND_2026-09-16.md`,
  `docs/E45_PRODUCTS_GOD_TABLE_2026-09-17.md` e
  `docs/E47_SCHEMA_DRIFT_DETECTOR_2026-09-17.md` — propostas operacionais/observabilidade.
- `docs/plans/PLANO_RECONCILIACAO_LOCAL_GITHUB_SUPABASE_50_ETAPAS_2026-09-22.md`
  e `docs/db/APLICACAO_SIGNUP_20260922170000.md` — substituição da correção de signup.
- `supabase/MIGRATIONS_SYNC_LOG.md` — estado pendente das migrations de 28/09 e
  recibos E15 de 05/10.
