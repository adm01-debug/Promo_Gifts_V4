import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

const { toastError, toastSuccess, uploadMock } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  uploadMock: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { error: toastError, success: toastSuccess } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: uploadMock,
        createSignedUrl: vi
          .fn()
          .mockResolvedValue({ data: { signedUrl: 'https://x/y' }, error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
    from: () => ({
      insert: () => ({
        select: () => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'row-1' }, error: null }),
        }),
      }),
    }),
  },
}));

import { ArtFileUpload, validateArtFile } from '../ArtFileUpload';
import { AreaCard } from '../AreaCard';

const MB = 1024 * 1024;
function fileOf(name: string, type: string, bytes: number): File {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: bytes });
  return f;
}

function renderUpload() {
  const onChange = vi.fn();
  render(<ArtFileUpload userId="u1" attachments={[]} onAttachmentsChange={onChange} />);
  return { onChange, zone: screen.getByTestId('mockup-art-file-dropzone') };
}

beforeEach(() => {
  vi.clearAllMocks();
  uploadMock.mockResolvedValue({ error: null });
});

describe('validateArtFile (original de arte)', () => {
  it('aceita .ai de 24 MB e recusa .ai de 26 MB', () => {
    expect(validateArtFile(fileOf('a.ai', 'application/illustrator', 24 * MB))).toBeNull();
    expect(validateArtFile(fileOf('a.ai', 'application/illustrator', 26 * MB))).toMatch(
      /excede 25MB/,
    );
  });
});

describe('ArtFileUpload — comportamento', () => {
  it('arraste de .ai de 24 MB é enviado', async () => {
    const { zone, onChange } = renderUpload();
    fireEvent.drop(zone, {
      dataTransfer: { files: [fileOf('a.ai', 'application/illustrator', 24 * MB)] },
    });
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(uploadMock).toHaveBeenCalledTimes(1);
  });

  it('arraste de .ai de 26 MB é recusado sem enviar', async () => {
    const { zone } = renderUpload();
    fireEvent.drop(zone, {
      dataTransfer: { files: [fileOf('a.ai', 'application/illustrator', 26 * MB)] },
    });
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('a.ai: excede 25MB'));
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('bloqueia segundo envio enquanto um upload está em andamento', async () => {
    let release: (v: { error: null }) => void = () => {};
    uploadMock.mockImplementationOnce(() => new Promise((res) => (release = res)));
    const { zone } = renderUpload();
    const good = () => ({
      dataTransfer: { files: [fileOf('a.ai', 'application/illustrator', 1000)] },
    });

    fireEvent.drop(zone, good());
    await screen.findByRole('status');
    fireEvent.drop(zone, good());

    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith('Aguarde o envio em andamento terminar');
    expect(zone).toHaveAttribute('aria-busy', 'true');

    release({ error: null });
    await waitFor(() => expect(zone).toHaveAttribute('aria-busy', 'false'));
  });

  it('dropzone recebe foco por Tab e Enter abre o seletor', async () => {
    const user = userEvent.setup();
    const { zone } = renderUpload();
    const input = zone.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');

    await user.tab();
    expect(zone).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});

describe('AreaCard — seletor de logo', () => {
  const area = {
    id: 'a1',
    name: 'Frente',
    positionX: 50,
    positionY: 50,
    logoPreview: null,
  } as never;

  function setup() {
    const onLogoUpload = vi.fn();
    render(
      <AreaCard
        area={area}
        index={0}
        isActive={false}
        isReadOnly={false}
        canRemove={false}
        onSelect={vi.fn()}
        onNameChange={vi.fn()}
        onLogoUpload={onLogoUpload}
        onLogoRemove={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    return { onLogoUpload, input: screen.getByTestId('mockup-logo-upload-input-a1') };
  }

  it('restringe o accept a PNG/JPG/WebP', () => {
    expect(setup().input).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp');
  });

  it('SVG no seletor é recusado com a mensagem padrão e não chega ao upload', () => {
    const { input, onLogoUpload } = setup();
    fireEvent.change(input, { target: { files: [fileOf('l.svg', 'image/svg+xml', 1000)] } });
    expect(toastError).toHaveBeenCalledWith('Formato não suportado. Use JPG, PNG ou WebP.');
    expect(onLogoUpload).not.toHaveBeenCalled();
  });

  it('PNG de 11 MB no seletor é recusado; PNG de 1 MB passa', () => {
    const { input, onLogoUpload } = setup();
    fireEvent.change(input, { target: { files: [fileOf('l.png', 'image/png', 11 * MB)] } });
    expect(toastError).toHaveBeenCalledWith('Arquivo muito grande. Tamanho máximo: 10 MB.');
    expect(onLogoUpload).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { files: [fileOf('l.png', 'image/png', MB)] } });
    expect(onLogoUpload).toHaveBeenCalledTimes(1);
  });
});
