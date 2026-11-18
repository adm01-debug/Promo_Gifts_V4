/**
 * Bitrix sync logic extracted from QuoteViewPage
 */
import { supabase } from '@/integrations/supabase/client';
import { generateProposalPDFv2 } from '@/utils/proposalPdfReactGenerator';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { selectCrmById } from '@/lib/crm-db';
import type { ProposalTemplateData } from '@/components/pdf/ProposalHtmlTemplate';
import type { TablesUpdate } from '@/integrations/supabase/types';
import type { Quote } from '@/hooks/quotes';
import { invokeEdge } from '@/lib/edge/safeInvokeCall';
import { isValidQuoteTransition } from '@/lib/quote-status-config';
import { isQuoteStatus } from '@/types/quote';

interface SyncBitrixParams {
  quote: Quote;
  proposalData: ProposalTemplateData;
  bitrixCompanyId: string | null;
  userEmail?: string;
  logQuoteHistory: (
    quoteId: string,
    action: string,
    description: string,
    meta?: Record<string, unknown>,
  ) => Promise<void>;
  onBitrixCompanyIdFound?: (id: string) => void;
}

/**
 * Normaliza o `quote_id` que o Bitrix devolve antes de persistir em
 * `quotes.bitrix_quote_id`.
 *
 * O valor vem de terceiro e a coluna é texto, então `Number()` direto corrompia
 * o dado: id acima de 2^53 perdia precisão (9007199254740993 virava
 * ...992), 100 dígitos viravam notação científica, e `Infinity`, `-1`, `1.25` e
 * `true` eram gravados como texto. Aqui:
 *
 * - string só de dígitos passa inteira, sem `Number()`, para preservar
 *   precisão arbitrária; zeros à esquerda caem ('0042' -> '42');
 * - qualquer outra forma numérica ('+12', '1e3', '0x10', '1.0', número) só é
 *   aceita se virar inteiro seguro e positivo;
 * - o resto (0, vazio, 'abc', 'Infinity', NaN, negativo, fracionário,
 *   booleano, array) devolve null e nada é gravado.
 */
export function normalizeBitrixQuoteId(raw: unknown): string | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (/^\d+$/.test(trimmed)) {
      const semZerosAEsquerda = trimmed.replace(/^0+/, '');
      return semZerosAEsquerda.length > 0 ? semZerosAEsquerda : null;
    }
  }
  const asNumber = Number(typeof raw === 'string' ? raw.trim() : raw);
  return Number.isSafeInteger(asNumber) && asNumber > 0 ? String(asNumber) : null;
}

export async function syncQuoteToBitrix({
  quote,
  proposalData,
  bitrixCompanyId,
  userEmail,
  logQuoteHistory,
  onBitrixCompanyIdFound,
}: SyncBitrixParams): Promise<{
  success: boolean;
  updatedQuote?: Partial<Quote>;
}> {
  if (!quote.id) {
    toast.error('Orçamento sem identificador válido');
    return { success: false };
  }
  const quoteId = quote.id;

  if (quote.status === 'approved' || quote.status === 'converted' || quote.status === 'cancelled') {
    toast.error('Orçamento em status final não pode ser sincronizado com o Bitrix24');
    return { success: false };
  }

  let effectiveBitrixCompanyId = bitrixCompanyId;

  if (!effectiveBitrixCompanyId && quote.client_id) {
    try {
      const company = await selectCrmById<{ bitrix_company_id?: string; bitrix_id?: string }>(
        'companies',
        quote.client_id,
      );
      const bId = company?.bitrix_company_id ?? company?.bitrix_id;
      if (bId) {
        effectiveBitrixCompanyId = String(bId);
        onBitrixCompanyIdFound?.(String(bId));
      }
    } catch {
      /* ignore */
    }
  }

  if (!effectiveBitrixCompanyId) {
    toast.error('Empresa sem ID Bitrix24', {
      description: 'Esta empresa não possui um vínculo com o Bitrix24.',
    });
    return { success: false };
  }

  const itemsSemBitrixId = quote.items?.filter((item) => !item.bitrix_product_id) ?? [];
  const itensSincronizaveis = quote.items?.filter((item) => !!item.bitrix_product_id) ?? [];

  if (itensSincronizaveis.length === 0) {
    toast.error('Nenhum produto com ID Bitrix24');
    return { success: false };
  }

  if (itemsSemBitrixId.length > 0) {
    const nomes = itemsSemBitrixId
      .map((i) => `${i.product_name}${i.color_name ? ` - ${i.color_name}` : ''}`)
      .join(', ');
    toast.warning(`${itemsSemBitrixId.length} produto(s) excluído(s) da sincronização`, {
      description: `Sem ID Bitrix24: ${nomes}`,
      duration: 7000,
    });
  }

  logQuoteHistory(quoteId, 'sync_started', 'Sincronização com Bitrix24 iniciada').catch((err) => {
    logger.warn('logQuoteHistory(sync_started) failed', { err, quoteId });
  });

  // Generate PDF and upload
  let pdfStorageUrl: string | undefined;
  let filename: string | undefined;
  try {
    const blob = await generateProposalPDFv2(proposalData, { isDraft: quote.status === 'draft' });
    filename = `proposta-${(quote.quote_number || quoteId).replace(/\s+/g, '')}.pdf`;
    const storagePath = `quotes/${quoteId}/${filename}`;
    const { error: uploadError } = await supabase.storage
      .from('art-files')
      .upload(storagePath, blob, { contentType: 'application/pdf', upsert: true });

    if (uploadError) {
      logger.warn('PDF upload failed:', uploadError);
    } else {
      const { data: urlData } = supabase.storage.from('art-files').getPublicUrl(storagePath);
      pdfStorageUrl = urlData.publicUrl;
    }
  } catch (pdfErr) {
    logger.warn('PDF generation failed:', pdfErr);
  }

  const { data, error } = await invokeEdge<{
    ok: boolean;
    error?: string;
    result?: { quote_id?: string; message?: string };
  }>('sync-quote-bitrix', {
    body: {
      quote,
      proposalData,
      pdfUrl: pdfStorageUrl,
      filename,
      bitrixCompanyId: effectiveBitrixCompanyId,
      sellerEmail: userEmail,
      shippingType: quote.shipping_type,
      shippingCost: quote.shipping_cost,
    },
  });

  if (error || !data?.ok) {
    const msg = data?.error || error?.message || 'Erro desconhecido';
    await logQuoteHistory(quoteId, 'sync_error', `Falha: ${msg}`);
    throw new Error(msg);
  }

  const result = data.result;
  const bitrixQuoteIdFromResponse = normalizeBitrixQuoteId(result?.quote_id);

  const canTransitionToSent =
    isQuoteStatus(quote.status) && isValidQuoteTransition(quote.status, 'sent');
  const crmUpdates: TablesUpdate<'quotes'> = {};
  if (canTransitionToSent) crmUpdates.status = 'sent';
  if (bitrixQuoteIdFromResponse) crmUpdates.bitrix_quote_id = bitrixQuoteIdFromResponse;

  let updatePersisted = true;
  if (Object.keys(crmUpdates).length > 0) {
    try {
      const { error: updateError } = await supabase
        // rls-allow: update por id; RLS valida ownership
        .from('quotes')
        .update(crmUpdates)
        .eq('id', quoteId);
      if (updateError) throw updateError;
    } catch (err) {
      updatePersisted = false;
      logger.error('Failed to update quote status after Bitrix sync', { err, quoteId });
    }
  }

  await logQuoteHistory(
    quoteId,
    'sync_success',
    `Sincronizado com Bitrix24${bitrixQuoteIdFromResponse ? ` — ID Bitrix: ${bitrixQuoteIdFromResponse}` : ''}`,
    { newValue: bitrixQuoteIdFromResponse ?? undefined },
  );

  if (!updatePersisted) {
    toast.warning('Sincronizado com Bitrix24, mas o vínculo não foi salvo no orçamento', {
      description: bitrixQuoteIdFromResponse
        ? `ID Bitrix: ${bitrixQuoteIdFromResponse}`
        : undefined,
    });
    return { success: true, updatedQuote: {} };
  }

  toast.success(result?.message || 'Orçamento sincronizado com Bitrix24!');

  return {
    success: true,
    updatedQuote: {
      ...(canTransitionToSent ? { status: 'sent' as const } : {}),
      ...(bitrixQuoteIdFromResponse ? { bitrix_quote_id: bitrixQuoteIdFromResponse } : {}),
    },
  };
}
