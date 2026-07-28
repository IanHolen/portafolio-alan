import type { Metadata } from "next";
import DocumentarySwarm from "@/components/experiences/DocumentarySwarm";

export const metadata: Metadata = {
  title: "Documentary & Street — Alan Kugelmass",
  description:
    "Fifteen years of documentary and street photography across Africa, Latin America, Europe and Asia.",
};

export default function DocumentaryPage() {
  return <DocumentarySwarm />;
}
