import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, PerformanceMonitor, Stars } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isLowPower } from "./perf";
import * as THREE from "three";
import { paintMars } from "@/lib/mars-texture";
import { TERRITORIES, type Territory } from "@/data/territories";
import { TerritoryLabel } from "@/components/frontier/TerritoryLabel";
import {
  advanceSurfacePresentation,
  INITIAL_SURFACE_YAW,
  PRESENTATION_DURATION,
  SURFACE_ROTATION_SPEED,
  type SurfacePresentationState,
  type PresentationPhase,
} from "@/lib/territory-presentation";

const R = 2;

interface PresentationMotion {
  yaw: number;
  tilt: number;
  dragging: boolean;
  revision: number;
}

function PresentationMarker({
  territory,
  active,
  phase,
  description,
  surface,
  reduced,
}: {
  territory: Territory;
  active: boolean;
  phase: PresentationPhase;
  description: string;
  surface: React.RefObject<THREE.Mesh>;
  reduced: boolean;
}) {
  const pos = useMemo(
    () => latLonToVec(territory.lat, territory.lon, R * 1.008),
    [territory.lat, territory.lon],
  );
  const quat = useMemo(
    () =>
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        pos.clone().normalize(),
      ),
    [pos],
  );
  const dot = useRef<THREE.MeshBasicMaterial>(null);
  const halo = useRef<THREE.MeshBasicMaterial>(null);
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }, delta) => {
    const shown = phase !== "intro";
    const highlighted = active && phase === "visible";
    const target = shown ? (highlighted ? 1 : 0.2) : 0;
    if (dot.current)
      dot.current.opacity = reduced
        ? target
        : THREE.MathUtils.damp(dot.current.opacity, target, 5, delta);
    if (halo.current)
      halo.current.opacity = reduced
        ? highlighted
          ? 0.45
          : 0
        : THREE.MathUtils.damp(halo.current.opacity, highlighted ? 0.5 : 0, 5, delta);
    if (ring.current)
      ring.current.scale.setScalar(
        reduced ? 1.5 : 1.5 + (highlighted ? Math.sin(clock.elapsedTime * 1.6) * 0.12 : 0),
      );
  });
  return (
    <group position={pos} quaternion={quat}>
      <mesh>
        <circleGeometry args={[active ? 0.043 : 0.026, 20]} />
        <meshBasicMaterial
          ref={dot}
          color="#f08b5a"
          transparent
          opacity={0}
          toneMapped={false}
          depthTest
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ring} position={[0, 0, 0.003]}>
        <ringGeometry args={[0.055, 0.064, 24]} />
        <meshBasicMaterial
          ref={halo}
          color="#f08b5a"
          transparent
          opacity={0}
          toneMapped={false}
          depthTest
          depthWrite={false}
        />
      </mesh>
      {active && (
        <Html
          position={[0, 0, 0.045]}
          occlude={[surface]}
          zIndexRange={[8, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="territory-label-anchor" aria-hidden="true">
            <TerritoryLabel territory={territory} description={description} phase={phase} />
          </div>
        </Html>
      )}
    </group>
  );
}

function latLonToVec(lat: number, lon: number, r: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

function Marker({
  lat,
  lon,
  selected,
  onSelect,
  reduced,
  label,
}: {
  lat: number;
  lon: number;
  selected: boolean;
  onSelect?: (() => void) | undefined;
  reduced: boolean;
  label: string;
}) {
  const pos = useMemo(() => latLonToVec(lat, lon, R * 1.005), [lat, lon]);
  const quat = useMemo(
    () =>
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        pos.clone().normalize(),
      ),
    [pos],
  );
  const ring = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  useFrame(({ clock }) => {
    if (!ring.current) return;
    const t = reduced ? 0.5 : (clock.elapsedTime * 0.5) % 1;
    const s = 1 + t * (selected ? 2.4 : 1.6);
    ring.current.scale.setScalar(s);
    (ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - t) * (selected ? 0.9 : 0.5);
  });
  const color = selected ? "#f08b5a" : hover ? "#f2eee8" : "#d65a3a";
  return (
    <group position={pos} quaternion={quat}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = onSelect ? "pointer" : "";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "";
        }}
        name={label}
      >
        <circleGeometry args={[selected ? 0.055 : 0.04, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={ring}>
        <ringGeometry args={[0.05, 0.06, 32]} />
        <meshBasicMaterial color={color} transparent toneMapped={false} depthWrite={false} />
      </mesh>
      {selected && (
        <mesh position={[0, 0, 0.14]}>
          <cylinderGeometry args={[0.004, 0.004, 0.28, 6]} />
          <meshBasicMaterial color="#f08b5a" toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function CameraRig({
  group,
  selectedId,
  reduced,
  interactive,
  onFly,
  onReturn,
  cancelRef,
  flyBackRef,
}: {
  group: React.RefObject<THREE.Group | null>;
  selectedId: string;
  reduced: boolean;
  interactive: boolean;
  onFly: () => void;
  onReturn: () => void;
  cancelRef: React.MutableRefObject<(() => void) | null>;
  flyBackRef: React.MutableRefObject<(() => void) | null>;
}) {
  const camera = useThree((s) => s.camera);
  const desired = useRef<THREE.Vector3 | null>(null);
  const prevPos = useRef<THREE.Vector3 | null>(null);
  const focused = useRef(false);

  useEffect(() => {
    cancelRef.current = () => {
      desired.current = null;
    };
  }, [cancelRef]);

  const flyTo = useCallback(
    (t: Territory) => {
      prevPos.current = camera.position.clone();
      const dir = latLonToVec(t.lat, t.lon, 1).normalize();
      dir.applyQuaternion(group.current?.quaternion ?? new THREE.Quaternion());
      desired.current = dir.normalize().multiplyScalar(3.7);
      focused.current = true;
      onFly();
    },
    [group, camera, onFly],
  );

  const toggleFly = useCallback(() => {
    if (focused.current) {
      if (!prevPos.current) return;
      desired.current = prevPos.current.clone();
      focused.current = false;
      onReturn();
      return;
    }
    const t = TERRITORIES.find((x) => x.id === selectedId);
    if (t) flyTo(t);
  }, [selectedId, flyTo, onReturn]);

  useEffect(() => {
    flyBackRef.current = toggleFly;
  });

  const initialId = useRef(selectedId);
  useEffect(() => {
    if (!interactive) return;
    if (selectedId === initialId.current) return;
    const t = TERRITORIES.find((x) => x.id === selectedId);
    if (!t) return;
    flyTo(t);
  }, [selectedId, interactive, flyTo]);

  useFrame((_, d) => {
    const target = desired.current;
    if (!target) return;
    camera.position.lerp(target, reduced ? 1 : Math.min(1, d * 2.2));
    if (camera.position.distanceTo(target) < 0.05) desired.current = null;
  });
  return null;
}

function Planet({
  selectedId,
  onSelect,
  reduced,
  interactive = false,
  presentation,
  low,
  onFly,
  onReturn,
  cancelRef,
  flyBackRef,
  motion,
}: GlobeProps & {
  reduced: boolean;
  low: boolean;
  onFly: () => void;
  onReturn: () => void;
  cancelRef: React.MutableRefObject<(() => void) | null>;
  flyBackRef: React.MutableRefObject<(() => void) | null>;
  motion: React.RefObject<PresentationMotion>;
}) {
  const group = useRef<THREE.Group>(null);
  const surface = useRef<THREE.Mesh>(null!);
  const initialYaw = useRef(reduced ? -1.22 : INITIAL_SURFACE_YAW);
  const surfacePresentation = useRef<SurfacePresentationState>({
    index: 0,
    phase: "intro",
    age: 0,
    seen: [],
    turn: 0,
  });
  const lastMotion = useRef(0);
  const handleMarker = useCallback(
    (id: string) => {
      if (onSelect && interactive && id === selectedId) {
        flyBackRef.current?.();
        return;
      }
      onSelect?.(id);
    },
    [onSelect, interactive, selectedId, flyBackRef],
  );
  const maps = useMemo(() => {
    const m = paintMars(low ? 512 : 1024);
    const color = new THREE.CanvasTexture(m.color);
    color.colorSpace = THREE.SRGBColorSpace;
    color.anisotropy = 4;
    const bump = new THREE.CanvasTexture(m.bump);
    return { color, bump };
  }, [low]);
  useEffect(
    () => () => {
      maps.color.dispose();
      maps.bump.dispose();
    },
    [maps],
  );
  useFrame((_, d) => {
    if (group.current && presentation) {
      const input = motion.current;
      if (presentation.paused && !input.dragging) return;
      const changed = input.yaw !== 0 || input.tilt !== 0;
      group.current.rotation.y += input.yaw;
      group.current.rotation.x = THREE.MathUtils.clamp(
        group.current.rotation.x + input.tilt,
        -1,
        1,
      );
      input.yaw = 0;
      input.tilt = 0;
      if (reduced && !changed) return;
      const delta = Math.min(d, 0.05);
      if (!reduced && !input.dragging) group.current.rotation.y += delta * SURFACE_ROTATION_SPEED;
      const displayed = surfacePresentation.current;
      let previous = displayed;
      if (input.revision !== lastMotion.current || (reduced && changed)) {
        previous = { ...previous, seen: [], phase: "gap", age: PRESENTATION_DURATION.gap };
        lastMotion.current = input.revision;
      }
      const next = advanceSurfacePresentation(
        previous,
        delta,
        group.current.rotation.y,
        group.current.rotation.x,
      );
      surfacePresentation.current = next;
      if (displayed.index !== next.index || displayed.phase !== next.phase)
        presentation.onChange(next.index, next.phase);
      return;
    }
    if (group.current && !reduced && !interactive)
      group.current.rotation.y += Math.min(d, 0.05) * 0.04;
  });
  return (
    <group ref={group} rotation={[0.25, presentation ? initialYaw.current : -0.6, 0]}>
      <mesh ref={surface}>
        <sphereGeometry args={[R, low ? 48 : 96, low ? 48 : 96]} />
        <meshStandardMaterial
          map={maps.color}
          bumpMap={maps.bump}
          bumpScale={3}
          roughness={0.95}
          metalness={0}
        />
      </mesh>
      {/* atmosphere rim */}
      <mesh scale={1.06}>
        <sphereGeometry args={[R, low ? 32 : 64, low ? 32 : 64]} />
        <shaderMaterial
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={`varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `}
          fragmentShader={`varying vec3 vN; void main(){ float i = pow(0.72 - dot(vN, vec3(0.0,0.0,1.0)), 3.0); gl_FragColor = vec4(0.94,0.48,0.3,1.0)*i*1.6; }`}
        />
      </mesh>
      {TERRITORIES.map((t) =>
        presentation ? (
          <PresentationMarker
            key={t.id}
            territory={t}
            active={t.id === selectedId}
            phase={presentation.phase}
            description={presentation.description}
            surface={surface}
            reduced={reduced}
          />
        ) : (
          <Marker
            key={t.id}
            label={t.region}
            lat={t.lat}
            lon={t.lon}
            reduced={reduced}
            selected={t.id === selectedId}
            onSelect={onSelect ? () => handleMarker(t.id) : undefined}
          />
        ),
      )}
      {!presentation && (
        <CameraRig
          group={group}
          selectedId={selectedId}
          reduced={reduced}
          interactive={interactive}
          onFly={onFly}
          onReturn={onReturn}
          cancelRef={cancelRef}
          flyBackRef={flyBackRef}
        />
      )}
    </group>
  );
}

function OrbitRings({ reduced = false }: { reduced?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    if (ref.current && !reduced) ref.current.rotation.z += Math.min(d, 0.05) * 0.01;
  });
  return (
    <group ref={ref} rotation={[1.25, 0.2, 0]}>
      {[2.9, 3.5].map((r, i) => (
        <mesh key={r}>
          <ringGeometry args={[r, r + 0.006, 160]} />
          <meshBasicMaterial
            color="#939ca7"
            transparent
            opacity={i ? 0.12 : 0.22}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      <mesh position={[2.9, 0, 0]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial color="#f2eee8" />
      </mesh>
    </group>
  );
}

export interface GlobeProps {
  selectedId: string;
  onSelect?: ((id: string) => void) | undefined;
  interactive?: boolean;
  reselectSignal?: number;
  presentation?:
    | {
        phase: PresentationPhase;
        description: string;
        paused: boolean;
        onChange: (index: number, phase: PresentationPhase) => void;
      }
    | undefined;
  onReady?: () => void;
}

export default function MarsGlobe({
  selectedId,
  onSelect,
  interactive = false,
  reselectSignal = 0,
  presentation,
  onReady,
}: GlobeProps) {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const low = useMemo(() => isLowPower(), []);
  const [dpr, setDpr] = useState(low ? 1 : 1.5);
  const [rotating, setRotating] = useState(true);
  const stopRotation = useCallback(() => setRotating(false), []);
  const resumeRotation = useCallback(() => setRotating(true), []);
  const flyBackRef = useRef<(() => void) | null>(null);
  const lastReselect = useRef(reselectSignal);
  useEffect(() => {
    if (lastReselect.current === reselectSignal) return;
    lastReselect.current = reselectSignal;
    flyBackRef.current?.();
  }, [reselectSignal]);
  const cancelFlyRef = useRef<(() => void) | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const motion = useRef<PresentationMotion>({ yaw: 0, tilt: 0, dragging: false, revision: 0 });
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const invalidate = useRef<() => void>(() => {});
  const finishDrag = useCallback(() => {
    const active = pointer.current;
    pointer.current = null;
    motion.current.dragging = false;
    if (wrap.current) {
      delete wrap.current.dataset["dragging"];
      if (active && wrap.current.hasPointerCapture(active.id))
        wrap.current.releasePointerCapture(active.id);
    }
    invalidate.current();
  }, []);
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") finishDrag();
    };
    window.addEventListener("blur", finishDrag);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("blur", finishDrag);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [finishDrag]);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), {
      rootMargin: "100px",
    });
    io.observe(el);
    const onVis = () =>
      setVisible(document.visibilityState === "visible" && el.getBoundingClientRect().bottom > 0);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return (
    <div
      ref={wrap}
      className="absolute inset-0"
      data-territory-drag={presentation ? true : undefined}
      role={presentation ? "group" : undefined}
      tabIndex={presentation ? 0 : undefined}
      aria-label={presentation ? "Girar Marte. Arraste ou use as setas do teclado." : undefined}
      onPointerDown={
        presentation
          ? (event) => {
              if (event.button !== 0 || !event.isPrimary) return;
              if (event.pointerType === "mouse") event.preventDefault();
              event.currentTarget.focus({ preventScroll: true });
              pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
              motion.current.dragging = true;
              motion.current.revision++;
              event.currentTarget.dataset["dragging"] = "true";
              event.currentTarget.setPointerCapture(event.pointerId);
              invalidate.current();
            }
          : undefined
      }
      onPointerMove={
        presentation
          ? (event) => {
              const active = pointer.current;
              if (!active || active.id !== event.pointerId) return;
              motion.current.yaw += (event.clientX - active.x) * 0.006;
              if (event.pointerType !== "touch")
                motion.current.tilt += (event.clientY - active.y) * 0.004;
              active.x = event.clientX;
              active.y = event.clientY;
              invalidate.current();
            }
          : undefined
      }
      onPointerUp={presentation ? finishDrag : undefined}
      onPointerCancel={presentation ? finishDrag : undefined}
      onLostPointerCapture={presentation ? finishDrag : undefined}
      onKeyDown={
        presentation
          ? (event) => {
              if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
              event.preventDefault();
              if (!motion.current.dragging) motion.current.revision++;
              motion.current.dragging = true;
              if (event.key === "ArrowLeft") motion.current.yaw -= 0.12;
              if (event.key === "ArrowRight") motion.current.yaw += 0.12;
              if (event.key === "ArrowUp") motion.current.tilt -= 0.1;
              if (event.key === "ArrowDown") motion.current.tilt += 0.1;
              invalidate.current();
            }
          : undefined
      }
      onKeyUp={
        presentation
          ? (event) => {
              if (event.key.startsWith("Arrow")) finishDrag();
            }
          : undefined
      }
      onBlur={presentation ? finishDrag : undefined}
    >
      <Canvas
        dpr={dpr}
        frameloop={visible ? (presentation && reduced ? "demand" : "always") : "never"}
        onCreated={(state) => {
          invalidate.current = state.invalidate;
          onReady?.();
        }}
        camera={{ position: [0, 0.4, interactive ? 6.2 : 6.8], fov: 40 }}
        gl={{
          antialias: !low,
          alpha: true,
          powerPreference: low ? "low-power" : "high-performance",
        }}
        aria-label="Visualização 3D de Marte"
        aria-hidden={presentation ? true : undefined}
      >
        <PerformanceMonitor
          bounds={() => [40, 58]}
          flipflops={3}
          onIncline={() => setDpr((d) => Math.min(low ? 1.25 : 1.75, d + 0.25))}
          onDecline={() => setDpr((d) => Math.max(0.75, d - 0.25))}
          onFallback={() => setDpr(0.75)}
        />
        <ambientLight intensity={0.12} />
        <directionalLight position={[-6, 3, 4]} intensity={2.6} color="#fff1e6" />
        <directionalLight position={[5, -2, -4]} intensity={0.25} color="#7a8aa0" />
        <Stars
          radius={60}
          depth={30}
          count={low ? 500 : 1400}
          factor={2.2}
          saturation={0}
          fade
          speed={reduced ? 0 : 0.3}
        />
        <Planet
          selectedId={selectedId}
          onSelect={onSelect}
          reduced={reduced}
          interactive={interactive}
          presentation={presentation}
          low={low}
          onFly={stopRotation}
          onReturn={resumeRotation}
          cancelRef={cancelFlyRef}
          flyBackRef={flyBackRef}
          motion={motion}
        />
        <OrbitRings reduced={reduced} />
        {!presentation && (
          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom={interactive}
            enableRotate
            minDistance={3.4}
            maxDistance={9}
            rotateSpeed={0.5}
            enableDamping
            dampingFactor={0.08}
            autoRotate={interactive && !reduced && rotating}
            autoRotateSpeed={0.25}
            onStart={() => cancelFlyRef.current?.()}
          />
        )}
      </Canvas>
    </div>
  );
}
