# Plano de Melhorias e Correções do Catálogo com Jev (TypeSafe System One) — 100 Etapas

> **Autor:** Hermes (executor) · plano solicitado por Joaquim (PO)
> **Data:** 2026-09-28 · **Status:** PLANO — **não executar até aprovação do PO**
> **Repo:** `adm01-debug/Promo_Gifts_V4` · **Banco canônico (SSOT):** Supabase `doufsxqlfjyuvxuezpln` (PG17)
> **Modelo:** Jev (`jev-latest` / `jev-preview`) via `POST https://api.typesafe.ai/v1/systemone`

---

## Resumo executivo

Este plano usa o **Jev** (TypeSafe System One — modelo de *decisão* tipada, não de geração de texto) como **juiz/auditor de qualidade** sobre o catálogo de brindes do Promo_Gifts_V4, que já é padronizado por um pipeline **Medallion determinístico** (Bronze → Silver → Gold). O Jev **não substitui** o pipeline existente: ele audita, valida, classifica e flagga os casos que o de-para determinístico não resolve ou classificou errado — com **probabilidade calibrada** e **fila de revisão humana** para baixa confiança.

**Gaps medidos (baseline 2026-09-28):**

| Métrica | Valor |
|---|---|
| Produtos Gold (`products`) | 8.138 |
| Categorias (`categories`, árvore até 6 níveis) | 478 |
| Variantes (`product_variants`) | 20.216 |
| Bronze (`supplier_products_raw`) | 24.727 |
| Silver (`produtos_padronizacao`) | 8.132 |
| **Sem `padronizacao_id`** (Gold não linkado à Silver) | **528 (6,5%)** |
| **Sem `ai_title`** | **882 (10,8%)** |
| Sem `category_id` / sem `brand` | 0 / 0 |
| Grupos de similaridade (`product_similarity_groups` / `_members`) | 266 / 6.986 |
| Fila de enriquecimento IA (`ai_enrichment_queue`) | 7.671 |

**Prova de conceito já executada (não é mais necessário — registrada aqui):** o Jev, em português, flaggou corretamente erros reais de categorização no Gold — ex.: *"Power bank 4.000mAh com lanterna"* em `Lanternas` → 13% de confiança (errado); *"Kit porta-copos bambu 6 peças"* em `Copos` → 28% (errado); *"Fones de ouvido true wireless…"* em `Fone de Ouvido` → 94% (certo).

**Custo estimado:** a API cobra por token de entrada (saída grátis). Auditar 8,1k produtos com ~350 tokens/cada ≈ 2,85M tokens ≈ **U$ 1–2** (ordem de grandeza; confirmar no painel da TypeSafe).

---

## Princípios e restrições (imutáveis)

1. **SSOT `doufsxqlfjyuvxuezpln` é intocável sem aprovação explícita do PO** (REGRA #1 e #8 do `CLAUDE.md`). Toda mudança de schema passa por migration versionada e gate humano.
2. **Jev decide, não gera.** Para *reescrever* título/descrição usa-se o LLM gerativo existente (DeepSeek V3 em `ai_enrichment_queue`); o Jev entra como **juiz** que aprova/rejeita o texto gerado.
3. **Nada é aplicado em produção sem revisão humana** quando a confiança do Jev estiver abaixo do limiar por etapa.
4. **Idempotência e append-only** onde houver dado histórico; nunca sobrescrever Bronze.
5. **Toda mudança de banco = migration versionada** em `supabase/migrations/` (ou `medallion/migrations/` para a camada Medallion), SQL idempotente.
6. **Nunca** escrever segredo em código/commit. A chave fica em variável de ambiente (`JEV_API_KEY` / `TYPESAFE_API_KEY`), nunca no repo.

---

## Arquitetura da solução (onde o Jev encaixa)

```
                     ┌─────────────────────────────────────────────┐
 Bronze (raw) ──► Silver (produtos_padronizacao) ──► Gold (products) │
  supplier_products_raw   fn_standardize_supplier      fn_promote_*  │
                     └─────────────────────────────────────────────┘
                                     ▲            ▲
                                     │            │
   JEV (juiz de decisão) ──► (1) audita categorização / atributos / dedup
                              (2) valida conteúdo IA (ai_title/ai_description)
                              (3) classifica os casos que o de-para não resolve
                                     │
                                     ▼
              resultado persistido em tabelas de AUDITORIA (novas)
              + fila de revisão humana para confiança < limiar
```

O Jev é integrado como um **passo de decisão assíncrono** (worker/edge function), não como chamada síncrona no request do frontend.

---

## FASE 0 — Governança, Segurança e Fundações (etapas 1–10)

### Etapa 1 — Registrar a chave TypeSafe no cofre de segredos
- **Ação:** criar segredo `JEV_API_KEY` (chave `apikey_…` da TypeSafe) no cofre/ambiente do worker (Supabase Secret ou `.env` do host), **nunca** em código.
- **Verificação:** `grep -R "apikey_" supabase/ src/ scripts/` retorna vazio; a chave só existe no cofre.

### Etapa 2 — Definir o limite de custo e alerta
- **Ação:** registrar no `ai_usage_quotas` / painel um teto mensal (ex.: 5M tokens/mês) com alerta em 80%.
- **Verificação:** `select * from ai_usage_quotas` mostra o teto; um disparo acima de 80% gera evento em `ai_usage_logs`.

### Etapa 3 — Criar tabela de auditoria de decisões Jev (`jev_decision_log`)
- **Ação:** migration idempotente criando `public.jev_decision_log` (append-only): `id uuid pk`, `entity_table text`, `entity_id uuid`, `question_key text`, `question_type text`, `state jsonb`, `answer jsonb`, `confidence numeric`, `model text`, `input_tokens int`, `created_at timestamptz`, `run_id uuid`.
- **Verificação:** `\d jev_decision_log` mostra as colunas; `select count(*)` = 0.

### Etapa 4 — Criar índice e constraint da tabela de auditoria
- **Ação:** `create index if not exists idx_jev_log_entity on jev_decision_log(entity_table, entity_id);` + `check (confidence between 0 and 1)`.
- **Verificação:** `\d jev_decision_log` lista índice e check.

### Etapa 5 — Criar tabela de fila de revisão humana (`jev_review_queue`)
- **Ação:** migration `public.jev_review_queue`: `id`, `entity_table`, `entity_id`, `reason text`, `current_value jsonb`, `suggested_value jsonb`, `confidence numeric`, `status text default 'pending'` (`pending|approved|rejected`), `reviewed_by uuid`, `reviewed_at timestamptz`.
- **Verificação:** tabela existe; `status` é enum/text com default `pending`.

### Etapa 6 — Definir limiares globais de confiança por classe de decisão
- **Ação:** registrar em tabela de config (ou `admin_settings`) os limiares: `auto_apply ≥ 0.95`, `review 0.50–0.95`, `discard < 0.50`.
- **Verificação:** `select * from admin_settings where key like 'jev.threshold.%'`.

### Etapa 7 — Feature flag para desligar o Jev a quente
- **Ação:** kill-switch em `system_kill_switches` (nome `jev_audit`), consumido pelo worker antes de cada lote.
- **Verificação:** com o switch `on`, o worker não chama a API (log em `kill_switch_hits`).

### Etapa 8 — Baseline de métricas do catálogo (antes de qualquer mudança)
- **Ação:** snapshot `select` dos contadores de cobertura (produtos, categorias nulas, `padronizacao_id` nulo, `ai_title` nulo) e gravar em `medallion_coverage_snapshots`.
- **Verificação:** uma linha nova no snapshot com os números da tabela acima.

### Etapa 9 — Criar `run_id` (trace de execução) por batelada
- **Ação:** coluna `run_id` em `jev_decision_log` preenchida a cada lote; guardar `run_id` no snapshot de cobertura.
- **Verificação:** duas execuções geram `run_id` distintos.

### Etapa 10 — Documentar o contrato da API no repo
- **Ação:** `docs/` (ou `medallion/`) com o payload de referência `state/model/questions` e o shape de resposta (`answers.*.noul/choice/score/confidence/probabilities`).
- **Verificação:** documento versionado e linkado no README do Medallion.

---

## FASE 1 — Inventário e Profiling do Catálogo (etapas 11–20)

### Etapa 11 — Inventário de cobertura por camada
- **Ação:** query `select (select count(*) from supplier_products_raw), (select count(*) from produtos_padronizacao), (select count(*) from products);`
- **Verificação:** números batem com o baseline (24.727 / 8.132 / 8.138).

### Etapa 12 — Contagem de `products` sem link Silver (`padronizacao_id` nulo)
- **Ação:** `select count(*) from products where padronizacao_id is null;` (esperado 528).
- **Verificação:** gravar em snapshot; é o alvo da Fase 7.

### Etapa 13 — Contagem de `products` sem `ai_title`
- **Ação:** `select count(*) from products where ai_title is null or ai_title = '';` (esperado 882).
- **Verificação:** gravar; alvo da Fase 6.

### Etapa 14 — Distribuição de profundidade da árvore de categorias
- **Ação:** `select level, count(*) from categories group by level order by level;` + verificar `path` (materialized) coerente com `parent_id`.
- **Verificação:** níveis 1–6; sem órfãos (`parent_id` apontando para id inexistente).

### Etapa 15 — Categorias órfãs ou ciclos na árvore
- **Ação:** checar `parent_id` referenciando si mesmo ou ciclo (recursivo) e `path` divergente de `parent_id`.
- **Verificação:** zero ciclos; órfãos listados para correção manual.

### Etapa 16 — Cobertura de `supplier_category_mappings`
- **Ação:** `select count(*) from supplier_category_mappings;` e cruzar com `supplier_categories` para achar categorias de fornecedor **sem** de-para.
- **Verificação:** lista de fornecedor-categoria sem mapeamento (alvo de remapeamento na Fase 3).

### Etapa 17 — Profiling de `name` (Gold): caixa, acentos, ruído
- **Ação:** amostrar 200 `name` distintos e medir: duplicados exatos, nomes com ALL-CAPS, com `c/`, unidades inconsistentes (`ml`/`ML`/`litros`).
- **Verificação:** relatório de anomalias nominais.

### Etapa 18 — Profiling de atributos-chave (capacidade, dimensão, material)
- **Ação:** distribuição de `capacity_ml`, `dimensions_source`, `packing_type_canonical`, `surface_finish` — achar vazios/inconsistentes.
- **Verificação:** tabela de colunas com % de preenchimento.

### Etapa 19 — Baseline de duplicatas por similaridade
- **Ação:** `select count(*) from product_similarity_groups;` + `select count(*) from product_similarity_group_members;` (266 / 6.986).
- **Verificação:** registrar; alvo da Fase 5.

### Etapa 20 — Inventário dos registros de classificação automática existentes
- **Ação:** `select * from classify_functions_registry;` (25 funções) + `select * from ai_function_routing;` (18 rotas).
- **Verificação:** mapear onde o Jev pode entrar como nova função de classificação.

---

## FASE 2 — Camada de Integração Jev (etapas 21–30)

### Etapa 21 — Cliente HTTP mínimo com retry e timeout
- **Ação:** criar utilitário (edge function ou script) `jevClient(state, questions, model='jev-latest')` com `timeout` e `Retry-After` em 429.
- **Verificação:** chamada de teste retorna `answers` (200) e 429 aciona backoff.

### Etapa 22 — Modelos disponíveis e seleção
- **Ação:** `GET https://api.typesafe.ai/v1/models` e fixar `jev-latest` (default) / `jev-preview` (canário).
- **Verificação:** lista retornada contém `jev-latest`/`jev-preview`; registro do modelo usado em `jev_decision_log.model`.

### Etapa 23 — Normalizar o shape de pergunta (noul/choice/score)
- **Ação:** helpers `yesNo(inst)`, `choice(inst, criteria)`, `score(inst, levels)` gerando o `questions` tipado correto.
- **Verificação:** cada helper produz JSON aceito (200) e resposta com o campo correspondente.

### Etapa 24 — Idempotência por `(entity_table, entity_id, question_key, run_id)`
- **Ação:** `unique` (ou upsert) em `jev_decision_log` para não reprocessar/cobrar duas vezes o mesmo item no mesmo `run_id`.
- **Verificação:** re-executar o mesmo lote não duplica linhas nem chama a API de novo.

### Etapa 25 — Loteamento e limite de concorrência
- **Ação:** processar em lotes de N (ex.: 50) com concorrência controlada e `process_pending_batches`-like para não estourar o rate limit (1.000 req/min).
- **Verificação:** lote de 1.000 itens conclui sem 429 persistente.

### Etapa 26 — Persistir `state` e `answer` completos (auditoria)
- **Ação:** gravar `state` (texto enviado) e `answer` (JSON completo) em `jev_decision_log` — nunca só o veredito.
- **Verificação:** uma linha tem `state` e `answer` não nulos.

### Etapa 27 — Contabilizar tokens e custo por lote
- **Ação:** somar `usage.input_tokens` do retorno e gravar; projetar custo com o preço por token configurado.
- **Verificação:** `select sum(input_tokens) from jev_decision_log where run_id = X` bate com o painel da TypeSafe.

### Etapa 28 — Cache de decisões estáveis (opcional)
- **Ação:** para itens com `state` idêntico já julgado com `confidence ≥ 0.98`, reusar a decisão por N dias.
- **Verificação:** hit de cache não gera chamada de API.

### Etapa 29 — Versionamento de prompts/rubricas
- **Ação:** cada rubrica (instruções + critérios) versionada (ex.: coluna `rubric_version`), para reprodutibilidade.
- **Verificação:** mudança de rubrica altera `rubric_version` e é rastreável.

### Etapa 30 — Teste de contrato da integração (mock)
- **Ação:** teste que mocka o endpoint e valida que o worker grava `jev_decision_log` + fila de revisão corretamente para os 3 tipos de pergunta.
- **Verificação:** teste verde no CI do repo.

---

## FASE 3 — Auditoria de Categorização (etapas 31–45)

### Etapa 31 — Selecionar o universo a auditar (Gold)
- **Ação:** `select id, name, category_id, category_name from products where is_active and is_deleted is not true;`
- **Verificação:** contagem do universo registrada.

### Etapa 32 — Amostra piloto de 200 produtos com rótulo humano
- **Ação:** amostrar 200 e pedir ao PO/equipe o rótulo "categoria correta/incorreta" — base para calibrar limiar.
- **Verificação:** 200 rótulos salvos (ex.: tabela de baseline rotulada).

### Etapa 33 — Medir precisão/recall do Jev na amostra piloto
- **Ação:** rodar Jev (`noul`: "produto corretamente classificado em <cat>?") nos 200 e comparar com rótulo humano; medir precisão por limiar.
- **Verificação:** matriz de confusão + curva de limiar documentadas.

### Etapa 34 — Escolher o limiar de auto-aplicação da categorização
- **Ação:** com a curva do passo 33, fixar limiar (ex.: `≥ 0.95` auto-aprova, `≤ 0.40` reprova/flagga).
- **Verificação:** limiar gravado em config + justificado com números.

### Etapa 35 — Rodar auditoria completa de categoria (batch)
- **Ação:** para os 8.1k produtos, chamar Jev `noul` "categoria correta?" + `choice` "qual categoria top-level?".
- **Verificação:** `select count(*) from jev_decision_log where question_key='category_correct'` = N produtos.

### Etapa 36 — Gerar lista de suspeitos de categoria (baixa confiança)
- **Ação:** `select ... where confidence < 0.50` → alimentar `jev_review_queue` com `reason='low_confidence_category'`.
- **Verificação:** fila populada com os casos tipo "power bank → Lanternas".

### Etapa 37 — Revisar a árvore de categorias (top-level) para o `choice`
- **Ação:** extrair as categorias de nível 1 (`level=1`) como critérios do `choice`, garantindo vocabulário fechado.
- **Verificação:** o `choice` usa só categorias canônicas de nível 1.

### Etapa 38 — Cruzar categoria Jev vs categoria atual para divergência
- **Ação:** comparar `category_name` atual com o `choice` top-level do Jev; onde divergir e confiança alta → flag.
- **Verificação:** relatório de divergências ordenado por confiança.

### Etapa 39 — Remapear `supplier_category_mappings` faltantes
- **Ação:** para as categorias de fornecedor sem de-para (Etapa 16), usar Jev `choice` para propor a categoria canônica e gravar no de-para.
- **Verificação:** cobertura de `supplier_category_mappings` aumentada (de-para, não dado bruto).

### Etapa 40 — Normalizar nomes de categoria (grafia/plural/acento)
- **Ação:** listar categorias com grafia divergente (ex.: "Canetas | Plástico" vs "Canetas|Plastico") e propor canonical via Jev + revisão.
- **Verificação:** árvore com grafia consistente.

### Etapa 41 — Revisar `main_category_id` vs `category_id`
- **Ação:** auditar produtos onde `main_category_id` diverge do ancestral top-level de `category_id`.
- **Verificação:** inconsistências listadas.

### Etapa 42 — Validar produtos "kit/conjunto" (categoria composta)
- **Ação:** `choice` Jev para produtos `is_kit`/nome com "conjunto/kit" — categoria primária correta (ex.: "Conjunto caneta e chaveiro").
- **Verificação:** kits com categoria primária revisada.

### Etapa 43 — Auditar categorias de baixa densidade
- **Ação:** categorias com poucos produtos e produtos "órfãos" de taxonomia (nome não casa com a categoria).
- **Verificação:** lista para fusão/desativação de categorias.

### Etapa 44 — Consolidar resultado e gerar migration de correção (se aplicável)
- **Ação:** para as correções aprovadas, gerar migration `update products set category_id = … where …` idempotente, com gate humano.
- **Verificação:** migration no repo, `dry_run` antes de aplicar.

### Etapa 45 — Publicar relatório de auditoria de categorização
- **Ação:** `.md` em `docs/plans/` (ou `docs/`) com % de produtos corretos, suspeitos e corrigidos.
- **Verificação:** relatório versionado com números reais.

---

## FASE 4 — Padronização de Atributos (etapas 46–60)

### Etapa 46 — Auditoria de `brand` e `sub_brand`
- **Ação:** listar `brand`/`sub_brand` distintos e achar grafias divergentes da mesma marca.
- **Verificação:** tabela de marcas × grafias.

### Etapa 47 — Normalizar marca via `choice` (vocabulário de `supplier_sub_brands`)
- **Ação:** Jev `choice` para propor `sub_brand` canônico a partir de `supplier_sub_brands` (4 marcas conhecidas).
- **Verificação:** marcas divergentes mapeadas ao canônico.

### Etapa 48 — Auditoria de materiais (`auto_material`, `materials`, `product_materials`)
- **Ação:** distribuição de materiais e grupos (`material_groups`, `material_types`); achar material inconsistente com o nome.
- **Verificação:** relatório de materiais × produto.

### Etapa 49 — Normalizar material com `choice` sobre `material_groups`
- **Ação:** Jev classifica o material do produto (ex.: "fibra de palha de trigo") no grupo canônico (Plásticos/Metais/Tecidos…).
- **Verificação:** `product_materials` populado com grupo correto.

### Etapa 50 — Auditoria de cores (`colors`, `color_groups`, `color_variations`)
- **Ação:** cruzar `colors` (jsonb) com `color_variations` canônico; achar cores não mapeadas.
- **Verificação:** lista de cores sem vínculo canônico.

### Etapa 51 — Normalizar cor via `choice` + `color_synonym_map`
- **Ação:** Jev mapeia cor textual → `color_variations` canônico; alimentar `color_synonym_map` (de-para).
- **Verificação:** cobertura de sinônimos de cor ampliada.

### Etapa 52 — Auditoria de unidade/capacidade (`capacity_ml`, `capacities`, `capacity_ml`)
- **Ação:** achar valores inconsistentes (ex.: "0,5L" vs "500ml", unidades em texto).
- **Verificação:** relatório de capacidade não-normalizada.

### Etapa 53 — Normalizar capacidade/volume via `score`/`choice`
- **Ação:** Jev extrai/valida o valor numérico em `ml` (ex.: "9L" → 9000) como `score` contínuo ou `choice` por faixa.
- **Verificação:** `capacity_ml` preenchido corretamente nos suspeitos.

### Etapa 54 — Auditoria de dimensões físicas (fonte `dimensions_source`)
- **Ação:** ver `dimensions_source` (cm/mm/estimated) e achar unidades erradas (ex.: caixa em metros no SPOT).
- **Verificação:** relatório de dimensões suspeitas (muito grandes/pequenas).

### Etapa 55 — Validar dimensões plausíveis via `score` (sanity check)
- **Ação:** Jev `score` "a dimensão é plausível para este tipo de produto?" para flaggar outliers (ex.: caneta com 2m).
- **Verificação:** outliers listados para revisão.

### Etapa 56 — Auditoria de embalagem (`packing_type`, `packing_type_canonical`, `repacking_type`)
- **Ação:** distribuição de tipos de embalagem e divergência entre os campos.
- **Verificação:** relatório de embalagem inconsistente.

### Etapa 57 — Normalizar `packing_type_canonical` via `choice`
- **Ação:** Jev classifica a embalagem no vocabulário de `packaging_types` (14 tipos).
- **Verificação:** `packing_type_canonical` preenchido/consistente.

### Etapa 58 — Auditoria de `gender` e `target_audience`
- **Ação:** listar `gender`/`target_audience` e achar produtos com público errado/inconsistente.
- **Verificação:** relatório de público-alvo.

### Etapa 59 — Validar `target_audience` via `choice`
- **Ação:** Jev classifica o público (ex.: corporativo, infantil, feminino) com `choice` sobre `target_audiences` (38).
- **Verificação:** público-alvo corrigido/flagado.

### Etapa 60 — Consolidar atributos e gerar migration de backfill
- **Ação:** migration idempotente para aplicar os atributos aprovados (`brand`, `material`, `color`, `capacity`, `packing`, `gender`), com `dry_run` e gate humano.
- **Verificação:** migration no repo; backfill com `where` seletivo (nunca update global sem filtro).

---

## FASE 5 — Deduplicação / Entity Matching (etapas 61–70)

### Etapa 61 — Extrair pares candidatos dos grupos de similaridade
- **Ação:** `select * from product_similarity_group_members` → pares (a, b) dentro de cada grupo.
- **Verificação:** N pares candidatos listados.

### Etapa 62 — Definir política de identidade (mesmo produto vs variante)
- **Ação:** redigir `matching_policy`: mesmo modelo+fabricante+capacidade = mesmo; capacidade diferente = variante distinta; lista de IDs/embalagens conflitantes.
- **Verificação:** política documentada e versionada.

### Etapa 63 — Jev `choice` same/different/review para cada par
- **Ação:** enviar `state` = {record_a, record_b, matching_policy} e `choice` com `{same, different, review}`.
- **Verificação:** veredito com `probabilities` por par.

### Etapa 64 — Checks de campo (nome compatível? ID conflita?)
- **Ação:** perguntas `noul` auxiliares: "nomes compatíveis após diferenças de grafia?" e "identificadores conflitam?".
- **Verificação:** sinais de campo por par, para explicar o veredito.

### Etapa 65 — Guardar veredito e flaggar `review` para humano
- **Ação:** persistir em `jev_decision_log` + `jev_review_queue` para pares `review` ou `same` com confiança baixa.
- **Verificação:** pares ambíguos na fila.

### Etapa 66 — Medir taxa de falso-merge (precisão) antes de automatizar
- **Ação:** comparar veredito Jev com rótulo humano em amostra; medir precisão de `same` (evitar juntar produtos distintos).
- **Verificação:** métrica de falso-merge documentada.

### Etapa 67 — Aplicar dedup aprovado (merge) com constraint um-para-um
- **Ação:** para `same` aprovado, manter um produto canônico e apontar os demais (nunca apagar histórico; usar `is_deleted`/`related_references`).
- **Verificação:** merge registrado em `product_relationships`/audit, sem perda de `product_variants`.

### Etapa 68 — Transitivade (A≈B, B≈C ⇒ A≈C?)
- **Ação:** para clusters, validar com Jev + checar identificadores antes de assumir transitividade (regra explícita: não assumir).
- **Verificação:** clusters com identificadores consistentes.

### Etapa 69 — Reconciliação cross-supplier (mesmo produto de fornecedores distintos)
- **Ação:** pares entre fornecedores (ex.: SPOT vs XBZ) com `matching_policy` que aceita SKUs diferentes mas mesmo modelo.
- **Verificação:** duplicatas cross-supplier listadas.

### Etapa 70 — Relatório de dedup e impactos
- **Ação:** documentar nº de merges, nº de revisões, impacto em `product_variants`/preços.
- **Verificação:** relatório com números antes/depois.

---

## FASE 6 — Validação de Conteúdo IA (etapas 71–80)

### Etapa 71 — Inventário de conteúdo IA existente
- **Ação:** `select count(*) from products where ai_title is not null;` + distribuição de `ai_model`/`ai_version`.
- **Verificação:** baseline (7.256 com título, 882 sem).

### Etapa 72 — Definir rubrica de qualidade do título
- **Ação:** rubrica Jev para `ai_title`: contém categoria+marca+atributo-chave? sem ruído? ≤ 250 chars (check `name_max_250`)?
- **Verificação:** rubrica versionada (`rubric_version`).

### Etapa 73 — Jev como juiz do `ai_title` existente (`score`)
- **Ação:** para os 7.256 títulos, `score` 0–10 com a rubrica (clareza, completude, SEO).
- **Verificação:** distribuição de scores salva.

### Etapa 74 — Flaggar títulos ruins para regeneração
- **Ação:** título com `score < limiar` → `ai_enrichment_queue` (regenerar via DeepSeek) + `jev_review_queue`.
- **Verificação:** fila de enriquecimento incrementada com os ruins.

### Etapa 75 — Validar título regenerado com Jev (gate de qualidade)
- **Ação:** antes de promover `ai_title` novo ao Gold, Jev `noul` "título melhor que o anterior e correto?".
- **Verificação:** só promove título aprovado; rejeitado volta à fila.

### Etapa 76 — Validar `ai_description` (cobertura de atributos)
- **Ação:** Jev `score`/`choice` se a descrição menciona material, capacidade, dimensão, uso.
- **Verificação:** relatório de descrições incompletas.

### Etapa 77 — Auditar consistência título × categoria × atributos
- **Ação:** Jev `noul` "o título é consistente com a categoria e os atributos?" para pegar contradição.
- **Verificação:** contradições listadas.

### Etapa 78 — Preencher os 882 `ai_title` faltantes (gerar + julgar)
- **Ação:** para os 882, gerar título (DeepSeek) e validar com Jev antes de gravar.
- **Verificação:** `ai_title` nulo → 0 ao fim do lote.

### Etapa 79 — Auditoria de `short_description` vs `description`
- **Ação:** Jev verifica se `short_description` é um resumo fiel de `description`.
- **Verificação:** resumos divergentes listados.

### Etapa 80 — Relatório de qualidade de conteúdo
- **Ação:** documentar score médio antes/depois, nº de títulos regenerados.
- **Verificação:** relatório com números reais.

---

## FASE 7 — Fechamento de Gaps e Correções (etapas 81–90)

### Etapa 81 — Investigar os 528 produtos sem `padronizacao_id`
- **Ação:** `select id, name, supplier_id, supplier_reference from products where padronizacao_id is null;` e agrupar por fornecedor/status.
- **Verificação:** causa raiz identificada (ex.: Bronze ainda `pending`, ou promoção interrompida).

### Etapa 82 — Reprocessar Bronze `pending` → Silver → Gold
- **Ação:** rodar `fn_standardize_supplier`/`fn_promote_supplier` (ou `process_pending_batches`) para os pendentes.
- **Verificação:** `padronizacao_id` nulo reduz; acompanhar `pipeline_run_log`.

### Etapa 83 — Classificar Bronze sem de-para de categoria (via Jev)
- **Ação:** Bronze cujo `supplier_category` não tem `supplier_category_mappings` → Jev `choice` propõe categoria → alimentar de-para.
- **Verificação:** Bronze sem categoria mapeada reduz.

### Etapa 84 — Validar a promoção Silver→Gold dos 528
- **Ação:** conferir que a promoção não gerou produto duplicado (cruzar com dedup da Fase 5).
- **Verificação:** 528 (ou menos, após dedup) com `padronizacao_id` preenchido.

### Etapa 85 — Normalização de cores pendente (legado da Fase 4)
- **Ação:** aplicar o de-para de cor gerado (`color_synonym_map`) e conferir `color_variations` canônico.
- **Verificação:** cores divergentes mapeadas.

### Etapa 86 — Corrigir unidades de dimensão por fornecedor (quirks)
- **Ação:** aplicar as correções conhecidas (SPOT caixa em metros ×100; Só Marcas caixa MM÷10; texto "24,5x7cm" → parse) e validar com Jev.
- **Verificação:** dimensões plausíveis após correção (sanity check da Etapa 55).

### Etapa 87 — Backfill de atributos físicos faltantes
- **Ação:** para produtos com `dimensions_source='estimated'` ou vazio, Jev `score` propõe/valida a estimativa.
- **Verificação:** `dimensions_source` com origem registrada.

### Etapa 88 — Reconciliar `ncm_id`/`ncm_code` fiscais
- **Ação:** auditar NCM (8 dígitos, XBZ) e validar com `ncm_codes` (261 códigos) + Jev `choice` quando ambíguo.
- **Verificação:** NCM válido e consistente.

### Etapa 89 — Limpar campos legados apontados no comment da tabela (com cautela)
- **Ação:** avaliar o backlog documentado (`internal_*_cm`, `sku_promo` duplicado) — **apenas** leitura/análise; mudança real exige PO (REGRA #8).
- **Verificação:** análise entregue; nenhum `drop` sem aprovação.

### Etapa 90 — Relatório de fechamento de gaps
- **Ação:** documentar antes/depois de cada gap (padronização, categoria, cor, dimensão, NCM).
- **Verificação:** relatório com números de fechamento.

---

## FASE 8 — Observabilidade, Custo e Rollback (etapas 91–100)

### Etapa 91 — Dashboard de decisões Jev (por run)
- **Ação:** view/query agregando `jev_decision_log` por `run_id`/`question_key`/faixa de confiança.
- **Verificação:** view criada e consultável.

### Etapa 92 — Alerta de custo (tokens/mês)
- **Ação:** job que soma `input_tokens` do mês e alerta ao cruzar o teto (Etapa 2).
- **Verificação:** alerta dispara em teste de limite.

### Etapa 93 — Monitor de taxa de revisão humana
- **Ação:** métrica "% de itens caindo na fila de revisão" — se >X%, recalibrar limiar.
- **Verificação:** métrica visível e limiar reajustável.

### Etapa 94 — Trilha de auditoria imutável das decisões
- **Ação:** garantir `jev_decision_log` append-only (sem update/delete por aplicação) + `admin_audit_log` para ações de risco.
- **Verificação:** triggers/políticas impedem mutação indevida.

### Etapa 95 — Rollback de uma decisão aplicada
- **Ação:** manter `current_value`/`suggested_value` em `jev_review_queue` para reverter uma aplicação (voltar ao valor anterior).
- **Verificação:** rollback de um item restaura o estado anterior sem afetar os demais.

### Etapa 96 — Teste de regressão do pipeline com Jev ligado
- **Ação:** garantir que ligar/desligar o Jev não quebra `fn_standardize_supplier`/`fn_promote_supplier` (mutation test do kill-switch).
- **Verificação:** testes verdes com e sem Jev.

### Etapa 97 — Backfill retroativo (reprocessamento) seguro
- **Ação:** procedimento para reprocessar um lote com nova rubrica sem duplicar (via `run_id` + idempotência).
- **Verificação:** reprocessamento não duplica `jev_decision_log`.

### Etapa 98 — Documentação operacional (runbook)
- **Ação:** runbook em `docs/` com: como rodar, limiares, rollback, como recalibrar, como desligar.
- **Verificação:** runbook versionado e linkado.

### Etapa 99 — Revisão final de conformidade (SSOT, segredos, gates)
- **Ação:** `grep` por segredo, `validate-supabase-config`, verificação de que nenhuma mudança tocou `client.ts`/SSOT indevidamente.
- **Verificação:** gates verdes; nenhum segredo no diff.

### Etapa 100 — Aprovação do PO e go-live faseado
- **Ação:** apresentar relatório consolidado (números antes/depois, custo, lista de revisões) ao PO; go-live por fase (categorização → atributos → dedup → conteúdo), cada fase com gate humano.
- **Verificação:** aprovação registrada; `admin_audit_log` com a decisão de go-live.

---

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Português menos calibrado que inglês no Jev | Amostra piloto rotulada (Etapas 32–34) antes de qualquer aplicação; limiar conservador |
| Falso-merge juntando produtos distintos | Política de identidade explícita + checks de campo + revisão humana (Fase 5) |
| Jev "decide errado" com alta confiança | Nunca auto-aplicar em campo crítico sem gate humano (REGRA #8); trilha imutável |
| Estouro de custo | Teto + alerta (Etapas 2/92); cache de decisões estáveis |
| Rate limit / indisponibilidade | Retry/backoff (Etapa 21); kill-switch (Etapa 7) |
| Regressão no pipeline determinístico | Testes com/sem Jev (Etapa 96); Jev é passo aditivo, não substituto |

## Critérios de aceitação (resumo)

1. `jev_decision_log` e `jev_review_queue` criadas e versionadas via migration.
2. Amostra piloto rotulada com matriz de confusão e limiar justificado.
3. Categorização/atributos/dedup/conteúdo auditados com números antes/depois.
4. 528 produtos sem `padronizacao_id` e 882 sem `ai_title` tratados (ou justificados).
5. Nenhum segredo no repo; SSOT `doufsxqlfjyuvxuezpln` preservado; gates verdes.
6. Toda aplicação de schema/dados passou por migration + gate humano (PO).

---

## Apêndice A — Payload de referência (TypeSafe System One)

```http
POST https://api.typesafe.ai/v1/systemone
Authorization: Bearer $JEV_API_KEY
Content-Type: application/json
```

```json
{
  "state": "Produto: Caneca térmica 350ml. Categoria atual: Copos",
  "model": "jev-latest",
  "questions": {
    "categoria_correta": {
      "type": "noul",
      "instructions": "O produto está corretamente classificado na categoria indicada?"
    },
    "categoria_ideal": {
      "type": "choice",
      "instructions": "Qual é a categoria top-level correta?",
      "criteria": { "Canecas": null, "Copos": null, "Garrafas": null, "Outros": null }
    },
    "qualidade_nome": {
      "type": "score",
      "instructions": "Qualidade do título (clareza, completude, atributo-chave)",
      "criteria": ["Ruim", "Regular", "Bom", "Ótimo"]
    }
  }
}
```

Resposta (shape): `answers.<key>.{noul | choice+confidence+probabilities | score+legend+probabilities}` e `usage.input_tokens` (saída grátis).

---

> **Estado:** documento de planejamento. **Nada foi executado** além da PoC de categorização descrita no Resumo. A execução das 100 etapas aguarda aprovação do PO (Joaquim), fase a fase, conforme REGRA #8 do `CLAUDE.md`.
