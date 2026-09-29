const DEFAULT_TIMEOUT_MS = 15_000;

function imageReady(image: HTMLImageElement): Promise<void> {
  if (image.complete) {
    if (image.naturalWidth <= 0) {
      return Promise.reject(new Error('Uma imagem da revista não pôde ser carregada.'));
    }
    // `complete` only means the bytes arrived. `decode()` also waits until the
    // bitmap can be painted, which avoids blank images in the generated PDF.
    return typeof image.decode === 'function'
      ? image.decode().then(() => undefined)
      : Promise.resolve();
  }
  if (typeof image.decode === 'function') {
    return image.decode().then(() => undefined);
  }
  return new Promise((resolve, reject) => {
    image.addEventListener('load', () => resolve(), { once: true });
    image.addEventListener('error', () => reject(new Error('Falha ao carregar imagem.')), {
      once: true,
    });
  });
}

/** Aguarda fontes e imagens antes de abrir o diálogo nativo de impressão. */
export async function waitForMagazinePrintReadiness(
  root: Pick<Document, 'querySelectorAll'> = document,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<void> {
  const fonts = typeof document !== 'undefined' ? document.fonts?.ready : undefined;
  const images = Array.from(root.querySelectorAll<HTMLImageElement>('.mag-print-sheet img'));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('Tempo esgotado ao preparar fontes e imagens.')),
      timeoutMs,
    );
  });
  try {
    await Promise.race([
      Promise.all([fonts ?? Promise.resolve(), ...images.map(imageReady)]),
      timeout,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
