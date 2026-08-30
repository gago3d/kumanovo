export const agentState = {
  x: 0,
  y: 0,
  z: 2.4,
  yaw: 0,
  street: "Плоштад Нова Југославија",
  speed: 0,
  hunting: true,
};

export const fpsState = {
  x: 0,
  y: 1.7,
  z: 6,
  yaw: 0,
  pitch: 0,
  speed: 0,
  keys: new Set<string>(),
};

export function bindControlsTest() {
  if (typeof window === "undefined") return;
  window.__controlsTest = {
    getYaw: () => fpsState.yaw,
    getSpeed: () => fpsState.speed,
    setKeys: (codes) => {
      fpsState.keys = new Set(codes);
    },
  };
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys?: (codes: string[]) => void;
    };
  }
}
