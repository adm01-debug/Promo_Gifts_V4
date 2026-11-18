import { MessageSquare } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SaveAsTemplateButton } from '@/components/quotes/SaveAsTemplateButton';
import type { QuoteItem } from '@/hooks/quotes/quoteTypes';
import type { QuoteTemplateItem } from '@/hooks/quotes/useQuoteTemplates';

/**
 * Converte itens do construtor (snake_case, `personalizations` do domínio)
 * para o formato persistido em `quote_templates.items` (camelCase).
 */
export function toTemplateItems(items: QuoteItem[]): QuoteTemplateItem[] {
  return items.map((item) => ({
    productId: item.product_id,
    productSku: item.product_sku,
    productName: item.product_name,
    productImageUrl: item.product_image_url,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    colorName: item.color_name,
    colorHex: item.color_hex,
    personalizations: item.personalizations?.map((p) => ({
      techniqueId: p.technique_id,
      techniqueName: p.technique_name ?? '',
      colorsCount: p.colors_count,
      positionsCount: p.positions_count,
      unitCost: p.unit_cost,
      setupCost: p.setup_cost,
    })),
  }));
}

interface QuoteBuilderNotesCardProps {
  notes: string;
  setNotes: (value: string) => void;
  items: QuoteItem[];
  discountType: 'amount' | 'percent';
  discountValue: number;
  /**
   * Ação "Usar template" (QuoteTemplateSelector). Entra por prop para o card
   * seguir sem conhecer o estado do construtor — e para o gate de tamanho de
   * arquivo do QuoteBuilderPage não piorar.
   */
  usarTemplate?: React.ReactNode;
}

/**
 * Observações do orçamento + ação "Salvar como Template".
 *
 * Extraído de `QuoteBuilderPage.tsx` (gate de tamanho de arquivo: 500 linhas).
 */
export function QuoteBuilderNotesCard({
  notes,
  setNotes,
  items,
  discountType,
  discountValue,
  usarTemplate,
}: QuoteBuilderNotesCardProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-border/50 bg-card p-4">
      <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
        <MessageSquare className="h-4 w-4 text-primary" />
        Observações
      </h3>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Para o cliente</Label>
        <Textarea
          data-testid="quote-notes-input"
          value={notes || ''}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observações visíveis na proposta..."
          rows={3}
          maxLength={2000}
          className="resize-none text-xs"
        />
        {notes && (
          <p className="text-right text-[10px] text-muted-foreground">{notes.length}/2000</p>
        )}
      </div>
      {(items.length > 0 || usarTemplate) && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/50 pt-3">
          {/* "Usar template" aparece mesmo com o orçamento vazio: é justamente aí
              que aplicar um template poupa mais trabalho do vendedor. */}
          {usarTemplate}
          {items.length > 0 && (
            <SaveAsTemplateButton
              items={toTemplateItems(items)}
              discountPercent={discountType === 'percent' ? discountValue : 0}
              discountAmount={discountType === 'amount' ? discountValue : 0}
              notes={notes || ''}
            />
          )}
        </div>
      )}
    </div>
  );
}
