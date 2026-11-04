CREATE TABLE IF NOT EXISTS _asia_api_staging (
    referencia TEXT PRIMARY KEY,
    nome TEXT,
    raw_json JSONB NOT NULL,
    propriedades JSONB,
    altura INTEGER DEFAULT 0,
    largura INTEGER DEFAULT 0,
    comprimento INTEGER DEFAULT 0,
    peso NUMERIC DEFAULT 0,
    origem_faturamento VARCHAR(2),
    promocao INTEGER DEFAULT 0,
    categorias JSONB,
    tags JSONB,
    galeria JSONB,
    video TEXT,
    total_variacoes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE _asia_api_staging IS 'Staging temporário com dados completos da API Asia Import - Criado 13/03/2026';
