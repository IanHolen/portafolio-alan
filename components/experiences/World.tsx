"use client";

/**
 * World — shared interactive 3D photo-space engine.
 * Drag to orbit, wheel/pinch to dive, hover to focus, click to open.
 * Nodes can be static (pos) or orbiting (orbit: each photo circles the
 * center at its own radius/height/speed — rings can counter-rotate).
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Photo } from "@/lib/supabase";
import { thumbSrc } from "@/lib/photos";

export type WorldNode = {
  photo: Photo;
  index: number; // index into full photo list (lightbox)
  pos: [number, number, number];
  rot: [number, number, number];
  w: number;
  h: number;
  /** no idle drift (gallery walls) */
  pinned?: boolean;
  /** museum frame color behind the photo */
  frame?: string;
  /** orbit the world center: overrides pos over time */
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
};

function PhotoPlane({
  node,
  onPick,
  onHover,
  dimOpacity,
}: {
  node: WorldNode;
  onPick: (i: number) => void;
  onHover?: (p: Photo | null) => void;
  dimOpacity: number;
}) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const [hover, setHover] = useState(false);
  const fade = useRef(0);
  const seed = useMemo(() => (node.index * 2654435761) % 1000, [node.index]);

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

  useFrame(({ clock }, delta) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;

    // gentle scale focus
    const target = hover ? 1.16 : 1;
    m.scale.x += (target - m.scale.x) * 0.12;
    m.scale.y += (target - m.scale.y) * 0.12;

    // fade in when texture arrives
    if (tex && fade.current < 1) {
      fade.current = Math.min(1, fade.current + delta * 1.2);
    }
    if (mat.current) {
      mat.current.opacity = fade.current * (hover ? 1 : dimOpacity);
    }

    if (node.orbit) {
      const { r, y, speed, phase } = node.orbit;
      const a = phase + t * speed;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      m.position.set(x, y + Math.sin(t * 0.18 + seed) * 0.12, z);
      m.rotation.set(0, Math.atan2(x, z) + Math.PI, 0);
    } else if (!node.pinned) {
      m.position.y = node.pos[1] + Math.sin(t * 0.2 + seed) * 0.22;
      m.rotation.z = node.rot[2] + Math.sin(t * 0.14 + seed) * 0.02;
    }
  });

  if (!tex) return null;

  return (
    <mesh
      ref={mesh}
      position={node.pos}
      rotation={node.rot}
      onClick={(e) => {
        e.stopPropagation();
        onPick(node.index);
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

/** faint drifting dust for depth */
function Dust() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const N = 420;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 10 + Math.random() * 45;
      const th = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 40;
      pos[i * 3] = Math.cos(th) * r;
      pos[i * 3 + 1] = y;
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
  } = props;

  const nodes = useMemo(() => layout(photos), [photos, layout]);

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
      {nodes.map((n) => (
        <PhotoPlane
          key={n.photo.id}
          node={n}
          onPick={onPick}
          onHover={onHover}
          dimOpacity={dimOpacity}
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
    </Canvas>
  );
}
