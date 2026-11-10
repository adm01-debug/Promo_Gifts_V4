import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type Hls from 'hls.js';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

type HlsType = InstanceType<typeof Hls>;

// E128: extracted from PromoFlixPlayer.tsx
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export function formatTime(secs: number): string {
  if (!isFinite(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface UsePromoFlixPlayerOptions {
  src: string;
  isHls?: boolean;
  autoPlay?: boolean;
  onUnrecoverableError?: () => void;
  productName?: string;
  title?: string;
}

export function usePromoFlixPlayer({
  src,
  isHls = false,
  autoPlay = true,
  onUnrecoverableError,
  productName,
  title,
}: UsePromoFlixPlayerOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const hlsRef = useRef<HlsType | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('promoflix_volume');
      return saved !== null ? parseFloat(saved) : 1;
    } catch { return 1; }
  });
  const [isMuted, setIsMuted] = useState(() => {
    try { return localStorage.getItem('promoflix_muted') === 'true'; }
    catch { return false; }
  });
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [hlsError, setHlsError] = useState<string | null>(null);
  const [showLoadingAction, setShowLoadingAction] = useState(false);
  const [flashLabel, setFlashLabel] = useState<string | null>(null);
  const [isRaioXActive, setIsRaioXActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showRaioXPanel, setShowRaioXPanel] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<number | null>(null);
  const [hoverSeekPct, setHoverSeekPct] = useState<number | null>(null);
  const [qualities, setQualities] = useState<{ id: number; label: string }[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);

  const hotspots = useMemo(() => [
    { id: 1, x: 25, y: 35, label: 'Estrutura Principal', detail: 'Alumínio Escovado Premium', confidence: 98 },
    { id: 2, x: 65, y: 45, label: 'Lente de Precisão', detail: 'Cristal Safira Anti-Reflexo', confidence: 95 },
    { id: 3, x: 45, y: 75, label: 'Acabamento Base', detail: 'Polímero de Alta Densidade', confidence: 92 },
  ], []);

  const logTelemetry = useCallback((event: string, details?: unknown) => {
    logger.debug(`[PromoFlix Telemetry] ${event}`, details);
  }, []);

  const flash = useCallback((label: string) => {
    setFlashLabel(label);
    window.setTimeout(() => setFlashLabel(null), 700);
  }, []);

  const reconnectAttemptsRef = useRef(0);
  const loadingTimeoutRef = useRef<number | null>(null);
  const initTokenRef = useRef(0);
  const autoplayFallbackTriedRef = useRef(false);
  const suppressMutePersistRef = useRef(false);
  const hlsDestroyedRef = useRef(false);
  const onUnrecoverableErrorRef = useRef(onUnrecoverableError);
  onUnrecoverableErrorRef.current = onUnrecoverableError;

  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current !== null) {
      window.clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  const armLoadingTimeout = useCallback(() => {
    clearLoadingTimeout();
    loadingTimeoutRef.current = window.setTimeout(() => {
      const v = videoRef.current;
      if (v && v.readyState < 1) {
        setShowLoadingAction(true);
        logTelemetry('STUCK_LOADING_TIMEOUT', {
          readyState: v.readyState, networkState: v.networkState,
          src: `${src.substring(0, 50)}...`, currentTime: v.currentTime,
        });
        loadingTimeoutRef.current = window.setTimeout(() => {
          const vv = videoRef.current;
          if (vv && vv.readyState < 1) {
            setHlsError((prev) => prev ?? 'O vídeo está demorando para responder. Pode haver um bloqueio de rede ou CORS.');
            logTelemetry('LOADING_ERROR_FINAL', { readyState: vv.readyState });
          }
        }, 15000);
      } else {
        setIsLoading(false);
        setIsReconnecting(false);
      }
    }, 10000);
  }, [clearLoadingTimeout, logTelemetry, src]);

  const initPlayer = useCallback(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    const myToken = ++initTokenRef.current;
    autoplayFallbackTriedRef.current = false;
    hlsDestroyedRef.current = false;
    setIsLoading(true);
    setHlsError(null);
    setIsReconnecting(false);
    setShowLoadingAction(false);
    reconnectAttemptsRef.current = 0;
    logTelemetry('INIT_PLAYER', { src: `${src.substring(0, 50)}...`, isHls });
    armLoadingTimeout();
    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch { /* noop */ }
      hlsRef.current = null;
    }
    try { video.removeAttribute('src'); video.load(); } catch { /* noop */ }
    const shouldMuteForAutoplay = autoPlay && !isMuted;
    const effectiveMuted = isMuted || shouldMuteForAutoplay;
    suppressMutePersistRef.current = shouldMuteForAutoplay;
    const tryPlay = (v: HTMLVideoElement) => {
      v.play().catch((err) => {
        if (!autoplayFallbackTriedRef.current && !v.muted) {
          autoplayFallbackTriedRef.current = true;
          suppressMutePersistRef.current = true;
          v.muted = true;
          v.play().catch(() => setIsPlaying(false));
          logTelemetry('AUTOPLAY_FALLBACK_MUTED', { error: String(err) });
        } else {
          setIsPlaying(false);
        }
      });
    };
    const canPlayNativeHls = video.canPlayType('application/vnd.apple.mpegurl') !== '';
    const isM3u8 = /\.m3u8(\?|$)/i.test(src) || /\/manifest\/video\.m3u8/i.test(src) || /^https?:\/\/[^/]*cloudflarestream\.com.*\/manifest/i.test(src);
    const useNative = !isHls || !isM3u8 || canPlayNativeHls;
    if (useNative) {
      video.src = src;
      video.volume = volume;
      video.muted = effectiveMuted;
      try { video.load(); } catch { /* noop */ }
      if (isPlaying || autoPlay) tryPlay(video);
      return;
    }
    import('hls.js')
      .then(({ default: hlsConstructor }) => {
        if (myToken !== initTokenRef.current) return;
        const videoEl = videoRef.current;
        if (!videoEl) return;
        if (!hlsConstructor.isSupported()) {
          videoEl.src = src;
          videoEl.volume = volume;
          videoEl.muted = effectiveMuted;
          try { videoEl.load(); } catch { /* noop */ }
          if (isPlaying || autoPlay) tryPlay(videoEl);
          return;
        }
        if (hlsRef.current) {
          try { hlsRef.current.destroy(); } catch { /* noop */ }
        }
        const hlsInstance = new hlsConstructor({
          lowLatencyMode: false,
          enableWorker: true,
          maxBufferLength: 60,
          maxMaxBufferLength: 600,
          maxBufferSize: 120 * 1000 * 1000,
          backBufferLength: 30,
          startLevel: -1,
          abrEwmaDefaultEstimate: 2_000_000,
          startFragPrefetch: true,
          capLevelToPlayerSize: false,
        });
        hlsRef.current = hlsInstance;
        hlsInstance.loadSource(src);
        hlsInstance.attachMedia(videoEl);
        hlsInstance.on(hlsConstructor.Events.MANIFEST_PARSED, (_, data) => {
          if (myToken !== initTokenRef.current) return;
          const levels = data.levels.map((level, index) => ({
            id: index,
            label: level.height ? `${level.height}p` : `Qualidade ${index + 1}`,
          }));
          setQualities(levels);
          try {
            const savedQuality = localStorage.getItem('promoflix_quality');
            if (savedQuality?.startsWith('h:')) {
              const targetH = parseInt(savedQuality.slice(2), 10);
              if (Number.isFinite(targetH) && targetH > 0) {
                let bestIdx = -1;
                let bestDiff = Infinity;
                data.levels.forEach((lvl, idx) => {
                  if (!lvl.height) return;
                  const diff = Math.abs(lvl.height - targetH);
                  if (diff < bestDiff) { bestDiff = diff; bestIdx = idx; }
                });
                if (bestIdx >= 0) { hlsInstance.currentLevel = bestIdx; setCurrentQuality(bestIdx); }
              }
            }
          } catch (err) { logger.warn('Falha ao carregar preferência de qualidade:', err); }
          const v = videoRef.current;
          if (v) {
            v.volume = volume;
            v.muted = effectiveMuted;
            if (isPlaying || autoPlay) tryPlay(v);
          }
          setIsLoading(false);
          setIsReconnecting(false);
          clearLoadingTimeout();
        });
        hlsInstance.on(hlsConstructor.Events.FRAG_LOADED, () => {
          if (myToken !== initTokenRef.current) return;
          setIsLoading(false);
          setIsReconnecting(false);
          clearLoadingTimeout();
        });
        hlsInstance.on(hlsConstructor.Events.ERROR, (_, data) => {
          if (myToken !== initTokenRef.current) return;
          if (!data.fatal) return;
          switch (data.type) {
            case hlsConstructor.ErrorTypes.NETWORK_ERROR: {
              logger.error('HLS Network Error:', data);
              reconnectAttemptsRef.current += 1;
              if (reconnectAttemptsRef.current > 3) {
                setHlsError('Não foi possível carregar o vídeo. Verifique sua conexão e tente novamente.');
                setIsLoading(false);
                setIsReconnecting(false);
                clearLoadingTimeout();
                try { hlsInstance.destroy(); } catch { /* noop */ }
                hlsDestroyedRef.current = true;
                hlsRef.current = null;
                onUnrecoverableErrorRef.current?.();
              } else {
                setIsReconnecting(true);
                hlsInstance.startLoad();
              }
              break;
            }
            case hlsConstructor.ErrorTypes.MEDIA_ERROR:
              logger.error('HLS Media Error:', data);
              try { hlsInstance.recoverMediaError(); } catch {
                setHlsError('Erro de mídia ao reproduzir o vídeo.');
                setIsLoading(false);
                clearLoadingTimeout();
                try { hlsInstance.destroy(); } catch { /* noop */ }
                hlsDestroyedRef.current = true;
                hlsRef.current = null;
                onUnrecoverableErrorRef.current?.();
              }
              break;
            default:
              logger.error('HLS Fatal Error:', data);
              setHlsError('Falha ao carregar o vídeo. Tente novamente.');
              setIsLoading(false);
              setIsReconnecting(false);
              clearLoadingTimeout();
              try { hlsInstance.destroy(); } catch { /* noop */ }
              hlsDestroyedRef.current = true;
              hlsRef.current = null;
              onUnrecoverableErrorRef.current?.();
              break;
          }
        });
        hlsInstance.on(hlsConstructor.Events.LEVEL_SWITCHED, () => {
          if (hlsInstance.autoLevelEnabled) setCurrentQuality(-1);
        });
      })
      .catch((err) => {
        if (myToken !== initTokenRef.current) return;
        logger.error('HLS loading error:', err);
        const v = videoRef.current;
        if (v) {
          v.src = src;
          v.volume = volume;
          v.muted = effectiveMuted;
          try { v.load(); } catch { /* noop */ }
          if (isPlaying || autoPlay) tryPlay(v);
        } else {
          setHlsError('Erro crítico no player.');
          setIsLoading(false);
          clearLoadingTimeout();
        }
      });
  }, [src, isHls, volume, isMuted, isPlaying, autoPlay, armLoadingTimeout, clearLoadingTimeout, logTelemetry]);

  useEffect(() => {
    initPlayer();
    const video = videoRef.current;
    return () => {
      initTokenRef.current += 1;
      clearLoadingTimeout();
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch { /* noop */ }
        hlsRef.current = null;
      }
      if (video) {
        try { video.removeAttribute('src'); video.load(); } catch { /* noop */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, isHls]);

  const setQuality = useCallback((index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = index;
    setCurrentQuality(index);
    const label = index === -1 ? 'Auto' : qualities.find((q) => q.id === index)?.label || 'Qualidade';
    try {
      if (index === -1) {
        localStorage.setItem('promoflix_quality', 'auto');
      } else {
        const h = parseInt(label, 10);
        localStorage.setItem('promoflix_quality', Number.isFinite(h) && h > 0 ? `h:${h}` : 'auto');
      }
    } catch { /* noop */ }
    flash(label);
  }, [qualities, flash]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => { setIsPlaying(true); localStorage.setItem('promoflix_playing', 'true'); logTelemetry('EVENT_PLAY'); };
    const onPause = () => { setIsPlaying(false); localStorage.setItem('promoflix_playing', 'false'); logTelemetry('EVENT_PAUSE'); };
    const onTime = () => setCurrentTime(video.currentTime);
    const onMeta = () => {
      setDuration(video.duration || 0);
      setIsLoading(false);
      setHlsError(null);
      setShowLoadingAction(false);
      clearLoadingTimeout();
      logTelemetry('EVENT_LOADEDMETADATA', { duration: video.duration });
    };
    const onLoadStart = () => logTelemetry('EVENT_LOADSTART');
    const onLoadedData = () => {
      setIsLoading(false); setIsReconnecting(false); setShowLoadingAction(false);
      clearLoadingTimeout(); logTelemetry('EVENT_LOADEDDATA');
    };
    const onProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
        setIsLoading(false); setShowLoadingAction(false); clearLoadingTimeout();
      }
    };
    const onWaiting = () => {
      if (video.readyState < 2) { setIsLoading(true); logTelemetry('EVENT_WAITING', { readyState: video.readyState }); }
    };
    const onPlaying = () => {
      setIsLoading(false); setIsReconnecting(false); setShowLoadingAction(false);
      clearLoadingTimeout(); logTelemetry('EVENT_PLAYING');
    };
    const onCanPlay = () => {
      setIsLoading(false); setIsReconnecting(false); setShowLoadingAction(false);
      clearLoadingTimeout(); logTelemetry('EVENT_CANPLAY');
    };
    const onError = () => {
      const error = video.error;
      logTelemetry('EVENT_VIDEO_ERROR', { code: error?.code, message: error?.message, usingHls: Boolean(hlsRef.current), src: video.currentSrc?.substring(0, 80) });
      if (hlsRef.current) return;
      if (hlsDestroyedRef.current) return;
      if (!video.currentSrc && !video.src) return;
      switch (error?.code) {
        case 1: return;
        case 2: setHlsError('Falha de rede ao carregar o vídeo. Verifique sua conexão e tente novamente.'); break;
        case 3: setHlsError('Erro ao decodificar o vídeo. O arquivo pode estar corrompido ou em um codec não suportado.'); break;
        case 4:
        default:
          setHlsError('Não foi possível reproduzir este vídeo. O formato pode não ser suportado pelo seu navegador ou o link está indisponível.');
          onUnrecoverableErrorRef.current?.();
          break;
      }
      setIsLoading(false); setShowLoadingAction(false); clearLoadingTimeout();
    };
    const onRate = () => setPlaybackRate(video.playbackRate);
    const onVolume = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
      localStorage.setItem('promoflix_volume', video.volume.toString());
      if (suppressMutePersistRef.current && video.muted) {
        // autoplay-forced mute: keep flag until user explicitly unmutes
      } else {
        suppressMutePersistRef.current = false;
        localStorage.setItem('promoflix_muted', video.muted.toString());
      }
    };
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('loadstart', onLoadStart);
    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('progress', onProgress);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('error', onError);
    video.addEventListener('ratechange', onRate);
    video.addEventListener('volumechange', onVolume);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('loadstart', onLoadStart);
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('error', onError);
      video.removeEventListener('ratechange', onRate);
      video.removeEventListener('volumechange', onVolume);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => undefined); } else { v.pause(); }
  }, []);

  const seekBy = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
    flash(delta > 0 ? `+${delta}s` : `${delta}s`);
  }, [flash]);

  const setRate = useCallback((rate: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = rate;
    flash(`${rate}x`);
  }, [flash]);

  const stepRate = useCallback((direction: -1 | 1) => {
    const v = videoRef.current;
    if (!v) return;
    const idx = PLAYBACK_RATES.indexOf(v.playbackRate as (typeof PLAYBACK_RATES)[number]);
    const baseIdx = idx === -1 ? PLAYBACK_RATES.indexOf(1) : idx;
    const next = PLAYBACK_RATES[Math.max(0, Math.min(PLAYBACK_RATES.length - 1, baseIdx + direction))];
    setRate(next);
  }, [setRate]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  }, []);

  const setVol = useCallback((value: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = Math.max(0, Math.min(1, value));
    if (v.volume > 0 && v.muted) v.muted = false;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => undefined); }
    else { el.requestFullscreen().catch(() => undefined); }
  }, []);

  const togglePip = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) { await document.exitPictureInPicture(); }
      else if ('requestPictureInPicture' in v) { await v.requestPictureInPicture(); }
    } catch { toast.error('Picture-in-Picture indisponível neste vídeo'); }
  }, []);

  const toggleRaioX = useCallback(() => {
    setIsRaioXActive((prev) => {
      const next = !prev;
      if (next) {
        flash('Raio-X ATIVADO');
        setIsAnalyzing(true);
        let progress = 0;
        const interval = window.setInterval(() => {
          progress += 5;
          if (progress >= 100) {
            window.clearInterval(interval);
            setIsAnalyzing(false);
            setShowRaioXPanel(true);
          }
        }, 80);
      } else {
        flash('Raio-X DESATIVADO');
        setShowRaioXPanel(false);
        setIsAnalyzing(false);
        setSelectedHotspot(null);
      }
      return next;
    });
  }, [flash]);

  const takeScreenshot = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = v.videoWidth || 1280;
      canvas.height = v.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) { toast.error('Não foi possível capturar o frame'); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeName = (productName || title || 'promoflix').replace(/[^a-z0-9-_]+/gi, '-');
        a.href = url;
        a.download = `${safeName}-${Math.floor(v.currentTime)}s.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success('Frame salvo em PNG');
        flash('Foto');
      }, 'image/png');
    } catch {
      toast.error('Captura bloqueada pelo navegador (CORS). Tente outro vídeo ou use a tecla PrintScreen.');
    }
  }, [productName, title, flash]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      switch (e.key) {
        case ' ': case 'k': case 'K': e.preventDefault(); togglePlay(); break;
        case 'ArrowLeft': case 'j': case 'J': e.preventDefault(); seekBy(-10); break;
        case 'ArrowRight': case 'l': case 'L': e.preventDefault(); seekBy(10); break;
        case 'ArrowUp': e.preventDefault(); setVol((videoRef.current?.volume ?? 1) + 0.1); break;
        case 'ArrowDown': e.preventDefault(); setVol((videoRef.current?.volume ?? 1) - 0.1); break;
        case 'm': case 'M': e.preventDefault(); toggleMute(); break;
        case 'f': case 'F': e.preventDefault(); toggleFullscreen(); break;
        case 'p': case 'P': e.preventDefault(); togglePip(); break;
        case 's': case 'S': e.preventDefault(); takeScreenshot(); break;
        case '>': case '.': e.preventDefault(); stepRate(1); break;
        case '<': case ',': e.preventDefault(); stepRate(-1); break;
        case 'x': case 'X': e.preventDefault(); toggleRaioX(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, seekBy, setVol, toggleMute, toggleFullscreen, togglePip, takeScreenshot, stepRate, toggleRaioX]);

  const bumpControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2800);
  }, [isPlaying]);

  useEffect(() => bumpControls(), [bumpControls]);
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
    };
  }, []);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;
  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    v.currentTime = (Number(e.target.value) / 100) * duration;
  };

  return {
    videoRef, containerRef,
    isPlaying, currentTime, duration, buffered, volume, isMuted, playbackRate,
    isFullscreen, isLoading, isReconnecting, hlsError, showLoadingAction,
    flashLabel, isRaioXActive, isAnalyzing, showControls, setShowControls,
    showRaioXPanel, setShowRaioXPanel,
    selectedHotspot, setSelectedHotspot, hoverSeekPct, setHoverSeekPct,
    qualities, currentQuality, hotspots, bumpControls,
    togglePlay, seekBy, setRate, stepRate, toggleMute, setVol, toggleFullscreen,
    togglePip, toggleRaioX, takeScreenshot, setQuality,
    progressPct, bufferedPct, onSeek,
    initPlayer,
  };
}
