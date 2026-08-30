import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useApp } from "@/stores/app";
import { CITY as city } from "@/lib/city/generate";
import { bindControlsTest, fpsState } from "./agentState";

const fwd = new THREE.Vector3();
const right = new THREE.Vector3();
const next = new THREE.Vector3();

function nearStreet(x: number, z: number) {
  let md = Infinity;
  for (const pl of city.graph.polylines) {
    for (let i = 1; i < pl.points.length; i++) {
      const a = pl.points[i - 1];
      const b = pl.points[i];
      const vx = b.x - a.x;
      const vz = b.z - a.z;
      const len2 = vx * vx + vz * vz || 1;
      let t = ((x - a.x) * vx + (z - a.z) * vz) / len2;
      t = Math.max(0, Math.min(1, t));
      md = Math.min(md, Math.hypot(x - (a.x + vx * t), z - (a.z + vz * t)));
    }
  }
  if (Math.hypot(x - city.plaza.x, z - city.plaza.z) < 6.5) return true;
  return md < 2.4;
}

export function FirstPerson() {
  const mode = useApp((s) => s.cameraMode);
  const locked = useApp((s) => s.fpsLocked);
  const setLocked = useApp((s) => s.setFpsLocked);
  const { camera, gl } = useThree();
  const look = useRef({ mx: 0, my: 0 });
  const joy = useRef({ x: 0, y: 0 });

  useEffect(() => {
    bindControlsTest();
  }, []);

  useEffect(() => {
    if (mode !== "fps") {
      fpsState.keys.clear();
      return;
    }
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
      if (down) fpsState.keys.add(e.code);
      else fpsState.keys.delete(e.code);
    };
    const down = (e: KeyboardEvent) => onKey(e, true);
    const up = (e: KeyboardEvent) => onKey(e, false);
    const blur = () => fpsState.keys.clear();
    const move = (e: MouseEvent) => {
      if (!useApp.getState().fpsLocked) return;
      look.current.mx += e.movementX;
      look.current.my += e.movementY;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    window.addEventListener("visibilitychange", blur);
    document.addEventListener("mousemove", move);
    const lockChange = () => setLocked(document.pointerLockElement === gl.domElement);
    document.addEventListener("pointerlockchange", lockChange);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      window.removeEventListener("visibilitychange", blur);
      document.removeEventListener("mousemove", move);
      document.removeEventListener("pointerlockchange", lockChange);
    };
  }, [mode, gl, setLocked]);

  useEffect(() => {
    const el = gl.domElement;
    const onPointer = (e: PointerEvent) => {
      if (useApp.getState().cameraMode !== "fps") return;
      if (e.pointerType === "touch") {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        if (x < 0.45) {
          joy.current.x = (x / 0.45) * 2 - 1;
          joy.current.y = -(y * 2 - 1);
        } else {
          look.current.mx += e.movementX || 0;
          look.current.my += e.movementY || 0;
        }
      }
    };
    const up = () => {
      joy.current.x = 0;
      joy.current.y = 0;
    };
    el.addEventListener("pointermove", onPointer);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointermove", onPointer);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [gl]);

  useFrame((_, raw) => {
    if (mode !== "fps") return;
    const dt = Math.min(raw, 0.1);
    fpsState.yaw -= look.current.mx * 0.0022;
    fpsState.pitch -= look.current.my * 0.0022;
    fpsState.pitch = Math.max(-1.2, Math.min(1.2, fpsState.pitch));
    look.current.mx = 0;
    look.current.my = 0;

    const keys = fpsState.keys;
    let ax = 0;
    let az = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) az += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) az -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) ax += 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) ax -= 1;
    ax += joy.current.x;
    az += joy.current.y;
    const mag = Math.hypot(ax, az);
    if (mag > 1) {
      ax /= mag;
      az /= mag;
    }

    fwd.set(-Math.sin(fpsState.yaw), 0, -Math.cos(fpsState.yaw));
    right.set(Math.cos(fpsState.yaw), 0, -Math.sin(fpsState.yaw));
    const walk = 5.4;
    next.set(fpsState.x, 0, fpsState.z);
    next.addScaledVector(fwd, az * walk * dt);
    next.addScaledVector(right, ax * walk * dt);
    if (nearStreet(next.x, next.z)) {
      fpsState.x = next.x;
      fpsState.z = next.z;
    }
    fpsState.speed = mag * walk;
    fpsState.y = 1.7;

    camera.position.set(fpsState.x, fpsState.y, fpsState.z);
    camera.rotation.order = "YXZ";
    camera.rotation.y = fpsState.yaw;
    camera.rotation.x = fpsState.pitch;
  });

  return null;
}
