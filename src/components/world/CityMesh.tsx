import { useMemo } from "react";
import { Instances, Instance } from "@react-three/drei";
import * as THREE from "three";
import { CITY as city, LANDMARK_WORLD } from "@/lib/city/generate";
import { useApp } from "@/stores/app";

function hsl(h: number, s: number, l: number) {
  return new THREE.Color().setHSL(h, s, l);
}

export function CityMesh() {
  const night = useApp((s) => s.night);

  const windows = useMemo(() => {
    const out: { x: number; y: number; z: number }[] = [];
    let seed = 0x51a2;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (const b of city.buildings) {
      if (b.h < 1.5) continue;
      const floors = Math.min(7, Math.floor(b.h / 0.42));
      for (let f = 1; f < floors; f++) {
        if (rnd() > 0.48) continue;
        const side = rnd() > 0.5 ? 1 : -1;
        const along = (rnd() - 0.5) * Math.max(b.w, b.d) * 0.55;
        const c = Math.cos(b.rot);
        const s = Math.sin(b.rot);
        const ox = side * (b.w / 2 + 0.04);
        const oz = along;
        out.push({
          x: b.x + ox * c - oz * s,
          y: f * (b.h / (floors + 1)),
          z: b.z + ox * s + oz * c,
        });
      }
    }
    return out.slice(0, 480);
  }, []);

  return (
    <group>
      <Instances limit={city.buildings.length} range={city.buildings.length} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          roughness={0.82}
          metalness={0.04}
          emissive={night ? "#2a2418" : "#000000"}
          emissiveIntensity={night ? 0.18 : 0}
        />
        {city.buildings.map((b, i) => (
          <Instance
            key={i}
            position={[b.x, b.y + 0.04, b.z]}
            rotation={[0, b.rot, 0]}
            scale={[b.w, b.h, b.d]}
            color={hsl(b.hue, night ? 0.14 : 0.1, night ? 0.48 : 0.78)}
          />
        ))}
      </Instances>

      {night && windows.length > 0 && (
        <Instances limit={windows.length} range={windows.length}>
          <boxGeometry args={[0.08, 0.12, 0.08]} />
          <meshBasicMaterial color="#e6c27a" />
          {windows.map((w, i) => (
            <Instance key={i} position={[w.x, w.y, w.z]} />
          ))}
        </Instances>
      )}

      {night && city.lamps.length > 0 && (
        <Instances limit={city.lamps.length} range={city.lamps.length}>
          <cylinderGeometry args={[0.045, 0.06, 1.55, 6]} />
          <meshStandardMaterial color="#1a1c1e" roughness={0.45} metalness={0.35} />
          {city.lamps.map((l, i) => (
            <Instance key={i} position={[l.x, 0.78, l.z]} />
          ))}
        </Instances>
      )}

      {night &&
        city.lamps
          .filter((_, i) => i % 7 === 0)
          .slice(0, 16)
          .map((l, i) => (
            <pointLight
              key={i}
              position={[l.x, 1.65, l.z]}
              color="#e6c27a"
              intensity={2.2}
              distance={7.5}
              decay={2}
            />
          ))}

      <Landmarks night={night} />
    </group>
  );
}

function Landmarks({ night }: { night: boolean }) {
  const stone = night ? "#6a6358" : "#c2b8a8";
  const warm = night ? "#c4a35a" : "#8a6a32";
  const roof = night ? "#4a433c" : "#cfc3b0";
  return (
    <group>
      {LANDMARK_WORLD.filter((l) => l.kind === "monument" && l.id === "poles").map((l) => (
        <group key={l.id} position={[l.x, 0, l.z]}>
          {[0, 1, 2, 3].map((i) => {
            const a = (i / 4) * Math.PI * 2 + 0.4;
            return (
              <mesh key={i} position={[Math.cos(a) * 1.05, 1.45, Math.sin(a) * 1.05]}>
                <cylinderGeometry args={[0.09, 0.11, 2.9, 8]} />
                <meshStandardMaterial color={stone} metalness={0.28} roughness={0.38} />
              </mesh>
            );
          })}
        </group>
      ))}

      {LANDMARK_WORLD.filter((l) => l.kind === "church").map((l) => (
        <group key={l.id} position={[l.x, 0, l.z]}>
          <mesh position={[0, 1.35, 0]} castShadow>
            <boxGeometry args={[3.1, 2.7, 4.1]} />
            <meshStandardMaterial color={roof} roughness={0.85} />
          </mesh>
          <mesh position={[0, 3.35, 0]}>
            <sphereGeometry args={[1.05, 16, 12]} />
            <meshStandardMaterial
              color={warm}
              roughness={0.35}
              metalness={0.15}
              emissive={warm}
              emissiveIntensity={night ? 0.18 : 0}
            />
          </mesh>
          <mesh position={[0, 4.55, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.8, 6]} />
            <meshStandardMaterial color={warm} />
          </mesh>
        </group>
      ))}

      {LANDMARK_WORLD.filter((l) => l.kind === "mosque").map((l) => (
        <group key={l.id} position={[l.x, 0, l.z]}>
          <mesh position={[0, 1.15, 0]} castShadow>
            <boxGeometry args={[2.9, 2.3, 2.9]} />
            <meshStandardMaterial color={night ? "#3e4540" : "#b7c0b4"} roughness={0.8} />
          </mesh>
          <mesh position={[0, 2.7, 0]}>
            <sphereGeometry args={[0.98, 16, 12]} />
            <meshStandardMaterial color={night ? "#2f3a34" : "#d5ddd4"} />
          </mesh>
          <mesh position={[1.55, 2.5, 1.55]}>
            <cylinderGeometry args={[0.16, 0.2, 5, 8]} />
            <meshStandardMaterial color={night ? "#4a524c" : "#c5cec4"} />
          </mesh>
          <mesh position={[1.55, 5.15, 1.55]}>
            <coneGeometry args={[0.28, 0.6, 8]} />
            <meshStandardMaterial color={warm} />
          </mesh>
        </group>
      ))}

      {LANDMARK_WORLD.filter((l) => l.kind === "civic" || l.kind === "hall").map((l) => (
        <mesh key={l.id} position={[l.x, l.kind === "hall" ? 1.7 : 1.35, l.z]} castShadow>
          <boxGeometry args={l.kind === "hall" ? [6.6, 3.4, 4.3] : [4.6, 2.7, 3.3]} />
          <meshStandardMaterial color={night ? "#3a4148" : "#9aa3a8"} roughness={0.68} />
        </mesh>
      ))}

      {LANDMARK_WORLD.filter((l) => l.kind === "stadium").map((l) => (
        <group key={l.id} position={[l.x, 0, l.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
            <circleGeometry args={[3.6, 28]} />
            <meshStandardMaterial color={night ? "#2a3a28" : "#6e8a58"} />
          </mesh>
          <mesh position={[0, 0.7, 0]}>
            <torusGeometry args={[3.2, 0.45, 8, 28]} />
            <meshStandardMaterial color={night ? "#3a4148" : "#8b9298"} roughness={0.75} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
