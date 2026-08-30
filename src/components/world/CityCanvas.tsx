import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { useEffect, useRef, type ComponentRef, Suspense } from "react";
import * as THREE from "three";
import { useApp } from "@/stores/app";
import { Agent } from "./Agent";
import { agentState } from "./agentState";
import { CityMesh } from "./CityMesh";
import { FirstPerson } from "./FirstPerson";
import { GroundMap } from "./GroundMap";
import { Labels } from "./Labels";
import { Pins } from "./Pins";

function Lighting() {
  const night = useApp((s) => s.night);
  return night ? (
    <>
      <color attach="background" args={["#0b1014"]} />
      <fog attach="fog" args={["#0b1014", 36, 140]} />
      <hemisphereLight args={["#4a5e70", "#3a3228", 1.05]} />
      <directionalLight position={[18, 28, 12]} intensity={1.05} color="#e8eef4" castShadow />
      <directionalLight position={[-12, 10, -8]} intensity={0.32} color="#c4a35a" />
      <ambientLight intensity={0.4} />
      <Stars radius={90} depth={36} count={700} factor={2.2} fade speed={0.35} />
    </>
  ) : (
    <>
      <color attach="background" args={["#c5d0d6"]} />
      <fog attach="fog" args={["#c5d0d6", 55, 160]} />
      <hemisphereLight args={["#e8f1f6", "#8a8a70", 0.8]} />
      <directionalLight position={[24, 36, 10]} intensity={0.95} color="#fff6e0" castShadow />
      <directionalLight position={[-16, 12, -10]} intensity={0.18} color="#9bb0c0" />
      <ambientLight intensity={0.55} />
    </>
  );
}

const desired = new THREE.Vector3();
const look = new THREE.Vector3();

function Rig() {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const follow = useApp((s) => s.followAgent);
  const mode = useApp((s) => s.cameraMode);
  const flyTo = useApp((s) => s.flyTo);
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0.4, 0));

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.1);
    if (mode !== "orbit") return;
    const c = controls.current;
    if (!c) return;
    if (flyTo) {
      look.set(flyTo.x, 0.5, flyTo.z);
      desired.set(flyTo.x + 10, 16, flyTo.z + 14);
      camera.position.lerp(desired, 1 - Math.exp(-2.4 * dt));
      c.target.lerp(look, 1 - Math.exp(-2.6 * dt));
      if (camera.position.distanceTo(desired) < 0.55) {
        useApp.getState().setFlyTo(null);
      }
      c.enabled = false;
      return;
    }
    if (follow) {
      target.current.set(agentState.x, 0.6, agentState.z);
      c.target.lerp(target.current, 1 - Math.exp(-3 * dt));
    }
    c.enabled = true;
  });

  useEffect(() => {
    if (mode === "orbit") {
      camera.position.set(8, 32, 36);
      camera.lookAt(0, 0, 0);
      camera.rotation.order = "XYZ";
    }
  }, [mode, camera]);

  if (mode !== "orbit") return null;
  return (
    <OrbitControls
      ref={controls}
      enableDamping
      dampingFactor={0.08}
      minPolarAngle={0.18}
      maxPolarAngle={1.28}
      minDistance={8}
      maxDistance={120}
    />
  );
}

export function CityCanvas() {
  const night = useApp((s) => s.night);
  const showPins = useApp((s) => s.showPins);
  return (
    <Canvas
      className="touch-none"
      camera={{ position: [8, 32, 36], fov: 46, near: 0.1, far: 280 }}
      dpr={[1, 1.6]}
      shadows
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = night ? 1.05 : 1.12;
      }}
    >
      <Lighting />
      <Suspense fallback={null}>
        <GroundMap />
      </Suspense>
      <CityMesh />
      <Agent />
      {showPins && <Pins />}
      <Labels />
      <Rig />
      <FirstPerson />
    </Canvas>
  );
}
