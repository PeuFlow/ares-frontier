import { useEffect, useState } from "react";
import { paintRegion } from "@/lib/mars-texture";

const cache = new Map<number, string>();

export function RegionThumb({ seed, alt, className }: { seed: number; alt: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!cache.has(seed)) cache.set(seed, paintRegion(seed));
    setSrc(cache.get(seed)!);
  }, [seed]);
  return src ? (
    <img src={src} alt={alt} className={className} />
  ) : (
    <div className={`${className} bg-muted`} aria-hidden />
  );
}
