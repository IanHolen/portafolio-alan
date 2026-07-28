"use client";

/**
 * World — shared interactive 3D photo-space engine.
 * Drag to orbit, wheel/pinch to dive, hover to focus, click and the
 * photograph FLIES to you before opening. Optional mirror floor,
 * cinematic bloom, drifting dust, orbiting nodes.
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, MeshReflectorMaterial } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Photo } from "@/lib/supabase";
import { thumbSrc } from "@/lib/photos";

export type WorldNode = {
  photo: Photo;
  index: number;
  pos: [number, number, number];
  rot: [number, number, number];
  w: number;
  h: number;
  pinned?: boolean;
  frame?: string;
  orbit?: { r: number; y: number; speed: number; phase: number };
};

export type WorldProps = {
  photos: Photo[];
  layout: (photos: Photo[]) => WorldNode[];
  onPick: (index: number) => void;
  onHover?: (photo: Photo | null) => void;
  background?: string;
  fogNear?: number;
  fogFar?: number;
  minDistance?: number;
  maxDistance?: number;
  startDistance?: number;
  autoRotate?: number;
  minPolar?: number;
  maxPolar?: number;
  dimOpacity?: number;
  dust?: boolean;
  bloom?: boolean;
  /** dark mirror floor (museum) */
  floor?: { y: number; radius: number };
};

type FocusState = { id: string; started: number } | null;

function PhotoPlane({
  node,
  onPick,
  onHover,
  dimOpacity,
  focus,
  setFocus,
}: {
  node: WorldNode;
  onPick: (i: number) => void;
  onHover?: (p: Photo | null) => void;
  dimOpacity: number;
  focus: React.MutableRefObject<FocusState>;
  setFocus: (f: FocusState) => void;
}) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const [hover, setHover] = useState(false);
  const fade = useRef(0);
  const fly = useRef(0); // 0 = at home, 1 = at camera
  const seed = useMemo(() => (node.index * 2654435761) % 1000, [node.index]);
  const tmpV = useMemo(() => new THREE.Vector3(), []);
  const tmpQ = useMemo(() => new THREE.Quaternion(), []);
  const homeQ = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(...node.rot)),
    [node.rot]
  );

  useEffect(() => {
    let alive = true;
    new THREE.TextureLoader().load(thumbSrc(node.photo), (t) => {
      if (!alive) return;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      setTex(t);
    });
    return () => {
      alive = false;
    };
  }, [node.photo]);

  useFrame(({ clock, camera }, delta) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;
    const isFocused = focus.current?.id === node.photo.id;

    // fade in
    if (tex && fade.current < 1) fade.current = Math.min(1, fade.current + delta * 1.2);
    if (mat.current) mat.current.opacity = fade.current * (hover || isFocused ? 1 : dimOpacity);

    // home position (static / orbiting / drifting)
    let hx = node.pos[0],
      hy = node.pos[1],
      hz = node.pos[2];
    let hq = homeQ;
    if (node.orbit) {
      const { r, y, speed, phase } = node.orbit;
      const a = phase + t * speed;
      hx = Math.cos(a) * r;
      hz = Math.sin(a) * r;
      hy = y + Math.sin(t * 0.18 + seed) * 0.12;
      hq = tmpQ.setFromEuler(new THREE.Euler(0, Math.atan2(hx, hz) + Math.PI, 0));
    } else if (!node.pinned) {
      hy = node.pos[1] + Math.sin(t * 0.2 + seed) * 0.22;
    }

    // fly to camera when focused
    fly.current += ((isFocused ? 1 : 0) - fly.current) * (isFocused ? 0.14 : 0.1);
    const f = fly.current;
    if (f > 0.001) {
      const dist = 3.2;
      camera.getWorldDirection(tmpV);
      const target = tmpV.multiplyScalar(dist).add(camera.position);
      m.position.set(
        hx + (target.x - hx) * f,
        hy + (target.y - hy) * f,
        hz + (target.z - hz) * f
      );
      const camQ = camera.quaternion;
      m.quaternion.copy(hq).slerp(camQ, f);
      m.renderOrder = 10;
    } else {
      m.position.set(hx, hy, hz);
      m.quaternion.copy(hq);
      if (!node.orbit && !node.pinned) m.rotation.z = node.rot[2] + Math.sin(t * 0.14 + seed) * 0.02;
      m.renderOrder = 0;
    }

    // scale
    const targetS = isFocused ? 1.5 : hover ? 1.14 : 1;
    m.scale.x += (targetS - m.scale.x) * 0.12;
    m.scale.y += (targetS - m.scale.y) * 0.12;
  });

  if (!tex) return null;

  return (
    <mesh
      ref={mesh}
      position={node.pos}
      rotation={node.rot}
      onClick={(e) => {
        e.stopPropagation();
        if (focus.current) return;
        setFocus({ id: node.photo.id, started: performance.now() });
        setTimeout(() => {
          onPick(node.index);
          setFocus(null);
        }, 620);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        onHover?.(node.photo);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        onHover?.(null);
        document.body.style.cursor = "";
      }}
    >
      <planeGeometry args={[node.w, node.h]} />
      <meshBasicMaterial
        ref={mat}
        map={tex}
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
      {node.frame && (
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[node.w + 0.35, node.h + 0.35]} />
          <meshBasicMaterial color={node.frame} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      )}
    </mesh>
  );
}

function Dust() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const N = 420;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 10 + Math.random() * 45;
      const th = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(th) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 2] = Math.sin(th) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.008;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.06} color="#8a8578" transparent opacity={0.35} sizeAttenuation />
    </points>
  );
}

function MirrorFloor({ y, radius }: { y: number; radius: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      <circleGeometry args={[radius, 64]} />
      <MeshReflectorMaterial
        blur={[280, 80]}
        resolution={1024}
        mixBlur={0.9}
        mixStrength={0.55}
        roughness={0.85}
        depthScale={1.1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.3}
        color="#0a0908"
        metalness={0.4}
        mirror={0.6}
      />
    </mesh>
  );
}

function IntroDolly({ start }: { start: number }) {
  const { camera } = useThree();
  const done = useRef(false);
  useEffect(() => {
    camera.position.set(0, 0, start * 2.1);
  }, [camera, start]);
  useFrame(() => {
    if (done.current) return;
    const d = camera.position.length();
    const nd = d + (start - d) * 0.045;
    camera.position.setLength(nd);
    if (Math.abs(nd - start) < 0.05) done.current = true;
  });
  return null;
}

export default function World(props: WorldProps) {
  const {
    photos,
    layout,
    onPick,
    onHover,
    background = "#060606",
    fogNear = 18,
    fogFar = 90,
    minDistance = 2,
    maxDistance = 60,
    startDistance = 26,
    autoRotate = 0.3,
    minPolar = 0.35,
    maxPolar = Math.PI - 0.35,
    dimOpacity = 0.92,
    dust = true,
    bloom = true,
    floor,
  } = props;

  const nodes = useMemo(() => layout(photos), [photos, layout]);
  const focusRef = useRef<FocusState>(null);
  const setFocus = (f: FocusState) => {
    focusRef.current = f;
  };
  const [smallScreen, setSmallScreen] = useState(false);
  useEffect(() => {
    setSmallScreen(window.matchMedia("(max-width: 768px)").matches);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, startDistance], fov: 58, near: 0.1, far: 250 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 1.8]}
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
    >
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[background, fogNear, fogFar]} />
      <IntroDolly start={startDistance} />
      {dust && <Dust />}
      {floor && <MirrorFloor y={floor.y} radius={floor.radius} />}
      {nodes.map((n) => (
        <PhotoPlane
          key={n.photo.id}
          node={n}
          onPick={onPick}
          onHover={onHover}
          dimOpacity={dimOpacity}
          focus={focusRef}
          setFocus={setFocus}
        />
      ))}
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.55}
        zoomSpeed={0.9}
        minDistance={minDistance}
        maxDistance={maxDistance}
        autoRotate={autoRotate > 0}
        autoRotateSpeed={autoRotate}
        minPolarAngle={minPolar}
        maxPolarAngle={maxPolar}
      />
      {bloom && !smallScreen && (
        <EffectComposer>
          <Bloom intensity={0.28} luminanceThreshold={0.55} luminanceSmoothing={0.3} mipmapBlur />
        </EffectComposer>
      )}
    </Canvas>
  );
}
