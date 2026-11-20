/**
 * Campo "Prazo (dias úteis)" de uma técnica do produto. Texto livre com
 * validação: vazio = usa a tabela de preço (grava `null`).
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PRODUCTION_DAYS_MAX, parseProductionDays } from './productionDays';

interface ProductionDaysInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Sugestão do campo vazio (`tabela: N`). */
  placeholder: string;
}

export function ProductionDaysInput({
  id,
  value,
  onChange,
  placeholder,
}: ProductionDaysInputProps) {
  const invalid = !parseProductionDays(value).ok;
  const hintId = `${id}-hint`;
  return (
    <div>
      <Label htmlFor={id} className="mb-1 block text-[11px] font-medium text-muted-foreground">
        Prazo (dias úteis)
      </Label>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        value={value}
        placeholder={placeholder}
        aria-invalid={invalid}
        aria-describedby={hintId}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm"
      />
      <p
        id={hintId}
        role={invalid ? 'alert' : undefined}
        className={
          invalid ? 'mt-1 text-[11px] text-destructive' : 'mt-1 text-[11px] text-muted-foreground'
        }
      >
        {invalid
          ? `Use um número inteiro de 0 a ${PRODUCTION_DAYS_MAX}.`
          : 'Vazio = usa o prazo da tabela de preço.'}
      </p>
    </div>
  );
}
