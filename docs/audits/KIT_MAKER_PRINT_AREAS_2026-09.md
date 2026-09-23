# Kit Maker — cobertura de áreas de gravação (23/09/2026)

Consulta ao projeto canônico `doufsxqlfjyuvxuezpln`, via `v_kit_component_print_areas_public` (join `products` → `product_kit_components` → `kit_component_print_areas`, filtrando `is_active`).

| Métrica | Valor |
| --- | --- |
| Produtos ativos (`product`/`kit`) | 7.664 |
| Produtos com ≥ 1 área de gravação cadastrada | 953 |
| Cobertura | ~12,4% |

## Leitura para a etapa 12 (Área de aplicação real na Personalização)

Cobertura baixa confirma que o fallback fixo "Frente" precisa continuar funcionando para a maioria dos produtos — a etapa 12 troca o select fixo por um select com as áreas reais **apenas quando existirem**, sem regressão para os ~88% sem cadastro. Não há indicação, nesta consulta, de quais produtos especificamente carecem de área; uma curadoria dos mais usados fica como possível trabalho futuro de dado, fora deste plano técnico.
