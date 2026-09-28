# Plano de Melhorias e Correções do Catálogo com Jev (TypeSafe System One) — v2

> **Autor:** Claude (revisão DBA) sobre o plano v1 de Hermes/DeepSeek (PR #1950) · solicitado por Joaquim (PO)
> **Data:** 2026-09-28 · **Status:** PLANO — **não executar Blocos 1 e 2 até aprovação do PO**
> **Repo:** `adm01-debug/Promo_Gifts_V4` · **Banco canônico (SSOT):** Supabase `doufsxqlfjyuvxuezpln` (PG17)
> **Modelo:** Jev `jev-latest` (= `jev-1.13.0`) via `POST https://api.typesafe.ai/v1/systemone`
> **Substitui:** o plano v1 de 100 etapas (mesmo caminho de arquivo). Revisão completa em
> https://github.com/adm01-debug/Promo_Gifts_V4/pull/1950#pullrequestreview-5344693479

---

## 0. O que mudou da v1 para a v2 (e por quê)

A v1 tinha o princípio certo — **Jev decide, o pipeline determinístico continua dono da
escrita** — mas foi escrita sem consultar `pg_catalog` nem a doc da TypeSafe. A v2 foi
validada linha a linha contra o banco vivo e contra `docs.typesafe.ai`. Correções que mudam
o desenho:

| # | v1 dizia | Medido / documentado | Efeito na v2 |
|---|---|---|---|
| 1 | Bronze = 24.727 | `count(*)` = **20.168** (16.510 `processed` + 3.658 `skipped`); 24.727 era `n_live_tup` | Baseline corrigido |
| 2 | 528 sem `padronizacao_id` → "Bronze pending / promoção interrompida" | Bronze `pending` = 0. **522 dos 528 têm Silver `promoted` com `product_id = products.id`.** `fn_promote_padronizacao` nunca gravou o back-link | Vira o item 1 do Bloco 0: `UPDATE` + patch na função. **Zero Jev** |
| 3 | Tabelas `colors`, `capacities`, `materials` | Não existem. Existem `color_variations` (87), `color_groups` (18), `color_synonym_map` (13), `material_groups` (10), `material_types` (94), `product_materials` (13.508); `capacities` é coluna de `products` | Nomes corrigidos no Bloco 1 |
| 4 | `ai_usage_quotas` como teto de tokens | Tabela é `(role app_role, monthly_limit, is_unlimited)` — cota por papel de usuário | Teto do Jev vai em `admin_settings` (`key`/`value jsonb`) |
| 5 | `medallion_coverage_snapshots` recebe os 2 novos indicadores | Colunas fixas (`ncm_pct`, `materials_pct`, … `display_name_pct`) por `fornecedor/camada` | Snapshot próprio (`jev_baseline_snapshots`) ou 2 colunas novas via migration |
| 6 | `score` extrai "9L → 9000" e estima dimensão (etapas 53/87) | `score` é **ordinal, 2–10 níveis**. Doc: *"Jev is not a calculator"*, *"keep arithmetic in code"* | Removidas. Extração numérica é `fn_apply_transform`/regex; Jev só valida plausibilidade (`noul`) |
| 7 | `choice` sobre 261 NCM (etapa 88) | Limite **255 opções** | Hierárquico (capítulo → código) ou pré-filtro por categoria |
| 8 | `noul` com `confidence < 0.50` | `noul` devolve só **P(sim)**; sem campo `confidence` | Confiança derivada em código: `abs(p − 0.5) × 2` |
| 9 | `noul` "categoria correta?" + `choice` flat top-level | **4.888 produtos (60%) estão em categoria não-folha** de árvore com 6 níveis (28 L1 · 113 L2 · 167 L3 · 119 L4 · 45 L5 · 6 L6) | Classificação **hierárquica** nível a nível (cookbook *Hierarchical classification*), rubrica "correta = mais específica aplicável" |
| 10 | Dedup "N pares" | 263 grupos, **máx. 391 membros, p95 ≈ 117 → 369.627 pares**; 141.958 arestas `similar` já existem em `product_relationships`; **64 FKs** apontam para `products.id` | Blocking + comparação só com `is_reference_product`; merge = migração de referências, não `is_deleted` |
| 11 | Etapas 14–15 (órfãos/ciclos) | 0 órfãos, 0 auto-referência, 0 divergência `path`×`parent_id`, 0 inconsistência de `level` | Removidas; vira `CHECK` de saída |
| 12 | Etapas 16/39/83 (de-para de categoria) | Só **7 `supplier_categories` sem mapping** (434 × 427), todas STRICKER, **inertes**: STRICKER não tem `supplier_field_mappings.target_field='categories'` e 0 Bronze referencia esses códigos | Removidas |
| 13 | Etapa 89 (`sku_promo` duplicado) | Já existe `CHECK chk_products_sku_promo_equals_sku` + `trg_sync_sku_promo` | Removida |
| 14 | Rate limit 1.000 req/min; custo U$ 1–2 | Doc: **1.200 req/min, 250k tokens/s**; **U$ 0,042 / 1M tokens de entrada** → ≈ U$ 0,12 para 8,1k produtos | Corrigido |
| 15 | Gerador "DeepSeek V3" | `ai_function_routing` → `deepseek-v4-flash` (5.019 produtos) + legado `deepseek-chat` (2.237) | Corrigido |
| 16 | `system_kill_switches(name)` | Colunas são `switch_name` / `enabled` | Corrigido |
| 17 | (ausente) | **42 triggers em `products`**; `trg_aa_capture_manual_edits` põe o campo em `locked_fields` se `app.write_source <> 'pipeline'`; `fn_promote_padronizacao` só respeita `locked_fields` | Decisão explícita de escrita (§4) — sem ela, a próxima promoção da Silver desfaz a correção do Jev |

**Baseline corrigido (2026-09-28, `count(*)` real):**

| Métrica | Valor |
|---|---|
| Gold `products` (ativos) | 8.138 (7.704) |
| `categories` (níveis 1–6) | 478 (65 inativas/deletadas) |
| `product_variants` | 20.216 |
| Bronze `supplier_products_raw` | **20.168** (pending = 0) |
| Silver `produtos_padronizacao` | 8.132 |
| Sem `padronizacao_id` | 528 (522 corrigíveis por join; 6 pré-Medallion) |
| Sem `ai_title` | 882 |
| Sem `main_category_id` | 489 |
| `capacity_ml` nulo | 6.325 (78%) |
| `packing_type_canonical` nulo | 4.948 (61%) |
| `dimensions_source` nulo | 3.183 |
| `target_audience` vazio | 1.782 |
| Grupos de nome exato duplicado (ativos, case-insensitive) | 976 |
| `product_similarity_groups` / `_members` | 266 / 6.986 |
| `ai_enrichment_queue` | 7.671 (7.221 `done`, 450 `pending`) |

---

## 1. Princípios (imutáveis)

1. **SSOT `doufsxqlfjyuvxuezpln`**: toda mudança de schema/DML = migration versionada, aplicada **só** por `.github/workflows/db-apply-migration.yml` (E15), com aprovação do PO (REGRA #1/#8).
2. **Jev decide, não gera.** Texto novo continua vindo do LLM gerativo roteado por `ai_function_routing`; o Jev aprova/rejeita.
3. **Determinístico antes de probabilístico.** Tudo que é `UPDATE ... FROM` ou regex sai do escopo do Jev (Bloco 0).
4. **Nenhuma escrita em `products` pelo Jev sem gate humano** e sem decisão explícita sobre `locked_fields` (§4).
5. **Piloto rotulado antes de qualquer lote**: 200 rótulos humanos, matriz de confusão, limiar justificado. Doc da TypeSafe: *"English is the primary training language… other languages handled but not equally well"* — em português o limiar tem que ser medido, não assumido.
6. Segredo `JEV_API_KEY` só em cofre (Supabase secret / env do worker). Nunca no repo.
7. Append-only em `jev_decision_log`; Bronze nunca é alterado.

---

## 2. Bloco 0 — Determinístico, sem Jev (fecha 3 dos 4 gaps do resumo executivo)

| # | Ação | Como | Verificação | Status |
|---|---|---|---|---|
| 0.1 | Back-link `products.padronizacao_id` nos 522 + `fn_promote_padronizacao` passa a gravar o vínculo no INSERT e no UPDATE | Migration `20260928212000_fix_products_padronizacao_backlink` (PR aberta) | `select count(*) from products p join produtos_padronizacao pp on pp.product_id=p.id and pp.status='promoted' where p.padronizacao_id is null` = 0 | PR aberta, aguarda PO + E15 |
| 0.2 | Backfill `main_category_id` nos 489 | `main_category_id = category_id` (100% dos 7.649 preenchidos hoje seguem essa regra; `fn_sync_main_category_from_pca` mantém) | `select count(*) from products where main_category_id is null and category_id is not null` = 0 | PR aberta, aguarda PO + E15 |
| 0.3 | `capacity_ml` a partir de `capacities` / `name` | `fn_apply_transform` + regex `(\d+[,.]?\d*)\s*(ml|l|litros?)` → ml; **Jev não entra** | % nulo cai de 78% para o residual real | a planejar |
| 0.4 | `packing_type_canonical` a partir de `packing_type` (14 `packaging_types`) | `fn_trigger_classify_packing` já existe — rodar em lote com `bulk_import_mode` | % nulo cai de 61% | a planejar |
| 0.5 | Corrigir quirks de unidade por fornecedor (SPOT caixa em metros ×100; Só Marcas mm ÷ 10) | de-para em `supplier_field_mappings`, não SQL ad hoc | `dimensions_source` nulo cai de 3.183 | a planejar |
| 0.6 | Dedup exato: 976 grupos de nome idêntico entre ativos | relatório por fornecedor; mesmo `supplier_id` nunca é duplicata (`dup_supplier_ref` = 0) | lista para o PO decidir | a planejar |

Custo: zero token. Risco: baixo (todas idempotentes, com `WHERE` seletivo, `write_source='pipeline'`).

---

## 3. Bloco 1 — Jev como auditor **read-only**

Saída deste bloco é **fila de revisão**, nunca escrita em `products`.

### 3.1 Fundações (migration única, via E15)

- `public.jev_decision_log` (append-only): `id uuid pk`, `run_id uuid`, `entity_table text`, `entity_id uuid`, `question_key text`, `question_type text check in ('noul','choice','score')`, `rubric_version text`, `state jsonb`, `answer jsonb`, `p_yes numeric` (noul), `confidence numeric check (0..1)`, `model text`, `input_tokens int`, `created_at timestamptz default now()`.
  Índice `(entity_table, entity_id)`, `unique (run_id, entity_table, entity_id, question_key)` para idempotência.
  **RLS habilitada + policy** desde a criação (achado P5 do `SCHEMA_REFERENCE.md`: tabelas com RLS sem policy). Worker usa `service_role`; `authenticated` só leitura para `is_admin_or_above`.
- `public.jev_review_queue`: `id`, `entity_table`, `entity_id`, `reason text`, `current_value jsonb`, `suggested_value jsonb`, `confidence numeric`, `status text default 'pending' check in ('pending','approved','rejected')`, `reviewed_by uuid`, `reviewed_at timestamptz`, `applied_at timestamptz`, `rolled_back_at timestamptz`. Mesma RLS.
- Config em `admin_settings`: `jev.threshold.<question_key>` (`auto_apply`, `review`, `discard`), `jev.monthly_token_cap`, `jev.model`.
- Kill-switch: linha `switch_name='jev_audit'` em `system_kill_switches` (colunas `switch_name`/`enabled`), lida antes de cada lote; hit em `kill_switch_hits`.
- Snapshot de baseline: tabela `jev_baseline_snapshots(run_id, captured_at, metric text, value bigint)` — não reaproveitar `medallion_coverage_snapshots` (colunas fixas).

### 3.2 Cliente

- Edge function / worker `jev-audit` (Deno) com `fetch` + timeout + backoff em `429`/`529` (doc: retry exponencial). Rate limit oficial: 1.200 req/min, 250k tokens/s.
- `state` como **objeto JSON** com campos nomeados (doc recomenda), só com os campos que a decisão precisa (doc: *"accuracy falls as the state grows with content unrelated"*). Limite: 32k tokens de `state`.
- Helpers tipados: `noul(instructions)`, `choice(instructions, criteria: Record<string,string|null>)` (≤ 255), `score(instructions, levels: string[])` (2–10).
- Confiança derivada em código: `noul` → `abs(p−0.5)×2`; `choice`/`score` → campo `confidence` da resposta.
- Persistir `state` e `answer` completos + `usage.input_tokens`. Cache por `(sha256(state), question_key, rubric_version)` para `confidence ≥ 0.98` por 30 dias.
- Teste de contrato com mock (3 tipos) no CI (`vitest`).

### 3.3 Piloto obrigatório (gate)

1. Amostra estratificada de **200 produtos ativos** (por nível de categoria e fornecedor).
2. Rótulo humano: "categoria atual correta? / categoria correta = ?".
3. Rodar Jev **hierárquico**: `choice` L1 (28 opções) → `choice` filhos do L1 escolhido → … até folha, guardando `probabilities` por nível (beam de 2).
4. Matriz de confusão por limiar; escolher `auto_apply`/`review`/`discard` com números. Se precisão em `auto_apply` < 97%, **não existe Bloco 2 para categoria** — só fila de revisão.

### 3.4 Auditorias (só após 3.3)

| Auditoria | Primitiva | Vocabulário fechado | Saída |
|---|---|---|---|
| Categoria (8,1k) | `choice` hierárquico | `categories` ativas por nível | divergência atual × sugerida, com `probabilities` |
| Kits (`is_kit` / "kit|conjunto" no nome) | `choice` L1 | 28 L1 | categoria primária sugerida |
| Material | `choice` | `material_groups` (10) → `material_types` (94) | grupo/tipo sugerido para `product_materials` |
| Cor | `choice` | `color_groups` (18) → `color_variations` (87) | entrada sugerida em `color_synonym_map(supplier_color_name, canonical_color_id, confidence, source='jev')` |
| Embalagem | `choice` | `packaging_types` (14) | `packing_type_canonical` sugerido |
| Público | `choice` (multi = várias perguntas `noul`) | `target_audiences` (38) | `target_audience[]` sugerido |
| Dimensão/capacidade plausível | `noul` | — | outlier para revisão (Jev **não** propõe número) |
| NCM | `choice` hierárquico (capítulo → código) ou pré-filtro por categoria | `ncm_codes` (261, > 255) | NCM sugerido |
| Qualidade `ai_title` (7.256) | `score` 4 níveis (Ruim/Regular/Bom/Ótimo) | rubrica versionada | distribuição; `< Bom` → regenerar |
| `ai_description` cobre material/capacidade/dimensão/uso | `noul` ×4 | — | lacunas |
| Título × categoria × atributos consistentes | `noul` | — | contradições |
| `short_description` resume `description` | `noul` | — | divergências |
| Dedup (Fase 5 da v1) | `choice` same/different/review | `matching_policy` versionada | só pares **(membro, `is_reference_product`)** dentro do grupo, bloqueados por `supplier_id` diferente + mesma `material_family`/`capacity_band` |

Cada auditoria: `run_id` próprio, relatório `.md` em `docs/plans/` com números antes/depois, e **nenhuma escrita em `products`**.

---

## 4. Bloco 2 — Aplicação com gate humano (só após precisão medida em 3.3)

### 4.1 Decisão de escrita (obrigatória — a v1 não tinha)

`products` tem 42 triggers. Um `UPDATE` de `category_id` dispara `trg_aa_capture_manual_edits`, `trg_sync_category_assignment`, `trg_sync_product_category_name`, `trg_set_min_quantity`, `trg_products_search_vector`, `trg_products_seo_autofill`, `trg_product_automation`.

| Se o worker gravar com… | Consequência | Uso |
|---|---|---|
| `app.write_source='pipeline'` + `bulk_import_mode='true'` | Campo **não** entra em `locked_fields`; a próxima `fn_promote_padronizacao` **sobrescreve** a correção | Nunca para correção aprovada |
| `app.write_source='jev'` (qualquer valor ≠ `'pipeline'`) | Campo entra em `locked_fields`; pipeline passa a respeitar; automações pesadas rodam (aceitável em lote pequeno) | **Padrão para item aprovado na fila** |

Regra: o worker aplica **só** itens `approved` em `jev_review_queue`, com `write_source='jev'`, e grava `applied_at`. `current_value` fica na fila para rollback (`UPDATE` inverso + remover o campo de `locked_fields` + `rolled_back_at`).

### 4.2 Ordem de go-live (cada fase com aprovação do PO)

1. Cor e embalagem (vocabulário pequeno, baixo risco; de-para em `color_synonym_map`, não em `products`).
2. Material (`product_materials`).
3. Categoria (só `auto_apply` ≥ limiar medido; resto na fila).
4. Título/descrição: `score < Bom` → `ai_enrichment_queue` com `enrichment_type='jev_regenerate'` e `priority` alta (não colidir com `ai-enqueue-daily`, que re-enfileira 5.000/dia); título novo só promove após `noul` "melhor e correto?".
5. Dedup: **inventário das 64 FKs** para `products.id` + procedimento de merge (migrar referências, `product_relationships`, variantes) testado em dry-run; `is_active=false` exige token em `product_deactivation_tokens` (bloqueado por `trg_aa_block_product_deactivation` e revertido pelo cron `fantasmas-deactivate-guard`).

---

## 5. Observabilidade, custo e rollback

- View `v_jev_runs` agregando `jev_decision_log` por `run_id`/`question_key`/faixa de confiança.
- Job diário soma `input_tokens` do mês × U$ 0,042/M e alerta ao cruzar `jev.monthly_token_cap`.
- Métrica "% na fila de revisão" por `question_key`; > 30% → recalibrar rubrica antes de continuar.
- `jev_decision_log` sem `UPDATE`/`DELETE` para `authenticated` (só `service_role` insere).
- Reprocessamento com nova `rubric_version` = novo `run_id`; `unique` impede duplicar.
- Runbook em `docs/`: rodar, limiares, desligar (`jev_audit`), rollback de item.

---

## 6. Riscos

| Risco | Mitigação |
|---|---|
| Português menos calibrado | Piloto 3.3 é gate; sem 97% em `auto_apply`, não há Bloco 2 para categoria |
| Correção do Jev desfeita pelo pipeline | §4.1: `write_source='jev'` + `locked_fields` |
| Falso-merge no dedup | Blocking + só pares com referência + inventário de FKs + dry-run |
| Estouro de custo | Cap em `admin_settings` + alerta; custo base ≈ U$ 0,12 por passada completa |
| Rate limit / 529 | Backoff; kill-switch `jev_audit` |
| Regressão no pipeline | Bloco 0 e 1 não tocam `fn_standardize_supplier`/`fn_promote_supplier`; Bloco 2 escreve só via fila |

## 7. Critérios de aceitação

1. Bloco 0 aplicado via E15 com pós-check verde: `padronizacao_id` nulo = 6 (pré-Medallion), `main_category_id` nulo = 0.
2. `jev_decision_log` / `jev_review_queue` criadas por migration, com RLS e policy.
3. Piloto de 200 rótulos com matriz de confusão e limiar registrado em `admin_settings`.
4. Cada auditoria com relatório antes/depois e zero escrita em `products` no Bloco 1.
5. Nenhum segredo no repo; SSOT preservado; gates verdes.

---

## Apêndice A — Payload de referência (conforme `docs.typesafe.ai/api`)

```http
POST https://api.typesafe.ai/v1/systemone
Authorization: Bearer $JEV_API_KEY
Content-Type: application/json
```

```json
{
  "model": "jev-latest",
  "state": {
    "produto": "Caneca térmica 350ml inox com tampa",
    "categoria_atual": "Bar | Cozinha > Copos",
    "atributos": { "capacidade_ml": 350, "material": "inox" }
  },
  "questions": {
    "categoria_l1": {
      "type": "choice",
      "instructions": "Qual categoria de nível 1 descreve melhor o produto?",
      "criteria": { "Bar | Cozinha": null, "Tecnologia | Eletrônicos": null, "Papelaria | Escritório": null }
    },
    "titulo_qualidade": {
      "type": "score",
      "instructions": "Qualidade do título: contém tipo do produto, atributo-chave e sem ruído?",
      "criteria": ["Ruim", "Regular", "Bom", "Ótimo"]
    },
    "capacidade_plausivel": {
      "type": "noul",
      "instructions": "A capacidade informada é plausível para este tipo de produto?"
    }
  }
}
```

Resposta: `answers.<key>` → `noul` (0–1) · `choice + probabilities + confidence` · `score + legend + probabilities + confidence`; `usage.input_tokens` (saída grátis). Limites: `choice` ≤ 255 opções; `score` 2–10 níveis; `state` ≤ 32k tokens.
