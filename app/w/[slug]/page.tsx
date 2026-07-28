import type { Metadata } from "next";
import CoupleOrbit from "@/components/experiences/CoupleOrbit";

export const metadata: Metadata = {
  title: "A wedding — Alan Kugelmass",
  robots: { index: false, follow: false },
};

export default async function WeddingAlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CoupleOrbit slug={slug} />;
}
