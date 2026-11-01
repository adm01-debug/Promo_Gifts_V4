import { useState, useEffect, useRef } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Sparkles,
  MessageCircle,
  X,
  Send,
  Loader2,
  Lightbulb,
  Palette,
  Ruler,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
  suggestions?: QuickAction[];
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
}

interface AIMockupAssistantProps {
  productName?: string;
  techniqueName?: string;
  /** Legacy callback (type/value pair). */
  onSuggestionApply?: (type: string, value: unknown) => void;
  /** Modern callback receiving structured suggestion (techniqueId, position, etc). */
  onApplySuggestion?: (suggestion: {
    techniqueId?: string;
    position?: { x: number; y: number };
    [key: string]: unknown;
  }) => void;
  className?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'position', label: 'Melhor posição', icon: Target, action: () => {} },
  { id: 'size', label: 'Tamanho ideal', icon: Ruler, action: () => {} },
  { id: 'color', label: 'Cores sugeridas', icon: Palette, action: () => {} },
  { id: 'tips', label: 'Dicas gerais', icon: Lightbulb, action: () => {} },
];

// R4: mensagem honesta exibida em qualquer caminho (handleSend e handleQuickAction)
const ASSISTANT_UNAVAILABLE_MSG =
  'O assistente de IA para mockup está em desenvolvimento. Em breve você poderá receber sugestões automáticas de posicionamento e técnica. Por enquanto, use as ações rápidas abaixo para orientações gerais.';

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content:
      'Olá! Eu sou o Matheus, seu expert em layouts. Posso ajudar com posicionamento, técnicas e sugestões para criar o mockup perfeito. Como posso ajudar?',
    timestamp: new Date(),
    suggestions: QUICK_ACTIONS,
  },
];

export function AIMockupAssistant({
  productName: _productName,
  techniqueName: _techniqueName,
  className,
}: AIMockupAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const postHonestReply = (userContent: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userContent,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: ASSISTANT_UNAVAILABLE_MSG,
          timestamp: new Date(),
        },
      ]);
      setIsLoading(false);
    }, 500);
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput('');
    postHonestReply(text);
  };

  const handleQuickAction = (action: QuickAction) => {
    if (isLoading) return;
    postHonestReply(action.label);
  };

  if (!isOpen) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn('fixed bottom-24 right-4 z-50 md:bottom-6', className)}
      >
        <Button
          size="lg"
          className="group relative h-14 w-14 gap-0 overflow-hidden rounded-full border-0 bg-primary p-0 text-primary-foreground shadow-lg hover:bg-primary/90"
          onClick={() => setIsOpen(true)}
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Bot className="h-6 w-6" />
          </motion.div>
          <span className="absolute -right-1 -top-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground/50" />
            <Sparkles className="relative h-4 w-4 text-primary-foreground" />
          </span>
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className={cn(
        'fixed z-50 overflow-hidden rounded-2xl border bg-background shadow-2xl',
        'bottom-24 right-4 md:bottom-6',
        isMinimized ? 'h-14 w-72' : 'h-[500px] max-h-[70vh] w-80 sm:w-96',
        className,
      )}
    >
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-3 border-b bg-primary/15 p-3"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="rounded-lg bg-primary/25 p-2">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-semibold">Matheus — Expert em Layouts</h3>
          {!isMinimized && <p className="truncate text-xs text-muted-foreground">Em desenvolvimento</p>}
        </div>
        <Badge variant="secondary" className="text-[10px]">
          Beta
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Fechar"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="h-[calc(100%-130px)] flex-1">
            <div className="space-y-4 p-3">
              <AnimatePresence>
                {messages.map((message, idx) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn('flex gap-2', message.role === 'user' ? 'flex-row-reverse' : '')}
                  >
                    <div
                      className={cn(
                        'shrink-0 rounded-lg p-2',
                        message.role === 'user' ? 'bg-primary text-white' : 'bg-muted',
                      )}
                    >
                      {message.role === 'user' ? (
                        <MessageCircle className="h-4 w-4" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </div>
                    <div
                      className={cn(
                        'max-w-[80%] rounded-xl p-3',
                        message.role === 'user' ? 'bg-primary text-white' : 'bg-muted',
                      )}
                    >
                      <p className="text-sm">{message.content}</p>

                      {/* Quick actions */}
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {message.suggestions.map((action) => (
                            <Button
                              key={action.id}
                              variant="secondary"
                              size="sm"
                              className="h-7 gap-1 px-2 text-xs"
                              disabled={isLoading}
                              onClick={() => handleQuickAction(action)}
                            >
                              <action.icon className="h-3 w-3" />
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2"
                >
                  <div className="rounded-lg bg-muted p-2">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="rounded-xl bg-muted p-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t bg-muted/30 p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte sobre o mockup..."
                className="h-10 flex-1 !border-[hsl(145,80%,30%)] !ring-[hsl(145,80%,30%)] hover:!border-[hsl(145,80%,30%)]/50 focus-visible:!border-[hsl(145,80%,30%)] focus-visible:!ring-[hsl(145,80%,30%)]/20"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                aria-label={isLoading ? 'Enviando...' : 'Enviar pergunta'}
                className="h-10 w-10 shrink-0 bg-primary text-white hover:bg-primary/90"
                disabled={!input.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </>
      )}
    </motion.div>
  );
}
