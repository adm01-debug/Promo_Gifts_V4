# E30 — Plano de capacidade e alerta de crescimento

> PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md, etapa E30.
> `[GIT]` (script/workflow/migration preparados) + `[REQUER-PO]` (aplicação
> da migration — cria schema `ops`, tabela e cron novos).

## Problema medido

`SCHEMA_REFERENCE.md` já registrava +39% de crescimento do banco em 2 meses,
sem série histórica por tabela — qualquer projeção de capacidade até aqui
era chute. Consulta ao vivo em 2026-09-16 (`pg_total_relation_size` por
tabela, schema `public`, top 15):

| tabela | total_bytes | live_tup |
|---|---|---|
| `stock_snapshots` | 1.649.934.336 (≈1,54 GB) | 170.913 |
| `supplier_products_raw_history_p2026_08` | 790.126.592 | 531.883 |
| `stock_daily_summary` | 674.627.584 | 1.898.345 |
| `supplier_products_raw_history_p2026_06` | 604.676.096 | 408.143 |
| `supplier_products_raw_history_p2026_07` | 538.427.392 | 363.767 |
| `supplier_products_raw` | 370.114.560 | 19.805 |
| `supplier_products_raw_history_p2026_09` | 329.768.960 | 220.190 |
| `products` | 183.058.432 | 8.036 |
| `supplier_customization_options_raw` | 159.440.896 | 45.251 |
| `product_images` | 148.217.856 | 72.007 |

As partições mensais de `supplier_products_raw_history` sozinhas somam
≈2,26 GB — já cobertas por E25 (automação de partição, prazo 2026-12-15).
`stock_snapshots` e `stock_daily_summary` (E26–E28) são as duas maiores
tabelas não-particionadas.

## Decisão de schema

Tabela nova `ops.table_size_history` (schema `ops` também novo — confirmado
vazio em `information_schema.schemata` em 2026-09-16, mesma checagem que a
migration de E25 já deixa registrada). Formato genérico
(`captured_at, schema_name, table_name, total_bytes, live_tup`), chave
primária composta — uma linha por tabela por captura diária.

Deliberadamente **não** reaproveitado por `ops.wraparound_monitor_log` (E33):
os dois monitores têm granularidade heterogênea (por-tabela vs.
por-banco/por-sequência/por-slot) e misturar num formato único obrigaria
`NULL`s condicionais ou um `jsonb` genérico sem necessidade — E33 continua
como tabela própria, dependente deste mesmo schema `ops`.

## RLS e superfície de acesso

Segue o padrão que E19 já formalizou neste repo para tabelas internas:
RLS habilitada, **zero policies** (deny-all), sem `GRANT` a `anon`/
`authenticated` no schema nem na tabela — só `service_role`/`postgres` e a
função `SECURITY DEFINER` `fn_cron_safe_run` (que roda como owner da
função, `bypassrls`) conseguem gravar. Entrada nova em
`.security/rls-no-policy-allowlist.json` documentando a decisão (mesmo
arquivo criado por E19, mesmo formato).

## Cron: escolha de `p_key`

Consulta ao vivo a `cron.job` em 2026-09-16 (regex sobre
`fn_cron_safe_run\(\d+`) devolveu como maior `p_key` em uso `166`
(`fantasmas-deactivate-guard`). A migration de E33
(`docs/E33_MONITOR_WRAPAROUND_2026-09-16.md`) já reservou `167` para o
próprio monitor (ainda não aplicada). A migration de E25
(`20260916193000_e25_supplier_history_partition_automation.sql`, também
ainda não aplicada) já usa `200`. Este pacote usa **`168`** — sem colisão
com nenhum dos dois, mesmo que sejam aplicados fora de ordem.

## Artefatos preparados (não aplicados)

- **Migration:** `supabase/migrations/20260916211500_e30_ops_table_size_history.sql`
  — cria schema `ops`, tabela `ops.table_size_history` (RLS deny-all,
  índice `(schema_name, table_name, captured_at DESC)`), cron diário
  `table-size-history-daily` (`17 3 * * *`, `p_key=168`, via
  `fn_cron_safe_run`, single-statement). Tem cabeçalho `-- Rollback:` (E15)
  e blocos de pré/pós-condição no padrão já usado pela migration de E25.
- **Script de projeção:** `scripts/capacity-growth-projection.mjs` — núcleo
  puro `computeProjections()` (regressão linear simples entre o primeiro e
  o último ponto da série por tabela) + casca de I/O read-only (Management
  API, nunca PostgREST — REGRA #8). Sinaliza tabela cuja projeção 90 dias à
  frente passe de 20% do tamanho do banco OU 30%/mês de crescimento. Com
  menos de 7 dias de série coletada, não sinaliza nada (`insufficientData`).
  9 testes unitários em `tests/scripts/capacity-growth-projection.test.mjs`.
- **Workflow:** `.github/workflows/capacity-growth-report.yml` — semanal
  (segunda 09:00 UTC), advisory (não gate, mesmo padrão de
  `ddl-out-of-band-detector.yml`/E12): abre ou atualiza issue rotulada
  `capacity-growth` quando há tabela(s) sinalizada(s); sem credenciais ou
  antes da migration ser aplicada, degrada para inconclusive/static-pass
  sem abrir issue.

## O que NÃO foi feito nesta etapa

- A migration **não foi aplicada** — cria schema/tabela/cron novos, exige
  aprovação explícita do PO por objeto (REGRA #8), independente do workflow
  E15 (construído, mas aplicação real ainda não é bloqueante — ver §2 do
  roadmap aprovado).
- Sem a migration aplicada, não há série histórica ainda — os itens 2 e 3
  do checklist de conclusão ("7 dias de série coletados", "relatório de
  projeção publicado") só progridem depois da aprovação + 7 dias corridos.
- E33 (monitor de wraparound) permanece bloqueado no mesmo gate — sua
  própria migration depende do schema `ops` que este pacote cria.

## Checklist de conclusão (do plano)

- [ ] Tabela + cron criados via aprovação do PO (migration pronta, `p_key=168`)
- [ ] 7 dias de série coletados (só após aplicação)
- [ ] Relatório de projeção publicado como artefato (workflow pronto, roda semanalmente após aplicação)
