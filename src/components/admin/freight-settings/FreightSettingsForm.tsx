/**
 * Formulário dos parâmetros globais de frete (linha única de `freight_settings`).
 *
 * Recebe a linha salva e devolve em `onSave` só os campos que mudaram. Quem
 * grava e avisa por toast é o hook `useUpdateFreightSettings`, na página.
 * A página remonta o formulário (`key`) quando a linha salva muda, então o
 * estado inicial sempre parte do que está no banco.
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type {
  FreightSettingsPatch,
  FreightSettingsRow,
  MultiPersonalizationRule,
} from '@/services/freightSettingsService';
import {
  buildFreightSettingsPatch,
  maskCep,
  parseFreightSettingsDraft,
  toFreightSettingsDraft,
  type FreightSettingsDraft,
  type FreightSettingsField,
} from './freightSettingsFormSchema';

interface FreightSettingsFormProps {
  /** A linha salva no banco. */
  row: FreightSettingsRow;
  /** `true` enquanto o salvar está em andamento. */
  saving: boolean;
  /** `true` enquanto a tela busca de novo a linha salva. */
  syncing: boolean;
  /** Recebe só os campos alterados, já validados. */
  onSave: (patch: FreightSettingsPatch) => void;
}

const RULE_OPTIONS: ReadonlyArray<{
  value: MultiPersonalizationRule;
  label: string;
  hint: string;
}> = [
  {
    value: 'max',
    label: 'Usar o maior prazo',
    hint: 'Vale o prazo da personalização mais demorada.',
  },
  {
    value: 'sum',
    label: 'Somar os prazos',
    hint: 'Os prazos de todas as personalizações do item são somados.',
  },
];

interface TextFieldProps {
  id: string;
  label: string;
  hint: string;
  value: string;
  error: string | undefined;
  inputMode: 'decimal' | 'numeric';
  disabled: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}

function TextField({
  id,
  label,
  hint,
  value,
  error,
  inputMode,
  disabled,
  onChange,
  onBlur,
}: TextFieldProps) {
  const hintId = `${id}-ajuda`;
  const errorId = `${id}-erro`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      <p id={hintId} className="text-xs text-muted-foreground">
        {hint}
      </p>
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Campos de texto livre; a regra de personalização é escolha entre duas opções. */
type TextFieldName = Exclude<FreightSettingsField, 'multiPersonalizationRule'>;

/** A empresa opera em São Paulo: a data não pode depender do fuso da máquina. */
const UPDATED_AT_DAY = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});
const UPDATED_AT_TIME = new Intl.DateTimeFormat('pt-BR', {
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

/** "19/11/2026 18:31", ou `null` se o banco não devolveu uma data legível. */
function formatUpdatedAt(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${UPDATED_AT_DAY.format(date)} ${UPDATED_AT_TIME.format(date)}`;
}

export function FreightSettingsForm({ row, saving, syncing, onSave }: FreightSettingsFormProps) {
  const [draft, setDraft] = useState<FreightSettingsDraft>(() => toFreightSettingsDraft(row));
  const [touched, setTouched] = useState<Partial<Record<FreightSettingsField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [failedSubmits, setFailedSubmits] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const parsed = useMemo(() => parseFreightSettingsDraft(draft), [draft]);
  const patch = useMemo(
    () => (parsed.ok ? buildFreightSettingsPatch(row, parsed.values) : null),
    [parsed, row],
  );
  // Rascunho inválido conta como alterado: a linha salva sempre passa na validação.
  const dirty = patch === null || Object.keys(patch).length > 0;
  // Enquanto salva ou relê a linha, nada é digitável: a releitura remonta o
  // formulário e descartaria o que fosse digitado nesse intervalo.
  const locked = saving || syncing;
  const updatedAt = formatUpdatedAt(row.updated_at);

  const setField = (field: TextFieldName, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };
  const touch = (field: FreightSettingsField) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };
  const errorOf = (field: FreightSettingsField): string | undefined => {
    if (parsed.ok || !(submitted || touched[field])) return undefined;
    return parsed.errors[field];
  };

  // Salvar recusado pela validação: leva a tela e o foco ao primeiro campo com erro.
  useEffect(() => {
    if (failedSubmits === 0) return;
    const field = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    field?.scrollIntoView({ block: 'center' });
    field?.focus({ preventScroll: true });
  }, [failedSubmits]);

  const handleReset = () => {
    setDraft(toFreightSettingsDraft(row));
    setTouched({});
    setSubmitted(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (!parsed.ok) setFailedSubmits((count) => count + 1);
    if (patch === null || !dirty || saving || syncing) return;
    onSave(patch);
  };

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} data-testid="freight-settings-form">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parâmetros do cálculo</CardTitle>
          <CardDescription>
            Origem dos envios, como o volume da caixa vira peso cobrado e como os prazos se somam.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="frete-cep-origem"
              label="CEP de origem"
              hint="De onde saem as remessas. Formato 00000-000."
              value={draft.originCep}
              error={errorOf('originCep')}
              inputMode="numeric"
              disabled={locked}
              onChange={(value) => setField('originCep', maskCep(value))}
              onBlur={() => touch('originCep')}
            />
            <TextField
              id="frete-fator-aproveitamento"
              label="Fator de aproveitamento padrão"
              hint="Quanto do espaço interno da caixa pode ser ocupado, de 0,50 a 1,00. Valor sugerido ao cadastrar uma caixa nova."
              value={draft.defaultFillFactor}
              error={errorOf('defaultFillFactor')}
              inputMode="decimal"
              disabled={locked}
              onChange={(value) => setField('defaultFillFactor', value)}
              onBlur={() => touch('defaultFillFactor')}
            />
            <TextField
              id="frete-divisor-correios"
              label="Divisor de cubagem — Correios"
              hint="Converte o volume da caixa em peso cobrado (cm³ por kg). Quanto maior, menor o peso cobrado."
              value={draft.cubicDivisorCorreios}
              error={errorOf('cubicDivisorCorreios')}
              inputMode="numeric"
              disabled={locked}
              onChange={(value) => setField('cubicDivisorCorreios', value)}
              onBlur={() => touch('cubicDivisorCorreios')}
            />
            <TextField
              id="frete-divisor-rodoviario"
              label="Divisor de cubagem — Rodoviário"
              hint="O mesmo cálculo, para transportadoras rodoviárias (cm³ por kg)."
              value={draft.cubicDivisorRodoviario}
              error={errorOf('cubicDivisorRodoviario')}
              inputMode="numeric"
              disabled={locked}
              onChange={(value) => setField('cubicDivisorRodoviario', value)}
              onBlur={() => touch('cubicDivisorRodoviario')}
            />
            <TextField
              id="frete-folga-interna"
              label="Folga interna (dias úteis)"
              hint="Dias somados ao prazo de produção. Use 0 para não somar nada."
              value={draft.internalBufferDays}
              error={errorOf('internalBufferDays')}
              inputMode="numeric"
              disabled={locked}
              onChange={(value) => setField('internalBufferDays', value)}
              onBlur={() => touch('internalBufferDays')}
            />
          </div>

          <div className="space-y-2">
            <p id="frete-regra-rotulo" className="text-sm font-medium leading-none">
              Item com mais de uma personalização
            </p>
            <p className="text-xs text-muted-foreground">
              Como calcular o prazo quando o mesmo item leva várias personalizações.
            </p>
            <RadioGroup
              aria-labelledby="frete-regra-rotulo"
              value={draft.multiPersonalizationRule}
              disabled={locked}
              onValueChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  multiPersonalizationRule: value === 'sum' ? 'sum' : 'max',
                }))
              }
            >
              {RULE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  htmlFor={`frete-regra-${option.value}`}
                  className="flex cursor-pointer items-start gap-3 rounded-md border p-3"
                >
                  <RadioGroupItem
                    id={`frete-regra-${option.value}`}
                    value={option.value}
                    className="mt-0.5"
                  />
                  <span className="space-y-0.5 text-sm">
                    <span className="block font-medium">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">{option.hint}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-3">
          {updatedAt ? (
            <p className="text-xs text-muted-foreground" data-testid="freight-settings-updated-at">
              Atualizado em {updatedAt}
            </p>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={handleReset} disabled={!dirty || saving}>
              Desfazer alterações
            </Button>
            <Button
              type="submit"
              disabled={!dirty || saving || syncing}
              data-testid="save-freight-settings"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}
