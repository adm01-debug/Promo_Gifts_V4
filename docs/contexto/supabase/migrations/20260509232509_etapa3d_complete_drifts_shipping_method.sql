-- Completar Etapa 3D: shipping_method em quotes + índice no quote_items
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS shipping_method text;

CREATE INDEX IF NOT EXISTS idx_quote_items_kit_group 
  ON public.quote_items(kit_group_id) 
  WHERE kit_group_id IS NOT NULL;

-- Comments faltantes
COMMENT ON COLUMN public.orders.total IS
  'Alias gerado de total_amount. Mantido por compatibilidade com hook useClientOrdersHistory que seleciona "total". Read-only.';
COMMENT ON COLUMN public.orders.client_company IS
  'Nome da empresa cliente. NULL até integração Bitrix CRM popular. Hook useClientOrdersHistory lê via SELECT.';
COMMENT ON COLUMN public.quotes.discount_percent IS
  'Desconto exposto ao cliente (% sobre subtotal). Coexiste com discount_percentage legacy — código novo usa discount_percent.';
COMMENT ON COLUMN public.quotes.negotiation_markup_percent IS
  'Markup INTERNO 0–50%. Infla subtotal apresentado para criar margem psicológica de desconto. NUNCA exposto ao cliente.';
COMMENT ON COLUMN public.quotes.real_subtotal IS
  'Subtotal real (sem markup de negociação). Calculado por trigger no cutover. Read-only.';
COMMENT ON COLUMN public.quotes.real_discount_percent IS
  'Desconto efetivo real vs real_subtotal. Validado contra alçada do vendedor. Read-only.';
COMMENT ON COLUMN public.quote_items.sort_order IS
  'Ordem de apresentação. Coexiste com display_order legacy — código novo usa sort_order.';
COMMENT ON COLUMN public.quote_items.price_updated_at IS
  'Timestamp da última atualização de preço no catálogo SSOT. Usado pelo badge de preço defasado.';
COMMENT ON COLUMN public.quote_items.price_confirmed_at IS
  'Timestamp em que vendedor confirmou preço com fornecedor. Quando NOT NULL suprime badge de defasagem.';
