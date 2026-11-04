ALTER VIEW supplier_stricker.v_customization_by_technique SET (security_invoker = true);
ALTER VIEW supplier_stricker.v_images_by_product        SET (security_invoker = true);
ALTER VIEW supplier_stricker.v_products_complete        SET (security_invoker = true);
ALTER VIEW supplier_stricker.v_stock_by_product         SET (security_invoker = true);
ALTER VIEW classification_audit.v_gaps_acionaveis      SET (security_invoker = true);
ALTER VIEW classification_audit.v_kits_para_revisao    SET (security_invoker = true);
ALTER VIEW prod_audit.v_category_suggestions_review    SET (security_invoker = true);
