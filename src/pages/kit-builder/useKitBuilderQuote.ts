/**
 * useKitBuilderQuote — Lógica de criação de orçamento a partir do kit
 */

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import {
  calculateTotalKitPrice,
  getKitItemLineId,
  type KitItem,
  type KitItemPersonalization,
  type KitState,
} from '@/lib/kit-builder';
import type { Json } from '@/integrations/supabase/types';
import { newRequestId } from '@/lib/telemetry/requestId';
import { validateKitStockForQuote } from '@/hooks/kit-builder/useKitStockValidation';

export interface KitQuoteClient {
  client_cnpj?: string;
  client_company?: string;
  client_email?: string;
  client_id?: string;
  client_name?: string;
  client_phone?: string;
}

interface RetryableQuoteOperation {
  id: string;
  fingerprint: string;
  kitGroupId: string;
}

class KitQuoteValidationError extends Error {}

const QUOTE_RETRY_STORAGE_PREFIX = 'kit-maker:quote-retry:';

/**
 * Session-scoped retry receipts survive a refresh after the server commits but
 * before the browser receives the response.  The key contains only a compact
 * deterministic hash, never the quote payload or client details.
 *
 * The database still owns correctness: if a (very unlikely) hash collision
 * selected the wrong request id, create_kit_quote_transactional rejects the
 * different payload hash instead of producing a second quote.
 */
function fingerprintKey(fingerprint: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < fingerprint.length; index += 1) {
    hash ^= fingerprint.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${QUOTE_RETRY_STORAGE_PREFIX}${(hash >>> 0).toString(16)}`;
}

function readRetryReceipt(fingerprint: string): RetryableQuoteOperation | null {
  try {
    const raw = globalThis.sessionStorage?.getItem(fingerprintKey(fingerprint));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<RetryableQuoteOperation>;
    if (
      value.fingerprint === fingerprint &&
      typeof value.id === 'string' &&
      typeof value.kitGroupId === 'string'
    ) {
      return { id: value.id, fingerprint, kitGroupId: value.kitGroupId };
    }
  } catch {
    // Storage can be disabled by the browser. In-memory retry remains safe.
  }
  return null;
}

function writeRetryReceipt(operation: RetryableQuoteOperation): void {
  try {
    globalThis.sessionStorage?.setItem(
      fingerprintKey(operation.fingerprint),
      JSON.stringify(operation),
    );
  } catch {
    // An unavailable storage must not prevent a commercially valid submission.
  }
}

function clearRetryReceipt(fingerprint: string): void {
  try {
    globalThis.sessionStorage?.removeItem(fingerprintKey(fingerprint));
  } catch {
    // Best-effort cleanup only; the server checks the full payload hash.
  }
}

function toPersonalizationPayload(
  personalization: KitItemPersonalization,
  quantity: number,
): Record<string, Json> {
  const width = personalization.width ?? null;
  const height = personalization.height ?? null;
  const unitCost = personalization.estimatedPrice;
  if (typeof unitCost !== 'number' || !Number.isFinite(unitCost) || unitCost < 0) {
    throw new Error('Preço de personalização indisponível para criação do orçamento');
  }
  const productionNotes = [
    personalization.position ? `Posição: ${personalization.position}` : null,
    personalization.artworkColors?.length
      ? `Paleta da arte: ${personalization.artworkColors.join(', ')}`
      : null,
  ].filter((note): note is string => Boolean(note));
  return {
    technique_id: personalization.techniqueId ?? null,
    technique_name: personalization.techniqueName ?? null,
    location_code: personalization.positionCode ?? null,
    location_name: personalization.positionName ?? personalization.position ?? null,
    personalized_quantity: quantity,
    colors_count: personalization.colors ?? 1,
    positions_count: 1,
    area_cm2: width !== null && height !== null ? width * height : null,
    width_cm: width,
    height_cm: height,
    setup_cost: personalization.setupCost ?? 0,
    unit_cost: unitCost,
    total_cost:
      personalization.pricedQuantity === quantity &&
      typeof personalization.totalPrice === 'number' &&
      Number.isFinite(personalization.totalPrice)
        ? personalization.totalPrice
        : unitCost * quantity,
    artwork_url: personalization.artworkUrl ?? null,
    artwork_colors: personalization.artworkColors ?? [],
    // The canonical personalization writer persists `notes`, but has no
    // dedicated palette column. Keep the exact chosen colors in its supported
    // production field instead of silently discarding them.
    notes: productionNotes.length > 0 ? productionNotes.join(' · ') : null,
  };
}

function itemPersonalizationCost(
  personalization: KitItemPersonalization | undefined,
  item: KitItem,
  kitQuantity: number,
): number {
  if (!personalization?.enabled) return 0;
  if (
    typeof personalization.estimatedPrice !== 'number' ||
    !Number.isFinite(personalization.estimatedPrice) ||
    personalization.estimatedPrice < 0
  ) {
    throw new Error('Preço de personalização indisponível para criação do orçamento');
  }
  const quantity = item.quantity * kitQuantity;
  return personalization.pricedQuantity === quantity && Number.isFinite(personalization.totalPrice)
    ? (personalization.totalPrice ?? 0)
    : personalization.estimatedPrice * quantity;
}

export function useKitBuilderQuote() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCreatingQuote, setIsCreatingQuote] = useState(false);
  // State changes are asynchronous. This ref closes the interval between a
  // double click and React rendering `isCreatingQuote=true`.
  const createInFlightRef = useRef(false);
  const retryableRequestRef = useRef<RetryableQuoteOperation | null>(null);

  const handleAddToQuote = async (
    kitState: KitState,
    kitQuantity: number,
    client: KitQuoteClient = {},
    sourceKitId?: string,
  ) => {
    if (!user) {
      toast.error('Você precisa estar logado para criar um orçamento.');
      return;
    }

    if (!kitState.isValid) return;
    if (createInFlightRef.current) {
      toast.info('A criação do orçamento já está em andamento.');
      return;
    }

    createInFlightRef.current = true;
    setIsCreatingQuote(true);
    try {
      const kitLabel = kitState.name || 'Kit sem nome';
      const kitMetadataNote = kitState.identity?.tag
        ? `[${kitState.identity.tag}] ${kitLabel}`
        : kitLabel;

      const boxRef = kitState.box;
      const itemsRef = kitState.items;
      const personRef = kitState.personalization;
      const pricing = calculateTotalKitPrice(boxRef, itemsRef, personRef, kitQuantity);
      const quotePayload = {
        seller_id: user.id,
        status: 'draft',
        // Empty string lets the `set_quote_number` BEFORE INSERT trigger generate it.
        quote_number: '',
        client_id: client.client_id || null,
        client_name: client.client_name?.trim() || 'Cliente a definir',
        client_company: client.client_company?.trim() || null,
        client_email: client.client_email?.trim() || null,
        client_phone: client.client_phone?.trim() || null,
        client_cnpj: client.client_cnpj?.trim() || null,
        subtotal: pricing.subtotal,
        discount_percent: 0,
        discount_amount: 0,
        total: pricing.total,
        negotiation_markup_percent: 0,
        notes: `Kit: ${kitMetadataNote}`,
        // internal_notes removido: campo descontinuado na UI.
        tags: {
          source: 'kit-builder',
          kit_name: kitLabel,
          kit_quantity: kitQuantity,
          kit_identity_tag: kitState.identity?.tag ?? null,
          source_custom_kit_id: sourceKitId ?? null,
        },
      };

      // Build the semantic payload before allocating an operation id. A random
      // kit_group_id used to be included in this fingerprint, so a retry after
      // a lost response was incorrectly treated as a new quote.
      const quoteItems: Array<Record<string, Json | undefined>> = [];

      // Add box if present
      if (boxRef) {
        const boxQty = kitQuantity;
        quoteItems.push({
          product_name: boxRef.name,
          product_sku: boxRef.sku || null,
          product_image_url: boxRef.imageUrl || null,
          product_id: boxRef.id,
          quantity: boxQty,
          unit_price: boxRef.price,
          subtotal: boxRef.price * boxQty,
          sort_order: 0,
          notes: 'Caixa/embalagem do kit',
          color_name: null,
          color_hex: null,
          kit_name: kitLabel,
          personalization_cost: personRef.box.enabled
            ? personRef.box.pricedQuantity === kitQuantity &&
              Number.isFinite(personRef.box.totalPrice)
              ? (personRef.box.totalPrice ?? 0)
              : (personRef.box.estimatedPrice ?? 0) * kitQuantity
            : 0,
          personalizations: personRef.box.enabled
            ? [toPersonalizationPayload(personRef.box, kitQuantity)]
            : [],
        });
      }

      itemsRef.forEach((item: KitItem, index: number) => {
        const itemQty = item.quantity * kitQuantity;
        quoteItems.push({
          product_name: item.name,
          product_sku: item.sku || null,
          product_image_url: item.imageUrl || null,
          product_id: item.id,
          quantity: itemQty,
          unit_price: item.price,
          subtotal: item.price * itemQty,
          sort_order: index + 1,
          notes: item.isOptional ? 'Item opcional' : null,
          color_name: item.selectedColor?.name || null,
          color_hex: item.selectedColor?.hex || null,
          kit_name: kitLabel,
          size_code: item.selectedSize || null,
          product_variant_id: item.selectedVariantId || null,
          artwork_urls: (() => {
            const configured = personRef.items[getKitItemLineId(item)] ?? personRef.items[item.id];
            return [configured?.artworkUrl, configured?.generatedMockupUrl].filter(
              (url): url is string => Boolean(url),
            );
          })(),
          personalization_cost: itemPersonalizationCost(
            personRef.items[getKitItemLineId(item)] ?? personRef.items[item.id],
            item,
            kitQuantity,
          ),
          personalizations: (personRef.items[getKitItemLineId(item)] ?? personRef.items[item.id])
            ?.enabled
            ? [
                toPersonalizationPayload(
                  personRef.items[getKitItemLineId(item)] ?? personRef.items[item.id],
                  item.quantity * kitQuantity,
                ),
              ]
            : [],
        });
      });

      if (quoteItems.length === 0) throw new Error('Kit sem itens para orçar');

      // Retain the same idempotency key only for an exact retry after a
      // transport error. Editing the kit creates a new semantic operation.
      const fingerprint = JSON.stringify({ quote: quotePayload, items: quoteItems });
      const recoverableOperation =
        retryableRequestRef.current?.fingerprint === fingerprint
          ? retryableRequestRef.current
          : readRetryReceipt(fingerprint);

      // A lost response may hide a quote that already committed. Replaying the
      // exact receipt first lets the database return that quote even when stock
      // changed afterwards. Stock validation applies only to genuinely new
      // commercial operations.
      if (!recoverableOperation) {
        const liveStock = await validateKitStockForQuote(kitState.items, kitState.box, kitQuantity);
        if (liveStock.status === 'unknown') {
          throw new KitQuoteValidationError(
            'Não foi possível confirmar o estoque agora. Nenhum orçamento foi criado.',
          );
        }
        if (liveStock.status === 'unavailable') {
          throw new KitQuoteValidationError(
            `Estoque insuficiente em ${liveStock.alerts.length} item(ns). Revise o kit antes de continuar.`,
          );
        }
      }

      const operation = recoverableOperation ?? {
        id: newRequestId(),
        fingerprint,
        kitGroupId: newRequestId(),
      };
      retryableRequestRef.current = operation;
      writeRetryReceipt(operation);

      const requestItems = quoteItems.map((item) => ({
        ...item,
        kit_group_id: operation.kitGroupId,
      }));

      // This RPC wraps the existing transactional writer and records the
      // request id. It makes a timeout/retry return the original quote rather
      // than creating a second commercial document.
      const { data, error: quoteError } = await supabase.rpc('create_kit_quote_transactional', {
        _request_id: operation.id,
        _quote: quotePayload as unknown as Json,
        _items: requestItems as unknown as Json,
      });
      const quote = data;

      if (quoteError) throw quoteError;
      if (!quote?.id) throw new Error('A criação transacional não retornou o orçamento');

      retryableRequestRef.current = null;
      clearRetryReceipt(fingerprint);
      toast.success(`Orçamento criado com sucesso!`);
      navigate(`/orcamentos/${quote.id}`);
    } catch (err) {
      logger.error('[Kit Quote] Error creating quote:', err);
      toast.error(
        err instanceof KitQuoteValidationError
          ? err.message
          : 'Erro ao criar orçamento. Tente novamente.',
      );
    } finally {
      createInFlightRef.current = false;
      setIsCreatingQuote(false);
    }
  };

  return { handleAddToQuote, isCreatingQuote };
}
