import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { paintMars } from "@/lib/mars-texture";
import { TERRITORIES } from "@/data/territories";

const R = 2;

function latLonToVec(lat: number, lon: number, r: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

function Marker({
  lat, lon, selected, onSelect, reduced, label,
}: { lat: number; lon: number; selected: boolean; onSelect?: () => void; reduced: boolean; label: string }) {
  const pos = useMemo(() => latLonToVec(lat, lon, R * 1.005), [lat, lon]);
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize()), [pos]);
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
        onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = onSelect ? "pointer" : ""; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = ""; }}
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

function Planet({ selectedId, onSelect, reduced, interactive }: GlobeProps & { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const maps = useMemo(() => {
    const m = paintMars(1024);
    const color = new THREE.CanvasTexture(m.color);
    color.colorSpace = THREE.SRGBColorSpace;
    color.anisotropy = 4;
    const bump = new THREE.CanvasTexture(m.bump);
    return { color, bump };
  }, []);
  useFrame((_, d) => {
    if (group.current && !reduced && !interactive) group.current.rotation.y += Math.min(d, 0.05) * 0.04;
  });
  return (
    <group ref={group} rotation={[0.25, -0.6, 0]}>
      <mesh>
        <sphereGeometry args={[R, 96, 96]} />
        <meshStandardMaterial map={maps.color} bumpMap={maps.bump} bumpScale={3} roughness={0.95} metalness={0} />
      </mesh>
      {/* atmosphere rim */}
      <mesh scale={1.06}>
        <sphereGeometry args={[R, 64, 64]} />
        <shaderMaterial
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={`varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `}
          fragmentShader={`varying vec3 vN; void main(){ float i = pow(0.72 - dot(vN, vec3(0.0,0.0,1.0)), 3.0); gl_FragColor = vec4(0.94,0.48,0.3,1.0)*i*1.6; }`}
        />
      </mesh>
      {TERRITORIES.map((t) => (
        <Marker
          key={t.id}
          label={t.region}
          lat={t.lat}
          lon={t.lon}
          reduced={reduced}
          selected={t.id === selectedId}
          onSelect={onSelect ? () => onSelect(t.id) : undefined}
        />
      ))}
    </group>
  );
}

function OrbitRings() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, d) => { if (ref.current) ref.current.rotation.z += Math.min(d, 0.05) * 0.01; });
  return (
    <group ref={ref} rotation={[1.25, 0.2, 0]}>
      {[2.9, 3.5].map((r, i) => (
        <mesh key={r}>
          <ringGeometry args={[r, r + 0.006, 160]} />
          <meshBasicMaterial color="#939ca7" transparent opacity={i ? 0.12 : 0.22} side={THREE.DoubleSide} />
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
  onSelect?: (id: string) => void;
  interactive?: boolean;
}

export default function MarsGlobe({ selectedId, onSelect, interactive = false }: GlobeProps) {
  const reduced = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.4, interactive ? 6.2 : 6.8], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
      aria-label="Visualização 3D de Marte"
    >
      <ambientLight intensity={0.12} />
      <directionalLight position={[-6, 3, 4]} intensity={2.6} color="#fff1e6" />
      <directionalLight position={[5, -2, -4]} intensity={0.25} color="#7a8aa0" />
      <Stars radius={60} depth={30} count={1400} factor={2.2} saturation={0} fade speed={reduced ? 0 : 0.3} />
      <Planet selectedId={selectedId} onSelect={onSelect} reduced={reduced} interactive={interactive} />
      <OrbitRings />
      <OrbitControls
        enablePan={false}
        enableZoom={interactive}
        enableRotate
        minDistance={3.4}
        maxDistance={9}
        rotateSpeed={0.5}
        enableDamping
        dampingFactor={0.08}
        autoRotate={interactive && !reduced}
        autoRotateSpeed={0.25}
      />
    </Canvas>
  );
}
