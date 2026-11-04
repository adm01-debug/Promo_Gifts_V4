-- Passo 2: Criar supplier_field_mapping para XBZ Disponivel → supplier_availability_status
INSERT INTO supplier_field_mappings (supplier_id, source_field, target_field, target_table, transform_type)
VALUES (
  (SELECT id FROM suppliers WHERE code = 'XBZ'),
  'Disponivel',
  'supplier_availability_status',
  'variant_supplier_sources',
  'direct'
);
