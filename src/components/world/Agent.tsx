import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { astar, nearestNode } from "@/lib/city/map";
import { formatPrice } from "@/lib/listings/format";
import { filteredListings, useApp } from "@/stores/app";
import { CITY as city } from "@/lib/city/generate";
import { agentState } from "./agentState";

export function Agent() {
  const group = useRef<THREE.Group>(null);
  const pathRef = useRef<number[]>([]);
  const pi = useRef(0);
  const inspect = useRef(0);
  const targetId = useRef<string | null>(null);
  const lastStreet = useRef("");

  const graph = city.graph;

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.1);
    const g = group.current;
    if (!g) return;

    const st = useApp.getState();
    const list = filteredListings(st);
    const undiscovered = list.filter((l) => !st.discovered.includes(l.id));

    if (inspect.current > 0) {
      inspect.current -= dt;
      agentState.speed = 0;
      const bob = Math.sin(inspect.current * 10) * 0.02;
      g.position.y = bob;
      return;
    }

    if (pathRef.current.length === 0 || pi.current >= pathRef.current.length - 1) {
      const from = nearestNode(graph, agentState.x, agentState.z);
      let goal = Math.floor(Math.random() * graph.nodes.length);
      let nextId: string | null = null;
      if (undiscovered.length) {
        const pick = undiscovered[0];
        goal = nearestNode(graph, pick.worldX, pick.worldZ);
        nextId = pick.id;
      }
      pathRef.current = astar(graph, from, goal);
      pi.current = 0;
      targetId.current = nextId;
    }

    const path = pathRef.current;
    const b = graph.nodes[path[Math.min(pi.current + 1, path.length - 1)]];
    if (!b) return;
    const speed = targetId.current ? 6.2 : 3.4;
    const dx = b.x - agentState.x;
    const dz = b.z - agentState.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.35) {
      pi.current += 1;
      if (b.name && b.name !== lastStreet.current) {
        lastStreet.current = b.name;
        agentState.street = b.name;
        if (Math.random() < 0.22) {
          const t = st.lang === "mk" ? `агентот оди по ${b.name}` : `agent walking ${b.name}`;
          st.pushFeed(t);
        }
      }
      if (pi.current >= path.length - 1 && targetId.current) {
        const listing = list.find((l) => l.id === targetId.current);
        if (listing) {
          inspect.current = 1.35;
          const price = formatPrice(listing.priceAmount, listing.priceCurrency, listing.pricePeriod, st.lang);
          const kind =
            listing.listingType === "lokal"
              ? st.lang === "mk"
                ? "локал"
                : "shop"
              : listing.listingType === "kukja"
                ? st.lang === "mk"
                  ? "куќа"
                  : "house"
                : listing.rooms
                  ? `${listing.rooms}+1`
                  : st.lang === "mk"
                    ? "стан"
                    : "apt";
          const text =
            st.lang === "mk"
              ? `агентот најде ${kind} на ${listing.neighborhood} · ${listing.source} · ${price}`
              : `agent found ${kind} on ${listing.neighborhood} · ${listing.source} · ${price}`;
          st.discover(listing.id, text);
        }
        targetId.current = null;
        pathRef.current = [];
      }
    } else {
      const step = Math.min(speed * dt, dist);
      agentState.x += (dx / dist) * step;
      agentState.z += (dz / dist) * step;
      agentState.yaw = Math.atan2(dx, dz);
      agentState.speed = speed;
    }

    const t = performance.now() / 1000;
    const bob = Math.sin(t * 8) * 0.05 * (agentState.speed > 0.2 ? 1 : 0);
    g.position.set(agentState.x, bob, agentState.z);
    g.rotation.y = agentState.yaw;
  });

  return (
    <group ref={group} position={[0, 0, 2.4]}>
      <mesh position={[0, 0.95, 0]} castShadow>
        <capsuleGeometry args={[0.28, 0.85, 4, 8]} />
        <meshStandardMaterial color="#3d6b68" roughness={0.65} emissive="#1a3332" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 1.7, 0.02]}>
        <sphereGeometry args={[0.24, 12, 10]} />
        <meshStandardMaterial color="#c4b49a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.9, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.14, 10]} />
        <meshStandardMaterial color="#1a1e20" />
      </mesh>
      <mesh position={[0.14, 0.95, 0.16]} rotation={[0.35, 0, 0.15]}>
        <boxGeometry args={[0.12, 0.5, 0.12]} />
        <meshStandardMaterial color="#243e3c" />
      </mesh>
      <mesh position={[-0.14, 0.95, 0.16]} rotation={[0.35, 0, -0.15]}>
        <boxGeometry args={[0.12, 0.5, 0.12]} />
        <meshStandardMaterial color="#243e3c" />
      </mesh>
      <mesh position={[0, 1.15, 0.28]}>
        <boxGeometry args={[0.18, 0.08, 0.28]} />
        <meshStandardMaterial color="#c4a35a" emissive="#c4a35a" emissiveIntensity={0.65} />
      </mesh>
      <pointLight position={[0, 1.2, 0.45]} color="#e6c27a" intensity={1.6} distance={5} />
    </group>
  );
}
