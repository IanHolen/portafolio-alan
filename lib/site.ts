export const SITE = {
  name: "Alan Kugelmass",
  title: "Alan Kugelmass — Photographer",
  tagline: "Ride to town, shoot 'em up, keep on going",
  role: "Photographer & Visual Storyteller",
  location: "Nairobi, Kenya",
  origin: "Montevideo, Uruguay",
  whatsapp: "+254717744389",
  whatsappUrl:
    "https://wa.me/254717744389?text=Hi%20Alan%2C%20I%20found%20you%20through%20your%20portfolio%20site",
  // Email pending — set NEXT_PUBLIC_CONTACT_EMAIL when available
  socials: [
    { label: "Instagram", url: "https://www.instagram.com/ziggyq_/" },
    { label: "Weddings", url: "https://www.instagram.com/ziggyweddings/" },
    { label: "LinkedIn", url: "https://www.linkedin.com/in/alankugelmass/" },
    { label: "Facebook", url: "https://www.facebook.com/alankphoto" },
    { label: "Vimeo", url: "https://vimeo.com/ziggyQ" },
  ],
  sections: [
    {
      slug: "weddings",
      title: "Weddings",
      subtitle: "The Film",
      blurb:
        "Two people, one day, and every unrepeatable second in between — photographed like cinema.",
    },
    {
      slug: "hotels",
      title: "Hotels & Spaces",
      subtitle: "Architecture of Calm",
      blurb:
        "Resorts, lodges and properties — light, geometry and the feeling of being there.",
    },
    {
      slug: "documentary",
      title: "Documentary & Street",
      subtitle: "The Swarm",
      blurb:
        "Fifteen years of streets, faces and wild places across four continents.",
    },
    {
      slug: "prints",
      title: "Prints",
      subtitle: "The Gallery",
      blurb:
        "Landscapes and fine-art photographs, printed and shipped worldwide.",
    },
  ],
} as const;

export const ABOUT = {
  headline: "Photographer & visual storyteller, shooting the world since 2010.",
  paragraphs: [
    "Alan Kugelmass is a photographer and videographer born in Montevideo, Uruguay, and currently based in Nairobi, Kenya. Trained in Art Direction at Universidad de Palermo in Buenos Aires, he has spent more than fifteen years behind a camera, chasing light from the salt flats of Argentina to the reefs of the Kenyan coast.",
    "His work moves between worlds: intimate wedding photography under the name ziggyweddings, long-term documentary work in the streets, villages and slums of Africa and Latin America, wildlife encounters in the Masai Mara and Samburu, and fine-art landscapes available as prints worldwide.",
    "Whether it is a bride's first look, a dhow race off Lamu Island, or a leopard staring straight into the lens, the pursuit is the same — the honest, unrepeatable moment.",
  ],
  stats: [
    { value: "15+", label: "years shooting" },
    { value: "4", label: "continents" },
    { value: "900+", label: "photographs in this archive" },
    { value: "∞", label: "moments left to chase" },
  ],
};
