import type { Metadata } from "next";
import HotelSpaces from "@/components/experiences/HotelSpaces";

export const metadata: Metadata = {
  title: "Hotels & Spaces — Alan Kugelmass",
  description:
    "Hotel, resort and property photography by Alan Kugelmass. Light, geometry and the feeling of being there.",
};

export default function HotelsPage() {
  return <HotelSpaces />;
}
