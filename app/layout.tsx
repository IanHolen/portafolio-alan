import type { Metadata } from "next";
import "@fontsource/cormorant-garamond/300.css";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "./globals.css";
import Nav from "@/components/Nav";
import GalleryCursor from "@/components/GalleryCursor";
import Tracker from "@/components/Tracker";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: SITE.title,
  description:
    "Alan Kugelmass — photographer & visual storyteller. Weddings, hotels & spaces, documentary, and fine-art prints. Based in Nairobi, Kenya.",
  openGraph: {
    title: SITE.title,
    description: "Weddings · Hotels & Spaces · Documentary · Prints",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-body grain">
        <GalleryCursor />
        <Tracker />
        <Nav />
        {children}
      </body>
    </html>
  );
}
