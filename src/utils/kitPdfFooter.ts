import type jsPDF from 'jspdf';
import { GRAY_500, setText } from './kitPdfPrimitives';

/** Rodapé com o aviso legal e a numeração de páginas, aplicado a todas as páginas. */
export function drawFooter(doc: jsPDF): void {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    setText(doc, GRAY_500);
    doc.text(
      'Valores estimados, sujeitos a confirmação. Preços de personalização podem variar conforme arte final.',
      14,
      pageHeight - 10,
    );
    doc.text(`Página ${page} de ${pageCount}`, 196, pageHeight - 10, { align: 'right' });
  }
}
