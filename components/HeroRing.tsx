"use client";

/**
 * HeroRing — a quiet ring of photographs orbiting behind the name on
 * the landing page. Non-interactive teaser of the worlds inside.
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const FEATURED = [
  "/thumbs/weddings/Blbfx4eBXmi.webp",
  "/thumbs/documentary/DaQPX4iAm0g_001.webp",
  "/thumbs/prints/BwZoXQLgW5x.webp",
  "/thumbs/hotels/CD108BVpqbl_001.webp",
  "/thumbs/documentary/Da75HC9AlHZ_001.webp",
  "/thumbs/weddings/zw_DVOdyvJgkO6_001.webp",
  "/thumbs/prints/BSCmSgthxNx.webp",
  "/thumbs/documentary/CnEYGH7oP-T_001.webp",
  "/thumbs/weddings/BkLzSzVh44Z.webp",
  "/thumbs/prints/BwuRnlrg-mR.webp",
  "/thumbs/documentary/C8mjTKRIANe.webp",
  "/thumbs/hotels/CEJuuwHJex5_001.webp",
  "/thumbs/prints/C76s18ioPL3.webp",
  "/thumbs/weddings/zw_DHTlKtkIyls_001.webp",
];

function RingPhoto({ url, i, n }: { url: string; i: number; n: number }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const fade = useRef(0);
  const mat = useRef<THREE.MeshBasicMaterial>(null);

  useEffect(() => {
    let alive = true;
    new THREE.TextureLoader().load(url, (t) => {
      if (!alive) return;
      t.colorSpace = THREE.SRGBColorSpace;
      setTex(t);
    });
    return () => {
      alive = false;
    };
  }, [url]);

  useFrame(({ clock }, delta) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;
    const a = (i / n) * Math.PI * 2 + t * 0.05;
    const r = 11;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    m.position.set(x, Math.sin(a * 2 + t * 0.12) * 1.4, z);
    m.rotation.y = Math.atan2(x, z) + Math.PI;
    if (tex && fade.current < 1) fade.current = Math.min(1, fade.current + delta * 0.7);
    if (mat.current) mat.current.opacity = fade.current * 0.5;
  });

  if (!tex) return null;
  const ar = (tex.image?.width || 3) / (tex.image?.height || 2);
  const h = 2.4;

  return (
    <mesh ref={mesh}>
      <planeGeometry args={[h * ar, h]} />
      <meshBasicMaterial ref={mat} map={tex} transparent opacity={0} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}

export default function HeroRing() {
  const urls = useMemo(() => FEATURED, []);
  return (
    <div className="pointer-events-none absolute inset-0">
      <Canvas
        camera={{ position: [0, 0.6, 17], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.6]}
        style={{ position: "absolute", inset: 0 }}
      >
        <fog attach="fog" args={["#070707", 14, 34]} />
        {urls.map((u, i) => (
          <RingPhoto key={u} url={u} i={i} n={urls.length} />
        ))}
      </Canvas>
      {/* fade edges so the ring melts into the page */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--bg)_78%)]" />
    </div>
  );
}
