"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Photo } from "@/lib/supabase";
import { hash01, thumbSrc } from "@/lib/photos";

const TUNNEL_LEN = 900; // world units along -Z
const COUNT = 230; // planes in the flight

type Node = {
  photo: Photo;
  gi: number; // index in full photo array (for lightbox)
  pos: [number, number, number];
  rot: [number, number, number];
  w: number;
  h: number;
};

function buildNodes(photos: Photo[]): Node[] {
  const step = Math.max(1, Math.floor(photos.length / COUNT));
  const picked: { p: Photo; gi: number }[] = [];
  for (let i = 0; i < photos.length && picked.length < COUNT; i += step)
    picked.push({ p: photos[i], gi: i });

  return picked.map(({ p, gi }, i) => {
    const t = i / picked.length;
    const r1 = hash01(p.filename, 1);
    const r2 = hash01(p.filename, 2);
    const r3 = hash01(p.filename, 3);
    const r4 = hash01(p.filename, 4);
    // ring distribution around the flight path, radius 4..16
    const ang = r1 * Math.PI * 2;
    const rad = 4 + r2 * 12;
    const x = Math.cos(ang) * rad + (r3 - 0.5) * 4;
    const y = Math.sin(ang) * rad * 0.6 + (r4 - 0.5) * 3;
    const z = -t * TUNNEL_LEN - r3 * 6;
    const ar = (p.width || 1080) / (p.height || 1080);
    const h = 2.6 + r2 * 1.6;
    return {
      photo: p,
      gi,
      pos: [x, y, z],
      rot: [(r2 - 0.5) * 0.3, (r1 - 0.5) * 0.5, (r4 - 0.5) * 0.12],
      w: h * ar,
      h,
    };
  });
}

function PhotoPlane({ node, onPick }: { node: Node; onPick: (gi: number) => void }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.load(thumbSrc(node.photo), (t) => {
      if (!alive) return;
      t.colorSpace = THREE.SRGBColorSpace;
      setTex(t);
    });
    return () => {
      alive = false;
    };
  }, [node.photo]);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    // slow drift
    const t = clock.elapsedTime;
    const s = hash01(node.photo.filename, 9) * 10;
    mesh.current.position.y = node.pos[1] + Math.sin(t * 0.25 + s) * 0.35;
    mesh.current.rotation.y = node.rot[1] + Math.sin(t * 0.18 + s) * 0.05;
  });

  if (!tex) return null;

  return (
    <mesh
      ref={mesh}
      position={node.pos}
      rotation={node.rot}
      onClick={(e) => {
        e.stopPropagation();
        onPick(node.gi);
      }}
      onPointerOver={() => {
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
        opacity={hover ? 1 : 0.88}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

function Rig({ nodes, onPick }: { nodes: Node[]; onPick: (gi: number) => void }) {
  const { camera } = useThree();
  const scroll = useRef(0);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      // progress across the 1400vh flight body
      const total = window.innerHeight * 13; // 1400vh - 100vh
      scroll.current = Math.min(1, Math.max(0, doc.scrollTop / total));
    };
    const onMouse = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouse, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  useFrame(() => {
    const targetZ = -scroll.current * TUNNEL_LEN;
    camera.position.z += (targetZ - camera.position.z) * 0.06;
    camera.position.x += (mouse.current.x * 2.4 - camera.position.x) * 0.04;
    camera.position.y += (-mouse.current.y * 1.6 - camera.position.y) * 0.04;
    camera.lookAt(camera.position.x * 0.6, camera.position.y * 0.6, camera.position.z - 14);
  });

  return (
    <>
      {nodes.map((n) => (
        <PhotoPlane key={n.photo.id} node={n} onPick={onPick} />
      ))}
    </>
  );
}

export default function SwarmCanvas({
  photos,
  onPick,
}: {
  photos: Photo[];
  onPick: (index: number) => void;
}) {
  const nodes = useMemo(() => buildNodes(photos), [photos]);

  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 62, near: 0.1, far: 140 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 1.8]}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={["#050505"]} />
      <fog attach="fog" args={["#050505", 24, 110]} />
      <Rig nodes={nodes} onPick={onPick} />
    </Canvas>
  );
}
