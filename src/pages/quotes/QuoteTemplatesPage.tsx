import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Users } from 'lucide-react';
import { PageSEO } from '@/components/seo/PageSEO';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuoteTemplatesList } from '@/components/quotes/QuoteTemplatesList';
import { QuoteTemplateForm } from '@/components/quotes/QuoteTemplateForm';
import { AdminTemplatesManager } from '@/components/quotes/AdminTemplatesManager';
import { type QuoteTemplate, useQuoteTemplates } from '@/hooks/quotes/useQuoteTemplates';

type ViewMode = 'create' | 'edit' | 'list';

/** Abas da visão de admin. */
type TemplatesTab = 'all-templates' | 'my-templates';

/**
 * GUARD: `Tabs.onValueChange` entrega `string`. Narrowing em vez de asserção —
 * valor fora do par conhecido é ignorado e a aba atual permanece.
 */
function isTemplatesTab(value: string): value is TemplatesTab {
  return value === 'all-templates' || value === 'my-templates';
}

/**
 * Templates (modelos) de orçamento — lista do vendedor, gestão admin
 * (todos os templates) e formulário de criação/edição.
 *
 * Rota: `/orcamentos/templates` (ver `src/routes/quote-routes.tsx`).
 * MainLayout vem da rota-layout `ProtectedAppLayout`, não daqui.
 */
export default function QuoteTemplatesPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingTemplate, setEditingTemplate] = useState<QuoteTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<TemplatesTab>('my-templates');
  const { isAdmin } = useQuoteTemplates();

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setViewMode('create');
  };

  const handleEditTemplate = (template: QuoteTemplate) => {
    setEditingTemplate(template);
    setViewMode('edit');
  };

  const handleSaveComplete = () => {
    setViewMode('list');
    setEditingTemplate(null);
  };

  const handleBack = () => {
    if (viewMode === 'list') {
      navigate('/orcamentos');
      return;
    }
    setViewMode('list');
    setEditingTemplate(null);
  };

  return (
    <>
      <PageSEO
        title="Modelos de Orçamento"
        description="Gerencie modelos para criar orçamentos rapidamente."
        path="/orcamentos/templates"
        noIndex
      />
      <div className="mx-auto flex w-full max-w-[1920px] animate-fade-in flex-col gap-3 px-3 py-3 pb-6 sm:gap-4 sm:px-4 sm:py-4 lg:px-6 xl:px-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            aria-label="Voltar"
            data-testid="quote-templates-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1
              data-testid="page-title-orcamentos-templates"
              className="font-display text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl"
            >
              {viewMode === 'list' && 'Templates de Orçamento'}
              {viewMode === 'create' && 'Novo Template'}
              {viewMode === 'edit' && 'Editar Template'}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {viewMode === 'list' && 'Gerencie seus templates reutilizáveis para orçamentos'}
              {viewMode === 'create' && 'Crie um novo template de orçamento'}
              {viewMode === 'edit' && `Editando: ${editingTemplate?.name ?? ''}`}
            </p>
          </div>
        </div>

        {viewMode === 'list' &&
          (isAdmin ? (
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                if (isTemplatesTab(v)) setActiveTab(v);
              }}
            >
              <TabsList>
                <TabsTrigger value="my-templates" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Meus Templates
                </TabsTrigger>
                <TabsTrigger value="all-templates" className="gap-2">
                  <Users className="h-4 w-4" />
                  Todos os Templates
                </TabsTrigger>
              </TabsList>

              <TabsContent value="my-templates" className="mt-4">
                <QuoteTemplatesList
                  onCreateTemplate={handleCreateTemplate}
                  onEditTemplate={handleEditTemplate}
                />
              </TabsContent>

              <TabsContent value="all-templates" className="mt-4">
                <AdminTemplatesManager onEditTemplate={handleEditTemplate} />
              </TabsContent>
            </Tabs>
          ) : (
            <QuoteTemplatesList
              onCreateTemplate={handleCreateTemplate}
              onEditTemplate={handleEditTemplate}
            />
          ))}

        {(viewMode === 'create' || viewMode === 'edit') && (
          <QuoteTemplateForm
            template={editingTemplate}
            onSave={handleSaveComplete}
            onCancel={handleBack}
          />
        )}
      </div>
    </>
  );
}
