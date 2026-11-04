-- ═══════════════════════════════════════════════════════════════
-- FASE A5: CRIAR TABELA kit_component_print_areas
-- Áreas de gravação vinculadas a componentes individuais de kits
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE kit_component_print_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- FK PRINCIPAL: qual componente do kit
    kit_component_id UUID NOT NULL REFERENCES product_kit_components(id) ON DELETE CASCADE,
    
    -- FK TÉCNICA: qual técnica de gravação + tabela de preço
    tabela_preco_id UUID NOT NULL REFERENCES tabela_preco_gravacao_oficial(id),
    
    -- LOCAL DE GRAVAÇÃO
    location_code TEXT NOT NULL,
    location_name TEXT,
    location_order INTEGER DEFAULT 1,
    
    -- DIMENSÕES MÁXIMAS DA ÁREA
    max_width NUMERIC NOT NULL,
    max_height NUMERIC NOT NULL,
    
    -- FORMA DA ÁREA
    shape TEXT NOT NULL DEFAULT 'rectangle',
    is_curved BOOLEAN NOT NULL DEFAULT false,
    
    -- ORDEM E STATUS
    technique_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- AUDITORIA
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- UNIQUE: mesmo componente + mesmo local + mesma técnica não pode repetir
CREATE UNIQUE INDEX uq_kcpa_component_location_tecnica 
ON kit_component_print_areas (kit_component_id, location_code, tabela_preco_id);

-- PERFORMANCE
CREATE INDEX idx_kcpa_component 
ON kit_component_print_areas (kit_component_id);

CREATE INDEX idx_kcpa_tabela 
ON kit_component_print_areas (tabela_preco_id);

CREATE INDEX idx_kcpa_active 
ON kit_component_print_areas (kit_component_id, is_active);

-- COMENTÁRIO
COMMENT ON TABLE kit_component_print_areas IS 
'Áreas de gravação vinculadas a componentes individuais de kits.
Cada componente (faca, estojo, tábua) pode ter N locais de gravação,
e cada local pode ter N técnicas disponíveis.
Reutiliza tabela de preços: tabela_preco_gravacao_oficial + faixas.
Criada em 14/03/2026 - Plano Executivo KITS v4.';
