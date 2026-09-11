UPDATE supplier_settings SET default_is_imported = true WHERE supplier_id = bcfc0d02... AND default_is_imported IS NULL;
Spot/Stricker: default_is_imported NULL → true;
Todos os 5 suppliers ativos agora têm settings completos sem NULL em campos críticos;
