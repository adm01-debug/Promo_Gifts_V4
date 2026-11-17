import type { Dispatch, SetStateAction } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Quote } from '@/hooks/quotes/quoteTypes';
import type { ProposalTemplateData } from '@/components/pdf/ProposalHtmlTemplate';

const mocks = vi.hoisted(() => ({
  pdf: vi.fn(), download: vi.fn(), upload: vi.fn(), publicUrl: vi.fn(),
  storageFrom: vi.fn(), invoke: vi.fn(), from: vi.fn(), update: vi.fn(), eq: vi.fn(),
  crm: vi.fn<(<T>(table: string, id: string) => Promise<T>)>(),
  success: vi.fn(), warning: vi.fn(), error: vi.fn(), warnLog: vi.fn(), errorLog: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: { from: mocks.storageFrom },
    from: mocks.from,
  },
}));
// A chamada da edge passa pelo wrapper SSOT `invokeEdge` (QuoteActionHandlers.ts:15 e
// QuoteBitrixSync.ts:12) — nao mais por supabase.functions.invoke. O mock fica na
// fronteira real, igual ao resto da suite (ex. tests/components/kit-builder/KitAIPromptDialog.test.tsx:13).
vi.mock('@/lib/edge/safeInvokeCall', () => ({ invokeEdge: mocks.invoke }));
vi.mock('@/utils/proposalPdfReactGenerator', () => ({ generateProposalPDFv2: mocks.pdf, downloadPDF: mocks.download }));
vi.mock('@/lib/crm-db', () => ({ selectCrmById: mocks.crm }));
vi.mock('sonner', () => ({ toast: { success: mocks.success, warning: mocks.warning, error: mocks.error } }));
vi.mock('@/lib/logger', () => ({ logger: { warn: mocks.warnLog, error: mocks.errorLog } }));

import { buildWhatsAppUrl, calcPersTotal, formatCNPJ, formatCurrency, handleDownloadPDF, handleSyncBitrix } from '@/pages/quotes/quote-view/QuoteActionHandlers';
import { syncQuoteToBitrix } from '@/pages/quotes/quote-view/QuoteBitrixSync';
import { selectCrmById } from '@/lib/crm-db';

const QUOTE_ID = '11111111-1111-4111-8111-111111111111';
const proposal: ProposalTemplateData = {
  quoteNumber: 'ORC 001', date: '2026-11-10', validUntil: '2026-12-01',
  client: { name: 'Cliente' }, seller: { name: 'Vendedor' }, items: [], subtotal: 100, total: 100,
};
const pdf = new Blob(['test PDF'], { type: 'application/pdf' });
// status 'pending': unico status aceito pelos DOIS helpers hoje (handleSyncBitrix recusa
// 'draft' — QuoteActionHandlers.ts:87-92; syncQuoteToBitrix recusa status final —
// QuoteBitrixSync.ts:47-50) e com transicao -> 'sent' valida (quote-status-config.ts:123).
function quote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: QUOTE_ID, quote_number: 'ORC 001', client_id: 'client-1', status: 'pending',
    subtotal: 100, discount_percent: 0, discount_amount: 0, total: 100,
    shipping_type: 'fob_pre', shipping_cost: 12.5,
    items: [{ product_id: 'product-1', product_name: 'Caneca', quantity: 10, unit_price: 10, bitrix_product_id: '7' }],
    ...overrides,
  };
}
type Helper = 'actions' | 'sync';
const helpers: Helper[] = ['actions', 'sync'];
async function run(helper: Helper, current = quote(), companyId: string | null = 'company-1') {
  const history = vi.fn<(id: string, action: string, description: string, meta?: Record<string, unknown>) => Promise<void>>().mockResolvedValue();
  const setQuote = vi.fn<Dispatch<SetStateAction<Quote | null>>>();
  const found = vi.fn();
  const common = { quote: current, proposalData: proposal, bitrixCompanyId: companyId, userEmail: 'seller@example.test', logQuoteHistory: history };
  const result = helper === 'actions'
    ? await handleSyncBitrix({ ...common, setQuote, selectCrmById })
    : await syncQuoteToBitrix({ ...common, onBitrixCompanyIdFound: found });
  return { result, history, setQuote, found };
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.pdf.mockResolvedValue(pdf);
  mocks.upload.mockResolvedValue({ error: null });
  mocks.publicUrl.mockReturnValue({ data: { publicUrl: 'https://files.example.test/proposal.pdf' } });
  mocks.storageFrom.mockReturnValue({ upload: mocks.upload, getPublicUrl: mocks.publicUrl });
  mocks.eq.mockResolvedValue({ error: null });
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.from.mockReturnValue({ update: mocks.update });
  // envelope de sucesso real da edge: supabase/functions/sync-quote-bitrix/index.ts:207
  mocks.invoke.mockResolvedValue({ data: { ok: true, result: { quote_id: '123', message: 'Sincronizado' } }, error: null });
  mocks.crm.mockResolvedValue({ bitrix_company_id: 'crm-company' });
});

describe.each(helpers)('%s root quote synchronization', helper => {
  it('accepts the actual Edge success envelope using ok', async () => {
    mocks.invoke.mockResolvedValue({ data: { ok: true, result: { quote_id: '123' } }, error: null });
    await run(helper);
    expect(mocks.update).toHaveBeenCalledWith({ status: 'sent', bitrix_quote_id: '123' });
    expect(mocks.success).toHaveBeenCalledWith('Orçamento sincronizado com Bitrix24!');
  });

  it.each([
    { ok: true, success: false },
  ])('retains both explicit success envelopes: %j', async flags => {
    mocks.invoke.mockResolvedValue({ data: { ...flags, result: null }, error: null });
    const result = await run(helper);
    expect(mocks.update).toHaveBeenCalledWith({ status: 'sent' });
    expect(result.history).toHaveBeenLastCalledWith(QUOTE_ID, 'sync_success', expect.any(String), { newValue: undefined });
  });

  it.each([{ ok: false }, { ok: false, success: false }])('never treats failure/nonboolean envelopes as success: %j', async flags => {
    mocks.invoke.mockResolvedValue({ data: { ...flags, result: { quote_id: '123' } }, error: null });
    await expect(run(helper)).rejects.toThrow('Erro desconhecido');
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it.each([undefined, ''])('blocks unsaved quote id %s before any external operation', async id => {
    const result = await run(helper, quote({ id }), null);
    expect(mocks.error).toHaveBeenCalledWith('Orçamento sem identificador válido');
    expect(mocks.crm).not.toHaveBeenCalled();
    expect(mocks.pdf).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
    expect(result.history).not.toHaveBeenCalled();
    expect(result.setQuote).not.toHaveBeenCalled();
    expect(result.result).toEqual(helper === 'sync' ? { success: false } : undefined);
  });

  it.each([
    { company: { bitrix_company_id: '77', bitrix_id: '88' }, expected: '77' },
    { company: { bitrix_id: '88' }, expected: '88' },
  ])('retains CRM company fallback and primary-field precedence $expected', async ({ company, expected }) => {
    mocks.crm.mockResolvedValue(company);
    const result = await run(helper, quote(), null);
    expect(mocks.crm).toHaveBeenCalledWith('companies', 'client-1');
    expect(mocks.invoke.mock.calls[0][1].body.bitrixCompanyId).toBe(expected);
    if (helper === 'sync') expect(result.found).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it.each(['missing', 'rejected'])('stops without a company when CRM is %s', async mode => {
    if (mode === 'missing') mocks.crm.mockResolvedValue({});
    else mocks.crm.mockRejectedValue(new Error('CRM unavailable'));
    await run(helper, quote(), null);
    expect(mocks.error).toHaveBeenCalledWith('Empresa sem ID Bitrix24', expect.objectContaining({ description: expect.any(String) }));
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(mocks.pdf).not.toHaveBeenCalled();
  });

  it.each([undefined, []])('retains empty/absent item guard', async items => {
    await run(helper, quote({ items }));
    expect(mocks.error).toHaveBeenCalledWith('Nenhum produto com ID Bitrix24');
    expect(mocks.pdf).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('warns with color names while preserving the complete edge payload for mixed items', async () => {
    const current = quote();
    current.items?.push({ product_id: 'missing', product_name: 'Copo', color_name: 'Azul', quantity: 1, unit_price: 2 });
    const result = await run(helper, current);
    expect(mocks.warning).toHaveBeenCalledExactlyOnceWith('1 produto(s) excluído(s) da sincronização', { description: 'Sem ID Bitrix24: Copo - Azul', duration: 7000 });
    expect(mocks.invoke).toHaveBeenCalledWith('sync-quote-bitrix', { body: {
      quote: current, proposalData: proposal, pdfUrl: 'https://files.example.test/proposal.pdf', filename: 'proposta-ORC001.pdf',
      bitrixCompanyId: 'company-1', sellerEmail: 'seller@example.test', shippingType: 'fob_pre', shippingCost: 12.5,
    } });
    expect(result.history.mock.calls.map(call => call[1])).toEqual(['sync_started', 'sync_success']);
    expect(mocks.storageFrom).toHaveBeenCalledWith('art-files');
    expect(mocks.upload).toHaveBeenCalledWith(`quotes/${QUOTE_ID}/proposta-ORC001.pdf`, pdf, { contentType: 'application/pdf', upsert: true });
  });

  it.each(['draft', 'sent'] as const)('generates PDF with draft flag for %s', async status => {
    if (status === 'draft' && helper === 'actions') {
      // handleSyncBitrix recusa rascunho ANTES do PDF (QuoteActionHandlers.ts:87-92);
      // a cobertura de isDraft:true segue viva pelo helper 'sync'.
      await run(helper, quote({ status }));
      expect(mocks.error).toHaveBeenCalledWith('Rascunho não pode ser sincronizado', expect.objectContaining({ description: expect.any(String) }));
      expect(mocks.pdf).not.toHaveBeenCalled();
      return;
    }
    await run(helper, quote({ status }));
    expect(mocks.pdf).toHaveBeenCalledWith(proposal, { isDraft: status === 'draft' });
  });

  it.each(['pdf', 'upload-throw', 'upload-error'])('preserves edge sync when optional PDF phase fails: %s', async mode => {
    if (mode === 'pdf') mocks.pdf.mockRejectedValue(new Error('PDF unavailable'));
    else if (mode === 'upload-throw') mocks.upload.mockRejectedValue(new Error('Upload unavailable'));
    else mocks.upload.mockResolvedValue({ error: { message: 'Storage denied' } });
    await run(helper);
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.invoke.mock.calls[0][1].body.pdfUrl).toBeUndefined();
    expect(mocks.success).toHaveBeenCalledWith('Sincronizado');
    expect(mocks.publicUrl).not.toHaveBeenCalled();
  });

  it.each([
    { data: null, error: { message: 'Transport denied' }, expected: 'Transport denied' },
    { data: { success: false, error: 'Business denied' }, error: null, expected: 'Business denied' },
    { data: null, error: null, expected: 'Erro desconhecido' },
  ])('propagates $expected and never marks failure as sent', async response => {
    mocks.invoke.mockResolvedValue(response);
    await expect(run(helper)).rejects.toThrow(response.expected);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it.each([
    { id: 123, expected: '123' }, { id: '0042', expected: '42' },
    { id: undefined, expected: undefined }, { id: null, expected: undefined },
    { id: 0, expected: undefined }, { id: '', expected: undefined },
    { id: 'abc', expected: undefined }, { id: NaN, expected: undefined },
    { id: Number.MAX_SAFE_INTEGER, expected: String(Number.MAX_SAFE_INTEGER) },
    { id: '+12', expected: '12' }, { id: '1e3', expected: '1000' },
    { id: '0x10', expected: '16' }, { id: '1.0', expected: '1' },
    { id: '  12  ', expected: '12' }, { id: '000', expected: undefined },
    { id: [], expected: undefined },
  ])('normalizes response id $id without persisting nonfinite values', async ({ id, expected }) => {
    mocks.invoke.mockResolvedValue({ data: { ok: true, result: { quote_id: id } }, error: null });
    const result = await run(helper);
    const expectedUpdate = { status: 'sent', ...(expected ? { bitrix_quote_id: expected } : {}) };
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith(expectedUpdate);
    expect(mocks.eq).toHaveBeenCalledExactlyOnceWith('id', QUOTE_ID);
    expect(result.history).toHaveBeenLastCalledWith(QUOTE_ID, 'sync_success', expect.any(String), { newValue: expected });
    expect(mocks.success).toHaveBeenCalledWith('Orçamento sincronizado com Bitrix24!');
    if (helper === 'sync') expect(result.result).toEqual({ success: true, updatedQuote: expectedUpdate });
    else {
      const update = result.setQuote.mock.calls[0][0];
      expect(typeof update).toBe('function');
      if (typeof update === 'function') {
        expect(update(quote())).toEqual({ ...quote(), ...expectedUpdate });
        expect(update(null)).toBeNull();
      }
    }
  });
});

describe('standalone sync error history', () => {
  it('keeps the explicit sync_error event when the edge rejects the operation', async () => {
    mocks.invoke.mockResolvedValue({ data: { success: false, error: 'Denied' }, error: null });
    const history = vi.fn().mockResolvedValue(undefined);
    await expect(syncQuoteToBitrix({ quote: quote(), proposalData: proposal, bitrixCompanyId: 'company-1', logQuoteHistory: history })).rejects.toThrow('Denied');
    expect(history.mock.calls.map(call => call.slice(0, 3))).toEqual([
      [QUOTE_ID, 'sync_started', 'Sincronização com Bitrix24 iniciada'],
      [QUOTE_ID, 'sync_error', 'Falha: Denied'],
    ]);
  });

  it('keeps successful edge result when best-effort local update throws', async () => {
    mocks.eq.mockRejectedValue(new Error('local update unavailable'));
    const history = vi.fn().mockResolvedValue(undefined);
    const result = await syncQuoteToBitrix({ quote: quote(), proposalData: proposal, bitrixCompanyId: 'company-1', userEmail: 'seller@example.test', logQuoteHistory: history });
    // o sucesso remoto e preservado; o aviso de vinculo nao salvo substituiu o toast de
    // sucesso (QuoteBitrixSync.ts:176-183) e o resultado continua success:true.
    expect(mocks.warning).toHaveBeenCalledWith('Sincronizado com Bitrix24, mas o vínculo não foi salvo no orçamento', { description: 'ID Bitrix: 123' });
    expect(mocks.success).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, updatedQuote: {} });
    expect(history).toHaveBeenLastCalledWith(QUOTE_ID, 'sync_success', expect.any(String), { newValue: '123' });
  });
});

describe('root PDF and message helpers', () => {
  it.each([{ data: null, current: quote() }, { data: proposal, current: null }])('does nothing for an absent PDF input', async ({ data, current }) => {
    await handleDownloadPDF(data, current);
    expect(mocks.pdf).not.toHaveBeenCalled();
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it.each([
    { status: 'draft' as const, quote_number: 'ORC \t001', filename: 'proposta-ORC001.pdf' },
    { status: 'sent' as const, quote_number: undefined, filename: 'proposta-sem-numero.pdf' },
  ])('downloads generated $status proposal using $filename', async ({ status, quote_number: quoteNumber, filename }) => {
    await handleDownloadPDF(proposal, quote({ status, quote_number: quoteNumber }));
    expect(mocks.pdf).toHaveBeenCalledWith(proposal, { isDraft: status === 'draft' });
    expect(mocks.download).toHaveBeenCalledExactlyOnceWith(pdf, filename);
    expect(mocks.success).toHaveBeenCalledWith('PDF gerado com sucesso!');
  });
  it('propagates a PDF failure without download or success notification', async () => {
    mocks.pdf.mockRejectedValue(new Error('PDF failed'));
    await expect(handleDownloadPDF(proposal, quote())).rejects.toThrow('PDF failed');
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it.each([undefined, '', '(11) 99999-1234'])('encodes WhatsApp text and normalizes phone %s', clientPhone => {
    const approval = 'https://example.test/approve?id=1&token=a+b';
    const url = new URL(buildWhatsAppUrl(quote({ client_phone: clientPhone, valid_until: '2026-12-01T12:00:00Z' }), approval));
    expect(url.origin).toBe('https://wa.me');
    expect(url.pathname).toBe(clientPhone ? '/5511999991234' : '/');
    expect(url.searchParams.get('text')).toContain('📋 *Proposta Comercial ORC 001*');
    expect(url.searchParams.get('text')).toContain('📅 Válida até: 01/12/2026');
    expect(url.searchParams.get('text')).toContain(`✅ Aprovar proposta: ${approval}`);
  });
  it('omits optional validity/approval lines while preserving zero value', () => {
    const url = new URL(buildWhatsAppUrl(quote({ total: 0, quote_number: undefined }), null));
    const text = url.searchParams.get('text');
    expect(text).toContain(formatCurrency(0));
    expect(text).not.toContain('Válida até');
    expect(text).not.toContain('Aprovar proposta');
  });
  it.each([
    { total: 10, quantity: 0, expected: 10 }, { total: 10, quantity: -1, expected: 10 },
  ])('rounds personalization per unit: $total / $quantity', ({ total, quantity, expected }) => {
    expect(calcPersTotal(total, quantity)).toBe(expected);
  });
  it.each([
    ['12345678000195', '12.345.678/0001-95'], ['12.345.678/0001-95', '12.345.678/0001-95'],
    ['123', '123'], ['', ''],
  ])('formats only complete CNPJ %s', (input, expected) => expect(formatCNPJ(input)).toBe(expected));
});
