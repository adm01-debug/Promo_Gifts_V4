/**
 * Lê `products.ships_separately` direto da tabela-base.
 *
 * O formulário de produto carrega o cadastro por `v_products_public`, que não
 * expõe esta coluna. Sem esta leitura, o formulário abriria sempre com
 * "Não mistura" desligado e, ao salvar, apagaria a marcação em silêncio.
 * Em erro lança: assumir `false` aqui seria o mesmo apagamento.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export async function fetchShipsSeparately(productId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('products')
    .select('ships_separately')
    .eq('id', productId)
    .maybeSingle();
  if (error) {
    logger.error('[productShipsSeparatelyService] falha ao ler ships_separately', {
      code: error.code,
      message: error.message,
    });
    throw error;
  }
  return data?.ships_separately ?? false;
}
