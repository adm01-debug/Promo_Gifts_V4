INSERT INTO supplier_field_mappings (supplier_id, source_field, target_field, target_table, transform_type)
VALUES (
  (SELECT id FROM suppliers WHERE code = 'XBZ'),
  'IpiTaxa',
  'supplier_ipi_rate',
  'variant_supplier_sources',
  'direct'
);
