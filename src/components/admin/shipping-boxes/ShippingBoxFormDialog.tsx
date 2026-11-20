/**
 * Formulário de caixa de transporte (criar e editar).
 *
 * O admin digita a medida EXTERNA e a espessura da parede; a medida interna e o
 * volume aparecem calculados, só para leitura — no banco são colunas geradas e
 * nunca vão no payload. O peso máximo é digitado em kg e gravado em gramas.
 * A validação está em `shippingBoxFormSchema.ts`.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { ShippingBoxRow, ShippingBoxWrite } from '@/services/shippingBoxService';
import { formatDimensionsCm, formatLiters } from './shippingBoxFormat';
import {
  EMPTY_SHIPPING_BOX_DRAFT,
  SHIPPING_BOX_CODE_MAX_LENGTH,
  SHIPPING_BOX_NAME_MAX_LENGTH,
  computeInnerPreview,
  newShippingBoxDraft,
  normalizeShippingBoxCode,
  parseShippingBoxForm,
  toShippingBoxDraft,
  type ShippingBoxFormDraft,
  type ShippingBoxFormErrors,
  type ShippingBoxFormField,
} from './shippingBoxFormSchema';

/** Código que o banco recusou por já estar em uso, com a mensagem para exibir. */
export interface RejectedShippingBoxCode {
  code: string;
  message: string;
}

interface ShippingBoxFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Caixa em edição; null = criação. */
  box: ShippingBoxRow | null;
  /** Fator sugerido na caixa nova: o padrão de `/admin/frete`. Na edição não é usado. */
  newBoxFillFactor: number;
  /** Ordem sugerida na caixa nova: a próxima da lista. Na edição não é usada. */
  newBoxSortOrder: number;
  saving: boolean;
  /** Mostrado no campo Código enquanto o código digitado for o recusado. */
  rejectedCode?: RejectedShippingBoxCode | null;
  onSave: (values: ShippingBoxWrite) => void;
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  inputMode?: 'decimal' | 'numeric' | 'text';
  maxLength?: number;
  placeholder?: string;
  testId?: string;
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  inputMode = 'text',
  maxLength,
  placeholder,
  testId,
}: TextFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        data-testid={testId}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Traz à vista o primeiro campo com erro, rolando só a área dos campos. */
function revealFirstInvalid(area: HTMLElement | null) {
  area?.querySelector('[aria-invalid="true"]')?.parentElement?.scrollIntoView({ block: 'center' });
}

export function ShippingBoxFormDialog({
  open,
  onOpenChange,
  box,
  newBoxFillFactor,
  newBoxSortOrder,
  saving,
  rejectedCode = null,
  onSave,
}: ShippingBoxFormDialogProps) {
  const isEdit = box !== null;
  const [draft, setDraft] = useState<ShippingBoxFormDraft>(EMPTY_SHIPPING_BOX_DRAFT);
  const [errors, setErrors] = useState<ShippingBoxFormErrors>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [failedSubmits, setFailedSubmits] = useState(0);
  const areaRef = useRef<HTMLDivElement>(null);
  // Envio em andamento: o segundo clique de um duplo clique chega antes de
  // `saving` virar true na tela e gravaria a caixa duas vezes.
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    submittingRef.current = false;
    setDraft(
      box ? toShippingBoxDraft(box) : newShippingBoxDraft(newBoxFillFactor, newBoxSortOrder),
    );
    setErrors({});
    setAdvancedOpen(box !== null && box.empty_weight_g > 0);
  }, [open, box, newBoxFillFactor, newBoxSortOrder]);

  // Terminado o salvar (recusado pelo banco, por exemplo), o formulário volta a
  // aceitar um novo envio.
  useEffect(() => {
    if (!saving) submittingRef.current = false;
  }, [saving]);

  const codeRejection =
    rejectedCode?.code === normalizeShippingBoxCode(draft.code) ? rejectedCode.message : undefined;

  // A área do formulário rola: depois de uma validação recusada, traz para a
  // vista o primeiro campo com erro (rótulo, campo e mensagem).
  useEffect(() => {
    if (failedSubmits === 0) return;
    revealFirstInvalid(areaRef.current);
  }, [failedSubmits]);

  // O mesmo vale quando o banco recusa o código por já estar em uso.
  useEffect(() => {
    if (codeRejection === undefined) return;
    revealFirstInvalid(areaRef.current);
  }, [codeRejection]);

  const setField = (field: ShippingBoxFormField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || !open || submittingRef.current) return;
    const result = parseShippingBoxForm(draft);
    if (!result.ok) {
      setErrors(result.errors);
      if (result.errors.emptyWeightG) setAdvancedOpen(true);
      setFailedSubmits((count) => count + 1);
      return;
    }
    submittingRef.current = true;
    onSave(result.values);
  };

  const preview = computeInnerPreview(draft);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Esc ou clique fora durante o salvar não fecha: a resposta ainda vai
        // chegar e fecharia (ou apagaria) o formulário que estivesse aberto.
        if (saving && !nextOpen) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden p-0"
        data-testid="admin-form"
      >
        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>
              {isEdit ? 'Editar caixa de transporte' : 'Nova caixa de transporte'}
            </DialogTitle>
            <DialogDescription>
              Informe a medida externa, que é a impressa na caixa. A medida interna é calculada.
            </DialogDescription>
          </DialogHeader>

          <div ref={areaRef} className="relative min-h-0 flex-1 overflow-y-auto">
            <fieldset disabled={saving} className="min-w-0 space-y-5 px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <TextField
                  id="sb-code"
                  label="Código"
                  value={draft.code}
                  onChange={(value) => setField('code', value.toUpperCase())}
                  error={errors.code ?? codeRejection}
                  hint="Como a expedição chama a caixa: P, M, G, GG."
                  maxLength={SHIPPING_BOX_CODE_MAX_LENGTH}
                  testId="admin-code-input"
                />
                <TextField
                  id="sb-name"
                  label="Nome"
                  value={draft.name}
                  onChange={(value) => setField('name', value)}
                  error={errors.name}
                  maxLength={SHIPPING_BOX_NAME_MAX_LENGTH}
                  placeholder="Caixa P"
                  testId="admin-name-input"
                />
              </div>

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">Medidas externas (cm)</legend>
                <div className="grid gap-4 sm:grid-cols-3">
                  <TextField
                    id="sb-outer-height"
                    label="Altura externa (cm)"
                    value={draft.outerHeightCm}
                    onChange={(value) => setField('outerHeightCm', value)}
                    error={errors.outerHeightCm}
                    inputMode="decimal"
                  />
                  <TextField
                    id="sb-outer-width"
                    label="Largura externa (cm)"
                    value={draft.outerWidthCm}
                    onChange={(value) => setField('outerWidthCm', value)}
                    error={errors.outerWidthCm}
                    inputMode="decimal"
                  />
                  <TextField
                    id="sb-outer-length"
                    label="Comprimento externo (cm)"
                    value={draft.outerLengthCm}
                    onChange={(value) => setField('outerLengthCm', value)}
                    error={errors.outerLengthCm}
                    inputMode="decimal"
                  />
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <TextField
                  id="sb-wall"
                  label="Espessura da parede (mm)"
                  value={draft.wallThicknessMm}
                  onChange={(value) => setField('wallThicknessMm', value)}
                  error={errors.wallThicknessMm}
                  hint="De 1 a 20 mm. Papelão comum: 3 mm."
                  inputMode="numeric"
                />
                <div
                  className="rounded-lg border bg-muted/30 p-3 text-sm"
                  aria-live="polite"
                  data-testid="shipping-box-inner-preview"
                >
                  <div className="text-xs font-medium text-muted-foreground">
                    Medidas internas (calculadas)
                  </div>
                  <div className="mt-1 font-medium tabular-nums">
                    {formatDimensionsCm(preview.heightCm, preview.widthCm, preview.lengthCm)}
                  </div>
                  <div className="mt-1">
                    Volume interno:{' '}
                    <span className="font-medium tabular-nums">
                      {formatLiters(preview.volumeL)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Externa menos duas paredes em cada medida. É o espaço que recebe a carga.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <TextField
                  id="sb-max-weight"
                  label="Peso máximo (kg)"
                  value={draft.maxWeightKg}
                  onChange={(value) => setField('maxWeightKg', value)}
                  error={errors.maxWeightKg}
                  hint="Peso total do volume: caixa mais carga."
                  inputMode="decimal"
                />
                <TextField
                  id="sb-fill-factor"
                  label="Fator de aproveitamento"
                  value={draft.fillFactor}
                  onChange={(value) => setField('fillFactor', value)}
                  error={errors.fillFactor}
                  hint="De 0,50 a 1,00. Parte do volume que dá para ocupar."
                  inputMode="decimal"
                />
                <TextField
                  id="sb-sort-order"
                  label="Ordem de exibição"
                  value={draft.sortOrder}
                  onChange={(value) => setField('sortOrder', value)}
                  error={errors.sortOrder}
                  hint="Menor número aparece primeiro; empate ordena pelo código."
                  inputMode="numeric"
                />
              </div>

              <label className="flex items-center gap-2 text-sm" htmlFor="sb-active">
                <Switch
                  id="sb-active"
                  checked={draft.isActive}
                  onCheckedChange={(checked) =>
                    setDraft((current) => ({ ...current, isActive: checked }))
                  }
                />
                Ativa (entra no cálculo de frete)
              </label>

              <Collapsible
                open={advancedOpen}
                onOpenChange={setAdvancedOpen}
                className="rounded-lg border"
              >
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-between px-3 text-sm font-medium"
                  >
                    Avançado
                    <ChevronDown
                      className={cn('h-4 w-4 transition-transform', advancedOpen && 'rotate-180')}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="border-t px-3 py-3">
                  <TextField
                    id="sb-empty-weight"
                    label="Peso da caixa vazia (g)"
                    value={draft.emptyWeightG}
                    onChange={(value) => setField('emptyWeightG', value)}
                    error={errors.emptyWeightG}
                    hint="Conta dentro do peso máximo. Deixe 0 para ignorar o peso da caixa."
                    inputMode="numeric"
                  />
                </CollapsibleContent>
              </Collapsible>
            </fieldset>
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !open} data-testid="admin-save-btn">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEdit ? 'Salvar alterações' : 'Criar caixa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
