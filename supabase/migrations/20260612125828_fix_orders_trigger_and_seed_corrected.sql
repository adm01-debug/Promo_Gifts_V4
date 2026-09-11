
-- Trigger de order_number (separado do INSERT para garantir atomicidade)
CREATE TRIGGER trg_orders_gen_number
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.generate_order_number_v5();

-- Pedidos de teste com valores dentro dos check constraints
-- fulfillment_status: pending/processing/shipped/delivered (sem 'unfulfilled')
INSERT INTO public.orders (
  seller_id, organization_id, client_name, client_company,
  subtotal, discount_amount, shipping_cost, total,
  status, fulfillment_status, payment_status, payment_method,
  created_at, updated_at
) VALUES
(
  '75921d8b-611f-4413-9ce5-afccdb733d26',
  '5db5aee1-064b-4ef4-9193-345dcd8274ea',
  'Maria Fernanda Costa', 'TechCorp Brasil LTDA',
  11500.00, 500.00, 350.00, 11350.00,
  'confirmed', 'processing', 'pending', 'boleto',
  now() - INTERVAL '5 days', now() - INTERVAL '5 days'
),
(
  '75921d8b-611f-4413-9ce5-afccdb733d26',
  '5db5aee1-064b-4ef4-9193-345dcd8274ea',
  'Carlos Mendes', 'Grupo Alfa Comercial',
  4200.00, 0.00, 250.00, 4450.00,
  'delivered', 'delivered', 'paid', 'pix',
  now() - INTERVAL '12 days', now() - INTERVAL '12 days'
),
(
  '75921d8b-611f-4413-9ce5-afccdb733d26',
  '5db5aee1-064b-4ef4-9193-345dcd8274ea',
  'Ana Luiza Dias', 'Construtora Primavera',
  1850.00, 100.00, 0.00, 1750.00,
  'delivered', 'delivered', 'paid', 'cartao_credito',
  now() - INTERVAL '18 days', now() - INTERVAL '18 days'
),
(
  '75921d8b-611f-4413-9ce5-afccdb733d26',
  '5db5aee1-064b-4ef4-9193-345dcd8274ea',
  'Roberto Alves', 'Banco Meridiano SA',
  8750.00, 875.00, 400.00, 8275.00,
  'confirmed', 'processing', 'pending', 'transferencia',
  now() - INTERVAL '2 days', now() - INTERVAL '2 days'
),
(
  '75921d8b-611f-4413-9ce5-afccdb733d26',
  '5db5aee1-064b-4ef4-9193-345dcd8274ea',
  'Juliana Pires', 'Startup Criativa EIRELI',
  3300.00, 0.00, 150.00, 3450.00,
  'pending', 'pending', 'pending', 'pix',
  now(), now()
);
;
