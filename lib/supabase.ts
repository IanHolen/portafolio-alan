import { createClient } from '@supabase/supabase-js';

// Publishable values (safe in client bundles by design); env vars override.
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://udistfvjicapcfmyqwut.supabase.co";
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkaXN0ZnZqaWNhcGNmbXlxd3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMDg0NDUsImV4cCI6MjEwMDc4NDQ0NX0.9VryslT4Rsor1gjYSKsWZ19EnkvzcdMTO3ibAs9Mwlw";

export const supabase = createClient(url, anon);

export type Photo = {
  id: string;
  code: string;
  filename: string;
  category: 'weddings' | 'hotels' | 'documentary' | 'prints';
  storage_path: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  location: string | null;
  featured: boolean;
  sort_order: number;
};

export const photoUrl = (path: string) =>
  `${url}/storage/v1/object/public/photos/${path}`;

export const thumbUrl = (path: string) =>
  `${url}/storage/v1/object/public/thumbs/${path.replace(/\.jpg$/, '.webp')}`;

export async function getPhotos(category?: Photo['category']) {
  let q = supabase.from('photos').select('*').order('sort_order');
  if (category) q = q.eq('category', category);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Photo[];
}
