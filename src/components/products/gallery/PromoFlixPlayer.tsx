import { useState } from 'react';
import {
  Camera,
  Gauge,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Zap,
  ZapOff,
  Info,
  X,
  Search,
  Target,
  ChevronRight,
  Settings,
  MessageCircle,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { VideoShareWhatsAppDialog } from './VideoShareWhatsAppDialog';
import { cn } from '@/lib/utils';
import { m as motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePromoFlixPlayer, PLAYBACK_RATES, formatTime } from './usePromoFlixPlayer';

interface PromoFlixPlayerProps {
  src: string;
  posterUrl?: string | null;
  title?: string;
  productName?: string;
  isHls?: boolean;
  autoPlay?: boolean;
  className?: string;
  productId?: string | null;
  productPrice?: number | null;
  productSku?: string | null;
  productMinQuantity?: number | null;
  shareUrl?: string | null;
  /** Chamado quando o player esgota todas as tentativas e falha de forma irrecuperável.
   *  O componente pai pode usar isso para acionar um fallback (ex.: iframe YouTube/Vimeo). */
  onUnrecoverableError?: () => void;
}

export function PromoFlixPlayer({
  src,
  posterUrl,
  title,
  productName,
  isHls = false,
  autoPlay = true,
  className,
  productId: _productId,
  productPrice,
  productSku,
  productMinQuantity,
  shareUrl,
  onUnrecoverableError,
}: PromoFlixPlayerProps) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const canShareOnWhatsApp = Boolean(productName);

  const {
    videoRef,
    containerRef,
    isPlaying,
    currentTime,
    duration,
    buffered,
    volume,
    isMuted,
    playbackRate,
    isFullscreen,
    showControls,
    setShowControls,
    isLoading,
    isReconnecting,
    hlsError,
    showLoadingAction,
    flashLabel,
    isRaioXActive,
    isAnalyzing,
    showRaioXPanel,
    setShowRaioXPanel,
    selectedHotspot,
    setSelectedHotspot,
    hoverSeekPct,
    setHoverSeekPct,
    qualities,
    currentQuality,
    hotspots,
    bumpControls,
    togglePlay,
    seekBy,
    setRate,
    toggleMute,
    setVol,
    toggleFullscreen,
    togglePip,
    toggleRaioX,
    takeScreenshot,
    setQuality,
    progressPct,
    bufferedPct,
    onSeek,
    initPlayer,
  } = usePromoFlixPlayer({ src, isHls, autoPlay, onUnrecoverableError, productName, title });

  const volumeIcon =
    isMuted || volume === 0 ? (
      <VolumeX className="h-5 w-5" />
    ) : (
      <Volume2 className="h-5 w-5" />
    );

  return (
    <div
      ref={containerRef}
      className={cn(
        'group relative w-full overflow-hidden bg-black text-white',
        'aspect-video select-none',
        className,
      )}
      onMouseMove={bumpControls}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={(e) => {
        if (e.target === e.currentTarget) togglePlay();
      }}
    >
      {/* crossOrigin removed: Cloudflare Stream doesn't return CORS headers for
          dynamic preview origins (id-preview--*.lovable.app), which blocked HLS
          manifest fetch. Without it, video plays fine. Screenshot (canvas) may
          produce tainted canvas — the catch block in takeScreenshot handles this. */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full bg-black"
        poster={posterUrl ?? undefined}
        autoPlay={autoPlay}
        playsInline
        preload="auto"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      >
        <track kind="captions" />
      </video>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.45)_100%)]" />

      {(isLoading || isReconnecting) && !hlsError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/20 backdrop-blur-[2px]">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 rounded-full border-2 border-white/10" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-r-primary/60 border-t-primary" />
            <div className="absolute inset-2 flex items-center justify-center rounded-full bg-primary/10">
              <Play className="h-4 w-4 fill-primary text-primary" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60">
              {isReconnecting ? 'Reconectando...' : 'Carregando'}
            </span>
            {showLoadingAction && (
              <motion.button
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  initPlayer();
                }}
                className="mt-2 flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/20"
              >
                <RotateCcw className="h-3 w-3" />
                Carregar Manualmente
              </motion.button>
            )}
          </div>
        </div>
      )}

      {hlsError && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/80 p-6 text-center backdrop-blur-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-red-500 ring-1 ring-red-500/40">
            <ZapOff className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold">Ops! Algo deu errado</h3>
            <p className="max-w-xs text-sm text-white/60">{hlsError}</p>
          </div>
          <Button
            onClick={() => initPlayer()}
            className="bg-primary px-8 font-bold text-primary-foreground hover:bg-primary/90"
          >
            Tentar Novamente
          </Button>
        </div>
      )}

      <AnimatePresence>
        {flashLabel && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center"
          >
            <div className="rounded-full border border-white/10 bg-black/70 px-6 py-3 text-2xl font-bold tabular-nums shadow-2xl backdrop-blur-md">
              {flashLabel}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRaioXActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-20"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(var(--primary-rgb),0.1)_100%)] opacity-30" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
            {isAnalyzing && (
              <motion.div
                className="absolute left-0 z-30 h-1 w-full bg-primary/60 shadow-[0_0_15px_rgba(var(--primary-rgb),0.8)]"
                initial={{ top: '0%' }}
                animate={{ top: '100%' }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            )}
            {!isAnalyzing &&
              hotspots.map((spot) => (
                <motion.button
                  key={spot.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: spot.id * 0.2 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedHotspot(spot.id);
                  }}
                  className={cn(
                    'pointer-events-auto absolute flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-xl transition-all hover:scale-125',
                    selectedHotspot === spot.id
                      ? 'z-40 scale-125 bg-primary'
                      : 'bg-primary/40 backdrop-blur-sm',
                  )}
                  style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                >
                  <div className="absolute h-10 w-10 animate-ping rounded-full bg-primary/20" />
                  <Target className="h-4 w-4 text-white" />
                </motion.button>
              ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRaioXPanel && isRaioXActive && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute bottom-0 right-0 top-0 z-40 flex w-52 flex-col border-l border-white/10 bg-black/40 p-6 shadow-2xl backdrop-blur-xl"
          >
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 fill-primary/20 text-primary" />
                <h3 className="font-display text-lg font-bold tracking-tight">RAIO-X</h3>
              </div>
              <button
                onClick={() => setShowRaioXPanel(false)}
                className="rounded-full p-1 transition-colors hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto pr-2">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  Produto em Foco
                </p>
                <p className="text-sm font-medium">{productName || title || 'Identificando...'}</p>
              </div>
              {selectedHotspot ? (
                (() => {
                  const spot = hotspots.find((s) => s.id === selectedHotspot);
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={selectedHotspot}
                      className="space-y-4"
                    >
                      <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/10 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-primary">
                            Análise de Componente
                          </span>
                          <Badge
                            variant="outline"
                            className="border-primary/30 bg-primary/20 text-[9px] uppercase text-white"
                          >
                            {spot?.confidence}% Precisão
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold">{spot?.label}</p>
                        <p className="text-xs leading-relaxed text-white/70">{spot?.detail}</p>
                      </div>
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-white/50">Materiais</span>
                          <span className="font-mono">AL+SI+CR</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                          <div className="h-full bg-primary" style={{ width: '85%' }} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })()
              ) : (
                <div className="flex h-48 flex-col items-center justify-center space-y-4 px-4 text-center opacity-60">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
                    <Search className="h-6 w-6 text-white/40" />
                  </div>
                  <p className="text-xs text-white/60">
                    Selecione um ponto de interesse no vídeo para analisar
                  </p>
                </div>
              )}
            </div>
            <div className="border-t border-white/10 pt-6">
              <Button
                variant="outline"
                size="sm"
                className="group w-full gap-2 border-white/10 bg-white/5 hover:bg-white/10 hover:text-white"
                onClick={() => toast.info('Integrando com Catálogo de Produtos...')}
              >
                <Info className="h-4 w-4" />
                Ver Detalhes Técnicos
                <ChevronRight className="ml-auto h-3 w-3 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isPlaying && !isLoading && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={togglePlay}
            className="group/play absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/10 via-transparent to-black/40"
            aria-label="Reproduzir"
          >
            <span className="relative flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-primary/30 blur-2xl transition-all group-hover/play:bg-primary/50" />
              <span className="absolute inset-0 scale-110 rounded-full border border-white/20 transition-transform duration-500 group-hover/play:scale-125" />
              <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/95 text-black shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover/play:scale-110">
                <Play className="ml-1 h-9 w-9 fill-current" />
              </span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/70 via-black/30 to-transparent px-5 py-4 transition-all duration-500',
          showControls || !isPlaying ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0',
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative overflow-hidden rounded-md bg-gradient-to-br from-primary to-primary/70 px-2.5 py-1 shadow-lg shadow-primary/30 ring-1 ring-white/20">
            <span className="relative z-10 text-[11px] font-black uppercase tracking-[0.25em] text-primary-foreground">
              PromoFlix
            </span>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
            />
          </div>
          {title && (
            <div className="flex flex-col leading-tight">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">
                Você está assistindo
              </span>
              <span className="max-w-[420px] truncate text-sm font-semibold tracking-tight text-white drop-shadow-md">
                {title}
              </span>
            </div>
          )}
        </div>
        {isRaioXActive && (
          <div className="pointer-events-auto flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/20 px-3 py-1.5 shadow-lg shadow-primary/20 backdrop-blur-md">
              <Zap className="h-3.5 w-3.5 animate-pulse fill-primary/40 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                Modo Raio-X
              </span>
            </div>
          </div>
        )}
      </div>

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black via-black/80 to-transparent px-4 pb-4 pt-12 transition-all duration-500 md:px-5 md:pb-4 md:pt-12',
          showControls || !isPlaying ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
        )}
      >
        <div
          className="group/seek relative mb-2 flex items-center py-3 md:mb-3 md:py-2"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = ((e.clientX - rect.left) / rect.width) * 100;
            setHoverSeekPct(Math.max(0, Math.min(100, pct)));
          }}
          onMouseLeave={() => setHoverSeekPct(null)}
        >
          {hoverSeekPct !== null && duration > 0 && (
            <div
              className="pointer-events-none absolute -top-2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-white/10 bg-black/90 px-2 py-1 text-[11px] font-bold tabular-nums text-white shadow-xl backdrop-blur-md"
              style={{ left: `${hoverSeekPct}%` }}
            >
              {formatTime((hoverSeekPct / 100) * duration)}
              <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90" />
            </div>
          )}
          <div className="relative h-1.5 w-full rounded-full bg-white/20 transition-all duration-200 md:h-1 md:group-hover/seek:h-1.5">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white/30"
              style={{ width: `${bufferedPct}%` }}
            />
            {hoverSeekPct !== null && (
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white/15"
                style={{ width: `${hoverSeekPct}%` }}
              />
            )}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]"
              style={{ width: `${progressPct}%` }}
            />
            <div
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.6)] ring-2 ring-primary transition-opacity md:h-3.5 md:w-3.5 md:opacity-0 md:group-hover/seek:opacity-100"
              style={{ left: `${progressPct}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progressPct}
            onChange={onSeek}
            aria-label="Linha do tempo"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1 md:flex-nowrap">
          <div className="flex items-center gap-1">
            <button
              onClick={togglePlay}
              className="rounded-full p-3 transition-all hover:scale-110 hover:bg-white/15 active:scale-95 md:p-2"
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 fill-current md:h-5 md:w-5" />
              ) : (
                <Play className="h-6 w-6 fill-current md:h-5 md:w-5" />
              )}
            </button>
            <button
              onClick={() => seekBy(-10)}
              className="rounded-full p-3 transition-all hover:-rotate-12 hover:bg-white/15 active:scale-95 md:p-2"
              aria-label="Voltar 10 segundos"
              title="Voltar 10s (J / ←)"
            >
              <RotateCcw className="h-6 w-6 md:h-5 md:w-5" />
            </button>
            <button
              onClick={() => seekBy(10)}
              className="rounded-full p-3 transition-all hover:rotate-12 hover:bg-white/15 active:scale-95 md:p-2"
              aria-label="Avançar 10 segundos"
              title="Avançar 10s (L / →)"
            >
              <RotateCw className="h-6 w-6 md:h-5 md:w-5" />
            </button>
            <div className="group/vol hidden items-center sm:flex">
              <button
                onClick={toggleMute}
                className="rounded-full p-2 transition-all hover:scale-110 hover:bg-white/15 active:scale-95"
                aria-label={isMuted ? 'Ativar som' : 'Mutar'}
              >
                {volumeIcon}
              </button>
              <div className="overflow-hidden">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVol(Number(e.target.value))}
                  aria-label="Volume"
                  className="w-0 cursor-pointer accent-primary transition-all duration-300 md:group-hover/vol:ml-2 md:group-hover/vol:w-24"
                />
              </div>
            </div>
            <div className="ml-2 flex items-baseline gap-1 font-mono text-sm tabular-nums md:ml-3 md:gap-1.5 md:text-[13px]">
              <span className="font-semibold text-white">{formatTime(currentTime)}</span>
              <span className="text-white/30">/</span>
              <span className="text-white/50">{formatTime(duration)}</span>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1 md:gap-1.5">
            <div className="mr-1 flex items-center gap-1 border-r border-white/10 px-1 md:mr-2 md:gap-1.5 md:px-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleRaioX}
                    className={cn(
                      'group relative flex items-center justify-center rounded-full p-3 transition-all duration-300 md:p-2',
                      isRaioXActive
                        ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]'
                        : 'text-white/80 hover:bg-white/15 hover:text-white',
                    )}
                    aria-label="Ativar Raio-X"
                  >
                    {isRaioXActive ? (
                      <Zap className="h-6 w-6 fill-current md:h-5 md:w-5" />
                    ) : (
                      <ZapOff className="h-6 w-6 md:h-5 md:w-5" />
                    )}
                    {isRaioXActive && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 md:-right-1 md:-top-1">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Raio-X (X)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={takeScreenshot}
                    className="flex items-center gap-1 rounded-full p-3 text-white/80 transition-colors hover:bg-white/15 hover:text-white md:p-2"
                    aria-label="Capturar frame"
                  >
                    <Camera className="h-6 w-6 md:h-5 md:w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Foto do frame (S)</TooltipContent>
              </Tooltip>
              {canShareOnWhatsApp && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareDialogOpen(true);
                      }}
                      className="flex items-center gap-1 rounded-full p-3 text-white/80 transition-colors hover:bg-[#25D366]/20 hover:text-[#25D366] md:p-2"
                      aria-label="Enviar vídeo pelo WhatsApp"
                    >
                      <MessageCircle className="h-6 w-6 md:h-5 md:w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Enviar vídeo pelo WhatsApp</TooltipContent>
                </Tooltip>
              )}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-1 rounded-full px-3 py-3 text-sm font-medium tabular-nums transition-colors hover:bg-white/15 md:px-2.5 md:py-2"
                      aria-label="Velocidade"
                    >
                      <Gauge className="h-6 w-6 md:h-5 md:w-5" />
                      <span className="hidden sm:inline">{playbackRate}x</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32">
                    <DropdownMenuLabel>Velocidade</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {PLAYBACK_RATES.map((rate) => (
                      <DropdownMenuItem
                        key={rate}
                        onClick={() => setRate(rate)}
                        className={cn(playbackRate === rate && 'font-bold text-primary', 'py-2.5')}
                      >
                        {rate === 1 ? 'Normal (1x)' : `${rate}x`}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent side="top">Velocidade (&lt; / &gt;)</TooltipContent>
            </Tooltip>
            {qualities.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-1 rounded-full px-3 py-3 text-sm font-medium transition-colors hover:bg-white/15 md:px-2.5 md:py-2"
                    aria-label="Qualidade"
                    title="Qualidade do Vídeo"
                  >
                    <Settings className="h-6 w-6 md:h-5 md:w-5" />
                    <span className="hidden sm:inline">
                      {currentQuality === -1
                        ? 'Auto'
                        : qualities.find((q) => q.id === currentQuality)?.label}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuLabel>Qualidade</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setQuality(-1)}
                    className={cn(currentQuality === -1 && 'font-bold text-primary', 'py-2.5')}
                  >
                    Auto
                  </DropdownMenuItem>
                  {qualities.map((q) => (
                    <DropdownMenuItem
                      key={q.id}
                      onClick={() => setQuality(q.id)}
                      className={cn(currentQuality === q.id && 'font-bold text-primary', 'py-2.5')}
                    >
                      {q.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <button
              onClick={togglePip}
              className="hidden rounded-full p-3 transition-colors hover:bg-white/15 sm:flex md:p-2"
              aria-label="Picture-in-Picture"
              title="Picture-in-Picture (P)"
            >
              <PictureInPicture2 className="h-6 w-6 md:h-5 md:w-5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="rounded-full p-3 transition-colors hover:bg-white/15 md:p-2"
              aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
              title="Tela cheia (F)"
            >
              {isFullscreen ? (
                <Minimize className="h-6 w-6 md:h-5 md:w-5" />
              ) : (
                <Maximize className="h-6 w-6 md:h-5 md:w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {canShareOnWhatsApp && (
        <VideoShareWhatsAppDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          productName={productName || ''}
          videoTitle={title}
          shareUrl={shareUrl}
          productPrice={productPrice}
          productSku={productSku}
          productMinQuantity={productMinQuantity}
        />
      )}
    </div>
  );
}
