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

export interface KitQuoteClient {
  client_cnpj?: string;
  client_company?: string;
  client_email?: string;
  client_name?: string;
  client_phone?: string;
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
    setup_cost: 0,
    unit_cost: unitCost,
    total_cost: unitCost * quantity,
    artwork_url: personalization.artworkUrl ?? null,
    notes: personalization.position ? `Posição: ${personalization.position}` : null,
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
  return personalization.estimatedPrice * item.quantity * kitQuantity;
}

export function useKitBuilderQuote() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCreatingQuote, setIsCreatingQuote] = useState(false);
  // State changes are asynchronous. This ref closes the interval between a
  // double click and React rendering `isCreatingQuote=true`.
  const createInFlightRef = useRef(false);
  const retryableRequestRef = useRef<{ id: string; fingerprint: string } | null>(null);

  const handleAddToQuote = async (
    kitState: KitState,
    kitQuantity: number,
    client: KitQuoteClient = {},
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
        },
      };

      const kitGroupId = crypto.randomUUID();
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
          kit_group_id: kitGroupId,
          kit_name: kitLabel,
          personalization_cost: personRef.box.enabled
            ? (personRef.box.estimatedPrice ?? 0) * kitQuantity
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
          kit_group_id: kitGroupId,
          kit_name: kitLabel,
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
      const requestId =
        retryableRequestRef.current?.fingerprint === fingerprint
          ? retryableRequestRef.current.id
          : newRequestId();
      retryableRequestRef.current = { id: requestId, fingerprint };

      // This RPC wraps the existing transactional writer and records the
      // request id. It makes a timeout/retry return the original quote rather
      // than creating a second commercial document.
      const { data, error: quoteError } = await supabase.rpc(
        'create_kit_quote_transactional' as never,
        {
          _request_id: requestId,
          _quote: quotePayload as unknown as Json,
          _items: quoteItems as unknown as Json,
        } as never,
      );
      const quote = data as { id?: string } | null;

      if (quoteError) throw quoteError;
      if (!quote?.id) throw new Error('A criação transacional não retornou o orçamento');

      retryableRequestRef.current = null;
      toast.success(`Orçamento criado com sucesso!`);
      navigate(`/orcamentos/${quote.id}`);
    } catch (err) {
      logger.error('[Kit Quote] Error creating quote:', err);
      toast.error('Erro ao criar orçamento. Tente novamente.');
    } finally {
      createInFlightRef.current = false;
      setIsCreatingQuote(false);
    }
  };

  return { handleAddToQuote, isCreatingQuote };
}
