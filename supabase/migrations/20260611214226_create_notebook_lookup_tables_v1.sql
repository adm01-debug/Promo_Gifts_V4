
-- ═══════════════════════════════════════════════════════════════════
-- MÓDULO MATERIAL GRÁFICO — TABELAS DE LOOKUP
-- Inclui B5, Pele reciclada, Percalux, Couchê e Pencil_included
-- ═══════════════════════════════════════════════════════════════════

-- 1. PAPER_FORMATS (Formatos de papel - ISO + B-series)
CREATE TABLE IF NOT EXISTS public.paper_formats (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  code          varchar(10)  NOT NULL UNIQUE,
  name          varchar(30)  NOT NULL,
  width_cm      numeric(6,2) NOT NULL,
  height_cm     numeric(6,2) NOT NULL,
  description   text,
  display_order int          DEFAULT 0,
  is_active     boolean      NOT NULL DEFAULT true,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.paper_formats IS 'Formatos ISO/B de papel para cadernos e blocos';

INSERT INTO public.paper_formats (code, name, width_cm, height_cm, description, display_order) VALUES
  ('A3',  'A3',  29.7, 42.0, 'Grande — apresentações e mapas',     10),
  ('A4',  'A4',  21.0, 29.7, 'Padrão — folha de impressora',       20),
  ('B5',  'B5',  17.6, 25.0, 'Agenda — ligeiramente maior que A5', 25),
  ('A5',  'A5',  14.8, 21.0, 'Mais popular — portátil e compacto', 30),
  ('A6',  'A6',  10.5, 14.8, 'Bolso — compacto',                   40),
  ('A7',  'A7',   7.4, 10.5, 'Mini — notas rápidas',               50)
ON CONFLICT (code) DO NOTHING;

-- 2. PAPER_RULINGS (Tipos de pauta)
CREATE TABLE IF NOT EXISTS public.paper_rulings (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  code          varchar(20) NOT NULL UNIQUE,
  name          varchar(50) NOT NULL,
  description   text,
  display_order int         DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.paper_rulings IS 'Tipo de pauta do papel interno do caderno';

INSERT INTO public.paper_rulings (code, name, description, display_order) VALUES
  ('BLANK',   'Liso',         'Sem pauta — folhas em branco',            10),
  ('RULED',   'Pautado',      'Linhas horizontais',                       20),
  ('GRID',    'Quadriculado', 'Quadrados 5×5mm padrão',                   30),
  ('DOTTED',  'Pontilhado',   'Pontos espaçados — bullet journal',         40),
  ('PLANNER', 'Planner',      'Layout de planejamento diário ou semanal', 50)
ON CONFLICT (code) DO NOTHING;

-- 3. PAPER_WEIGHTS (Gramaturas)
CREATE TABLE IF NOT EXISTS public.paper_weights (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  weight_gsm    int          NOT NULL UNIQUE,
  description   varchar(50),
  typical_use   varchar(100),
  display_order int          DEFAULT 0,
  is_active     boolean      NOT NULL DEFAULT true,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.paper_weights IS 'Gramatura em g/m² do papel dos cadernos';

INSERT INTO public.paper_weights (weight_gsm, description, typical_use, display_order) VALUES
  (60,  'Leve',         'Blocos econômicos e cadernos simples',    10),
  (70,  'Padrão leve',  'Cadernos escolares e agendas',            20),
  (75,  'Sulfite',      'Cadernetas gerais',                       30),
  (80,  'Padrão',       'Cadernos corporativos — mais popular',    40),
  (90,  'Médio',        'Bullet journal e cadernos premium',       50),
  (100, 'Grosso',       'Sketchbooks leves',                       60),
  (120, 'Extra-grosso', 'Desenho e aquarela leve',                 70),
  (150, 'Couchê leve',  'Impressão de alta qualidade, couchê',     80),
  (180, 'Couchê pesado','Desenho artístico e premium',             90)
ON CONFLICT (weight_gsm) DO NOTHING;

-- 4. PAPER_COLORS (Cores do papel)
CREATE TABLE IF NOT EXISTS public.paper_colors (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  code          varchar(20) NOT NULL UNIQUE,
  name          varchar(50) NOT NULL,
  description   text,
  display_order int         DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.paper_colors (code, name, description, display_order) VALUES
  ('WHITE',    'Branco',           'Papel branco padrão',                     10),
  ('IVORY',    'Marfim / Creme',   'Tom bege claro — marfim, amarelado',      20),
  ('YELLOW',   'Amarelo / Pólen',  'Papel pólen natural',                     30),
  ('RECYCLED', 'Bege Reciclado',   'Tom natural do papel reciclado / kraft',  40)
ON CONFLICT (code) DO NOTHING;

-- 5. BINDING_TYPES (Tipos de encadernação)
CREATE TABLE IF NOT EXISTS public.binding_types (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  code          varchar(20) NOT NULL UNIQUE,
  name_pt       varchar(60) NOT NULL,
  name_en       varchar(60),
  description   text,
  max_sheets    int,
  display_order int         DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.binding_types (code, name_pt, name_en, description, max_sheets, display_order) VALUES
  ('SPIRAL',  'Espiral',                    'Spiral',         'Espiral plástico ou metálico — furos redondos',    400, 10),
  ('WIRE_O',  'Wire-O',                     'Wire-O/Twin',    'Duplo anel metálico — furos quadrados',            250, 20),
  ('PERFECT', 'Brochura / Lombada Quadrada','Perfect Bound',  'Colado com cola hot melt — sem argolas',           200, 30),
  ('SADDLE',  'Canoa / Grampo',             'Saddle Stitch',  'Grampeado na dobra central',                        64, 40),
  ('SEWN',    'Costurado',                  'Sewn/Stitched',  'Cadernos costurados — máxima durabilidade',        900, 50),
  ('CASE',    'Capa Dura Encadernada',      'Case Bound',     'Capa dura colada à lombada',                       500, 60),
  ('DISC',    'Disco',                      'Disc Bound',     'Discos plásticos removíveis',                     NULL, 70),
  ('RING',    'Argolas / Fichário',         'Ring Bound',     'Argolas metálicas — removíveis',                  NULL, 80)
ON CONFLICT (code) DO NOTHING;

-- 6. BINDING_COLORS (Cores de espiral / wire-o)
CREATE TABLE IF NOT EXISTS public.binding_colors (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  code          varchar(20) NOT NULL UNIQUE,
  name          varchar(40) NOT NULL,
  hex_color     varchar(7),
  display_order int         DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.binding_colors (code, name, hex_color, display_order) VALUES
  ('BLACK',  'Preto',   '#000000', 10),
  ('SILVER', 'Prata',   '#C0C0C0', 20),
  ('GOLD',   'Dourado', '#FFD700', 30),
  ('WHITE',  'Branco',  '#FFFFFF', 40)
ON CONFLICT (code) DO NOTHING;

-- 7. COVER_TYPES (Rigidez da capa)
CREATE TABLE IF NOT EXISTS public.cover_types (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  code          varchar(20) NOT NULL UNIQUE,
  name          varchar(50) NOT NULL,
  description   text,
  display_order int         DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.cover_types (code, name, description, display_order) VALUES
  ('HARD', 'Capa Dura',       'Rígida — cartão grosso, papelão',          10),
  ('SOFT', 'Capa Flexível',   'Cartão ou papel flexível — dobrável',      20),
  ('SEMI', 'Semi-Rígida',     'Intermediária entre dura e flexível',      30)
ON CONFLICT (code) DO NOTHING;

-- 8. COVER_MATERIALS (Materiais de revestimento da capa) 
-- Inclui Percalux, Pele reciclada e Linho (ausentes no doc original)
CREATE TABLE IF NOT EXISTS public.cover_materials (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  code            varchar(30) NOT NULL UNIQUE,
  name            varchar(80) NOT NULL,
  description     text,
  is_eco_friendly boolean     NOT NULL DEFAULT false,
  display_order   int         DEFAULT 0,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.cover_materials (code, name, description, is_eco_friendly, display_order) VALUES
  ('CARDBOARD',          'Cartão / Papelão',             'Papelão, cartão duplex — básico e econômico',           false, 10),
  ('CARDBOARD_PVC',      'Cartão Revestido PVC',         'Cartão com película PVC brilhante ou fosco',            false, 20),
  ('SYNTHETIC_LEATHER',  'Couro Sintético / Courvin',    'PU ou PVC imitando couro — mais comum em cadernetas',   false, 30),
  ('GENUINE_LEATHER',    'Couro Legítimo',               'Couro natural bovino',                                  false, 40),
  ('RECYCLED_LEATHER',   'Pele / Couro Reciclado',       'Couro com % reciclada (ex: 58% reciclada) — Stricker',  true,  45),
  ('PU',                 'Poliuretano (PU)',              'Material sintético macio — vegano, resistente',         false, 50),
  ('PU_WATER',           'PU à base de água',            'PU com processo de fabricação menos poluente',          true,  55),
  ('POLYLEATHER',        'Polipele',                     'Similar a couro sintético — toque suave',               false, 60),
  ('CORK',               'Cortiça',                      'Material natural sustentável — muito popular no SPOT',  true,  70),
  ('BAMBOO',             'Bambu',                        'Placa de bambu comprimido — eco-friendly',              true,  80),
  ('PERCALUX',           'Percalux',                     'Tecido sintético texturizado — popular no XBZ',         false, 85),
  ('RUBBER',             'Borracha / Emborrachado',      'Soft touch, toque macio — cadernetas XBZ populares',   false, 90),
  ('KRAFT',              'Kraft',                        'Papel kraft natural não branqueado',                    true, 100),
  ('FABRIC',             'Tecido',                       'Linho, algodão, poliéster ou tecido misto',             false, 110),
  ('LINEN',              'Linho',                        'Tecido de linho natural — eco-friendly',                true, 115),
  ('PLASTIC',            'Plástico',                     'PP, PVC transparente ou cromado',                       false, 120),
  ('RPET',               'RPET',                         'Plástico reciclado (PET reciclado)',                    true, 130),
  ('RECYCLED_MILK',      'Embalagens de Leite Recicladas','Material reciclado de embalagens Tetra Pak',           true, 140),
  ('COUCHE',             'Couchê',                       'Papel couchê com acabamento brilhante ou fosco',        false, 145)
ON CONFLICT (code) DO NOTHING;

-- 9. COVER_FINISHES (Acabamentos superficiais)
CREATE TABLE IF NOT EXISTS public.cover_finishes (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  code          varchar(20) NOT NULL UNIQUE,
  name          varchar(50) NOT NULL,
  description   text,
  display_order int         DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.cover_finishes (code, name, description, display_order) VALUES
  ('MATTE',     'Fosco',               'Sem brilho — aspecto opaco',                   10),
  ('GLOSSY',    'Brilhante',           'Alto brilho — acabamento plástico',             20),
  ('SOFT_TOUCH','Soft Touch',          'Toque aveludado — o mais popular em premium',   30),
  ('TEXTURED',  'Texturizado',         'Com textura tátil',                             40),
  ('LAMINATED', 'Laminado',            'Com película protetora transparente',           50),
  ('UV_SPOT',   'Verniz UV Localizado','Brilho em áreas específicas — efeito especial', 60),
  ('EMBOSSED',  'Alto Relevo',         'Gravação em relevo — sela / logotipo',          70),
  ('DEBOSSED',  'Baixo Relevo',        'Gravação rebaixada — clássica em cadernetas',   80),
  ('METALLIC',  'Metalizado',          'Efeito metálico / cromado',                     90)
ON CONFLICT (code) DO NOTHING;

-- 10. NOTEBOOK_FEATURES (Características e acessórios)
-- Inclui PENCIL_INCLUDED (ausente no doc original — VILAÇA tem lápis)
CREATE TABLE IF NOT EXISTS public.notebook_features (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  code          varchar(30) NOT NULL UNIQUE,
  name          varchar(60) NOT NULL,
  description   text,
  display_order int         DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.notebook_features (code, name, description, display_order) VALUES
  ('ELASTIC',          'Elástico',           'Faixa elástica para fechar',                            10),
  ('BOOKMARK',         'Marca-Página',       'Fita de cetim para marcar páginas',                     20),
  ('POCKET',           'Bolso Interior',     'Bolso na contracapa ou frontal para documentos',        30),
  ('PEN_LOOP',         'Porta-Caneta',       'Suporte lateral para caneta ou lapiseira',              40),
  ('ROUNDED',          'Cantos Arredondados','Evita "orelhas" e desgaste nos cantos',                 50),
  ('PERFORATED',       'Microperfurado',     'Folhas destacáveis com perfuração',                     60),
  ('NUMBERED',         'Páginas Numeradas',  'Com numeração de página impressa',                      70),
  ('INDEX',            'Índice',             'Páginas de índice para organização',                    80),
  ('CALENDAR',         'Calendário',         'Com calendário impresso nas páginas',                   90),
  ('MAGNETIC',         'Fecho Magnético',    'Imã para fechar — mais seguro e elegante',             100),
  ('PEN_INCLUDED',     'Caneta Incluída',    'Vem com caneta esferográfica no kit',                  110),
  ('PENCIL_INCLUDED',  'Lápis Incluído',     'Vem com lápis (e/ou borracha) no kit — ex: VILAÇA',   120),
  ('MULTIPLE_BOOKMARK','Múltiplos Marcadores','2 ou mais fitas marcadoras de página',                 130),
  ('RULER',            'Régua Inclusa',      'Vem com régua de papel ou plástico',                   140),
  ('STICKY_NOTES',     'Adesivos Inclusos',  'Bloco de notas adesivas incluído no kit',              150)
ON CONFLICT (code) DO NOTHING;

-- ── Timestamps automáticos ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ 
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'paper_formats','paper_rulings','paper_weights','paper_colors',
    'binding_types','binding_colors','cover_types','cover_materials',
    'cover_finishes','notebook_features'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%s;
       CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%s
       FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END $$;
;
