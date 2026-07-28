"use client";

/**
 * World — shared interactive 3D photo-space engine.
 * The user is INSIDE the space: drag to orbit, wheel/pinch to zoom,
 * hover to light a photo up, click to open it. No scroll narratives.
 * Each category passes its own spatial layout + mood.
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
  /** photos slowly drift/breathe unless pinned (e.g. gallery walls) */
  pinned?: boolean;
  /** museum frame color behind the photo (e.g. "#f5f2ea") */
  frame?: string;
};

export type WorldProps = {
  photos: Photo[];
  layout: (photos: Photo[]) => WorldNode[];
  onPick: (index: number) => void;
  background?: string;
  fogNear?: number;
  fogFar?: number;
  minDistance?: number;
  maxDistance?: number;
  startDistance?: number;
  autoRotate?: number; // speed; 0 = off
  minPolar?: number;
  maxPolar?: number;
  dimOpacity?: number; // resting opacity of photos
};

function PhotoPlane({
  node,
  onPick,
  dimOpacity,
}: {
  node: WorldNode;
  onPick: (i: number) => void;
  dimOpacity: number;
}) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
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

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const target = hover ? 1.18 : 1;
    m.scale.x += (target - m.scale.x) * 0.12;
    m.scale.y += (target - m.scale.y) * 0.12;
    if (!node.pinned) {
      const t = clock.elapsedTime;
      m.position.y = node.pos[1] + Math.sin(t * 0.22 + seed) * 0.28;
      m.rotation.z = node.rot[2] + Math.sin(t * 0.15 + seed) * 0.03;
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
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "";
      }}
    >
      <planeGeometry args={[node.w, node.h]} />
      <meshBasicMaterial
        map={tex}
        transparent
        opacity={hover ? 1 : dimOpacity}
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

function SceneNodes({
  nodes,
  onPick,
  dimOpacity,
}: {
  nodes: WorldNode[];
  onPick: (i: number) => void;
  dimOpacity: number;
}) {
  return (
    <>
      {nodes.map((n) => (
        <PhotoPlane key={n.photo.id} node={n} onPick={onPick} dimOpacity={dimOpacity} />
      ))}
    </>
  );
}

/** gentle intro dolly: camera eases from far to startDistance */
function IntroDolly({ start }: { start: number }) {
  const { camera } = useThree();
  const done = useRef(false);
  useEffect(() => {
    camera.position.set(0, 0, start * 2.2);
  }, [camera, start]);
  useFrame(() => {
    if (done.current) return;
    const target = start;
    const d = camera.position.length();
    const nd = d + (target - d) * 0.045;
    camera.position.setLength(nd);
    if (Math.abs(nd - target) < 0.05) done.current = true;
  });
  return null;
}

export default function World(props: WorldProps) {
  const {
    photos,
    layout,
    onPick,
    background = "#060606",
    fogNear = 18,
    fogFar = 90,
    minDistance = 2,
    maxDistance = 60,
    startDistance = 26,
    autoRotate = 0.35,
    minPolar = 0.35,
    maxPolar = Math.PI - 0.35,
    dimOpacity = 0.92,
  } = props;

  const nodes = useMemo(() => layout(photos), [photos, layout]);

  return (
    <Canvas
      camera={{ position: [0, 0, startDistance], fov: 60, near: 0.1, far: 250 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 1.8]}
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
    >
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[background, fogNear, fogFar]} />
      <IntroDolly start={startDistance} />
      <SceneNodes nodes={nodes} onPick={onPick} dimOpacity={dimOpacity} />
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
