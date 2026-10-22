import { lazy, Suspense, useEffect, useState } from "react";
import type { GlobeProps } from "./MarsGlobe";

const MarsGlobe = lazy(() => import("./MarsGlobe"));

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function Loading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center" role="status">
      <div className="relative h-40 w-40 overflow-hidden rounded-full border border-border">
        <div className="animate-scan absolute inset-x-0 h-1/2 bg-gradient-to-b from-transparent to-primary/20" />
      </div>
      <span className="eyebrow absolute bottom-6">Calibrando superfície…</span>
    </div>
  );
}

function Fallback() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
      <div className="h-56 w-56 rounded-full bg-[radial-gradient(circle_at_35%_35%,var(--mineral),var(--primary)_45%,var(--background)_80%)] opacity-90" />
      <p className="eyebrow max-w-xs text-center">Visualização 3D indisponível neste dispositivo</p>
    </div>
  );
}

export function GlobeStage(props: GlobeProps) {
  const [state, setState] = useState<"pending" | "ok" | "nogl">("pending");
  useEffect(() => setState(hasWebGL() ? "ok" : "nogl"), []);
  if (state === "pending") return <Loading />;
  if (state === "nogl") return <Fallback />;
  return (
    <Suspense fallback={<Loading />}>
      <MarsGlobe {...props} />
    </Suspense>
  );
}
