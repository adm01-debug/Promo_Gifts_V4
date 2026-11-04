# public.image_types

> Vocabulário oficial de tipos semânticos de imagem da Promo Brindes.
Esta tabela é o DICIONÁRIO que classifica cada foto em product_images.
Pense nela como um enum gerenciável: em vez de hardcodar 'main', 'gallery' etc. no app,
cada tipo é um registro com metadados que controlam comportamento no frontend e no pipeline.

━━━ O QUE É ━━━
18 tipos cadastrados (jun/2026). Exemplos:
  main     → foto principal/capa do produto na cor selecionada
  gallery  → ângulos extras (d2, d3...) sem cor específica
  set      → foto mostrando todas as cores disponíveis juntas
  location → foto indicando ONDE no produto a gravação vai
  area     → diagrama técnico da área de gravação com dimensões
  component→ peça isolada do produto (ex: tampa de caneta)
  logo     → produto COM logotipo do cliente já aplicado

━━━ COMO FUNCIONA ━━━
1. Cada registro define metadados que controlam exibição e pipeline:
     display_priority → ordem na galeria (10=main vai primeiro, 99=other vai por último)
     show_in_gallery  → FALSE para tipos internos (mockup, thumbnail) — não aparecem no front
     is_color_specific→ TRUE = imagem varia por cor; FALSE = é genérica (mesma para todas as cores)
     is_primary_candidate→ TRUE = pode ser is_primary=true em product_images

2. A coluna code é a chave funcional — é o que o pipeline, triggers e funções usam.
   O id UUID é usado como FK em product_images.image_type_id e supplier_image_suffix_mappings.image_type_id.

3. A tabela é relativamente estática. Novos tipos são raros e exigem:
   a) INSERT em image_types
   b) UPDATE do CHECK CONSTRAINT em product_images.image_type (alerta via trg_image_types_check_reminder)
   c) Atualizar fn_image_types_check_constraint_reminder com o novo code na lista

━━━ COM QUEM CONVIVE ━━━
  product_images              → image_type_id FK, image_type varchar (dual-column, sempre em sync)
  supplier_image_suffix_mappings → image_type_id FK (DE-PARA: sufixo do supplier → tipo interno)
  vw_image_type_coherence     → monitor de divergência entre os dois campos
  vw_image_type_dropblockers  → lista tudo que bloqueia DROP COLUMN de image_type
  fn_auto_classify_product_image → hardcoda os UUIDs desta tabela no código
  fn_sync_image_type_code     → consulta esta tabela para sincronizar os dois campos

━━━ COMO RECUPERAR QUANDO TRAVA ━━━
  -- Checar divergências entre image_type varchar e image_type_id FK:
  SELECT * FROM vw_image_type_coherence;

  -- Reconstruir sincronização manual de toda a tabela product_images:
  UPDATE product_images pi
  SET image_type = it.code
  FROM image_types it WHERE it.id = pi.image_type_id
  AND pi.image_type != it.code;

  -- Ver quem usa este vocabulary além do DB:
  SELECT * FROM vw_image_type_dropblockers;

━━━ O QUE FOI CORRIGIDO ━━━
  2026-06-17: Adicionado trigger trg_image_types_check_reminder (AFTER INSERT/UPDATE OF code)
  → emite RAISE WARNING quando novo tipo é inserido mas não está no CHECK CONSTRAINT
  de product_images.image_type — previne silenciosamente a divergência CHECK vs FK.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.mv_product_images_audit, public.v_media_statistics, public.v_media_stats, public.v_product_images_cdn, public.v_product_images_quality_gap, public.vw_image_type_coherence, public.vw_media_stats_by_type |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  | PK UUID gerada automaticamente. ATENÇÃO: este UUID é hardcodado em fn_auto_classify_product_image — não altere registros existentes sem atualizar a função. Exemplos críticos:   gallery → 1590e144-e3f8-41e6-98f9-f4a25bae496d  (DEFAULT de product_images.image_type_id)   main    → 7ea182ff-edcc-4c4c-b7a1-443b07500f6c   other   → 953d054a-3bbc-4954-a319-b3c806ac596f  (fallback quando nenhum padrão casa) |
| 2 | `code` | `character varying(30)` | não |  |  | Código único interno do tipo de imagem — chave funcional usada pelo pipeline e triggers. É o valor que aparece em product_images.image_type (varchar). Os dois campos formam o "dual-column pattern": image_type = code, image_type_id = id.  VALORES ATIVOS (jun/2026):   main           → imagem principal/capa do produto na cor selecionada   gallery        → vista alternativa (ângulos extras, d2..d9 na XBZ)   set            → foto mostrando TODAS as cores disponíveis juntas   product        → foto de uma cor específica (usado por SPOT/ASIA)   ambient        → produto em contexto de uso real (lifestyle)   detail         → close-up / detalhe de material ou gravação   logo           → produto COM logotipo do cliente já aplicado   component      → peça isolada do produto (ex: tampa, alça)   location       → foto indicando ONDE no produto vai a gravação   area           → diagrama técnico da área de gravação com dimensões (mm)   box            → caixa / embalagem comercial do produto   pouch          → estojo ou bolsa protetora que acompanha o produto   bag            → sacola que acompanha o produto   mockup         → mockup gerado digitalmente (interno, show_in_gallery=false)   thumbnail      → miniatura (interno, show_in_gallery=false)   vitrine_pessoa → mockup lifestyle com modelo/pessoa usando o produto   vitrine_ambiente→ mockup do produto em ambiente decorado   other          → não classificado (fallback — indica problema no pipeline)  ATENÇÃO: adicionar novo code aqui REQUER atualizar também:   1. CHECK CONSTRAINT chk_product_images_image_type em product_images   2. Lista em fn_image_types_check_constraint_reminder (o trigger vai avisar!)   3. Hardcodes em fn_auto_classify_product_image  UUID de gallery = '1590e144-e3f8-41e6-98f9-f4a25bae496d' (DEFAULT de product_images.image_type_id). UUID de other   = '953d054a-3bbc-4954-a319-b3c806ac596f' (fallback de classificação). |
| 3 | `name` | `character varying(100)` | não |  |  | Nome do tipo em PT-BR para exibição na interface de administração. Ex: "Imagem Principal", "Vista Alternativa", "Todas as Cores". Deve ser claro para operadores e clientes brasileiros. |
| 4 | `name_en` | `character varying(100)` | sim |  |  | Nome do tipo em EN para documentação e APIs internacionais. Ex: "Main Image", "Alternative View", "All Colors Set". Usado em endpoints que servem parceiros ou integrações externas. |
| 5 | `description` | `text` | sim |  |  | Descrição funcional em PT-BR explicando QUANDO e POR QUE usar este tipo. Destinada a devs e operadores que precisam classificar imagens manualmente. Ex: "Foto principal/frontal do produto na cor específica selecionada". |
| 6 | `description_en` | `text` | sim |  |  | Descrição funcional em EN. Mesma semântica que description, para APIs e documentação externa. |
| 7 | `category` | `character varying(30)` | não | `'product'::character varying` |  | Categoria: product (fotos do produto), packaging (embalagem), personalization (áreas de gravação), marketing (lifestyle/ambiente), internal (uso interno) |
| 8 | `subcategory` | `character varying(30)` | sim |  |  | Subcategoria opcional para agrupamento mais fino dentro de category. Ex: category=personalization → subcategory=technical (para location, area)     category=marketing      → subcategory=lifestyle (para ambient, vitrine_ambiente) Não utilizado na lógica de pipeline — apenas para organização visual no admin. |
| 9 | `is_color_specific` | `boolean` | sim | `true` |  | Se TRUE, a imagem tipicamente varia por cor. Se FALSE, é genérica (ex: imagem de todas as cores juntas) |
| 10 | `is_primary_candidate` | `boolean` | sim | `false` |  | Se TRUE, pode ser usada como imagem principal do produto no catálogo |
| 11 | `requires_variant` | `boolean` | sim | `false` |  | Se TRUE, a imagem DEVE ter um product_variants linkado (variant_id NOT NULL em product_images). Usado para tipos que só fazem sentido no contexto de uma variante específica. Hoje nenhum tipo ativo tem este flag — reservado para uso futuro em tipos de mockup por variante. |
| 12 | `show_in_gallery` | `boolean` | sim | `true` |  | Se TRUE, imagens deste tipo aparecem na galeria pública do produto no frontend. FALSE para tipos internos ou de pipeline que não devem ser exibidos ao cliente:   mockup    → gerado internamente, não mostrar ao cliente   thumbnail → versão reduzida, o app usa a URL CF diretamente   other     → não classificado, não exibir até classificar corretamente Verificado pela fn_get_product_gallery e pela view v_product_images_cdn. |
| 13 | `show_in_simulator` | `boolean` | sim | `false` |  | Se TRUE, aparece no simulador de personalização (ex: componentes, localizações) |
| 14 | `is_internal_only` | `boolean` | sim | `false` |  | Se TRUE, tipo visível apenas no painel de administração — nunca enviado para o frontend público. Diferença de show_in_gallery: is_internal_only oculta até do painel de cliente; show_in_gallery=FALSE ainda pode aparecer em contextos admin. |
| 15 | `display_priority` | `smallint` | sim | `50` |  | Ordem de exibição na galeria: menor número aparece primeiro. Usado por ORDER BY it.display_priority nas RPCs get_product_gallery, get_all_product_images. Escala de referência:    5 → product   (foto de cor específica — mais relevante)   10 → main      (imagem principal — capa)   12 → vitrine_pessoa   13 → vitrine_ambiente   15 → set       (todas as cores juntas)   20 → gallery   (ângulos extras — padrão)   25 → ambient   (lifestyle)   30 → logo      (com logotipo)   35 → detail    (close-up)   40 → box/pouch/bag (embalagens)   50 → component/location/area (personalização)   60 → mockup    (gerado)   70 → thumbnail (interno)   99 → other     (não classificado — sempre por último) |
| 16 | `gallery_order` | `smallint` | sim |  |  | Ordem de exibição dentro da galeria quando múltiplas imagens do mesmo tipo existem. Complementa display_priority (que ordena entre tipos) com ordenação interna por tipo. Usado por ORDER BY COALESCE(it.gallery_order, 99) em get_product_gallery. NULL = usar display_order da product_images como desempate. |
| 17 | `icon` | `character varying(50)` | sim |  |  | Nome do ícone (Lucide Icons) para representar o tipo na UI de administração. Ex: "Image", "Images", "Box", "Tag", "Layers". Não afeta nenhuma lógica de negócio — puramente visual. |
| 18 | `ui_color` | `character varying(20)` | sim |  |  | Cor hex ou nome CSS para o badge/pill deste tipo no painel admin. Ex: "#3B82F6" para azul, "#10B981" para verde. Não afeta nenhuma lógica de negócio — puramente visual. |
| 19 | `is_active` | `boolean` | sim | `true` |  | Soft-delete do tipo. FALSE → tipo não deve mais ser usado em novos registros de product_images. ATENÇÃO: registros existentes em product_images com este image_type_id NÃO são alterados automaticamente. Use a query abaixo para auditar impacto antes de desativar:   SELECT COUNT(*), source_supplier FROM product_images   WHERE image_type_id = '<UUID>' AND is_active = true GROUP BY source_supplier; |
| 20 | `created_at` | `timestamp with time zone` | sim | `now()` |  | Timestamp de criação do tipo (DEFAULT now()). Imutável após inserção. |
| 21 | `updated_at` | `timestamp with time zone` | sim | `now()` |  | Timestamp da última atualização. Mantido automaticamente por trg_image_types_updated_at. Útil para detectar quando metadados do tipo foram alterados (ex: display_priority mudou). |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_image_types_category | CHECK | `CHECK (category::text = ANY (ARRAY['product'::character varying, 'packaging'::character varying, 'personalization'::character varying, 'marketing'::character varying, 'internal'::character varying, 'other'::character varying]::text[]))` |  |  | sim |
| chk_image_types_priority | CHECK | `CHECK (display_priority >= 1 AND display_priority <= 100)` |  |  | sim |
| image_types_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| uq_image_types_code | UNIQUE | `UNIQUE (code)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.product_images | fk_product_images_image_type | image_type_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| image_types_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX image_types_pkey ON public.image_types USING btree (id)` |
| uq_image_types_code | btree | code | sim | sim |  | `CREATE UNIQUE INDEX uq_image_types_code ON public.image_types USING btree (code)` |


## Policies (RLS)

### `auth_read_image_types`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_image_types_check_reminder | AFTER | INSERT OR UPDATE | ROW | enabled | public.fn_image_types_check_constraint_reminder |
| trg_image_types_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_timestamp_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
