import { describe, expect, it, vi } from 'vitest';
import { waitForMagazinePrintReadiness } from '../printReadiness';

function rootWith(images: HTMLImageElement[]) {
  return { querySelectorAll: vi.fn(() => images) } as unknown as Pick<Document, 'querySelectorAll'>;
}

describe('waitForMagazinePrintReadiness', () => {
  it('aguarda o decode de todas as imagens', async () => {
    const decode = vi.fn().mockResolvedValue(undefined);
    const image = { complete: false, decode } as unknown as HTMLImageElement;
    await waitForMagazinePrintReadiness(rootWith([image]), 100);
    expect(decode).toHaveBeenCalledOnce();
  });

  it('aguarda decode mesmo quando os bytes já terminaram de carregar', async () => {
    const decode = vi.fn().mockResolvedValue(undefined);
    const image = { complete: true, naturalWidth: 640, decode } as unknown as HTMLImageElement;
    await waitForMagazinePrintReadiness(rootWith([image]), 100);
    expect(decode).toHaveBeenCalledOnce();
  });

  it('bloqueia impressão quando uma imagem concluída está quebrada', async () => {
    const image = { complete: true, naturalWidth: 0 } as HTMLImageElement;
    await expect(waitForMagazinePrintReadiness(rootWith([image]), 100)).rejects.toThrow(
      'não pôde ser carregada',
    );
  });

  it('encerra a preparação por timeout', async () => {
    const image = {
      complete: false,
      decode: vi.fn(
        () =>
          new Promise(() => {
            // Deliberadamente pendente para exercitar o timeout.
          }),
      ),
    } as unknown as HTMLImageElement;
    await expect(waitForMagazinePrintReadiness(rootWith([image]), 5)).rejects.toThrow(
      'Tempo esgotado',
    );
  });
});
