import { Html } from "@react-three/drei";
import { LANDMARK_WORLD, NEIGHBORHOODS, toWorld } from "@/lib/city/map";
import { useApp } from "@/stores/app";

export function Labels() {
  const show = useApp((s) => s.showLabels);
  const lang = useApp((s) => s.lang);
  const flyTo = useApp((s) => s.flyTo);
  if (!show) return null;

  return (
    <group>
      {NEIGHBORHOODS.filter((n) => n.id !== "ploshtad").map((n) => {
        const p = toWorld(n.lat, n.lng);
        const active = flyTo && Math.hypot(flyTo.x - p.x, flyTo.z - p.z) < 1.2;
        return (
          <Html
            key={n.id}
            position={[p.x, 2.4, p.z]}
            center
            distanceFactor={48}
            occlude={false}
            style={{ pointerEvents: "none" }}
          >
            <div className={active ? "map-label map-label-on" : "map-label"}>
              {lang === "mk" ? n.nameMk : n.nameEn}
            </div>
          </Html>
        );
      })}
      {LANDMARK_WORLD.filter((l) => l.kind !== "monument" && l.kind !== "square").map((l) => (
        <Html
          key={l.id}
          position={[l.x, 3.6, l.z]}
          center
          distanceFactor={40}
          occlude={false}
          style={{ pointerEvents: "none" }}
        >
          <div className="map-label map-label-sm">{lang === "mk" ? l.nameMk : l.nameEn}</div>
        </Html>
      ))}
    </group>
  );
}
