import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { filterListings, useApp } from "@/stores/app";

export function Pins() {
  const all = useApp((s) => s.listings);
  const filters = useApp((s) => s.filters);
  const saved = useApp((s) => s.saved);
  const listings = useMemo(() => filterListings(all, filters, saved), [all, filters, saved]);
  const selected = useApp((s) => s.selectedId);
  const select = useApp((s) => s.select);

  return (
    <group>
      {listings.map((l) => (
          <Pin
            key={l.id}
            id={l.id}
            x={l.worldX}
            z={l.worldZ}
            kind={l.listingType}
            active={selected === l.id}
            onSelect={select}
          />
        ))}
    </group>
  );
}

function Pin({
  id,
  x,
  z,
  kind,
  active,
  onSelect,
}: {
  id: string;
  x: number;
  z: number;
  kind: string;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.position.y = 2.2 + Math.sin(t * 2.4 + x) * 0.12;
    g.rotation.y = t * 0.6;
  });
  const scale = kind === "lokal" ? 1.25 : 1;
  return (
    <group
      ref={ref}
      position={[x, 2.2, z]}
      scale={scale * (active ? 1.25 : 1)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
    >
      <mesh>
        <sphereGeometry args={[0.22, 12, 10]} />
        <meshStandardMaterial color="#c4a35a" emissive="#c4a35a" emissiveIntensity={active ? 1.4 : 0.8} />
      </mesh>
      <mesh position={[0, -0.38, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.14, 0.5, 8]} />
        <meshStandardMaterial color="#c4a35a" emissive="#c4a35a" emissiveIntensity={0.5} />
      </mesh>
      <mesh scale={[2.4, 2.4, 2.4]}>
        <sphereGeometry args={[0.22, 10, 8]} />
        <meshBasicMaterial color="#c4a35a" transparent opacity={0.12} />
      </mesh>
    </group>
  );
}
