import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BookmarkPlus } from "lucide-react";
import { type QuoteTemplateItem } from "@/hooks/useQuoteTemplates";
import { QuoteTemplateForm } from "./QuoteTemplateForm";

interface SaveAsTemplateButtonProps {
  items: QuoteTemplateItem[];
  discountPercent?: number;
  discountAmount?: number;
  notes?: string;
  internalNotes?: string;
  trigger?: React.ReactNode;
  onSaved?: () => void;
}

export function SaveAsTemplateButton({
  items,
  // Recebidos pela API pública, ainda não persistidos por este stub (ver handleSave).
  discountPercent: _discountPercent = 0,
  discountAmount: _discountAmount = 0,
  notes: _notes = "",
  internalNotes: _internalNotes = "",
  trigger,
  onSaved,
}: SaveAsTemplateButtonProps) {
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    setOpen(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <BookmarkPlus className="h-4 w-4 mr-2" />
            Salvar como Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Salvar como Template</DialogTitle>
          <DialogDescription>
            Salve este orçamento como um template reutilizável
          </DialogDescription>
        </DialogHeader>
        <QuoteTemplateForm
          initialItems={items}
          onSave={handleSave}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
