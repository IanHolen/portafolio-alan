import type { Metadata } from "next";
import WeddingFilm from "@/components/experiences/WeddingFilm";

export const metadata: Metadata = {
  title: "Weddings — Alan Kugelmass",
  description:
    "Wedding photography by Alan Kugelmass (ziggyweddings). Destination weddings, photographed like cinema.",
};

export default function WeddingsPage() {
  return <WeddingFilm />;
}
