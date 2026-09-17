-- Substitui a versão mínima criada horas antes nesta mesma investigação
-- (que só continha CREATE SCHEMA IF NOT EXISTS para os 5 schemas). Como
-- 20260512000000_bootstrap_missing_application_schemas.sql nunca chegou a
-- ser aplicada em lugar nenhum (foi criada e substituída na mesma sessão,
-- antes de qualquer merge), reescrever este arquivo não viola a regra de
-- "nunca editar migration já aplicada".
--
-- Ao rodar `supabase db diff --linked` pela primeira vez com verificação
-- live (E02 de docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md),
-- o replay em shadow database passou a travar um passo à frente do
-- CREATE SCHEMA: os OBJETOS dentro desses 5 schemas (tabelas, views,
-- materialized views, funções, sequences) também não têm nenhuma migration
-- que os crie — foram construídos inteiramente fora do fluxo de migrations
-- (dashboard/MCP/scripts pontuais), o mesmo padrão já confirmado em outras
-- migrations desta investigação, só que em escala maior.
--
-- Conteúdo abaixo: `supabase db dump --linked --schema analytics,
-- supplier_stricker,cf_recon,prod_audit,classification_audit` rodado
-- em 2026-09-16 contra o projeto canônico (doufsxqlfjyuvxuezpln) —
-- é o DDL real e completo desses 5 schemas hoje: 29 tabelas, 21 views/
-- materialized views, 20 funções, sequences, RLS, policies, grants,
-- constraints e índices. Não é reconstrução aproximada por introspecção
-- manual — é o `pg_dump --schema-only` oficial.
--
-- No banco vivo (onde tudo isso já existe) cada statement é no-op
-- garantido por `IF NOT EXISTS` / `CREATE OR REPLACE`. Em qualquer
-- ambiente novo (shadow database do `db diff`, setup local do zero)
-- passa a criar o que faltava. Única dependência externa a estes 5
-- schemas: FK de `supplier_stricker` para `public.categories`, criada
-- em 2025-01-02 — muito antes desta migration (2026-05-12), ordem segura.
--
-- Comentários nos próprios CREATE SCHEMA (preservados abaixo, vindos do
-- pg_dump) registram quando/por que cada schema nasceu: analytics em
-- "T20 do redeploy 2026-05"; cf_recon em "2026-06-16 durante auditoria
-- forense"; os demais sem data explícita no comentário do schema.




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "analytics";


ALTER SCHEMA "analytics" OWNER TO "postgres";


COMMENT ON SCHEMA "analytics" IS 'Materialized views internas/analíticas. Não exposto via PostgREST. Acesso via views wrapper em public ou via service_role. Criado em T20 do redeploy 2026-05.';



CREATE SCHEMA IF NOT EXISTS "cf_recon";


ALTER SCHEMA "cf_recon" OWNER TO "postgres";


COMMENT ON SCHEMA "cf_recon" IS 'Schema de reconciliação Cloudflare Images × DB. Criado 2026-06-16 durante auditoria forense.
Contém: cf_image (mirror CF), crawl_run (histórico de crawls), cf_ghost_check_queue (IDs suspeitos),
action_log (log imutável de decisões), remediation (plano de remediações), metric_snapshot (KPIs).';



CREATE SCHEMA IF NOT EXISTS "classification_audit";


ALTER SCHEMA "classification_audit" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "prod_audit";


ALTER SCHEMA "prod_audit" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "supplier_stricker";


ALTER SCHEMA "supplier_stricker" OWNER TO "postgres";


COMMENT ON SCHEMA "supplier_stricker" IS 'Dados brutos sincronizados da API Stricker (SPOT Gifts Brasil)';



CREATE OR REPLACE FUNCTION "classification_audit"."apply_high_confidence_suggestions"("p_dry_run" boolean DEFAULT true, "p_min_matches" integer DEFAULT 4) RETURNS TABLE("acao" "text", "product_id" "uuid", "produto" "text", "categoria" "text", "matches" integer, "score" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'classification_audit'
    AS $$
BEGIN
  IF NOT p_dry_run THEN
    INSERT INTO product_category_assignments (product_id, category_id, is_primary)
    SELECT s.product_id, s.category_id, false
    FROM classification_audit.category_suggestions s
    JOIN products p ON p.id = s.product_id AND p.is_active
    WHERE NOT s.already_assigned
      AND s.matches >= p_min_matches
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN QUERY
  SELECT 
    CASE WHEN p_dry_run THEN 'DRY-RUN'::text ELSE 'APLICADO'::text END,
    s.product_id,
    p.name,
    c.full_path_readable,
    s.matches,
    s.score
  FROM classification_audit.category_suggestions s
  JOIN products p ON p.id = s.product_id AND p.is_active
  JOIN categories c ON c.id = s.category_id
  WHERE NOT s.already_assigned
    AND s.matches >= p_min_matches
  ORDER BY s.score DESC;
END;
$$;


ALTER FUNCTION "classification_audit"."apply_high_confidence_suggestions"("p_dry_run" boolean, "p_min_matches" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "classification_audit"."has_material_conflict"("p_product_name" "text", "p_category_path" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public', 'extensions'
    AS $$
  WITH 
  prod_norm AS (SELECT lower(unaccent(p_product_name)) AS n),
  cat_norm AS (SELECT lower(unaccent(p_category_path)) AS p),
  -- Materiais mutuamente exclusivos
  conflicts AS (
    SELECT * FROM (VALUES
      ('aluminio',  ARRAY['plastico','vidro','couro','madeira','bambu']),
      ('inox',      ARRAY['plastico','couro','madeira','bambu','papel']),
      ('vidro',     ARRAY['plastico','couro','madeira','bambu','papel']),
      ('plastico',  ARRAY['vidro','aluminio','inox','couro','bambu']),
      ('couro',     ARRAY['plastico','vidro','aluminio','inox','papel']),
      ('madeira',   ARRAY['plastico','vidro','aluminio','inox','couro']),
      ('bambu',     ARRAY['plastico','vidro','aluminio','inox','couro']),
      ('nylon',     ARRAY['couro','vidro','metal','madeira']),
      ('poliester', ARRAY['couro','vidro','metal','madeira','bambu'])
    ) AS t(material, conflito_com)
  )
  SELECT EXISTS (
    SELECT 1 FROM conflicts c, prod_norm, cat_norm
    WHERE prod_norm.n LIKE '%' || c.material || '%'
      AND EXISTS (
        SELECT 1 FROM unnest(c.conflito_com) conf
        WHERE cat_norm.p LIKE '%' || conf || '%'
      )
      -- produto NÃO pode mencionar também o material conflitante
      AND NOT EXISTS (
        SELECT 1 FROM unnest(c.conflito_com) conf
        WHERE prod_norm.n LIKE '%' || conf || '%'
      )
  );
$$;


ALTER FUNCTION "classification_audit"."has_material_conflict"("p_product_name" "text", "p_category_path" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "classification_audit"."has_type_conflict"("p_product_name" "text", "p_category_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_prod_type text;
  v_cat_base text;
  v_types text[] := ARRAY[
    'mochila', 'bolsa', 'necessaire', 'squeeze', 'garrafa', 'copo', 'copos',
    'taca', 'tacas', 'caneta', 'canetas', 'caderno', 'caderneta', 'bloco',
    'mouse', 'desk', 'chapeu', 'camiseta', 'camisa', 'boné', 'mesa',
    'carteira', 'porta', 'tabua', 'kit', 'conj', 'nécessaire', 'abridor',
    'saca', 'rolhas', 'garrafa', 'cuia', 'agenda', 'lapis', 'pasta',
    'mochila', 'chaveiro', 'relogio', 'luminária', 'caixa', 'suporte',
    'mesa', 'fone', 'leitor', 'camera', 'mochila', 'tapete'
  ];
  v_type text;
BEGIN
  -- Detectar tipo primário do produto (primeiro tipo que aparece no início do nome)
  FOREACH v_type IN ARRAY v_types LOOP
    IF lower(unaccent(p_product_name)) ~ ('^[^a-z]*' || v_type || '[^a-z]') THEN
      v_prod_type := v_type;
      EXIT;
    END IF;
  END LOOP;
  
  -- Se detectou tipo do produto, verificar se categoria menciona esse tipo
  IF v_prod_type IS NOT NULL THEN
    -- Permitir singular/plural
    RETURN NOT (
      lower(unaccent(p_category_name)) LIKE '%' || v_prod_type || '%'
      OR lower(unaccent(p_category_name)) LIKE '%' || v_prod_type || 's%'
      OR (v_prod_type LIKE '%s' AND lower(unaccent(p_category_name)) LIKE '%' || rtrim(v_prod_type,'s') || '%')
    );
  END IF;
  
  RETURN false;
END;
$$;


ALTER FUNCTION "classification_audit"."has_type_conflict"("p_product_name" "text", "p_category_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "classification_audit"."matches_category_prefix"("p_product_name" "text", "p_category_name" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public', 'extensions'
    AS $$
  WITH norm AS (
    SELECT 
      -- Normaliza ambos: lowercase, sem acento, sem pontuação, sem |
      regexp_replace(lower(unaccent(p_product_name)), '[^a-z0-9 ]', ' ', 'g') AS prod,
      regexp_replace(lower(unaccent(p_category_name)), '[|,\.\-]', ' ', 'g') AS cat
  )
  SELECT 
    -- Categoria começa com mesmos N tokens que produto, ou é substring próxima do início
    EXISTS (
      SELECT 1 FROM norm
      WHERE prod LIKE regexp_replace(cat, '\s+', ' ', 'g') || '%'
         OR prod LIKE '%' || regexp_replace(cat, '\s+', ' ', 'g') || '%'
    )
  FROM norm;
$$;


ALTER FUNCTION "classification_audit"."matches_category_prefix"("p_product_name" "text", "p_category_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "classification_audit"."validate_match_phrase"("p_product_name" "text", "p_tokens" "text") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_name text := lower(unaccent(p_product_name));
  v_tokens text[] := regexp_split_to_array(p_tokens, ',\s*');
  v_tk text;
  v_all_present boolean := true;
BEGIN
  -- TODOS os tokens devem aparecer como palavra inteira (não substring)
  FOREACH v_tk IN ARRAY v_tokens LOOP
    IF v_name !~ ('\m' || trim(v_tk) || '\M') THEN
      v_all_present := false;
      EXIT;
    END IF;
  END LOOP;
  
  RETURN v_all_present;
END;
$$;


ALTER FUNCTION "classification_audit"."validate_match_phrase"("p_product_name" "text", "p_tokens" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "prod_audit"."assert"("p_batch" "text", "p_test" "text", "p_cat" "text", "p_sev" "text", "p_cond" boolean, "p_expected" "text" DEFAULT NULL::"text", "p_actual" "text" DEFAULT NULL::"text", "p_details" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'prod_audit', 'public'
    AS $$
BEGIN
  INSERT INTO prod_audit.test_results(batch, test_name, category, severity, result, expected, actual, details)
  VALUES (p_batch, p_test, p_cat, p_sev, 
    CASE WHEN p_cond THEN 'pass' ELSE 'fail' END,
    p_expected, p_actual, p_details);
END $$;


ALTER FUNCTION "prod_audit"."assert"("p_batch" "text", "p_test" "text", "p_cat" "text", "p_sev" "text", "p_cond" boolean, "p_expected" "text", "p_actual" "text", "p_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "prod_audit"."classification_gap_report"() RETURNS TABLE("regra" "text", "descricao" "text", "categoria_alvo_pattern" "text", "produtos_que_batem" integer, "ja_classificados" integer, "faltando_classificar" integer, "pct_gap" numeric)
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'prod_audit', 'public'
    AS $_$
DECLARE r record; v_sql text; v_result record;
BEGIN
  FOR r IN SELECT * FROM prod_audit.classification_rules WHERE active ORDER BY id LOOP
    v_sql := format($Q$
      WITH match_prods AS (
        SELECT pf.product_id, pf.current_categories
        FROM prod_audit.product_features pf
        JOIN products p ON p.id = pf.product_id
        WHERE (%s)
      ),
      target_cats AS (
        SELECT id FROM categories 
        WHERE is_active 
          AND (name ILIKE '%%' || %L || '%%'
               OR full_path_readable ILIKE '%%' || %L || '%%')
      ),
      assess AS (
        SELECT COUNT(*) AS total,
          COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM unnest(mp.current_categories) AS cc WHERE cc IN (SELECT id FROM target_cats)
          )) AS com_target,
          COUNT(*) FILTER (WHERE NOT EXISTS (
            SELECT 1 FROM unnest(mp.current_categories) AS cc WHERE cc IN (SELECT id FROM target_cats)
          )) AS sem_target
        FROM match_prods mp
      )
      SELECT total, com_target, sem_target FROM assess;
    $Q$, r.product_condition, r.target_category_name_like, r.target_category_name_like);

    EXECUTE v_sql INTO v_result;
    regra := r.rule_name;
    descricao := r.description;
    categoria_alvo_pattern := r.target_category_name_like;
    produtos_que_batem := COALESCE(v_result.total, 0);
    ja_classificados := COALESCE(v_result.com_target, 0);
    faltando_classificar := COALESCE(v_result.sem_target, 0);
    pct_gap := CASE WHEN COALESCE(v_result.total, 0) = 0 THEN 0
                ELSE ROUND(100.0 * v_result.sem_target / v_result.total, 1) END;
    RETURN NEXT;
  END LOOP;
END;
$_$;


ALTER FUNCTION "prod_audit"."classification_gap_report"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "prod_audit"."generate_category_suggestions"() RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'prod_audit', 'public'
    AS $$
DECLARE v_inserted int;
BEGIN
  TRUNCATE prod_audit.category_suggestions RESTART IDENTITY;

  -- REGRA 1: "caneca" → categoria CANECAS (mais específica por material se possível)
  WITH cand AS (
    SELECT 
      pf.product_id, pf.name AS product_name, pf.sku, pf.name_normalized,
      pf.current_categories, pf.materials,
      -- Escolher subcategoria por material se disponível
      COALESCE(
        (SELECT c.id FROM categories c 
         WHERE c.is_active AND c.level >= 3
           AND c.full_path_readable ILIKE '%CANECAS%'
           AND EXISTS (SELECT 1 FROM unnest(pf.materials) m 
                       WHERE c.name ILIKE '%' || m || '%')
         ORDER BY c.level DESC LIMIT 1),
        -- Fallback: escolher pai "CANECAS" genérico
        (SELECT c.id FROM categories c 
         WHERE c.is_active AND c.level = 2 
           AND c.full_path_readable ILIKE 'BAR%CANECAS' LIMIT 1)
      ) AS sug_cat_id
    FROM prod_audit.product_features pf
    WHERE pf.name_normalized ~ '\ycaneca\y'
      AND NOT EXISTS (
        SELECT 1 FROM unnest(pf.current_categories) cc
        JOIN categories cat ON cat.id = cc 
        WHERE cat.full_path_readable ILIKE '%CANECAS%'
      )
  )
  INSERT INTO prod_audit.category_suggestions
    (product_id, product_name, product_sku, rule_name, 
     suggested_category_id, suggested_category_path, current_categories, confidence, reason)
  SELECT 
    cand.product_id, cand.product_name, cand.sku,
    'caneca_base',
    cand.sug_cat_id,
    c.full_path_readable,
    ARRAY(SELECT cat.full_path_readable FROM unnest(cand.current_categories) cc
          JOIN categories cat ON cat.id = cc),
    'high',
    'Nome contém "caneca" mas está em COPOS — deveria estar em CANECAS'
  FROM cand 
  JOIN categories c ON c.id = cand.sug_cat_id
  ON CONFLICT (product_id, suggested_category_id, rule_name) DO NOTHING;

  -- REGRA 2: eco_keyword mas sem ECOLOGIA
  WITH cand AS (
    SELECT pf.product_id, pf.name AS product_name, pf.sku, pf.current_categories
    FROM prod_audit.product_features pf
    WHERE pf.has_eco_keyword = true
      AND NOT EXISTS (
        SELECT 1 FROM unnest(pf.current_categories) cc
        JOIN categories cat ON cat.id = cc 
        WHERE cat.name ILIKE '%ecolog%' OR cat.full_path_readable ILIKE '%ECOLOG%'
      )
  )
  INSERT INTO prod_audit.category_suggestions
    (product_id, product_name, product_sku, rule_name,
     suggested_category_id, suggested_category_path, current_categories, confidence, reason)
  SELECT 
    cand.product_id, cand.product_name, cand.sku,
    'eco_keyword',
    c.id, c.full_path_readable,
    ARRAY(SELECT cat.full_path_readable FROM unnest(cand.current_categories) cc
          JOIN categories cat ON cat.id = cc),
    'high',
    'Nome contém "eco/reciclado/sustentável/bambu/cortiça" — deve estar em ECOLOGIA'
  FROM cand
  CROSS JOIN LATERAL (
    SELECT id, full_path_readable FROM categories 
    WHERE is_active AND level = 1 AND name ILIKE 'Ecologia%' LIMIT 1
  ) c
  ON CONFLICT (product_id, suggested_category_id, rule_name) DO NOTHING;

  -- REGRA 3: is_thermal=true sem "Térmic" em nenhuma categoria
  WITH cand AS (
    SELECT pf.product_id, pf.name, pf.sku, pf.current_categories
    FROM prod_audit.product_features pf
    JOIN products p ON p.id = pf.product_id
    WHERE p.is_thermal = true
      AND NOT EXISTS (
        SELECT 1 FROM unnest(pf.current_categories) cc
        JOIN categories cat ON cat.id = cc 
        WHERE cat.full_path_readable ILIKE '%TÉRMIC%'
      )
  )
  INSERT INTO prod_audit.category_suggestions
    (product_id, product_name, product_sku, rule_name,
     suggested_category_id, suggested_category_path, current_categories, confidence, reason)
  SELECT 
    cand.product_id, cand.name, cand.sku,
    'termico_produto', c.id, c.full_path_readable,
    ARRAY(SELECT cat.full_path_readable FROM unnest(cand.current_categories) cc
          JOIN categories cat ON cat.id = cc),
    'medium',
    'Produto marcado is_thermal=true mas não está em categoria Térmica'
  FROM cand
  CROSS JOIN LATERAL (
    SELECT id, full_path_readable FROM categories
    WHERE is_active AND full_path_readable ILIKE '%TÉRMIC%'
    ORDER BY level DESC LIMIT 1
  ) c
  ON CONFLICT (product_id, suggested_category_id, rule_name) DO NOTHING;

  -- REGRA 4: "churrasco" no nome sem categoria KIT CHURRASCO
  WITH cand AS (
    SELECT pf.product_id, pf.name, pf.sku, pf.current_categories
    FROM prod_audit.product_features pf
    WHERE pf.name_normalized ~ '\ychurrasco\y'
      AND NOT EXISTS (
        SELECT 1 FROM unnest(pf.current_categories) cc
        JOIN categories cat ON cat.id = cc 
        WHERE cat.full_path_readable ILIKE '%CHURRASCO%'
      )
  )
  INSERT INTO prod_audit.category_suggestions
    (product_id, product_name, product_sku, rule_name,
     suggested_category_id, suggested_category_path, current_categories, confidence, reason)
  SELECT 
    cand.product_id, cand.name, cand.sku,
    'kit_churrasco', c.id, c.full_path_readable,
    ARRAY(SELECT cat.full_path_readable FROM unnest(cand.current_categories) cc
          JOIN categories cat ON cat.id = cc),
    'high',
    'Nome contém "churrasco" mas não está em Kit Churrasco'
  FROM cand
  CROSS JOIN LATERAL (
    SELECT id, full_path_readable FROM categories
    WHERE is_active AND name ILIKE 'Kit Churrasco%' AND level = 3 LIMIT 1
  ) c
  ON CONFLICT (product_id, suggested_category_id, rule_name) DO NOTHING;

  SELECT COUNT(*) INTO v_inserted FROM prod_audit.category_suggestions;
  RETURN v_inserted;
END;
$$;


ALTER FUNCTION "prod_audit"."generate_category_suggestions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "prod_audit"."quick_regression_check"() RETURNS TABLE("bateria" "text", "total_testes_anteriores" integer, "ultima_execucao" timestamp with time zone, "pass_rate_anterior" "text", "categoria_destaque" "text")
    LANGUAGE "sql"
    SET "search_path" TO 'prod_audit', 'public'
    AS $$
  WITH stats AS (
    SELECT 
      batch,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE result='pass') AS passed,
      MAX(executed_at) AS last_run,
      MODE() WITHIN GROUP (ORDER BY category) AS top_category
    FROM prod_audit.test_results
    GROUP BY batch
  )
  SELECT 
    batch,
    total,
    last_run,
    ROUND(100.0 * passed / NULLIF(total,0), 1)::text || '%',
    top_category
  FROM stats
  ORDER BY batch;
$$;


ALTER FUNCTION "prod_audit"."quick_regression_check"() OWNER TO "postgres";


COMMENT ON FUNCTION "prod_audit"."quick_regression_check"() IS 'Mostra estado atual de todas as baterias da auditoria pré-produção persistidas.';



CREATE OR REPLACE FUNCTION "prod_audit"."recent_failures"("p_hours" integer DEFAULT 24) RETURNS TABLE("batch" "text", "test_name" "text", "severity" "text", "actual" "text", "occurred_at" timestamp with time zone)
    LANGUAGE "sql"
    SET "search_path" TO 'prod_audit', 'public'
    AS $$
  SELECT batch, test_name, severity, actual, executed_at
  FROM prod_audit.test_results
  WHERE result = 'fail' AND executed_at > now() - (p_hours || ' hours')::interval
  ORDER BY severity, executed_at DESC;
$$;


ALTER FUNCTION "prod_audit"."recent_failures"("p_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "prod_audit"."score_product_category"("p_product_id" "uuid", "p_category_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'prod_audit', 'public', 'extensions'
    AS $$
DECLARE
  v_pf record; v_ck record;
  v_matched int := 0; v_cat_total int; v_score numeric := 0;
  v_tok text;
BEGIN
  SELECT * INTO v_pf FROM prod_audit.product_features WHERE product_id = p_product_id;
  SELECT * INTO v_ck FROM prod_audit.category_keywords WHERE category_id = p_category_id;
  IF v_pf IS NULL OR v_ck IS NULL THEN RETURN 0; END IF;

  v_cat_total := COALESCE(array_length(v_ck.tokens, 1), 0);
  
  -- Match: iterar tokens da categoria e verificar se cada um aparece no produto
  FOREACH v_tok IN ARRAY v_ck.tokens LOOP
    IF v_tok = ANY(v_pf.tokens) 
       OR v_pf.name_normalized ILIKE '%' || v_tok || '%' THEN
      v_matched := v_matched + 1;
    END IF;
  END LOOP;

  IF v_ck.is_client_segment THEN RETURN 0; END IF;
  IF v_matched = 0 AND NOT v_ck.is_kit_segment THEN RETURN 0; END IF;

  v_score := (v_matched::numeric / GREATEST(v_cat_total, 1)) * 40;

  IF v_matched > 0 AND v_ck.is_material_segment AND EXISTS (
    SELECT 1 FROM unnest(v_pf.materials) AS pm
    WHERE v_ck.name_normalized ILIKE '%' || pm || '%' OR pm = ANY(v_ck.tokens)
  ) THEN v_score := v_score + 25; END IF;

  IF v_matched > 0 AND v_ck.is_eco_segment THEN
    IF v_pf.has_eco_keyword THEN v_score := v_score + 20;
    ELSIF EXISTS (
      SELECT 1 FROM unnest(v_pf.materials) AS pm
      WHERE pm ~* 'bambu|cortica|cortiça|reciclad|rpet|organico|orgânico'
    ) THEN v_score := v_score + 15; END IF;
  END IF;

  IF v_ck.is_kit_segment AND v_pf.has_kit_keyword THEN
    v_score := v_score + CASE WHEN v_matched > 0 THEN 20 ELSE 10 END;
  END IF;

  v_score := v_score + GREATEST(0, extensions.similarity(v_pf.name_normalized, v_ck.name_normalized) * 10);

  RETURN v_score;
END;
$$;


ALTER FUNCTION "prod_audit"."score_product_category"("p_product_id" "uuid", "p_category_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "supplier_stricker"."calculate_price"("p_sku" character varying, "p_quantity" integer) RETURNS numeric
    LANGUAGE "plpgsql"
    SET "search_path" TO 'supplier_stricker', 'public'
    AS $$
DECLARE
    v_price DECIMAL(10,2);
BEGIN
    SELECT 
        CASE 
            WHEN p_quantity >= min_qty_5 AND price_5 IS NOT NULL THEN price_5
            WHEN p_quantity >= min_qty_4 AND price_4 IS NOT NULL THEN price_4
            WHEN p_quantity >= min_qty_3 AND price_3 IS NOT NULL THEN price_3
            WHEN p_quantity >= min_qty_2 AND price_2 IS NOT NULL THEN price_2
            ELSE price_1
        END
    INTO v_price
    FROM supplier_stricker.optionals
    WHERE sku = p_sku;
    
    RETURN v_price;
END;
$$;


ALTER FUNCTION "supplier_stricker"."calculate_price"("p_sku" character varying, "p_quantity" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "supplier_stricker"."calculate_price"("p_sku" character varying, "p_quantity" integer) IS 'Retorna preço unitário baseado na faixa de quantidade';



CREATE OR REPLACE FUNCTION "supplier_stricker"."check_stock_availability"("p_sku" character varying, "p_quantity" integer) RETURNS TABLE("is_available" boolean, "current_stock" integer, "next_restock_date" "date", "next_restock_qty" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'supplier_stricker', 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.stock_quantity >= p_quantity,
        s.stock_quantity,
        s.next_date_1,
        s.next_quantity_1
    FROM supplier_stricker.stocks s
    WHERE s.sku = p_sku;
END;
$$;


ALTER FUNCTION "supplier_stricker"."check_stock_availability"("p_sku" character varying, "p_quantity" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "supplier_stricker"."check_stock_availability"("p_sku" character varying, "p_quantity" integer) IS 'Verifica disponibilidade de estoque e próxima reposição';



CREATE OR REPLACE FUNCTION "supplier_stricker"."get_product_techniques"("p_prod_reference" character varying) RETURNS TABLE("technique_code" character varying, "technique_name" character varying, "locations_count" bigint, "min_area_cm2" numeric, "max_area_cm2" numeric)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'supplier_stricker', 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        co.technique_code,
        co.technique_name,
        COUNT(DISTINCT co.location_code) as locations_count,
        MIN(co.area_width_cm * co.area_height_cm) as min_area_cm2,
        MAX(co.area_width_cm * co.area_height_cm) as max_area_cm2
    FROM supplier_stricker.customization_options co
    WHERE co.prod_reference = p_prod_reference
      AND co.is_active = true
    GROUP BY co.technique_code, co.technique_name;
END;
$$;


ALTER FUNCTION "supplier_stricker"."get_product_techniques"("p_prod_reference" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "supplier_stricker"."get_product_techniques"("p_prod_reference" character varying) IS 'Lista técnicas de gravação disponíveis para um produto';



CREATE OR REPLACE FUNCTION "supplier_stricker"."update_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'supplier_stricker', 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "supplier_stricker"."update_timestamp"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE MATERIALIZED VIEW "analytics"."categories_tree_visual" AS
 WITH RECURSIVE "tree" AS (
         SELECT "categories"."id",
            "categories"."bitrix_id",
            "categories"."name",
            "categories"."level",
            "categories"."parent_id",
            "categories"."name" AS "tree_structure",
            ARRAY[COALESCE("categories"."display_order", 0)] AS "sort_path"
           FROM "public"."categories"
          WHERE ("categories"."parent_id" IS NULL)
        UNION ALL
         SELECT "c"."id",
            "c"."bitrix_id",
            "c"."name",
            "c"."level",
            "c"."parent_id",
            ((("tree_1"."tree_structure" || '
'::"text") ||
                CASE
                    WHEN ("c"."level" = 2) THEN '├── '::"text"
                    WHEN ("c"."level" = 3) THEN '│   ├── '::"text"
                    WHEN ("c"."level" = 4) THEN '│   │   ├── '::"text"
                    ELSE NULL::"text"
                END) || "c"."name"),
            ("tree_1"."sort_path" || COALESCE("c"."display_order", 0))
           FROM ("public"."categories" "c"
             JOIN "tree" "tree_1" ON (("c"."parent_id" = "tree_1"."id")))
        )
 SELECT "id",
    "bitrix_id",
    "name",
    "level",
    "parent_id",
    "tree_structure",
    "sort_path"
   FROM "tree"
  ORDER BY "sort_path"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "analytics"."categories_tree_visual" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "analytics"."mv_material_group_stats" AS
 SELECT "mg"."id" AS "group_id",
    "mg"."organization_id",
    "mg"."name" AS "group_name",
    "mg"."slug" AS "group_slug",
    "count"(DISTINCT "mt"."id") AS "total_materials",
    "count"(DISTINCT
        CASE
            WHEN "mt"."is_active" THEN "mt"."id"
            ELSE NULL::"uuid"
        END) AS "active_materials",
    "count"(DISTINCT "pm"."product_id") AS "products_using"
   FROM (("public"."material_groups" "mg"
     LEFT JOIN "public"."material_types" "mt" ON (("mt"."group_id" = "mg"."id")))
     LEFT JOIN "public"."product_materials" "pm" ON (("pm"."material_id" = "mt"."id")))
  GROUP BY "mg"."id", "mg"."organization_id", "mg"."name", "mg"."slug"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "analytics"."mv_material_group_stats" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "analytics"."mv_media_health" AS
 SELECT "s"."code" AS "source_supplier",
    "count"(DISTINCT "p"."id") AS "total_produtos",
    "count"(DISTINCT
        CASE
            WHEN ("pi_main"."id" IS NOT NULL) THEN "p"."id"
            ELSE NULL::"uuid"
        END) AS "com_img_principal",
    "count"(DISTINCT
        CASE
            WHEN ("pi_any"."id" IS NOT NULL) THEN "p"."id"
            ELSE NULL::"uuid"
        END) AS "com_qualquer_img",
    "round"(((("count"(DISTINCT
        CASE
            WHEN ("pi_main"."id" IS NOT NULL) THEN "p"."id"
            ELSE NULL::"uuid"
        END))::numeric / (NULLIF("count"(DISTINCT "p"."id"), 0))::numeric) * (100)::numeric), 1) AS "pct_cobertura_principal",
    "round"(((("count"(DISTINCT
        CASE
            WHEN ("pi_any"."id" IS NOT NULL) THEN "p"."id"
            ELSE NULL::"uuid"
        END))::numeric / (NULLIF("count"(DISTINCT "p"."id"), 0))::numeric) * (100)::numeric), 1) AS "pct_cobertura_qualquer",
    ( SELECT "count"(*) AS "count"
           FROM "public"."product_images"
          WHERE ((("product_images"."source_supplier")::"text" = "s"."code") AND ("product_images"."is_active" = true))) AS "total_imagens",
    ( SELECT "count"(*) AS "count"
           FROM "public"."product_images"
          WHERE ((("product_images"."source_supplier")::"text" = "s"."code") AND ("product_images"."variant_id" IS NOT NULL))) AS "imagens_vinculadas",
    ( SELECT "count"(*) AS "count"
           FROM "public"."product_images"
          WHERE ((("product_images"."source_supplier")::"text" = "s"."code") AND ("product_images"."alt_text" IS NOT NULL) AND ("product_images"."alt_text" <> ''::"text"))) AS "imagens_com_seo"
   FROM ((("public"."products" "p"
     JOIN "public"."suppliers" "s" ON (("p"."supplier_id" = "s"."id")))
     LEFT JOIN "public"."product_images" "pi_main" ON ((("p"."id" = "pi_main"."product_id") AND ("pi_main"."is_primary" = true) AND ("pi_main"."is_active" = true))))
     LEFT JOIN "public"."product_images" "pi_any" ON ((("p"."id" = "pi_any"."product_id") AND ("pi_any"."is_active" = true))))
  WHERE ("p"."is_active" = true)
  GROUP BY "s"."code"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "analytics"."mv_media_health" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "analytics"."mv_product_cards" AS
 SELECT "p"."id",
    "p"."name",
    "p"."slug",
    "p"."sku",
    "p"."short_description",
    "p"."sale_price",
    "p"."is_active",
    "p"."is_new",
    "p"."is_featured",
    "p"."is_stockout",
    "p"."category_id",
    "p"."main_category_id",
    "p"."colors",
    "p"."product_type",
    "p"."supplier_id",
    "p"."primary_image_url",
    "pi"."url_cdn" AS "primary_image_cdn",
    "count"(DISTINCT "pv"."id") FILTER (WHERE ("pv"."is_active" = true)) AS "variant_count",
    "sum"("pv"."stock_quantity") FILTER (WHERE ("pv"."is_active" = true)) AS "total_stock",
    "min"("pv"."next_date_1") FILTER (WHERE (("pv"."is_active" = true) AND ("pv"."next_date_1" IS NOT NULL) AND ("pv"."next_date_1" > CURRENT_DATE))) AS "earliest_restock_date",
    "sum"("pv"."next_quantity_1") FILTER (WHERE (("pv"."is_active" = true) AND ("pv"."next_date_1" IS NOT NULL) AND ("pv"."next_date_1" > CURRENT_DATE))) AS "earliest_restock_qty",
    "bool_or"((("pv"."is_active" = true) AND ("pv"."next_date_1" IS NOT NULL) AND ("pv"."next_date_1" > CURRENT_DATE))) AS "has_upcoming_restock"
   FROM (("public"."products" "p"
     LEFT JOIN "public"."product_images" "pi" ON ((("pi"."product_id" = "p"."id") AND ("pi"."is_primary" = true))))
     LEFT JOIN "public"."product_variants" "pv" ON (("pv"."product_id" = "p"."id")))
  WHERE ("p"."is_active" = true)
  GROUP BY "p"."id", "p"."name", "p"."slug", "p"."sku", "p"."short_description", "p"."sale_price", "p"."is_active", "p"."is_new", "p"."is_featured", "p"."is_stockout", "p"."category_id", "p"."main_category_id", "p"."colors", "p"."product_type", "p"."supplier_id", "p"."primary_image_url", "pi"."url_cdn"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "analytics"."mv_product_cards" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "analytics"."mv_product_compositions" AS
 SELECT "p"."id" AS "product_id",
    "p"."organization_id",
    "p"."name" AS "product_name",
    "count"(DISTINCT "pm"."material_id") AS "total_materials",
    "sum"("pm"."percentage") AS "total_percentage",
    "array_agg"("json_build_object"('material_id', "mt"."id", 'material_name', "mt"."name", 'group_name', "mg"."name", 'part', "pm"."part", 'percentage', "pm"."percentage") ORDER BY "pm"."sort_order") AS "materials_detail"
   FROM ((("public"."products" "p"
     LEFT JOIN "public"."product_materials" "pm" ON (("p"."id" = "pm"."product_id")))
     LEFT JOIN "public"."material_types" "mt" ON (("pm"."material_id" = "mt"."id")))
     LEFT JOIN "public"."material_groups" "mg" ON (("mt"."group_id" = "mg"."id")))
  GROUP BY "p"."id", "p"."organization_id", "p"."name"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "analytics"."mv_product_compositions" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "analytics"."mv_stock_velocity" AS
 WITH "latest_per_vss" AS (
         SELECT DISTINCT ON ("sd"."variant_supplier_source_id") "sd"."variant_supplier_source_id",
            "sd"."supplier_id",
            "sd"."supplier_branch_id",
            "sd"."variant_id",
            "sd"."product_id",
            "sd"."stock_close" AS "current_stock",
            "sd"."cost_price_close" AS "current_price",
            "sd"."summary_date" AS "last_update_date"
           FROM "public"."stock_daily_summary" "sd"
          WHERE ("sd"."sync_count" > 0)
          ORDER BY "sd"."variant_supplier_source_id", "sd"."summary_date" DESC
        ), "agg_7d" AS (
         SELECT "sd"."variant_supplier_source_id",
            "sum"(GREATEST(0, (- COALESCE("sd"."net_change", 0)))) AS "depleted",
            "sum"(GREATEST(0, COALESCE("sd"."net_change", 0))) AS "restocked",
            "count"(*) FILTER (WHERE ("sd"."sync_count" > 0)) AS "active_days"
           FROM "public"."stock_daily_summary" "sd"
          WHERE ("sd"."summary_date" >= (CURRENT_DATE - 7))
          GROUP BY "sd"."variant_supplier_source_id"
        ), "agg_30d" AS (
         SELECT "sd"."variant_supplier_source_id",
            "sum"(GREATEST(0, (- COALESCE("sd"."net_change", 0)))) AS "depleted",
            "sum"(GREATEST(0, COALESCE("sd"."net_change", 0))) AS "restocked",
            "count"(*) FILTER (WHERE ("sd"."sync_count" > 0)) AS "active_days",
            "count"(*) FILTER (WHERE ("sd"."restock_zero_to_positive" = true)) AS "restock_events",
            "count"(*) FILTER (WHERE "sd"."price_changed") AS "price_changes"
           FROM "public"."stock_daily_summary" "sd"
          WHERE ("sd"."summary_date" >= (CURRENT_DATE - 30))
          GROUP BY "sd"."variant_supplier_source_id"
        ), "agg_90d" AS (
         SELECT "sd"."variant_supplier_source_id",
            "sum"(GREATEST(0, (- COALESCE("sd"."net_change", 0)))) AS "depleted",
            "count"(*) FILTER (WHERE ("sd"."sync_count" > 0)) AS "active_days"
           FROM "public"."stock_daily_summary" "sd"
          WHERE ("sd"."summary_date" >= (CURRENT_DATE - 90))
          GROUP BY "sd"."variant_supplier_source_id"
        )
 SELECT "l"."variant_supplier_source_id",
    "l"."supplier_id",
    "l"."supplier_branch_id",
    "l"."variant_id",
    "l"."product_id",
    "l"."current_stock",
    "l"."current_price",
    "l"."last_update_date",
    COALESCE("a7"."depleted", (0)::bigint) AS "total_depleted_7d",
    COALESCE("a30"."depleted", (0)::bigint) AS "total_depleted_30d",
    COALESCE("a90"."depleted", (0)::bigint) AS "total_depleted_90d",
    "a7"."active_days" AS "active_days_7d",
    "a30"."active_days" AS "active_days_30d",
    "a90"."active_days" AS "active_days_90d",
    "round"(COALESCE((("a7"."depleted")::numeric / (NULLIF("a7"."active_days", 0))::numeric), (0)::numeric), 2) AS "avg_daily_depletion_7d",
    "round"(COALESCE((("a30"."depleted")::numeric / (NULLIF("a30"."active_days", 0))::numeric), (0)::numeric), 2) AS "avg_daily_depletion_30d",
    "round"(COALESCE((("a90"."depleted")::numeric / (NULLIF("a90"."active_days", 0))::numeric), (0)::numeric), 2) AS "avg_daily_depletion_90d",
        CASE
            WHEN (COALESCE((("a30"."depleted")::numeric / (NULLIF("a30"."active_days", 0))::numeric), (0)::numeric) > (0)::numeric) THEN "round"((COALESCE((("a7"."depleted")::numeric / (NULLIF("a7"."active_days", 0))::numeric), (0)::numeric) / (("a30"."depleted")::numeric / ("a30"."active_days")::numeric)), 2)
            ELSE NULL::numeric
        END AS "velocity_trend",
        CASE
            WHEN (COALESCE((("a7"."depleted")::numeric / (NULLIF("a7"."active_days", 0))::numeric), (0)::numeric) > (0)::numeric) THEN "round"((("l"."current_stock")::numeric / (("a7"."depleted")::numeric / ("a7"."active_days")::numeric)), 1)
            ELSE NULL::numeric
        END AS "days_to_stockout",
    COALESCE("a30"."restocked", (0)::bigint) AS "total_restocked_30d",
    COALESCE("a30"."restock_events", (0)::bigint) AS "restock_events_30d",
        CASE
            WHEN (COALESCE("a30"."restock_events", (0)::bigint) > 1) THEN "round"((30.0 / ("a30"."restock_events")::numeric), 1)
            ELSE NULL::numeric
        END AS "avg_days_between_restocks",
    COALESCE("a30"."price_changes", (0)::bigint) AS "price_changes_30d",
    "now"() AS "refreshed_at"
   FROM (((("latest_per_vss" "l"
     JOIN "public"."variant_supplier_sources" "vss" ON ((("vss"."id" = "l"."variant_supplier_source_id") AND ("vss"."is_active" = true))))
     LEFT JOIN "agg_7d" "a7" ON (("a7"."variant_supplier_source_id" = "l"."variant_supplier_source_id")))
     LEFT JOIN "agg_30d" "a30" ON (("a30"."variant_supplier_source_id" = "l"."variant_supplier_source_id")))
     LEFT JOIN "agg_90d" "a90" ON (("a90"."variant_supplier_source_id" = "l"."variant_supplier_source_id")))
  WITH NO DATA;


ALTER MATERIALIZED VIEW "analytics"."mv_stock_velocity" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "analytics"."mv_product_intelligence" AS
 WITH "product_metrics" AS (
         SELECT "sv"."product_id",
            "sum"("sv"."total_depleted_30d") AS "total_depleted_30d",
            "sum"("sv"."total_depleted_90d") AS "total_depleted_90d",
            "sum"("sv"."current_stock") AS "total_current_stock",
            "avg"("sv"."avg_daily_depletion_7d") AS "avg_depletion_7d",
            "avg"("sv"."avg_daily_depletion_30d") AS "avg_depletion_30d",
            "min"("sv"."days_to_stockout") AS "min_days_to_stockout",
            "max"("sv"."velocity_trend") AS "max_velocity_trend",
            "sum"("sv"."total_restocked_30d") AS "total_restocked_30d",
            "count"(*) AS "supplier_count",
            "avg"("sv"."current_price") AS "avg_current_price"
           FROM "analytics"."mv_stock_velocity" "sv"
          GROUP BY "sv"."product_id"
        ), "ranked" AS (
         SELECT "pm"."product_id",
            "pm"."total_depleted_30d",
            "pm"."total_depleted_90d",
            "pm"."total_current_stock",
            "pm"."avg_depletion_7d",
            "pm"."avg_depletion_30d",
            "pm"."min_days_to_stockout",
            "pm"."max_velocity_trend",
            "pm"."total_restocked_30d",
            "pm"."supplier_count",
            "pm"."avg_current_price",
            "percent_rank"() OVER (ORDER BY "pm"."total_depleted_30d" DESC) AS "depletion_rank"
           FROM "product_metrics" "pm"
        )
 SELECT "product_id",
    "total_depleted_30d",
    "total_depleted_90d",
    "total_current_stock",
    "avg_depletion_7d",
    "avg_depletion_30d",
    "min_days_to_stockout",
    "max_velocity_trend",
    "total_restocked_30d",
    "supplier_count",
    "avg_current_price",
        CASE
            WHEN (("total_depleted_30d" = (0)::numeric) OR ("total_depleted_30d" IS NULL)) THEN 'C'::"text"
            WHEN ("depletion_rank" <= (0.20)::double precision) THEN 'A'::"text"
            WHEN ("depletion_rank" <= (0.50)::double precision) THEN 'B'::"text"
            ELSE 'C'::"text"
        END AS "abc_classification",
    LEAST((100)::numeric, "round"((((COALESCE("avg_depletion_30d", (0)::numeric) * (5)::numeric) +
        CASE
            WHEN (COALESCE("max_velocity_trend", (0)::numeric) > (1)::numeric) THEN ("max_velocity_trend" * (10)::numeric)
            ELSE (0)::numeric
        END) + (
        CASE
            WHEN (COALESCE("total_restocked_30d", (0)::numeric) > (0)::numeric) THEN 15
            ELSE 0
        END)::numeric), 1)) AS "turnover_score",
    ((COALESCE("max_velocity_trend", (0)::numeric) > 1.5) AND (COALESCE("min_days_to_stockout", (999)::numeric) < (15)::numeric)) AS "is_hot_product",
    ((COALESCE("total_depleted_30d", (0)::numeric) < (5)::numeric) AND (COALESCE("total_current_stock", (0)::bigint) > 100)) AS "is_stagnant",
    ((COALESCE("total_depleted_30d", (0)::numeric) < (5)::numeric) AND (COALESCE("total_current_stock", (0)::bigint) > 500)) AS "is_negotiation_opportunity",
    ((COALESCE("min_days_to_stockout", (999)::numeric) < (7)::numeric) AND (COALESCE("avg_depletion_30d", (0)::numeric) > (1)::numeric)) AS "is_stockout_risk",
    (COALESCE("total_restocked_30d", (0)::numeric) > (COALESCE("total_depleted_30d", (0)::numeric) * 0.5)) AS "has_frequent_restock",
    "now"() AS "refreshed_at"
   FROM "ranked" "r"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "analytics"."mv_product_intelligence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "cf_recon"."action_log" (
    "id" bigint NOT NULL,
    "acted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actor" "text" DEFAULT 'claude'::"text" NOT NULL,
    "action" "text" NOT NULL,
    "image_db_id" "uuid",
    "cf_image_id" "text",
    "old_status" "text",
    "new_status" "text",
    "evidence" "jsonb",
    "reversible" boolean DEFAULT true NOT NULL,
    "product_id" "uuid"
);


ALTER TABLE "cf_recon"."action_log" OWNER TO "postgres";


COMMENT ON TABLE "cf_recon"."action_log" IS 'Log permanente e imutável de todas as decisões tomadas sobre imagens CF.
actor default = claude. Não fazer DELETE nesta tabela — é evidência de auditoria.';



COMMENT ON COLUMN "cf_recon"."action_log"."product_id" IS 'Denormalized product_id for cascade-delete resilience. Null for legacy rows where product_images was already cascade-deleted.';



CREATE SEQUENCE IF NOT EXISTS "cf_recon"."action_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "cf_recon"."action_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "cf_recon"."action_log_id_seq" OWNED BY "cf_recon"."action_log"."id";



CREATE TABLE IF NOT EXISTS "cf_recon"."cf_ghost_check_queue" (
    "image_id" "text" NOT NULL,
    "audit_uploaded_at" timestamp with time zone,
    "prefix_supplier" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "checked_at" timestamp with time zone,
    "attempts" smallint DEFAULT 0 NOT NULL,
    "last_error" "text",
    "enqueued_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cf_ghost_check_queue_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'checked_alive'::"text", 'checked_dead'::"text", 'error'::"text", 'false_positive'::"text"])))
);


ALTER TABLE "cf_recon"."cf_ghost_check_queue" OWNER TO "postgres";


COMMENT ON TABLE "cf_recon"."cf_ghost_check_queue" IS 'Fila de verificação de IDs CF suspeitos. 17.834 checked_dead (infer. estatística 325 amostras),
7 false_positive (xbz-15465p-* uploadados APÓS o ghost check).
Nenhum ghost_dead tem produto ativo no DB — pure histórico de IDs deletados do CF.';



CREATE TABLE IF NOT EXISTS "cf_recon"."cf_image" (
    "image_id" "text" NOT NULL,
    "uploaded_at" timestamp with time zone,
    "filename" "text",
    "meta" "jsonb",
    "crawl_run_id" "uuid",
    "first_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "cf_recon"."cf_image" OWNER TO "postgres";


COMMENT ON TABLE "cf_recon"."cf_image" IS 'Mirror completo do Cloudflare Images. 72.079 rows (= public._cf_images_audit).
PK = image_id (CF Image ID). Rastreia first_seen_at e last_seen_at por crawl.
NOTA: public._cf_images_audit é o espelho em public para JOIN direto em queries operacionais.
Sincronização bidirecional realizada em 2026-06-17.';



CREATE TABLE IF NOT EXISTS "cf_recon"."crawl_run" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finished_at" timestamp with time zone,
    "pages_scanned" integer DEFAULT 0 NOT NULL,
    "images_seen" integer DEFAULT 0 NOT NULL,
    "cf_total_reported" integer,
    "status" "text" DEFAULT 'running'::"text" NOT NULL,
    "notes" "text",
    CONSTRAINT "crawl_run_status_check" CHECK (("status" = ANY (ARRAY['running'::"text", 'completed'::"text", 'failed'::"text", 'partial'::"text"])))
);


ALTER TABLE "cf_recon"."crawl_run" OWNER TO "postgres";


COMMENT ON TABLE "cf_recon"."crawl_run" IS 'Histórico de crawls à API CF. 1 crawl parcial realizado (2026-06-16 23:44 UTC).
cf_total_reported=72.086. Crawl completo (~721 páginas) deve rodar periodicamente.';



CREATE TABLE IF NOT EXISTS "cf_recon"."metric_snapshot" (
    "id" bigint NOT NULL,
    "taken_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metrics" "jsonb" NOT NULL
);


ALTER TABLE "cf_recon"."metric_snapshot" OWNER TO "postgres";


COMMENT ON TABLE "cf_recon"."metric_snapshot" IS 'Snapshots periódicos de métricas de reconciliação CF×DB.
Inserir via INSERT ON CONFLICT DO UPDATE por taken_at (aproximado ao dia).';



CREATE SEQUENCE IF NOT EXISTS "cf_recon"."metric_snapshot_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "cf_recon"."metric_snapshot_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "cf_recon"."metric_snapshot_id_seq" OWNED BY "cf_recon"."metric_snapshot"."id";



CREATE TABLE IF NOT EXISTS "cf_recon"."remediation" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "kind" "text" NOT NULL,
    "product_id" "uuid",
    "image_db_id" "uuid",
    "cf_image_id" "text",
    "detail" "jsonb",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    CONSTRAINT "remediation_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'done'::"text", 'wontfix'::"text"])))
);


ALTER TABLE "cf_recon"."remediation" OWNER TO "postgres";


COMMENT ON TABLE "cf_recon"."remediation" IS 'Plano de remediações pendentes. status: open|in_progress|done|cancelled.
Linkar às entradas de action_log quando executado.';



CREATE SEQUENCE IF NOT EXISTS "cf_recon"."remediation_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "cf_recon"."remediation_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "cf_recon"."remediation_id_seq" OWNED BY "cf_recon"."remediation"."id";



CREATE OR REPLACE VIEW "cf_recon"."v_cf_orphans" AS
 SELECT "ci"."image_id",
    "ci"."uploaded_at",
    "ci"."filename"
   FROM ("cf_recon"."cf_image" "ci"
     LEFT JOIN "public"."product_images" "pi" ON ((("pi"."cloudflare_image_id")::"text" = "ci"."image_id")))
  WHERE (("pi"."id" IS NULL) AND ("ci"."crawl_run_id" IS NOT NULL));


ALTER VIEW "cf_recon"."v_cf_orphans" OWNER TO "postgres";


COMMENT ON VIEW "cf_recon"."v_cf_orphans" IS 'Imagens existentes no Cloudflare sem referencia em product_images (candidatas a custo recuperavel).';



CREATE OR REPLACE VIEW "cf_recon"."v_divergence" AS
 SELECT "pi"."id" AS "db_id",
    "pi"."cloudflare_image_id",
    "pi"."cf_sync_status",
    "pi"."cf_id_scheme",
    "pi"."source_supplier",
    "pi"."is_active",
    ("pi"."deleted_at" IS NOT NULL) AS "is_deleted",
    ("ci"."image_id" IS NOT NULL) AS "exists_in_cf",
        CASE
            WHEN (("ci"."image_id" IS NOT NULL) AND ("ci"."crawl_run_id" IS NOT NULL) AND ("pi"."cf_sync_status" = 'verified'::"text")) THEN 'ok'::"text"
            WHEN (("ci"."image_id" IS NOT NULL) AND ("ci"."crawl_run_id" IS NULL) AND ("pi"."cf_sync_status" = 'verified'::"text")) THEN 'ok_pending_crawl_confirmation'::"text"
            WHEN (("ci"."image_id" IS NOT NULL) AND ("pi"."cf_sync_status" <> 'verified'::"text")) THEN 'cf_present_db_unverified'::"text"
            WHEN (("ci"."image_id" IS NULL) AND ("pi"."deleted_at" IS NOT NULL)) THEN 'deleted_noise'::"text"
            WHEN (("ci"."image_id" IS NULL) AND "pi"."is_active") THEN 'broken_reference_active'::"text"
            WHEN (("ci"."image_id" IS NULL) AND (NOT "pi"."is_active")) THEN 'broken_reference_inactive'::"text"
            ELSE 'ok'::"text"
        END AS "divergence_class",
    (("ci"."image_id" IS NOT NULL) AND ("ci"."crawl_run_id" IS NOT NULL)) AS "exists_in_cf_confirmed"
   FROM ("public"."product_images" "pi"
     LEFT JOIN "cf_recon"."cf_image" "ci" ON (("ci"."image_id" = ("pi"."cloudflare_image_id")::"text")));


ALTER VIEW "cf_recon"."v_divergence" OWNER TO "postgres";


COMMENT ON VIEW "cf_recon"."v_divergence" IS 'Classificacao de divergencia por linha (requer cf_image populado via crawl).';



CREATE OR REPLACE VIEW "cf_recon"."v_verification_queue" AS
 SELECT "id",
    "cloudflare_image_id",
    "cf_sync_status",
    "cf_id_scheme",
    "source_supplier",
    "cf_check_attempts",
    "is_active",
    "created_at"
   FROM "public"."product_images" "pi"
  WHERE (("cf_sync_status" <> 'verified'::"text") AND ("deleted_at" IS NULL) AND (COALESCE("cf_id_scheme", ''::"text") <> 'hash_legacy'::"text"));


ALTER VIEW "cf_recon"."v_verification_queue" OWNER TO "postgres";


COMMENT ON VIEW "cf_recon"."v_verification_queue" IS 'Fila real de verificacao CF: pendentes vivos, sem deletados/hash_legacy.';



CREATE OR REPLACE VIEW "cf_recon"."v_health_dashboard" AS
 SELECT ( SELECT "count"(*) AS "count"
           FROM "public"."product_images") AS "db_total",
    ( SELECT "count"(*) AS "count"
           FROM "public"."product_images"
          WHERE "product_images"."is_active") AS "db_active",
    ( SELECT "count"(*) AS "count"
           FROM "public"."product_images"
          WHERE ("product_images"."cf_sync_status" = 'verified'::"text")) AS "verified",
    ( SELECT "count"(*) AS "count"
           FROM "public"."product_images"
          WHERE ("product_images"."cf_sync_status" = 'pending'::"text")) AS "pending",
    ( SELECT "count"(*) AS "count"
           FROM "public"."product_images"
          WHERE ("product_images"."cf_sync_status" = 'missing'::"text")) AS "missing",
    ( SELECT "count"(*) AS "count"
           FROM "public"."product_images"
          WHERE (("product_images"."cf_sync_status" = 'missing'::"text") AND "product_images"."is_active")) AS "missing_active",
    ( SELECT "count"(*) AS "count"
           FROM "cf_recon"."v_verification_queue") AS "queue_real",
    ( SELECT "count"(*) AS "count"
           FROM "cf_recon"."remediation"
          WHERE ("remediation"."status" = 'open'::"text")) AS "remediation_open",
    ( SELECT "count"(*) AS "count"
           FROM "cf_recon"."cf_image") AS "cf_crawled",
    ( SELECT "count"(*) AS "count"
           FROM "cf_recon"."action_log") AS "actions_logged",
    ( SELECT "count"(*) AS "count"
           FROM "cf_recon"."cf_image"
          WHERE ("cf_image"."crawl_run_id" IS NULL)) AS "cf_backfill_only",
    ( SELECT "count"(*) AS "count"
           FROM "cf_recon"."cf_image"
          WHERE ("cf_image"."crawl_run_id" IS NOT NULL)) AS "cf_crawl_confirmed",
    ( SELECT "count"(*) AS "count"
           FROM "cf_recon"."v_divergence"
          WHERE ("v_divergence"."divergence_class" = 'ok'::"text")) AS "divergence_ok",
    ( SELECT "count"(*) AS "count"
           FROM "cf_recon"."v_divergence"
          WHERE ("v_divergence"."divergence_class" = 'ok_pending_crawl_confirmation'::"text")) AS "divergence_pending",
    ( SELECT "count"(*) AS "count"
           FROM "cf_recon"."v_divergence"
          WHERE ("v_divergence"."divergence_class" ~~ 'broken%'::"text")) AS "divergence_broken";


ALTER VIEW "cf_recon"."v_health_dashboard" OWNER TO "postgres";


COMMENT ON VIEW "cf_recon"."v_health_dashboard" IS 'KPI unico da reconciliacao CF x product_images.';



CREATE OR REPLACE VIEW "cf_recon"."v_inactive_alive" AS
 SELECT "id",
    "product_id",
    "cloudflare_image_id",
    "cf_sync_status",
    "source_supplier",
    "cf_id_scheme",
    "updated_at"
   FROM "public"."product_images" "pi"
  WHERE (("is_active" IS FALSE) AND ("deleted_at" IS NULL));


ALTER VIEW "cf_recon"."v_inactive_alive" OWNER TO "postgres";


COMMENT ON VIEW "cf_recon"."v_inactive_alive" IS 'Imagens fora do catalogo (inativas) mas nao soft-deletadas. Candidatas a arquivamento.';



CREATE OR REPLACE VIEW "cf_recon"."v_inactive_alive_cf_cost" AS
 SELECT "ia"."id",
    "ia"."product_id",
    "ia"."cloudflare_image_id",
    "ia"."cf_sync_status",
    "ia"."source_supplier"
   FROM ("cf_recon"."v_inactive_alive" "ia"
     JOIN "cf_recon"."cf_image" "ci" ON (("ci"."image_id" = ("ia"."cloudflare_image_id")::"text")));


ALTER VIEW "cf_recon"."v_inactive_alive_cf_cost" OWNER TO "postgres";


COMMENT ON VIEW "cf_recon"."v_inactive_alive_cf_cost" IS 'Inativas vivas que ocupam storage no CF (custo recuperavel apos revisao). Requer crawl populado.';



CREATE OR REPLACE VIEW "cf_recon"."v_products_without_active_image" AS
 SELECT "id" AS "product_id",
    "name",
    "is_active" AS "product_active",
    ( SELECT "count"(*) AS "count"
           FROM "public"."product_images" "pi"
          WHERE ("pi"."product_id" = "p"."id")) AS "total_images",
    ( SELECT "count"(*) AS "count"
           FROM "public"."product_images" "pi"
          WHERE (("pi"."product_id" = "p"."id") AND ("pi"."cf_sync_status" = 'missing'::"text"))) AS "broken_images"
   FROM "public"."products" "p"
  WHERE (NOT (EXISTS ( SELECT 1
           FROM "public"."product_images" "pi"
          WHERE (("pi"."product_id" = "p"."id") AND "pi"."is_active"))));


ALTER VIEW "cf_recon"."v_products_without_active_image" OWNER TO "postgres";


COMMENT ON VIEW "cf_recon"."v_products_without_active_image" IS 'Produtos sem nenhuma imagem ativa (D6). product_active=true = gap de vitrine prioritario.';



CREATE TABLE IF NOT EXISTS "classification_audit"."category_suggestions" (
    "id" bigint NOT NULL,
    "product_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "score" integer NOT NULL,
    "matches" integer NOT NULL,
    "tokens_matched" "text",
    "already_assigned" boolean NOT NULL,
    "is_primary_now" boolean NOT NULL,
    "category_level" integer NOT NULL,
    "computed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "material_conflict" boolean,
    "type_conflict" boolean,
    "approved_auto" boolean,
    "tokens_in_name" boolean,
    "category_is_prefix" boolean
);


ALTER TABLE "classification_audit"."category_suggestions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "classification_audit"."category_suggestions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "classification_audit"."category_suggestions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "classification_audit"."category_suggestions_id_seq" OWNED BY "classification_audit"."category_suggestions"."id";



CREATE OR REPLACE VIEW "classification_audit"."v_gaps_acionaveis" WITH ("security_invoker"='true') AS
 SELECT "s"."product_id",
    "p"."name" AS "produto",
    "p"."sku",
    "s"."category_id",
    "c"."full_path_readable" AS "categoria_sugerida",
    "c"."level" AS "nivel",
    "s"."matches",
    "s"."tokens_matched",
    "s"."score",
        CASE
            WHEN ("s"."matches" >= 4) THEN '🟢 altissima'::"text"
            WHEN ("s"."matches" = 3) THEN '🟢 alta'::"text"
            WHEN (("s"."matches" = 2) AND ("c"."level" >= 4)) THEN '🟡 boa (folha especifica)'::"text"
            WHEN (("s"."matches" = 2) AND ("c"."level" = 3)) THEN '🟡 media'::"text"
            ELSE '🔴 baixa'::"text"
        END AS "confianca",
    ( SELECT "string_agg"("c2"."name", ' + '::"text") AS "string_agg"
           FROM ("public"."product_category_assignments" "pca2"
             JOIN "public"."categories" "c2" ON (("c2"."id" = "pca2"."category_id")))
          WHERE (("pca2"."product_id" = "s"."product_id") AND ("c2"."level" >= 2))) AS "categorias_atuais"
   FROM (("classification_audit"."category_suggestions" "s"
     JOIN "public"."products" "p" ON (("p"."id" = "s"."product_id")))
     JOIN "public"."categories" "c" ON (("c"."id" = "s"."category_id")))
  WHERE ((NOT "s"."already_assigned") AND "p"."is_active");


ALTER VIEW "classification_audit"."v_gaps_acionaveis" OWNER TO "postgres";


COMMENT ON VIEW "classification_audit"."v_gaps_acionaveis" IS 'Gaps de classificação detectados por análise de tokens do nome + descrição × nome da categoria.';



CREATE OR REPLACE VIEW "classification_audit"."v_kits_para_revisao" WITH ("security_invoker"='true') AS
 SELECT "p"."sku",
    "p"."name" AS "produto",
    "c"."full_path_readable" AS "categoria_sugerida",
    "s"."matches",
    "s"."tokens_matched",
    "s"."score",
    ( SELECT "string_agg"("c2"."name", ' · '::"text" ORDER BY "c2"."level") AS "string_agg"
           FROM ("public"."product_category_assignments" "pca2"
             JOIN "public"."categories" "c2" ON (("c2"."id" = "pca2"."category_id")))
          WHERE (("pca2"."product_id" = "s"."product_id") AND ("c2"."level" >= 2))) AS "categorias_atuais",
    ('https://example.com/admin/products/'::"text" || "p"."id") AS "link_admin"
   FROM (("classification_audit"."category_suggestions" "s"
     JOIN "public"."products" "p" ON (("p"."id" = "s"."product_id")))
     JOIN "public"."categories" "c" ON (("c"."id" = "s"."category_id")))
  WHERE ((NOT "s"."already_assigned") AND ("s"."matches" >= 3) AND "p"."is_active" AND ("p"."is_kit" OR ("p"."name" ~~* '%KIT%'::"text") OR ("p"."name" ~~* '%CONJ%'::"text")))
  ORDER BY "s"."score" DESC, "p"."sku";


ALTER VIEW "classification_audit"."v_kits_para_revisao" OWNER TO "postgres";


COMMENT ON VIEW "classification_audit"."v_kits_para_revisao" IS 'Kits/conjuntos com sugestões tier alto que merecem análise humana: decidir se kit deve aparecer na categoria do componente.';



CREATE TABLE IF NOT EXISTS "prod_audit"."category_keywords" (
    "category_id" "uuid" NOT NULL,
    "level" integer,
    "name" "text",
    "full_path" "text",
    "tokens" "text"[],
    "name_normalized" "text",
    "path_normalized" "text",
    "is_client_segment" boolean DEFAULT false,
    "is_material_segment" boolean DEFAULT false,
    "is_eco_segment" boolean DEFAULT false,
    "is_kit_segment" boolean DEFAULT false,
    "refreshed_at" timestamp with time zone DEFAULT "now"(),
    "base_type" "text"
);


ALTER TABLE "prod_audit"."category_keywords" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "prod_audit"."category_suggestions" (
    "id" bigint NOT NULL,
    "product_id" "uuid" NOT NULL,
    "product_name" "text",
    "product_sku" "text",
    "rule_name" "text" NOT NULL,
    "suggested_category_id" "uuid",
    "suggested_category_path" "text",
    "current_categories" "text"[],
    "confidence" "text",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reviewed" boolean DEFAULT false,
    "accepted" boolean
);


ALTER TABLE "prod_audit"."category_suggestions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "prod_audit"."category_suggestions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "prod_audit"."category_suggestions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "prod_audit"."category_suggestions_id_seq" OWNED BY "prod_audit"."category_suggestions"."id";



CREATE TABLE IF NOT EXISTS "prod_audit"."classification_rules" (
    "id" integer NOT NULL,
    "rule_name" "text",
    "description" "text",
    "product_condition" "text",
    "target_category_path_like" "text",
    "target_category_name_like" "text",
    "target_category_tokens" "text"[],
    "confidence" "text",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "classification_rules_confidence_check" CHECK (("confidence" = ANY (ARRAY['high'::"text", 'medium'::"text"])))
);


ALTER TABLE "prod_audit"."classification_rules" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "prod_audit"."classification_rules_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "prod_audit"."classification_rules_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "prod_audit"."classification_rules_id_seq" OWNED BY "prod_audit"."classification_rules"."id";



CREATE TABLE IF NOT EXISTS "prod_audit"."product_features" (
    "product_id" "uuid" NOT NULL,
    "sku" "text",
    "name" "text",
    "name_normalized" "text",
    "tokens" "text"[],
    "materials" "text"[],
    "colors" "text"[],
    "has_eco_keyword" boolean DEFAULT false,
    "has_kit_keyword" boolean DEFAULT false,
    "has_thermal_flag" boolean DEFAULT false,
    "has_textil_flag" boolean DEFAULT false,
    "current_categories" "uuid"[],
    "refreshed_at" timestamp with time zone DEFAULT "now"(),
    "base_type" "text"
);


ALTER TABLE "prod_audit"."product_features" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "prod_audit"."test_results" (
    "id" bigint NOT NULL,
    "batch" "text" NOT NULL,
    "test_name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "result" "text" NOT NULL,
    "expected" "text",
    "actual" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "duration_ms" numeric,
    "executed_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "test_results_result_check" CHECK (("result" = ANY (ARRAY['pass'::"text", 'fail'::"text", 'warning'::"text", 'skip'::"text"]))),
    CONSTRAINT "test_results_severity_check" CHECK (("severity" = ANY (ARRAY['critical'::"text", 'high'::"text", 'medium'::"text", 'low'::"text", 'info'::"text"])))
);


ALTER TABLE "prod_audit"."test_results" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "prod_audit"."test_results_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "prod_audit"."test_results_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "prod_audit"."test_results_id_seq" OWNED BY "prod_audit"."test_results"."id";



CREATE OR REPLACE VIEW "prod_audit"."v_category_suggestions_review" WITH ("security_invoker"='true') AS
 SELECT "id",
    "rule_name" AS "regra",
    "confidence" AS "confianca",
    "product_sku" AS "sku",
    "product_name" AS "produto",
    "suggested_category_path" AS "sugestao",
    "array_to_string"("current_categories", ' ∥ '::"text") AS "categorias_atuais",
    "reason" AS "motivo",
    "reviewed" AS "revisado",
    "accepted" AS "aceito"
   FROM "prod_audit"."category_suggestions" "cs";


ALTER VIEW "prod_audit"."v_category_suggestions_review" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "supplier_stricker"."canceled_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prod_reference" character varying(20) NOT NULL,
    "canceled_at" "date",
    "reason" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "supplier_stricker"."canceled_products" OWNER TO "postgres";


COMMENT ON TABLE "supplier_stricker"."canceled_products" IS 'Produtos descontinuados do portfólio Stricker';



CREATE TABLE IF NOT EXISTS "supplier_stricker"."category_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type_code" character varying(10) NOT NULL,
    "sub_type_code" character varying(10),
    "type_name" character varying(100),
    "sub_type_name" character varying(100),
    "category_id" "uuid",
    "is_mapped" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "supplier_stricker"."category_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "supplier_stricker"."colors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "color_code" character varying(10) NOT NULL,
    "color_name" character varying(100),
    "color_hex" character varying(10),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "supplier_stricker"."colors" OWNER TO "postgres";


COMMENT ON TABLE "supplier_stricker"."colors" IS 'Catálogo de cores disponíveis nos produtos Stricker';



COMMENT ON COLUMN "supplier_stricker"."colors"."color_code" IS 'Código único da cor (ex: 103, 128)';



COMMENT ON COLUMN "supplier_stricker"."colors"."color_hex" IS 'Código hexadecimal da cor (ex: #000000)';



CREATE TABLE IF NOT EXISTS "supplier_stricker"."customization_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "serv_code" character varying(50) NOT NULL,
    "prod_reference" character varying(20) NOT NULL,
    "component_code" character varying(10),
    "component_name" character varying(100),
    "location_code" character varying(10),
    "location_name" character varying(100),
    "technique_code" character varying(10),
    "technique_name" character varying(100),
    "area_code" character varying(10),
    "area_width_cm" numeric(6,2),
    "area_height_cm" numeric(6,2),
    "max_colors" integer,
    "price" numeric(10,2),
    "printing_lines_image" "text",
    "component_image" "text",
    "location_image" "text",
    "area_image" "text",
    "composed_location_image" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "supplier_stricker"."customization_options" OWNER TO "postgres";


COMMENT ON TABLE "supplier_stricker"."customization_options" IS 'Opções de personalização/gravação por produto';



COMMENT ON COLUMN "supplier_stricker"."customization_options"."serv_code" IS 'Código de serviço único (ex: 92568.1.1.TRS1-01-01)';



COMMENT ON COLUMN "supplier_stricker"."customization_options"."technique_code" IS 'Código técnica: TRS1, SER1, LAS1, BOR1, PDP1, UV1, SUB1, DTF1';



CREATE TABLE IF NOT EXISTS "supplier_stricker"."customization_tables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_code" character varying(30) NOT NULL,
    "technique_code" character varying(10),
    "technique_name" character varying(100),
    "area_min_cm2" numeric(8,2),
    "area_max_cm2" numeric(8,2),
    "colors" integer,
    "min_qty_1" integer DEFAULT 1,
    "price_1" numeric(10,2),
    "min_qty_2" integer,
    "price_2" numeric(10,2),
    "min_qty_3" integer,
    "price_3" numeric(10,2),
    "min_qty_4" integer,
    "price_4" numeric(10,2),
    "min_qty_5" integer,
    "price_5" numeric(10,2),
    "setup_price" numeric(10,2),
    "handling_price" numeric(10,2),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "min_qty_6" integer,
    "price_6" numeric(10,2),
    "min_qty_7" integer,
    "price_7" numeric(10,2),
    "min_qty_8" integer,
    "price_8" numeric(10,2),
    "min_qty_9" integer,
    "price_9" numeric(10,2),
    "min_qty_10" integer,
    "price_10" numeric(10,2),
    "min_qty_11" integer,
    "price_11" numeric(10,2),
    "min_qty_12" integer,
    "price_12" numeric(10,2),
    "min_qty_13" integer,
    "price_13" numeric(10,2),
    "min_qty_14" integer,
    "price_14" numeric(10,2),
    "min_qty_15" integer,
    "price_15" numeric(10,2),
    "sla_1" integer,
    "sla_2" integer,
    "sla_3" integer,
    "sla_4" integer,
    "sla_5" integer,
    "sla_6" integer,
    "sla_7" integer,
    "sla_8" integer,
    "sla_9" integer,
    "sla_10" integer,
    "sla_11" integer,
    "sla_12" integer,
    "sla_13" integer,
    "sla_14" integer,
    "sla_15" integer
);


ALTER TABLE "supplier_stricker"."customization_tables" OWNER TO "postgres";


COMMENT ON TABLE "supplier_stricker"."customization_tables" IS 'Tabelas de preços de personalização por técnica e área';



COMMENT ON COLUMN "supplier_stricker"."customization_tables"."setup_price" IS 'Custo de setup/clichê para a técnica';



COMMENT ON COLUMN "supplier_stricker"."customization_tables"."handling_price" IS 'Custo de manuseio por unidade';



CREATE TABLE IF NOT EXISTS "supplier_stricker"."optionals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku" character varying(30) NOT NULL,
    "web_sku" character varying(30),
    "prod_reference" character varying(20) NOT NULL,
    "color_code" character varying(10),
    "color_name" character varying(100),
    "color_hex" character varying(10),
    "size" character varying(20),
    "capacity" character varying(50),
    "min_qty_1" integer DEFAULT 1,
    "price_1" numeric(10,2),
    "min_qty_2" integer,
    "price_2" numeric(10,2),
    "min_qty_3" integer,
    "price_3" numeric(10,2),
    "min_qty_4" integer,
    "price_4" numeric(10,2),
    "min_qty_5" integer,
    "price_5" numeric(10,2),
    "image_1" "text",
    "image_2" "text",
    "image_3" "text",
    "image_4" "text",
    "image_5" "text",
    "image_6" "text",
    "image_7" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "synced_at" timestamp with time zone DEFAULT "now"(),
    "location_image_1" "text",
    "location_image_2" "text",
    "location_image_3" "text",
    "location_image_4" "text",
    "location_image_5" "text",
    "location_image_6" "text",
    "location_image_7" "text",
    "location_image_8" "text",
    "area_image_1" "text",
    "area_image_2" "text",
    "area_image_3" "text",
    "area_image_4" "text",
    "area_image_5" "text",
    "area_image_6" "text",
    "area_image_7" "text",
    "area_image_8" "text",
    "component_image_1" "text",
    "component_image_2" "text",
    "component_image_3" "text",
    "component_image_4" "text",
    "component_image_5" "text",
    "component_image_6" "text",
    "component_image_7" "text",
    "component_image_8" "text",
    "box_image" "text",
    "bag_image" "text",
    "pouch_image" "text"
);


ALTER TABLE "supplier_stricker"."optionals" OWNER TO "postgres";


COMMENT ON TABLE "supplier_stricker"."optionals" IS 'Variantes de produtos Stricker (40k+ SKUs)';



COMMENT ON COLUMN "supplier_stricker"."optionals"."sku" IS 'SKU único da variante (ex: 92568-128)';



COMMENT ON COLUMN "supplier_stricker"."optionals"."price_1" IS 'Preço em BRL para quantidade mínima 1';



CREATE TABLE IF NOT EXISTS "supplier_stricker"."product_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type_code" character varying(10) NOT NULL,
    "type_name" character varying(100),
    "subtype_code" character varying(10),
    "subtype_name" character varying(100),
    "level" integer DEFAULT 1,
    "parent_type_code" character varying(10),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "supplier_stricker"."product_types" OWNER TO "postgres";


COMMENT ON TABLE "supplier_stricker"."product_types" IS 'Categorias e subcategorias dos produtos Stricker';



CREATE TABLE IF NOT EXISTS "supplier_stricker"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prod_reference" character varying(20) NOT NULL,
    "name" character varying(500),
    "description" "text",
    "short_description" character varying(500),
    "has_colors" boolean DEFAULT false,
    "has_sizes" boolean DEFAULT false,
    "has_capacity" boolean DEFAULT false,
    "is_textil" boolean DEFAULT false,
    "combined_sizes" character varying(100),
    "gender" character varying(20),
    "box_length_mm" integer,
    "box_width_mm" integer,
    "box_height_mm" integer,
    "box_weight_kg" numeric(10,3),
    "product_weight_g" integer,
    "type_code" character varying(10),
    "type_name" character varying(100),
    "subtype_code" character varying(10),
    "subtype_name" character varying(100),
    "brand" character varying(50),
    "is_stockout" boolean DEFAULT false,
    "is_online_exclusive" boolean DEFAULT false,
    "catalog_page" integer,
    "main_image" "text",
    "optional_image_1" "text",
    "optional_image_2" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "synced_at" timestamp with time zone DEFAULT "now"(),
    "video_link" "text",
    "video_link_vimeo" "text",
    "video_360" "text"
);


ALTER TABLE "supplier_stricker"."products" OWNER TO "postgres";


COMMENT ON TABLE "supplier_stricker"."products" IS 'Produtos principais da Stricker (8k+ produtos)';



COMMENT ON COLUMN "supplier_stricker"."products"."prod_reference" IS 'Referência única do produto Stricker (ex: 92568)';



COMMENT ON COLUMN "supplier_stricker"."products"."brand" IS 'Marca: BRANVE, EKSTON, SUCO ou NULL';



COMMENT ON COLUMN "supplier_stricker"."products"."is_stockout" IS 'Produto do catálogo Stockout (descontinuado)';



CREATE TABLE IF NOT EXISTS "supplier_stricker"."stg_colors" (
    "id" integer NOT NULL,
    "stricker_ref" character varying(50) NOT NULL,
    "name" "text",
    "hex_code" character varying(7),
    "group_name" "text",
    "raw_data" "jsonb",
    "synced_at" timestamp with time zone DEFAULT "now"(),
    "mapped_to_color_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "supplier_stricker"."stg_colors" OWNER TO "postgres";


COMMENT ON TABLE "supplier_stricker"."stg_colors" IS 'Staging de cores da API Stricker';



CREATE SEQUENCE IF NOT EXISTS "supplier_stricker"."stg_colors_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "supplier_stricker"."stg_colors_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "supplier_stricker"."stg_colors_id_seq" OWNED BY "supplier_stricker"."stg_colors"."id";



CREATE TABLE IF NOT EXISTS "supplier_stricker"."stg_customizations" (
    "id" integer NOT NULL,
    "stricker_ref" character varying(50) NOT NULL,
    "product_ref" character varying(50),
    "technique_name" "text",
    "area_name" "text",
    "max_colors" integer,
    "max_width" numeric(10,2),
    "max_height" numeric(10,2),
    "raw_data" "jsonb",
    "synced_at" timestamp with time zone DEFAULT "now"(),
    "mapped_to_technique_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "supplier_stricker"."stg_customizations" OWNER TO "postgres";


COMMENT ON TABLE "supplier_stricker"."stg_customizations" IS 'Staging de técnicas de personalização da API Stricker';



CREATE SEQUENCE IF NOT EXISTS "supplier_stricker"."stg_customizations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "supplier_stricker"."stg_customizations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "supplier_stricker"."stg_customizations_id_seq" OWNED BY "supplier_stricker"."stg_customizations"."id";



CREATE TABLE IF NOT EXISTS "supplier_stricker"."stg_images" (
    "id" integer NOT NULL,
    "stricker_ref" character varying(50),
    "product_ref" character varying(50),
    "optional_ref" character varying(50),
    "image_type" character varying(50),
    "original_url" "text",
    "filename" "text",
    "position" integer,
    "raw_data" "jsonb",
    "synced_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "supplier_stricker"."stg_images" OWNER TO "postgres";


COMMENT ON TABLE "supplier_stricker"."stg_images" IS 'Staging de imagens da API Stricker';



CREATE SEQUENCE IF NOT EXISTS "supplier_stricker"."stg_images_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "supplier_stricker"."stg_images_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "supplier_stricker"."stg_images_id_seq" OWNED BY "supplier_stricker"."stg_images"."id";



CREATE TABLE IF NOT EXISTS "supplier_stricker"."stg_optionals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prod_reference" character varying(50) NOT NULL,
    "sku" character varying(50) NOT NULL,
    "web_sku" character varying(50),
    "color_code" character varying(20),
    "color_name" character varying(100),
    "color_hex" character varying(7),
    "size" character varying(50),
    "capacity" character varying(50),
    "min_qt_1" integer,
    "price_1" numeric(10,4),
    "min_qt_2" integer,
    "price_2" numeric(10,4),
    "min_qt_3" integer,
    "price_3" numeric(10,4),
    "min_qt_4" integer,
    "price_4" numeric(10,4),
    "min_qt_5" integer,
    "price_5" numeric(10,4),
    "image_1" "text",
    "image_2" "text",
    "image_3" "text",
    "image_4" "text",
    "image_5" "text",
    "image_6" "text",
    "image_7" "text",
    "raw_json" "jsonb",
    "processed" boolean DEFAULT false,
    "processed_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "supplier_stricker"."stg_optionals" OWNER TO "postgres";


COMMENT ON TABLE "supplier_stricker"."stg_optionals" IS 'Staging de variantes/opcionais da API Stricker';



CREATE TABLE IF NOT EXISTS "supplier_stricker"."stg_product_types" (
    "id" integer NOT NULL,
    "stricker_ref" character varying(50) NOT NULL,
    "name" "text",
    "parent_ref" character varying(50),
    "level" integer,
    "raw_data" "jsonb",
    "synced_at" timestamp with time zone DEFAULT "now"(),
    "mapped_to_category_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "supplier_stricker"."stg_product_types" OWNER TO "postgres";


COMMENT ON TABLE "supplier_stricker"."stg_product_types" IS 'Staging de categorias da API Stricker';



CREATE SEQUENCE IF NOT EXISTS "supplier_stricker"."stg_product_types_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "supplier_stricker"."stg_product_types_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "supplier_stricker"."stg_product_types_id_seq" OWNED BY "supplier_stricker"."stg_product_types"."id";



CREATE TABLE IF NOT EXISTS "supplier_stricker"."stg_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prod_reference" character varying(50) NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "brand" character varying(50),
    "type_code" character varying(10),
    "sub_type_code" character varying(10),
    "box_length_mm" integer,
    "box_width_mm" integer,
    "box_height_mm" integer,
    "box_weight_kg" numeric(10,3),
    "product_weight_g" integer,
    "has_colors" boolean DEFAULT false,
    "has_sizes" boolean DEFAULT false,
    "has_capacity" boolean DEFAULT false,
    "is_textil" boolean DEFAULT false,
    "is_stockout" boolean DEFAULT false,
    "main_image" "text",
    "box_image" "text",
    "pouch_image" "text",
    "all_image_list" "text",
    "video_link" "text",
    "video_link_vimeo" "text",
    "video_360" "text",
    "combined_sizes" "text",
    "gender" character varying(20),
    "raw_json" "jsonb",
    "processed" boolean DEFAULT false,
    "processed_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "supplier_stricker"."stg_products" OWNER TO "postgres";


COMMENT ON TABLE "supplier_stricker"."stg_products" IS 'Staging de produtos da API Stricker';



CREATE TABLE IF NOT EXISTS "supplier_stricker"."stg_stock" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku" character varying(50) NOT NULL,
    "stock_quantity" integer DEFAULT 0,
    "next_quantity_1" integer,
    "next_date_1" "date",
    "next_quantity_2" integer,
    "next_date_2" "date",
    "next_quantity_3" integer,
    "next_date_3" "date",
    "raw_json" "jsonb",
    "synced_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "supplier_stricker"."stg_stock" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "supplier_stricker"."stocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku" character varying(30) NOT NULL,
    "stock_quantity" integer DEFAULT 0,
    "next_quantity_1" integer,
    "next_date_1" "date",
    "next_quantity_2" integer,
    "next_date_2" "date",
    "next_quantity_3" integer,
    "next_date_3" "date",
    "last_sync_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "supplier_stricker"."stocks" OWNER TO "postgres";


COMMENT ON TABLE "supplier_stricker"."stocks" IS 'Estoque em tempo real dos SKUs Stricker';



COMMENT ON COLUMN "supplier_stricker"."stocks"."next_date_1" IS 'Data prevista da próxima entrada de estoque';



CREATE TABLE IF NOT EXISTS "supplier_stricker"."sync_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sync_type" character varying(50) NOT NULL,
    "sync_source" character varying(50) DEFAULT 'api'::character varying,
    "records_fetched" integer DEFAULT 0,
    "records_inserted" integer DEFAULT 0,
    "records_updated" integer DEFAULT 0,
    "records_deleted" integer DEFAULT 0,
    "status" character varying(20) DEFAULT 'running'::character varying,
    "error_message" "text",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "duration_seconds" integer,
    "triggered_by" character varying(50) DEFAULT 'n8n'::character varying
);


ALTER TABLE "supplier_stricker"."sync_log" OWNER TO "postgres";


COMMENT ON TABLE "supplier_stricker"."sync_log" IS 'Log de sincronizações com a API Stricker';



CREATE OR REPLACE VIEW "supplier_stricker"."v_customization_by_technique" WITH ("security_invoker"='true') AS
 SELECT "technique_code",
    "technique_name",
    "count"(DISTINCT "prod_reference") AS "products_count",
    "count"(*) AS "options_count",
    "avg"(("area_width_cm" * "area_height_cm")) AS "avg_area_cm2",
    "min"("price") AS "min_price",
    "max"("price") AS "max_price"
   FROM "supplier_stricker"."customization_options"
  WHERE ("is_active" = true)
  GROUP BY "technique_code", "technique_name"
  ORDER BY ("count"(DISTINCT "prod_reference")) DESC;


ALTER VIEW "supplier_stricker"."v_customization_by_technique" OWNER TO "postgres";


COMMENT ON VIEW "supplier_stricker"."v_customization_by_technique" IS 'Resumo de personalização por técnica de gravação';



CREATE OR REPLACE VIEW "supplier_stricker"."v_images_by_product" WITH ("security_invoker"='true') AS
 SELECT "p"."prod_reference",
    "p"."name",
    "p"."main_image",
    "p"."optional_image_1",
    "p"."optional_image_2",
    "o"."sku",
    "o"."color_name",
    "o"."image_1",
    "o"."image_2",
    "o"."image_3",
    "o"."image_4",
    "o"."image_5",
    "o"."image_6",
    "o"."image_7"
   FROM ("supplier_stricker"."products" "p"
     LEFT JOIN "supplier_stricker"."optionals" "o" ON ((("p"."prod_reference")::"text" = ("o"."prod_reference")::"text")))
  WHERE ("p"."is_active" = true);


ALTER VIEW "supplier_stricker"."v_images_by_product" OWNER TO "postgres";


COMMENT ON VIEW "supplier_stricker"."v_images_by_product" IS 'Todas as imagens por produto e variante';



CREATE OR REPLACE VIEW "supplier_stricker"."v_products_complete" WITH ("security_invoker"='true') AS
 SELECT "p"."id",
    "p"."prod_reference",
    "p"."name",
    "p"."description",
    "p"."brand",
    "p"."type_name",
    "p"."subtype_name",
    "p"."is_stockout",
    "p"."main_image",
    "count"("o"."id") AS "total_variants",
    "count"(DISTINCT "o"."color_code") AS "total_colors",
    "min"("o"."price_1") AS "min_price",
    "max"("o"."price_1") AS "max_price",
    COALESCE("sum"("s"."stock_quantity"), (0)::bigint) AS "total_stock",
    "p"."synced_at"
   FROM (("supplier_stricker"."products" "p"
     LEFT JOIN "supplier_stricker"."optionals" "o" ON ((("p"."prod_reference")::"text" = ("o"."prod_reference")::"text")))
     LEFT JOIN "supplier_stricker"."stocks" "s" ON ((("o"."sku")::"text" = ("s"."sku")::"text")))
  WHERE ("p"."is_active" = true)
  GROUP BY "p"."id", "p"."prod_reference", "p"."name", "p"."description", "p"."brand", "p"."type_name", "p"."subtype_name", "p"."is_stockout", "p"."main_image", "p"."synced_at";


ALTER VIEW "supplier_stricker"."v_products_complete" OWNER TO "postgres";


COMMENT ON VIEW "supplier_stricker"."v_products_complete" IS 'Visão consolidada de produtos com contagem de variantes e estoque';



CREATE OR REPLACE VIEW "supplier_stricker"."v_stock_by_product" WITH ("security_invoker"='true') AS
 SELECT "p"."prod_reference",
    "p"."name",
    "count"(DISTINCT "o"."sku") AS "total_skus",
    "sum"("s"."stock_quantity") AS "total_stock",
    "min"("s"."stock_quantity") AS "min_stock_sku",
    "max"("s"."stock_quantity") AS "max_stock_sku",
    "bool_or"(("s"."stock_quantity" > 0)) AS "has_stock",
    "min"("s"."next_date_1") AS "next_restock_date"
   FROM (("supplier_stricker"."products" "p"
     JOIN "supplier_stricker"."optionals" "o" ON ((("p"."prod_reference")::"text" = ("o"."prod_reference")::"text")))
     LEFT JOIN "supplier_stricker"."stocks" "s" ON ((("o"."sku")::"text" = ("s"."sku")::"text")))
  WHERE (("p"."is_active" = true) AND ("o"."is_active" = true))
  GROUP BY "p"."prod_reference", "p"."name";


ALTER VIEW "supplier_stricker"."v_stock_by_product" OWNER TO "postgres";


COMMENT ON VIEW "supplier_stricker"."v_stock_by_product" IS 'Estoque agregado por referência de produto';



ALTER TABLE ONLY "cf_recon"."action_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"cf_recon"."action_log_id_seq"'::"regclass");



ALTER TABLE ONLY "cf_recon"."metric_snapshot" ALTER COLUMN "id" SET DEFAULT "nextval"('"cf_recon"."metric_snapshot_id_seq"'::"regclass");



ALTER TABLE ONLY "cf_recon"."remediation" ALTER COLUMN "id" SET DEFAULT "nextval"('"cf_recon"."remediation_id_seq"'::"regclass");



ALTER TABLE ONLY "classification_audit"."category_suggestions" ALTER COLUMN "id" SET DEFAULT "nextval"('"classification_audit"."category_suggestions_id_seq"'::"regclass");



ALTER TABLE ONLY "prod_audit"."category_suggestions" ALTER COLUMN "id" SET DEFAULT "nextval"('"prod_audit"."category_suggestions_id_seq"'::"regclass");



ALTER TABLE ONLY "prod_audit"."classification_rules" ALTER COLUMN "id" SET DEFAULT "nextval"('"prod_audit"."classification_rules_id_seq"'::"regclass");



ALTER TABLE ONLY "prod_audit"."test_results" ALTER COLUMN "id" SET DEFAULT "nextval"('"prod_audit"."test_results_id_seq"'::"regclass");



ALTER TABLE ONLY "supplier_stricker"."stg_colors" ALTER COLUMN "id" SET DEFAULT "nextval"('"supplier_stricker"."stg_colors_id_seq"'::"regclass");



ALTER TABLE ONLY "supplier_stricker"."stg_customizations" ALTER COLUMN "id" SET DEFAULT "nextval"('"supplier_stricker"."stg_customizations_id_seq"'::"regclass");



ALTER TABLE ONLY "supplier_stricker"."stg_images" ALTER COLUMN "id" SET DEFAULT "nextval"('"supplier_stricker"."stg_images_id_seq"'::"regclass");



ALTER TABLE ONLY "supplier_stricker"."stg_product_types" ALTER COLUMN "id" SET DEFAULT "nextval"('"supplier_stricker"."stg_product_types_id_seq"'::"regclass");



ALTER TABLE ONLY "cf_recon"."action_log"
    ADD CONSTRAINT "action_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "cf_recon"."cf_ghost_check_queue"
    ADD CONSTRAINT "cf_ghost_check_queue_pkey" PRIMARY KEY ("image_id");



ALTER TABLE ONLY "cf_recon"."cf_image"
    ADD CONSTRAINT "cf_image_pkey" PRIMARY KEY ("image_id");



ALTER TABLE ONLY "cf_recon"."crawl_run"
    ADD CONSTRAINT "crawl_run_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "cf_recon"."metric_snapshot"
    ADD CONSTRAINT "metric_snapshot_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "cf_recon"."remediation"
    ADD CONSTRAINT "remediation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "classification_audit"."category_suggestions"
    ADD CONSTRAINT "category_suggestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "classification_audit"."category_suggestions"
    ADD CONSTRAINT "category_suggestions_product_id_category_id_key" UNIQUE ("product_id", "category_id");



ALTER TABLE ONLY "prod_audit"."category_keywords"
    ADD CONSTRAINT "category_keywords_pkey" PRIMARY KEY ("category_id");



ALTER TABLE ONLY "prod_audit"."category_suggestions"
    ADD CONSTRAINT "category_suggestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "prod_audit"."category_suggestions"
    ADD CONSTRAINT "category_suggestions_product_id_suggested_category_id_rule__key" UNIQUE ("product_id", "suggested_category_id", "rule_name");



ALTER TABLE ONLY "prod_audit"."classification_rules"
    ADD CONSTRAINT "classification_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "prod_audit"."classification_rules"
    ADD CONSTRAINT "classification_rules_rule_name_key" UNIQUE ("rule_name");



ALTER TABLE ONLY "prod_audit"."product_features"
    ADD CONSTRAINT "product_features_pkey" PRIMARY KEY ("product_id");



ALTER TABLE ONLY "prod_audit"."test_results"
    ADD CONSTRAINT "test_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "supplier_stricker"."canceled_products"
    ADD CONSTRAINT "canceled_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "supplier_stricker"."canceled_products"
    ADD CONSTRAINT "canceled_products_prod_reference_key" UNIQUE ("prod_reference");



ALTER TABLE ONLY "supplier_stricker"."category_mappings"
    ADD CONSTRAINT "category_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "supplier_stricker"."colors"
    ADD CONSTRAINT "colors_color_code_key" UNIQUE ("color_code");



ALTER TABLE ONLY "supplier_stricker"."colors"
    ADD CONSTRAINT "colors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "supplier_stricker"."customization_options"
    ADD CONSTRAINT "customization_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "supplier_stricker"."customization_options"
    ADD CONSTRAINT "customization_options_serv_code_key" UNIQUE ("serv_code");



ALTER TABLE ONLY "supplier_stricker"."customization_tables"
    ADD CONSTRAINT "customization_tables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "supplier_stricker"."customization_tables"
    ADD CONSTRAINT "customization_tables_table_code_key" UNIQUE ("table_code");



ALTER TABLE ONLY "supplier_stricker"."optionals"
    ADD CONSTRAINT "optionals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "supplier_stricker"."optionals"
    ADD CONSTRAINT "optionals_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "supplier_stricker"."product_types"
    ADD CONSTRAINT "product_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "supplier_stricker"."product_types"
    ADD CONSTRAINT "product_types_type_code_subtype_code_key" UNIQUE ("type_code", "subtype_code");



ALTER TABLE ONLY "supplier_stricker"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "supplier_stricker"."products"
    ADD CONSTRAINT "products_prod_reference_key" UNIQUE ("prod_reference");



ALTER TABLE ONLY "supplier_stricker"."stg_colors"
    ADD CONSTRAINT "stg_colors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "supplier_stricker"."stg_colors"
    ADD CONSTRAINT "stg_colors_stricker_ref_key" UNIQUE ("stricker_ref");



ALTER TABLE ONLY "supplier_stricker"."stg_customizations"
    ADD CONSTRAINT "stg_customizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "supplier_stricker"."stg_customizations"
    ADD CONSTRAINT "stg_customizations_stricker_ref_key" UNIQUE ("stricker_ref");



ALTER TABLE ONLY "supplier_stricker"."stg_images"
    ADD CONSTRAINT "stg_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "supplier_stricker"."stg_optionals"
    ADD CONSTRAINT "stg_optionals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "supplier_stricker"."stg_product_types"
    ADD CONSTRAINT "stg_product_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "supplier_stricker"."stg_product_types"
    ADD CONSTRAINT "stg_product_types_stricker_ref_key" UNIQUE ("stricker_ref");



ALTER TABLE ONLY "supplier_stricker"."stg_products"
    ADD CONSTRAINT "stg_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "supplier_stricker"."stg_stock"
    ADD CONSTRAINT "stg_stock_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "supplier_stricker"."stocks"
    ADD CONSTRAINT "stocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "supplier_stricker"."stocks"
    ADD CONSTRAINT "stocks_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "supplier_stricker"."sync_log"
    ADD CONSTRAINT "sync_log_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_analytics_mv_stock_velocity_product_id" ON "analytics"."mv_stock_velocity" USING "btree" ("product_id");



CREATE INDEX "idx_analytics_mv_stock_velocity_supplier_id" ON "analytics"."mv_stock_velocity" USING "btree" ("supplier_id");



CREATE UNIQUE INDEX "idx_mv_material_group_stats_pk" ON "analytics"."mv_material_group_stats" USING "btree" ("group_id");



CREATE UNIQUE INDEX "idx_mv_media_health_supplier" ON "analytics"."mv_media_health" USING "btree" ("source_supplier");



CREATE UNIQUE INDEX "idx_mv_product_compositions_pk" ON "analytics"."mv_product_compositions" USING "btree" ("product_id");



CREATE INDEX "idx_mv_product_intelligence_abc" ON "analytics"."mv_product_intelligence" USING "btree" ("abc_classification");



CREATE UNIQUE INDEX "idx_mv_product_intelligence_product_id_unique" ON "analytics"."mv_product_intelligence" USING "btree" ("product_id");



CREATE INDEX "idx_mv_stock_velocity_variant_id" ON "analytics"."mv_stock_velocity" USING "btree" ("variant_id");



CREATE UNIQUE INDEX "idx_tree_visual_id_unique" ON "analytics"."categories_tree_visual" USING "btree" ("id");



CREATE UNIQUE INDEX "mv_stock_velocity_pk" ON "analytics"."mv_stock_velocity" USING "btree" ("variant_supplier_source_id");



COMMENT ON INDEX "analytics"."mv_stock_velocity_pk" IS 'Índice UNIQUE criado para habilitar REFRESH MATERIALIZED VIEW CONCURRENTLY.
 O job refresh-all-materialized-views falhava com ERROR desde criação da MV.
 variant_supplier_source_id é único (18 466 rows, verificado 2026-06-18).';



CREATE UNIQUE INDEX "uidx_mv_product_cards_id" ON "analytics"."mv_product_cards" USING "btree" ("id");



CREATE INDEX "idx_cf_recon_cfimg_last_seen" ON "cf_recon"."cf_image" USING "btree" ("last_seen_at");



CREATE INDEX "idx_cf_recon_cfimg_uploaded" ON "cf_recon"."cf_image" USING "btree" ("uploaded_at");



CREATE INDEX "idx_ghost_queue_dispatch" ON "cf_recon"."cf_ghost_check_queue" USING "btree" ("enqueued_at") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_ghost_queue_status" ON "cf_recon"."cf_ghost_check_queue" USING "btree" ("status");



CREATE INDEX "idx_remediation_kind_status" ON "cf_recon"."remediation" USING "btree" ("kind", "status");



CREATE INDEX "idx_sug_gap" ON "classification_audit"."category_suggestions" USING "btree" ("already_assigned", "score" DESC);



CREATE INDEX "idx_sug_product" ON "classification_audit"."category_suggestions" USING "btree" ("product_id");



CREATE INDEX "idx_sug_score" ON "classification_audit"."category_suggestions" USING "btree" ("score" DESC);



CREATE INDEX "idx_catkw_level" ON "prod_audit"."category_keywords" USING "btree" ("level");



CREATE INDEX "idx_catkw_name_trgm" ON "prod_audit"."category_keywords" USING "gin" ("name_normalized" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_catkw_tokens" ON "prod_audit"."category_keywords" USING "gin" ("tokens");



CREATE INDEX "idx_catsug_confidence" ON "prod_audit"."category_suggestions" USING "btree" ("confidence");



CREATE INDEX "idx_catsug_product" ON "prod_audit"."category_suggestions" USING "btree" ("product_id");



CREATE INDEX "idx_catsug_rule" ON "prod_audit"."category_suggestions" USING "btree" ("rule_name");



CREATE INDEX "idx_catsug_unreviewed" ON "prod_audit"."category_suggestions" USING "btree" ("reviewed") WHERE ("reviewed" = false);



CREATE INDEX "idx_pf_current" ON "prod_audit"."product_features" USING "gin" ("current_categories");



CREATE INDEX "idx_pf_materials" ON "prod_audit"."product_features" USING "gin" ("materials");



CREATE INDEX "idx_pf_name_trgm" ON "prod_audit"."product_features" USING "gin" ("name_normalized" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_pf_tokens" ON "prod_audit"."product_features" USING "gin" ("tokens");



CREATE INDEX "idx_test_results_batch_result" ON "prod_audit"."test_results" USING "btree" ("batch", "result");



CREATE INDEX "idx_test_results_severity_fail" ON "prod_audit"."test_results" USING "btree" ("severity") WHERE ("result" = 'fail'::"text");



CREATE UNIQUE INDEX "category_mappings_unique_idx" ON "supplier_stricker"."category_mappings" USING "btree" ("type_code", COALESCE("sub_type_code", ''::character varying));



CREATE INDEX "idx_ss_category_mappings_category_id" ON "supplier_stricker"."category_mappings" USING "btree" ("category_id");



CREATE INDEX "idx_ss_stg_product_types_mapped_to_category_id" ON "supplier_stricker"."stg_product_types" USING "btree" ("mapped_to_category_id");



CREATE INDEX "idx_stricker_canceled_date" ON "supplier_stricker"."canceled_products" USING "btree" ("canceled_at");



CREATE INDEX "idx_stricker_colors_name" ON "supplier_stricker"."colors" USING "btree" ("color_name");



CREATE INDEX "idx_stricker_custom_active" ON "supplier_stricker"."customization_options" USING "btree" ("is_active");



CREATE INDEX "idx_stricker_custom_ref" ON "supplier_stricker"."customization_options" USING "btree" ("prod_reference");



CREATE INDEX "idx_stricker_custom_tech" ON "supplier_stricker"."customization_options" USING "btree" ("technique_code");



CREATE INDEX "idx_stricker_optionals_active" ON "supplier_stricker"."optionals" USING "btree" ("is_active");



CREATE INDEX "idx_stricker_optionals_color" ON "supplier_stricker"."optionals" USING "btree" ("color_code");



CREATE INDEX "idx_stricker_optionals_ref" ON "supplier_stricker"."optionals" USING "btree" ("prod_reference");



CREATE INDEX "idx_stricker_optionals_size" ON "supplier_stricker"."optionals" USING "btree" ("size");



CREATE INDEX "idx_stricker_optionals_synced" ON "supplier_stricker"."optionals" USING "btree" ("synced_at");



CREATE INDEX "idx_stricker_optionals_websku" ON "supplier_stricker"."optionals" USING "btree" ("web_sku");



CREATE INDEX "idx_stricker_stocks_qty" ON "supplier_stricker"."stocks" USING "btree" ("stock_quantity");



CREATE INDEX "idx_stricker_stocks_synced" ON "supplier_stricker"."stocks" USING "btree" ("last_sync_at");



CREATE INDEX "idx_stricker_synclog_started" ON "supplier_stricker"."sync_log" USING "btree" ("started_at");



CREATE INDEX "idx_stricker_synclog_status" ON "supplier_stricker"."sync_log" USING "btree" ("status");



CREATE INDEX "idx_stricker_synclog_type" ON "supplier_stricker"."sync_log" USING "btree" ("sync_type");



CREATE INDEX "idx_stricker_tables_active" ON "supplier_stricker"."customization_tables" USING "btree" ("is_active");



CREATE INDEX "idx_stricker_tables_tech" ON "supplier_stricker"."customization_tables" USING "btree" ("technique_code");



CREATE INDEX "idx_stricker_types_code" ON "supplier_stricker"."product_types" USING "btree" ("type_code");



CREATE INDEX "idx_stricker_types_level" ON "supplier_stricker"."product_types" USING "btree" ("level");



CREATE INDEX "idx_stricker_types_subtype" ON "supplier_stricker"."product_types" USING "btree" ("subtype_code");



CREATE INDEX "stg_optionals_processed_idx" ON "supplier_stricker"."stg_optionals" USING "btree" ("processed");



CREATE INDEX "stg_optionals_prod_reference_idx" ON "supplier_stricker"."stg_optionals" USING "btree" ("prod_reference");



CREATE UNIQUE INDEX "stg_optionals_unique_idx" ON "supplier_stricker"."stg_optionals" USING "btree" ("prod_reference", "sku");



CREATE INDEX "stg_products_processed_idx" ON "supplier_stricker"."stg_products" USING "btree" ("processed");



CREATE UNIQUE INDEX "stg_products_prod_reference_uidx" ON "supplier_stricker"."stg_products" USING "btree" ("prod_reference");



CREATE UNIQUE INDEX "stg_stock_sku_uidx" ON "supplier_stricker"."stg_stock" USING "btree" ("sku");



CREATE OR REPLACE TRIGGER "trg_customization_options_updated" BEFORE UPDATE ON "supplier_stricker"."customization_options" FOR EACH ROW EXECUTE FUNCTION "supplier_stricker"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_customization_tables_updated" BEFORE UPDATE ON "supplier_stricker"."customization_tables" FOR EACH ROW EXECUTE FUNCTION "supplier_stricker"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_optionals_updated" BEFORE UPDATE ON "supplier_stricker"."optionals" FOR EACH ROW EXECUTE FUNCTION "supplier_stricker"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_products_updated" BEFORE UPDATE ON "supplier_stricker"."products" FOR EACH ROW EXECUTE FUNCTION "supplier_stricker"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_stocks_updated" BEFORE UPDATE ON "supplier_stricker"."stocks" FOR EACH ROW EXECUTE FUNCTION "supplier_stricker"."update_timestamp"();



ALTER TABLE ONLY "supplier_stricker"."category_mappings"
    ADD CONSTRAINT "category_mappings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "supplier_stricker"."customization_options"
    ADD CONSTRAINT "fk_customization_product" FOREIGN KEY ("prod_reference") REFERENCES "supplier_stricker"."products"("prod_reference") ON DELETE CASCADE;



ALTER TABLE ONLY "supplier_stricker"."optionals"
    ADD CONSTRAINT "fk_optionals_product" FOREIGN KEY ("prod_reference") REFERENCES "supplier_stricker"."products"("prod_reference") ON DELETE CASCADE;



ALTER TABLE ONLY "supplier_stricker"."stocks"
    ADD CONSTRAINT "fk_stocks_optional" FOREIGN KEY ("sku") REFERENCES "supplier_stricker"."optionals"("sku") ON DELETE CASCADE;



ALTER TABLE ONLY "supplier_stricker"."stg_product_types"
    ADD CONSTRAINT "stg_product_types_mapped_to_category_id_fkey" FOREIGN KEY ("mapped_to_category_id") REFERENCES "public"."categories"("id");



ALTER TABLE "cf_recon"."action_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_only" ON "cf_recon"."action_log" TO "authenticated" USING ("public"."is_admin_or_above"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_admin_or_above"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "admin_only" ON "cf_recon"."cf_ghost_check_queue" TO "authenticated" USING ("public"."is_admin_or_above"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_admin_or_above"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "admin_only" ON "cf_recon"."cf_image" TO "authenticated" USING ("public"."is_admin_or_above"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_admin_or_above"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "admin_only" ON "cf_recon"."crawl_run" TO "authenticated" USING ("public"."is_admin_or_above"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_admin_or_above"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "admin_only" ON "cf_recon"."metric_snapshot" TO "authenticated" USING ("public"."is_admin_or_above"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_admin_or_above"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "admin_only" ON "cf_recon"."remediation" TO "authenticated" USING ("public"."is_admin_or_above"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_admin_or_above"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "cf_recon"."cf_ghost_check_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "cf_recon"."cf_image" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "cf_recon"."crawl_run" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "cf_recon"."metric_snapshot" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "cf_recon"."remediation" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "analytics" TO "authenticated";
GRANT USAGE ON SCHEMA "analytics" TO "service_role";
GRANT USAGE ON SCHEMA "analytics" TO "anon";



GRANT USAGE ON SCHEMA "supplier_stricker" TO "service_role";



GRANT ALL ON TABLE "analytics"."categories_tree_visual" TO "service_role";
GRANT SELECT ON TABLE "analytics"."categories_tree_visual" TO "authenticated";



GRANT ALL ON TABLE "analytics"."mv_material_group_stats" TO "service_role";



GRANT ALL ON TABLE "analytics"."mv_media_health" TO "service_role";



GRANT SELECT ON TABLE "analytics"."mv_product_cards" TO "service_role";
GRANT SELECT ON TABLE "analytics"."mv_product_cards" TO "authenticated";



GRANT ALL ON TABLE "analytics"."mv_product_compositions" TO "service_role";
GRANT SELECT ON TABLE "analytics"."mv_product_compositions" TO "authenticated";



GRANT SELECT ON TABLE "analytics"."mv_stock_velocity" TO "service_role";
GRANT SELECT ON TABLE "analytics"."mv_stock_velocity" TO "authenticated";



GRANT SELECT ON TABLE "analytics"."mv_product_intelligence" TO "service_role";
GRANT SELECT ON TABLE "analytics"."mv_product_intelligence" TO "authenticated";



GRANT ALL ON TABLE "cf_recon"."action_log" TO "service_role";



GRANT ALL ON TABLE "cf_recon"."cf_ghost_check_queue" TO "service_role";



GRANT ALL ON TABLE "cf_recon"."cf_image" TO "service_role";



GRANT ALL ON TABLE "cf_recon"."crawl_run" TO "service_role";



GRANT ALL ON TABLE "cf_recon"."metric_snapshot" TO "service_role";



GRANT ALL ON TABLE "cf_recon"."remediation" TO "service_role";



GRANT SELECT ON TABLE "supplier_stricker"."canceled_products" TO "service_role";
GRANT SELECT ON TABLE "supplier_stricker"."canceled_products" TO "authenticated";



GRANT SELECT ON TABLE "supplier_stricker"."category_mappings" TO "authenticated";



GRANT SELECT ON TABLE "supplier_stricker"."colors" TO "service_role";
GRANT SELECT ON TABLE "supplier_stricker"."colors" TO "authenticated";



GRANT SELECT ON TABLE "supplier_stricker"."customization_options" TO "service_role";
GRANT SELECT ON TABLE "supplier_stricker"."customization_options" TO "authenticated";



GRANT SELECT ON TABLE "supplier_stricker"."customization_tables" TO "service_role";
GRANT SELECT ON TABLE "supplier_stricker"."customization_tables" TO "authenticated";



GRANT SELECT ON TABLE "supplier_stricker"."optionals" TO "service_role";
GRANT SELECT ON TABLE "supplier_stricker"."optionals" TO "authenticated";



GRANT SELECT ON TABLE "supplier_stricker"."product_types" TO "service_role";
GRANT SELECT ON TABLE "supplier_stricker"."product_types" TO "authenticated";



GRANT SELECT ON TABLE "supplier_stricker"."products" TO "service_role";
GRANT SELECT ON TABLE "supplier_stricker"."products" TO "authenticated";



GRANT SELECT ON TABLE "supplier_stricker"."stg_optionals" TO "authenticated";



GRANT SELECT ON TABLE "supplier_stricker"."stg_products" TO "authenticated";



GRANT SELECT ON TABLE "supplier_stricker"."stg_stock" TO "authenticated";



GRANT SELECT ON TABLE "supplier_stricker"."stocks" TO "service_role";
GRANT SELECT ON TABLE "supplier_stricker"."stocks" TO "authenticated";



GRANT SELECT ON TABLE "supplier_stricker"."sync_log" TO "service_role";
GRANT SELECT ON TABLE "supplier_stricker"."sync_log" TO "authenticated";



GRANT SELECT ON TABLE "supplier_stricker"."v_customization_by_technique" TO "service_role";
GRANT SELECT ON TABLE "supplier_stricker"."v_customization_by_technique" TO "authenticated";



GRANT SELECT ON TABLE "supplier_stricker"."v_images_by_product" TO "service_role";
GRANT SELECT ON TABLE "supplier_stricker"."v_images_by_product" TO "authenticated";



GRANT SELECT ON TABLE "supplier_stricker"."v_products_complete" TO "service_role";
GRANT SELECT ON TABLE "supplier_stricker"."v_products_complete" TO "authenticated";



GRANT SELECT ON TABLE "supplier_stricker"."v_stock_by_product" TO "service_role";
GRANT SELECT ON TABLE "supplier_stricker"."v_stock_by_product" TO "authenticated";




