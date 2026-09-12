/**
 * KitAIPromptDialog — briefing estruturado para a edge function kit-ai-builder.
 * A IA devolve intenção semântica; itens, caixas, preços e compatibilidade são
 * resolvidos pelo catálogo carregado e aplicados só após confirmação humana.
 */
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  Loader2,
  Wand2,
  RotateCcw,
  Users,
  PackageCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { invokeEdge } from '@/lib/edge/safeInvokeCall';
import {
  formatCurrency,
  resolveKitAICompositions,
  type KitAIComposition,
  type KitAISuggestionBrief,
  type KitBox,
  type KitItem,
} from '@/lib/kit-builder';

type Suggestion = KitAISuggestionBrief;

const suggestionSchema = z
  .object({
    kit_type: z.enum(['montado', 'original', 'simples']),
    box_keywords: z.array(z.string().trim().min(1).max(80)).min(1).max(4),
    item_keywords: z.array(z.string().trim().min(1).max(80)).min(3).max(6),
    target_price_brl: z.object({
      min: z.number().finite().nonnegative(),
      max: z.number().finite().nonnegative(),
    }),
    narrative: z.string().trim().min(1).max(500),
  })
  .strict();

interface KitAIPromptDialogProps {
  catalogItems?: KitItem[];
  catalogBoxes?: KitBox[];
  onApply: (suggestion: Suggestion, composition: KitAIComposition) => void;
}

const AUDIENCES = ['Colaboradores', 'Clientes', 'Evento', 'Clientes VIP'];
const BUDGETS = ['Até R$ 100', 'Até R$ 150', 'Até R$ 250', 'Acima de R$ 250'];
const STYLES = ['Moderno e sustentável', 'Executivo', 'Criativo', 'Premium'];
const QUANTITIES = ['25 kits', '50 kits', '100 kits', '250 kits'];

function buildStructuredPrompt({
  prompt,
  audience,
  budget,
  style,
  quantity,
}: {
  prompt: string;
  audience: string;
  budget: string;
  style: string;
  quantity: string;
}) {
  return [
    prompt.trim(),
    audience && `Público-alvo: ${audience}.`,
    budget && `Faixa de preço por kit: ${budget}.`,
    style && `Estilo desejado: ${style}.`,
    quantity && `Quantidade estimada: ${quantity}.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function KitAIPromptDialog({
  catalogItems = [],
  catalogBoxes = [],
  onApply,
}: KitAIPromptDialogProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [audience, setAudience] = useState('');
  const [budget, setBudget] = useState('');
  const [style, setStyle] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [alternativeIndex, setAlternativeIndex] = useState(0);
  const generationInFlightRef = useRef(false);
  const latestGenerationRef = useRef(0);
  const alternatives = useMemo(
    () => (suggestion ? resolveKitAICompositions(suggestion, catalogItems, catalogBoxes) : []),
    [catalogBoxes, catalogItems, suggestion],
  );
  const activeAlternative = alternatives[alternativeIndex] ?? alternatives[0] ?? null;

  const clearForm = () => {
    setPrompt('');
    setAudience('');
    setBudget('');
    setStyle('');
    setQuantity('');
    setSuggestion(null);
    setAlternativeIndex(0);
  };

  const handleGenerate = async () => {
    if (prompt.trim().length < 6) {
      toast.error('Descreva melhor o kit desejado');
      return;
    }
    if (generationInFlightRef.current) return;
    generationInFlightRef.current = true;
    const generation = latestGenerationRef.current + 1;
    latestGenerationRef.current = generation;
    setLoading(true);
    setSuggestion(null);
    try {
      const { data, error } = await invokeEdge<{ error?: string; suggestion?: Suggestion }>(
        'kit-ai-builder',
        {
          body: {
            prompt: buildStructuredPrompt({ prompt, audience, budget, style, quantity }),
          },
        },
      );
      if (error) throw new Error(error.message);
      const parsed = suggestionSchema
        .refine((value) => value.target_price_brl.max >= value.target_price_brl.min, {
          path: ['target_price_brl', 'max'],
        })
        .safeParse(data?.suggestion);
      if (!parsed.success) throw new Error('Sugestão indisponível');
      // Ignore a stale response if a newer generation has already started.
      if (latestGenerationRef.current === generation) setSuggestion(parsed.data);
    } catch {
      toast.error('Erro ao gerar sugestão');
    } finally {
      generationInFlightRef.current = false;
      if (latestGenerationRef.current === generation) setLoading(false);
    }
  };

  const handleApply = () => {
    if (!suggestion || !activeAlternative) return;
    onApply(suggestion, activeAlternative);
    setOpen(false);
    clearForm();
    toast.success('Composição aplicada — revise variantes, estoque e valores antes de continuar.');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      // A response that arrives after closing the dialog belongs to a dead
      // interaction. Invalidate it before a user can reopen and generate a
      // new briefing, otherwise the old suggestion may overwrite the new one.
      latestGenerationRef.current += 1;
      generationInFlightRef.current = false;
      setLoading(false);
      setSuggestion(null);
      setAlternativeIndex(0);
    }
    setOpen(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Wand2 className="h-3.5 w-3.5 text-primary" />
          Montar com IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-5xl overflow-y-auto p-0">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Montar kit com IA
          </DialogTitle>
          <DialogDescription>
            A IA interpreta o briefing; produtos, caixa e preços vêm do catálogo atual e só entram
            no editor após sua confirmação.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)]">
          <section className="space-y-5" aria-label="Briefing do kit com IA">
            <div className="space-y-2">
              <Label htmlFor="kit-ai-prompt">
                O que você deseja? <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="kit-ai-prompt"
                placeholder="Ex.: Kit para onboarding, até R$ 150, com foco em bem-estar e sustentabilidade."
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={5}
                disabled={loading}
                maxLength={500}
              />
              <p className="text-right text-xs text-muted-foreground">{prompt.length}/500</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <StructuredSelect
                label="Público-alvo"
                icon={<Users className="h-4 w-4" />}
                value={audience}
                onValueChange={setAudience}
                options={AUDIENCES}
                disabled={loading}
              />
              <StructuredSelect
                label="Faixa de preço por kit"
                value={budget}
                onValueChange={setBudget}
                options={BUDGETS}
                disabled={loading}
              />
              <StructuredSelect
                label="Estilo"
                value={style}
                onValueChange={setStyle}
                options={STYLES}
                disabled={loading}
              />
              <StructuredSelect
                label="Quantidade de kits"
                icon={<PackageCheck className="h-4 w-4" />}
                value={quantity}
                onValueChange={setQuantity}
                options={QUANTITIES}
                disabled={loading}
              />
            </div>

            <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Dica da IA</p>
              Quanto mais contexto sobre ocasião, materiais e público, melhores serão as composições
              sugeridas.
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={clearForm}
                disabled={loading}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" /> Limpar campos
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={loading || prompt.trim().length < 6}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                {loading ? 'Gerando...' : 'Gerar sugestões'}
              </Button>
            </div>
          </section>

          <section
            className="rounded-xl border bg-card p-5"
            aria-live="polite"
            aria-label="Sugestão gerada pela IA"
          >
            {suggestion ? (
              <div className="animate-fade-in space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline" className="border-primary text-primary">
                    {alternatives.length
                      ? `Sugestão ${Math.min(alternativeIndex + 1, alternatives.length)} de ${alternatives.length}`
                      : 'Sem composição compatível'}
                  </Badge>
                  {alternatives.length > 1 && (
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label="Sugestão anterior"
                        onClick={() =>
                          setAlternativeIndex(
                            (current) => (current - 1 + alternatives.length) % alternatives.length,
                          )
                        }
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label="Próxima sugestão"
                        onClick={() =>
                          setAlternativeIndex((current) => (current + 1) % alternatives.length)
                        }
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                {activeAlternative ? (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold">{activeAlternative.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {activeAlternative.narrative}
                      </p>
                    </div>
                    <div className="overflow-hidden rounded-lg border bg-muted/20">
                      {activeAlternative.box.imageUrl && (
                        <img
                          src={activeAlternative.box.imageUrl}
                          alt={activeAlternative.box.name}
                          className="h-32 w-full object-cover"
                        />
                      )}
                      <div className="space-y-3 p-3">
                        <p className="text-sm font-medium">Caixa: {activeAlternative.box.name}</p>
                        <ul className="space-y-2" aria-label="Itens da composição sugerida">
                          {activeAlternative.items.map((item) => (
                            <li key={item.lineId} className="flex items-center gap-2 text-sm">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt=""
                                  className="h-8 w-8 rounded bg-background object-contain"
                                />
                              ) : (
                                <span className="h-8 w-8 rounded bg-muted" />
                              )}
                              <span className="min-w-0 flex-1 truncate">{item.name}</span>
                              <span>{formatCurrency(item.price)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">Tipo: {activeAlternative.kitType}</Badge>
                      <Badge variant="outline">
                        {activeAlternative.fitStatus === 'compatible'
                          ? 'Encaixe verificado'
                          : 'Encaixe requer conferência'}
                      </Badge>
                      <Badge variant="outline" className="border-primary text-primary">
                        {formatCurrency(activeAlternative.unitPrice)}/kit
                      </Badge>
                    </div>
                    <div className="border-t pt-4">
                      <p className="mb-3 text-xs text-muted-foreground">
                        Estoque e preço comercial serão novamente validados antes do orçamento.
                      </p>
                      <Button onClick={handleApply} className="w-full">
                        Usar esta composição
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
                    <p className="mb-2 font-medium">{suggestion.narrative}</p>
                    Nenhuma combinação do catálogo atual cabe na faixa de preço e nas dimensões
                    informadas. Ajuste o briefing ou monte manualmente.
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center text-muted-foreground">
                <Sparkles className="mb-3 h-10 w-10 text-primary/70" />
                <p className="font-medium text-foreground">Sua sugestão aparecerá aqui</p>
                <p className="mt-1 max-w-xs text-sm">
                  Descreva o kit e gere até três composições com itens reais do catálogo.
                </p>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StructuredSelect({
  label,
  icon,
  value,
  onValueChange,
  options,
  disabled,
}: {
  label: string;
  icon?: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  disabled: boolean;
}) {
  const id = `kit-ai-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2">
        {icon}
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
