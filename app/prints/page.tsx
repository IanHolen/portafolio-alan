import type { Metadata } from "next";
import PrintGallery from "@/components/experiences/PrintGallery";

export const metadata: Metadata = {
  title: "Prints — Alan Kugelmass",
  description:
    "Fine-art landscape photographs by Alan Kugelmass. Limited prints, shipped worldwide.",
};

export default function PrintsPage() {
  return <PrintGallery />;
}
