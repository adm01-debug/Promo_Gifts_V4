import { CheckCircle2, Rocket } from 'lucide-react';

/** Splash exibido no card de auth enquanto o redirect pós-login acontece. */
export function LoginSuccessSplash() {
  return (
    <div
      key="success"
      className="flex flex-col items-center justify-center px-8 py-16 text-center duration-500 animate-in fade-in zoom-in"
    >
      <div className="relative mb-8">
        <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/30 duration-700" />
        <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-blue-500/10 text-blue-400 shadow-[0_0_50px_rgba(59,130,246,0.5)] ring-1 ring-blue-500/20">
          <Rocket className="h-12 w-12 -rotate-45 animate-bounce" />
        </div>
        <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-4 border-[#030508] bg-emerald-500 shadow-lg duration-300 animate-in zoom-in">
          <CheckCircle2 className="h-4 w-4 text-white" />
        </div>
      </div>
      <h2 className="font-display text-3xl font-bold tracking-tight text-white">
        Decolagem autorizada!
      </h2>
      <p className="mt-3 text-base text-white/50">Bem-vindo a bordo. Iniciando sistemas...</p>
    </div>
  );
}
