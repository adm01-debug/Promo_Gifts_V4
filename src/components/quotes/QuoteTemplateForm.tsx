import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  type QuoteTemplate,
  type QuoteTemplateItem,
  type CreateTemplateInput,
  useQuoteTemplates,
} from '@/hooks/quotes/useQuoteTemplates';
import { Save, X } from 'lucide-react';
import { textoDoSubtotalDoItem, textoDoTotal } from '@/lib/quotes/templateTotal';

interface QuoteTemplateFormProps {
  template?: QuoteTemplate | null;
  initialItems?: QuoteTemplateItem[];
  /** Valores iniciais para criação (ignorados em edição, onde `template` manda). */
  initialValues?: Partial<Omit<CreateTemplateInput, 'items' | 'name'>>;
  onSave?: (template: QuoteTemplate | null) => void;
  onCancel?: () => void;
}

export function QuoteTemplateForm({
  template,
  initialItems = [],
  initialValues,
  onSave,
  onCancel,
}: QuoteTemplateFormProps) {
  const { createTemplate, updateTemplate } = useQuoteTemplates();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<CreateTemplateInput>({
    name: template?.name || '',
    description: template?.description || '',
    is_default: template?.is_default || false,
    items: template?.items || initialItems,
    discount_percent: template?.discount_percent ?? initialValues?.discount_percent ?? 0,
    discount_amount: template?.discount_amount ?? initialValues?.discount_amount ?? 0,
    notes: template?.notes ?? initialValues?.notes ?? '',
    internal_notes: template?.internal_notes ?? initialValues?.internal_notes ?? '',
    payment_terms: template?.payment_terms ?? initialValues?.payment_terms ?? '',
    delivery_time: template?.delivery_time ?? initialValues?.delivery_time ?? '',
    validity_days: template?.validity_days ?? initialValues?.validity_days ?? 30,
  });

  const isEditing = !!template;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    setSaving(true);
    try {
      let result;
      if (isEditing) {
        result = await updateTemplate(template.id, formData);
      } else {
        result = await createTemplate(formData);
      }
      // GUARD: `onSave` SÓ é chamado quando a gravação deu certo.
      //
      // createTemplate/updateTemplate devolvem `null` quando falham
      // (useQuoteTemplates.ts:219-227 e o mesmo padrão no update) e já mostram
      // o toast de erro. Antes esta linha era `onSave?.(result)` solto: os dois
      // consumidores ignoram o argumento e simplesmente fecham a tela —
      // QuoteTemplatesPage.tsx:139 volta para a lista e
      // SaveAsTemplateButton.tsx:38 fecha o diálogo. Resultado: quando o banco
      // recusava, o vendedor perdia nome, observações e tudo mais que havia
      // digitado, e a única pista era um toast que sumia.
      //
      // Com a guarda, a falha deixa o formulário na tela com os dados
      // preenchidos e o botão volta a ficar habilitado (`setSaving(false)` no
      // finally), então dá para tentar de novo sem redigitar.
      if (result) onSave?.(result);
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof CreateTemplateInput>(
    field: K,
    value: CreateTemplateInput[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Editar Template' : 'Novo Template'}</CardTitle>
          <CardDescription>
            {isEditing
              ? 'Atualize as informações do template de orçamento'
              : 'Crie um template reutilizável para agilizar seus orçamentos'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Template *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Ex: Kits Corporativos Padrão"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validity">Validade (dias)</Label>
              <Input
                id="validity"
                type="number"
                min={1}
                max={365}
                value={formData.validity_days}
                onChange={(e) => updateField('validity_days', parseInt(e.target.value) || 30)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Descreva o template para facilitar a identificação..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Template Padrão</Label>
              <p className="text-sm text-muted-foreground">
                Será sugerido automaticamente ao criar novos orçamentos
              </p>
            </div>
            <Switch
              checked={formData.is_default}
              onCheckedChange={(checked) => updateField('is_default', checked)}
            />
          </div>

          <Separator />

          {/* Discount Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">Configurações de Desconto</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="discount_percent">Desconto (%)</Label>
                <Input
                  id="discount_percent"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={formData.discount_percent || ''}
                  onChange={(e) => {
                    updateField('discount_percent', parseFloat(e.target.value) || 0);
                    if (e.target.value) updateField('discount_amount', 0);
                  }}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount_amount">Desconto Fixo (R$)</Label>
                <Input
                  id="discount_amount"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.discount_amount || ''}
                  onChange={(e) => {
                    updateField('discount_amount', parseFloat(e.target.value) || 0);
                    if (e.target.value) updateField('discount_percent', 0);
                  }}
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Terms */}
          <div className="space-y-4">
            <h4 className="font-medium">Termos e Condições</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="payment_terms">Condições de Pagamento</Label>
                <Input
                  id="payment_terms"
                  value={formData.payment_terms || ''}
                  onChange={(e) => updateField('payment_terms', e.target.value)}
                  placeholder="Ex: 50% entrada + 50% na entrega"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery_time">Prazo de Entrega</Label>
                <Input
                  id="delivery_time"
                  value={formData.delivery_time || ''}
                  onChange={(e) => updateField('delivery_time', e.target.value)}
                  placeholder="Ex: 15 dias úteis"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-4">
            <h4 className="font-medium">Observações</h4>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações para o Cliente</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Observações que aparecerão na proposta..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="internal_notes">Notas Internas</Label>
              <Textarea
                id="internal_notes"
                value={formData.internal_notes || ''}
                onChange={(e) => updateField('internal_notes', e.target.value)}
                placeholder="Notas visíveis apenas para a equipe..."
                rows={2}
              />
            </div>
          </div>

          {/* Items Summary */}
          {formData.items && formData.items.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium">Itens do Template</h4>
                <div className="space-y-2 rounded-lg bg-muted/50 p-4">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="flex-1 truncate">
                        {item.quantity}x {item.productName}
                      </span>
                      <span className="ml-4 font-medium">
                        {textoDoSubtotalDoItem(item, formatCurrency)}
                      </span>
                    </div>
                  ))}
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between font-medium">
                    <span>Total Estimado</span>
                    <span className="text-lg">{textoDoTotal(formData, formatCurrency)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={saving || !formData.name.trim()}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Template'}
        </Button>
      </div>
    </form>
  );
}
