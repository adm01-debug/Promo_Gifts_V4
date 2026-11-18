import { type QuoteTemplate } from '@/hooks/quotes/useQuoteTemplates';

export interface ExportedTemplate {
  version: string;
  exportedAt: string;
  templates: Omit<QuoteTemplate, 'created_at' | 'id' | 'seller_id' | 'updated_at'>[];
}

/**
 * Exports templates to a downloadable JSON file
 */
export function exportTemplatesToJson(templates: QuoteTemplate[], filename?: string): void {
  const exportData: ExportedTemplate = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    templates: templates.map((template) => ({
      name: template.name,
      description: template.description,
      is_default: template.is_default,
      template_data: template.template_data,
      items: template.items,
      discount_percent: template.discount_percent,
      discount_amount: template.discount_amount,
      notes: template.notes,
      internal_notes: template.internal_notes,
      payment_terms: template.payment_terms,
      delivery_time: template.delivery_time,
      validity_days: template.validity_days,
    })),
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const defaultFilename =
    filename || `templates-export-${new Date().toISOString().split('T')[0]}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports a single template to JSON
 */
export function exportSingleTemplate(template: QuoteTemplate): void {
  const sanitizedName = template.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  exportTemplatesToJson([template], `template-${sanitizedName}.json`);
}

/**
 * Validates imported template data
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * GUARD: type predicate em vez de asserção. O arquivo importado vem do disco do
 * vendedor, então cada campo exigido é checado de verdade antes de o tipo valer.
 */
function isExportedTemplate(value: unknown): value is ExportedTemplate {
  if (!isRecord(value)) return false;
  if (typeof value.version !== 'string' || value.version.length === 0) return false;
  if (!Array.isArray(value.templates)) return false;
  return value.templates.every(
    (template) =>
      isRecord(template) && typeof template.name === 'string' && template.name.length > 0,
  );
}

export function validateImportedTemplates(data: unknown): ExportedTemplate | null {
  return isExportedTemplate(data) ? data : null;
}

/**
 * Reads a JSON file and parses template data
 */
export function readTemplateFile(file: File): Promise<ExportedTemplate | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        // FileReader.readAsText sempre devolve string; ArrayBuffer/null aqui é
        // leitura falha — recusa em vez de asserção de tipo.
        const content = e.target?.result;
        if (typeof content !== 'string') {
          resolve(null);
          return;
        }
        const data: unknown = JSON.parse(content);
        resolve(validateImportedTemplates(data));
      } catch {
        resolve(null);
      }
    };

    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}
