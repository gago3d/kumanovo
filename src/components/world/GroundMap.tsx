import { useTexture } from "@react-three/drei";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { MAP_PLANE } from "@/lib/city/map";
import { useApp } from "@/stores/app";

export function GroundMap() {
  const night = useApp((s) => s.night);
  const basemap = useApp((s) => s.basemap);
  const streets = useTexture("/maps/kumanovo-streets.jpg");
  const sat = useTexture("/maps/kumanovo-sat.jpg");

  useLayoutEffect(() => {
    for (const t of [streets, sat]) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.needsUpdate = true;
    }
  }, [streets, sat]);

  const tex = basemap === "sat" ? sat : streets;
  const tint = night ? (basemap === "sat" ? "#7a8494" : "#8a909c") : "#ffffff";

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[MAP_PLANE.x, 0, MAP_PLANE.z]} receiveShadow>
      <planeGeometry args={[MAP_PLANE.w, MAP_PLANE.d]} />
      <meshBasicMaterial map={tex} color={tint} toneMapped={false} />
    </mesh>
  );
}
