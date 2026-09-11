/**
 * KitAIPromptDialog — briefing estruturado para a edge function kit-ai-builder.
 * A resposta é aplicada como filtros/keywords; ela não contém IDs canônicos
 * de produto e não deve criar linhas de orçamento automaticamente.
 */
import { useState, type ReactNode } from 'react';
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
import { Sparkles, Loader2, Wand2, RotateCcw, Users, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import { invokeEdge } from '@/lib/edge/safeInvokeCall';

interface Suggestion {
  kit_type: 'montado' | 'original' | 'simples';
  box_keywords: string[];
  item_keywords: string[];
  target_price_brl: { min: number; max: number };
  narrative: string;
}

interface KitAIPromptDialogProps {
  onApply: (suggestion: Suggestion) => void;
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

export function KitAIPromptDialog({ onApply }: KitAIPromptDialogProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [audience, setAudience] = useState('');
  const [budget, setBudget] = useState('');
  const [style, setStyle] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  const clearForm = () => {
    setPrompt('');
    setAudience('');
    setBudget('');
    setStyle('');
    setQuantity('');
    setSuggestion(null);
  };

  const handleGenerate = async () => {
    if (prompt.trim().length < 6) {
      toast.error('Descreva melhor o kit desejado');
      return;
    }
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
      if (data?.error || !data?.suggestion) throw new Error(data?.error || 'Sugestão indisponível');
      setSuggestion(data.suggestion);
    } catch {
      toast.error('Erro ao gerar sugestão');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!suggestion) return;
    onApply(suggestion);
    setOpen(false);
    clearForm();
    toast.success('Sugestão aplicada como filtros — revise produtos e valores antes de continuar.');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            A sugestão organiza filtros de catálogo. Produtos, caixa e preço continuam sujeitos à
            sua confirmação.
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
              Quanto mais contexto sobre ocasião, materiais e público, mais úteis serão os filtros
              sugeridos.
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
                <Badge variant="outline" className="border-primary text-primary">
                  Sugestão gerada
                </Badge>
                <div>
                  <h3 className="text-lg font-semibold">Kit sugerido</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{suggestion.narrative}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Tipo: {suggestion.kit_type}</Badge>
                  <Badge variant="outline" className="border-primary text-primary">
                    R$ {suggestion.target_price_brl.min}–{suggestion.target_price_brl.max}/kit
                  </Badge>
                </div>
                <SuggestionKeywords label="Caixa sugerida" keywords={suggestion.box_keywords} />
                <SuggestionKeywords label="Itens sugeridos" keywords={suggestion.item_keywords} />
                <div className="border-t pt-4">
                  <p className="mb-3 text-xs text-muted-foreground">
                    A aplicação não adiciona itens automaticamente nem confirma disponibilidade,
                    preço ou compatibilidade.
                  </p>
                  <Button onClick={handleApply} className="w-full">
                    Aplicar filtros da sugestão
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center text-muted-foreground">
                <Sparkles className="mb-3 h-10 w-10 text-primary/70" />
                <p className="font-medium text-foreground">Sua sugestão aparecerá aqui</p>
                <p className="mt-1 max-w-xs text-sm">
                  Descreva o kit e gere uma composição inicial para filtrar o catálogo.
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

function SuggestionKeywords({ label, keywords }: { label: string; keywords?: string[] }) {
  const safeKeywords = Array.isArray(keywords) ? keywords.filter(Boolean) : [];
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      {safeKeywords.length ? (
        <div className="flex flex-wrap gap-1.5">
          {safeKeywords.map((keyword) => (
            <Badge key={keyword} variant="secondary">
              {keyword}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma palavra-chave retornada.</p>
      )}
    </div>
  );
}
