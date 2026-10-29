/**
 * Matriz de aceite do Mockup — GRUPO 7 (A18–A20): saídas (imagem × ficha) e
 * histórico/limites.
 *
 * Um teste por cenário COBERTO, nomeado com o ID. Fixtures fixas em
 * `./grupo7.fixtures.ts` (nunca marca/cliente real). Nenhum teste desativado ou
 * marcado como pendente.
 *
 * Só entra comportamento que JÁ passa no código atual. O cenário que depende de
 * correção ainda não integrada NÃO vira teste aqui: A19 (excluir o último item da
 * última página → reconciliar a página) depende do cartão t_a87fe5f2 (branch
 * v2/s63-2610081947, commit e9ebc2f42), ainda não integrado; está listado como
 * PENDENTE no relato do cartão.
 *
 * A18 — a ficha de aprovação sai da MESMA revisão que a imagem: o documento baixa
 *       com a mesma referência, a mesma data e a mesma imagem do resultado, e uma
 *       revisão fixa mantém referência/data/imagem coerentes no PDF baixado.
 * A20 — limites de upload por tipo: raster até 10 MB (`MultiAreaManager`) e arte
 *       original (AI/EPS/PDF/SVG/CDR) até 25 MB (`ArtFileUpload`), com recusa
 *       acima do limite.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';

// Mocks de AMBIENTE (não do comportamento sob teste): bibliotecas de canvas/PDF,
// logo do timbrado (faz fetch de mesmo-origem), rede e sonner.
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  }),
  Toaster: () => null,
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/components/pdf/proposal/LogoWithTransparentBg', () => ({
  LogoWithTransparentBg: () => null,
  processLogoTransparent: vi.fn(async (src: string) => src),
}));

// html2canvas/jsPDF: usados só para gerar o PDF da ficha (contexto, não o alvo).
const { html2canvasMock, jsPdfSave, jsPdfAddImage } = vi.hoisted(() => ({
  html2canvasMock: vi.fn(),
  jsPdfSave: vi.fn(),
  jsPdfAddImage: vi.fn(),
}));
vi.mock('html2canvas', () => ({ default: html2canvasMock }));
vi.mock('jspdf', () => ({
  jsPDF: function jsPDFMock() {
    return {
      internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
      addImage: jsPdfAddImage,
      save: jsPdfSave,
    };
  },
}));

// Supabase (storage + tabela de anexos) — rede mockada, comportamento real.
const supa = vi.hoisted(() => ({
  upload: vi.fn(async () => ({ data: null, error: null })),
  createSignedUrl: vi.fn(async () => ({
    data: { signedUrl: 'https://fixture.invalid/signed/FIXTURE.art' },
    error: null,
  })),
  remove: vi.fn(async () => ({ error: null })),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: supa.upload,
        createSignedUrl: supa.createSignedUrl,
        remove: supa.remove,
      }),
    },
    from: () => ({
      insert: (payload: Record<string, unknown>) => ({
        select: () => ({
          single: async () => ({
            data: { id: 'fixture-att-1', notes: null, created_at: '2026-10-01T12:00:00.000Z', ...payload },
            error: null,
          }),
        }),
      }),
    }),
  },
}));

import { MockupLayoutButtons } from '@/components/mockup/approval/MockupLayoutButtons';
import { MockupApprovalPreview } from '@/components/mockup/approval/MockupApprovalPreview';
import { MultiAreaManager } from '@/components/mockup/MultiAreaManager';
import { ArtFileUpload } from '@/components/mockup/ArtFileUpload';
import {
  CLIENTE_FIXTURE,
  VENDEDOR_FIXTURE,
  PRODUTO_FIXTURE,
  TECNICA_FIXTURE,
  AREA_FIXTURE,
  FICHA_FIXTURE,
  MOCKUP_FIXTURE_URL,
  MB,
  rasterDe,
  arteVetorialDe,
  arquivoComTamanho,
} from './grupo7.fixtures';

beforeEach(() => {
  vi.clearAllMocks();
  html2canvasMock.mockResolvedValue({
    width: 800,
    height: 1000,
    toDataURL: () => 'data:image/jpeg;base64,RklDVFVSRS1DQU5WQVM',
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── A18 — baixar imagem e ficha com mesma revisão, data e referência ───────

describe('A18 — baixar imagem e ficha com mesma revisão, data e referência', () => {
  it('a ficha baixa com a MESMA imagem, referência e data do resultado gerado', async () => {
    render(
      <TooltipProvider>
        <MockupLayoutButtons
          generatedMockup={MOCKUP_FIXTURE_URL}
          product={PRODUTO_FIXTURE}
          technique={TECNICA_FIXTURE}
          client={CLIENTE_FIXTURE}
          seller={VENDEDOR_FIXTURE}
          activeArea={AREA_FIXTURE}
        />
      </TooltipProvider>,
    );

    // Abre a ficha da imagem gerada (mesmo resultado que o card mostra).
    fireEvent.click(await screen.findByRole('button', { name: /Gerar Layout - IA/ }));

    const ficha = await screen.findByRole('dialog');
    const texto = ficha.textContent ?? '';

    // Referência no formato do documento (MK-AAAAMMDD-HHMM) — a "revisão" da saída.
    const ref = /MK-\d{8}-\d{4}/.exec(texto)?.[0];
    expect(ref).toBeDefined();

    // A imagem embutida na ficha é o MESMO asset do resultado (mesma revisão).
    const imagem = ficha.querySelector('img[alt="Mockup"]');
    expect(imagem).not.toBeNull();
    expect(imagem).toHaveAttribute('src', MOCKUP_FIXTURE_URL);

    // A data do documento é a data de HOJE e a referência carrega essa mesma data.
    const agora = new Date();
    const dataBr = agora.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    expect(texto).toContain(dataBr);
    const aaaammdd = `${agora.getFullYear()}${String(agora.getMonth() + 1).padStart(2, '0')}${String(agora.getDate()).padStart(2, '0')}`;
    expect(ref).toContain(aaaammdd);

    // Baixar a ficha: o PDF sai nomeado pela MESMA referência exibida.
    fireEvent.click(screen.getByRole('button', { name: /Baixar PDF/ }));
    await waitFor(() =>
      expect(jsPdfSave).toHaveBeenCalledWith(`mockup-aprovacao-${ref}.pdf`),
    );
    expect(jsPdfAddImage).toHaveBeenCalled();
  });

  it('a ficha fixa mantém referência, data e imagem da MESMA revisão no PDF baixado', async () => {
    render(<MockupApprovalPreview data={FICHA_FIXTURE} open onOpenChange={() => {}} />);

    const ficha = await screen.findByRole('dialog');
    const texto = ficha.textContent ?? '';

    // Referência e data vêm do MESMO objeto de revisão (fixture fixa).
    expect(texto).toContain(`Ref. ${FICHA_FIXTURE.documentNumber}`);
    expect(texto).toContain(FICHA_FIXTURE.date);

    // A imagem embutida é o próprio asset da revisão fixa.
    const imagem = ficha.querySelector('img[alt="Mockup"]');
    expect(imagem).not.toBeNull();
    expect(imagem).toHaveAttribute('src', FICHA_FIXTURE.mockupImageUrl);

    // O PDF baixado é nomeado pela MESMA referência da revisão.
    fireEvent.click(screen.getByRole('button', { name: /Baixar PDF/ }));
    await waitFor(() =>
      expect(jsPdfSave).toHaveBeenCalledWith(
        `mockup-aprovacao-${FICHA_FIXTURE.documentNumber}.pdf`,
      ),
    );
    expect(jsPdfAddImage).toHaveBeenCalledTimes(1);
  });
});

// ─── A20 — raster 10 MB e arte original 25 MB ───────────────────────────────

describe('A20 — raster 10 MB e arte original 25 MB', () => {
  it('recusa raster acima de 10 MB e arte vetorial acima de 25 MB, aceitando o limite exato', async () => {
    // ── Raster: caminho de upload de logo (MultiAreaManager), limite 10 MB.
    const onLogoUpload = vi.fn();
    const { container, unmount } = render(
      <MultiAreaManager
        areas={[{ ...AREA_FIXTURE, logoPreview: null }]}
        activeAreaId={AREA_FIXTURE.id}
        onAreasChange={vi.fn()}
        onActiveAreaChange={vi.fn()}
        onLogoUpload={onLogoUpload}
      />,
    );
    const dropzone = container.firstElementChild as HTMLElement;

    // 10 MB exatos: aceito.
    fireEvent.drop(dropzone, { dataTransfer: { files: [rasterDe(10 * MB)] } });
    expect(onLogoUpload).toHaveBeenCalledTimes(1);
    expect(onLogoUpload).toHaveBeenCalledWith(
      AREA_FIXTURE.id,
      expect.objectContaining({ name: 'logo.png', size: 10 * MB }),
    );

    // 10 MB + 1 byte: recusado com mensagem explícita, nada aplicado.
    fireEvent.drop(dropzone, { dataTransfer: { files: [rasterDe(10 * MB + 1)] } });
    expect(onLogoUpload).toHaveBeenCalledTimes(1);
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
      'Arquivo muito grande. Tamanho máximo: 10 MB.',
    );
    unmount();

    // ── Arte original (vetorial): ArtFileUpload, limite 25 MB.
    const onAttachmentsChange = vi.fn();
    const arte = render(
      <ArtFileUpload
        userId="fixture-user"
        attachments={[]}
        onAttachmentsChange={onAttachmentsChange}
      />,
    );
    const input = arte.container.querySelector('input[type="file"]') as HTMLInputElement;

    // 25 MB + 1 byte: recusado, nada enviado.
    fireEvent.change(input, { target: { files: [arteVetorialDe(25 * MB + 1)] } });
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith('arte.ai: excede 25MB');
    expect(supa.upload).not.toHaveBeenCalled();
    expect(onAttachmentsChange).not.toHaveBeenCalled();

    // 25 MB exatos: aceito e registrado como anexo.
    fireEvent.change(input, { target: { files: [arteVetorialDe(25 * MB)] } });
    await waitFor(() => expect(supa.upload).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onAttachmentsChange).toHaveBeenCalledTimes(1));
    expect(onAttachmentsChange).toHaveBeenCalledWith([
      expect.objectContaining({ original_name: 'arte.ai', file_extension: '.ai', file_size_bytes: 25 * MB }),
    ]);

    // Formato fora da lista de arte vetorial: recusado antes de qualquer upload.
    fireEvent.change(input, {
      target: { files: [arquivoComTamanho(1024, 'malicioso.exe', 'application/octet-stream')] },
    });
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
      'malicioso.exe: formato não suportado (.ai, .eps, .pdf, .svg, .cdr)',
    );
    expect(supa.upload).toHaveBeenCalledTimes(1);
  });
});
