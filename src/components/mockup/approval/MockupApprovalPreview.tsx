/**
 * MockupApprovalPreview — Full-page preview of the approval document
 * with PDF download capability and automatic layout capture.
 *
 * O preview é responsivo: o A4 (794px) é reduzido por `transform: scale()`
 * dentro de uma caixa já dimensionada, para caber em telas estreitas sem
 * rolagem horizontal. A escala é neutralizada na hora da captura para o
 * documento exportado (PDF/PNG) continuar saindo em tamanho real.
 */

import { useRef, useState, useCallback, useEffect, type RefObject } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { MockupApprovalTemplate } from './MockupApprovalTemplate';
import type { MockupApprovalData } from '@/types/mockup-approval';

import { logger } from '@/lib/logger';

/** Largura do A4 exportado (210mm @96dpi) — precisa casar com o template. */
const PAGE_WIDTH = 794;
/** Altura A4 mínima correspondente (297mm @96dpi). */
const PAGE_HEIGHT = 1123;
/** Respiro lateral do container de preview (p-4 = 16px de cada lado). */
const STAGE_GUTTER = 32;

interface MockupApprovalPreviewProps {
  data: MockupApprovalData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired once with the captured layout image data URL */
  onLayoutCaptured?: (layoutDataUrl: string) => void;
}

/**
 * Escala "fit" do A4 dentro do container do preview (mesmo padrão do
 * TemplatePreviewDialog): mede a largura disponível e reduz o documento para
 * caber, sem nunca ampliar acima de 100%.
 */
function usePreviewFitScale(open: boolean, stageRef: RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!open) return;
    const compute = () => {
      const el = stageRef.current;
      const available = (el?.clientWidth || window.innerWidth) - STAGE_GUTTER;
      if (available <= 0) return;
      setScale(Math.min(1, available / PAGE_WIDTH));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [open, stageRef]);

  return scale;
}

export function MockupApprovalPreview({
  data,
  open,
  onOpenChange,
  onLayoutCaptured,
}: MockupApprovalPreviewProps) {
  const templateRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const scalerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [naturalHeight, setNaturalHeight] = useState(PAGE_HEIGHT);
  const hasCapturedRef = useRef(false);
  const scale = usePreviewFitScale(open, stageRef);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  // Reserva no preview a altura real do documento (o A4 pode crescer com specs/notas).
  useEffect(() => {
    if (!open) return;
    const height = templateRef.current?.offsetHeight;
    if (height && height > 0) setNaturalHeight(height);
  }, [open, data]);

  // Captura sempre em 1:1: a escala do preview ficaria "congelada" no arquivo exportado.
  const captureTemplate = useCallback(async (outputScale: number) => {
    const node = templateRef.current;
    if (!node) return null;
    const html2canvas = (await import('html2canvas')).default;
    const scaler = scalerRef.current;
    if (scaler) scaler.style.transform = 'none';
    try {
      return await html2canvas(node, {
        scale: outputScale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
    } finally {
      if (scaler) scaler.style.transform = `scale(${scaleRef.current})`;
    }
  }, []);

  // Auto-capture the layout once it renders
  useEffect(() => {
    if (!open || !onLayoutCaptured || hasCapturedRef.current) return;
    // Wait for images to load and template to render
    const timer = setTimeout(async () => {
      if (!templateRef.current || hasCapturedRef.current) return;
      hasCapturedRef.current = true;
      try {
        const canvas = await captureTemplate(1.5);
        if (!canvas) return;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        onLayoutCaptured(dataUrl);
      } catch (err) {
        logger.error('Layout capture error:', err);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [open, onLayoutCaptured, captureTemplate]);

  // Reset capture flag when dialog closes
  useEffect(() => {
    if (!open) hasCapturedRef.current = false;
  }, [open]);

  const handleExportPdf = useCallback(async () => {
    if (!templateRef.current) return;
    setIsExporting(true);

    try {
      const { jsPDF } = await import('jspdf');

      const canvas = await captureTemplate(2);
      if (!canvas) return;

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const canvasAspect = canvas.width / canvas.height;
      const pageAspect = pageWidth / pageHeight;

      let imgWidth: number;
      let imgHeight: number;
      let offsetX = 0;
      let offsetY = 0;

      if (canvasAspect > pageAspect) {
        imgWidth = pageWidth;
        imgHeight = pageWidth / canvasAspect;
        offsetY = 0;
      } else {
        imgHeight = pageHeight;
        imgWidth = pageHeight * canvasAspect;
        offsetX = (pageWidth - imgWidth) / 2;
      }

      pdf.addImage(imgData, 'JPEG', offsetX, offsetY, imgWidth, imgHeight);

      const filename = `mockup-aprovacao-${data.documentNumber.replace(/[/\s]/g, '-')}.pdf`;
      pdf.save(filename);
      toast.success('PDF exportado com sucesso!');
    } catch (err) {
      logger.error('PDF export error:', err);
      toast.error('Erro ao exportar PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  }, [captureTemplate, data.documentNumber]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] max-w-[860px] overflow-hidden p-0">
        <DialogHeader className="flex-row items-center justify-between border-b px-6 pb-2 pt-4">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <FileText aria-hidden="true" className="h-5 w-5 text-primary" />
              Aprovação de Layout
            </DialogTitle>
            <DialogDescription>
              Ref. {data.documentNumber} — {data.client.name}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleExportPdf} disabled={isExporting} size="sm" className="gap-1.5">
              {isExporting ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Download aria-hidden="true" className="h-4 w-4" />
              )}
              {isExporting ? 'Exportando...' : 'Baixar PDF'}
            </Button>
          </div>
        </DialogHeader>

        <div
          ref={stageRef}
          className="max-h-[calc(95vh-80px)] overflow-y-auto overflow-x-hidden bg-muted/30 p-4"
        >
          <div
            className="relative mx-auto"
            style={{ width: PAGE_WIDTH * scale, height: naturalHeight * scale }}
          >
            <div
              ref={scalerRef}
              data-testid="mockup-approval-scaler"
              className="absolute left-0 top-0 origin-top-left"
              style={{
                width: PAGE_WIDTH,
                height: naturalHeight,
                transform: `scale(${scale})`,
              }}
            >
              <div className="overflow-hidden rounded-lg bg-white shadow-xl">
                <MockupApprovalTemplate ref={templateRef} data={data} />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
