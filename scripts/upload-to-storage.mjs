/**
 * Sube public/photos y public/thumbs a Supabase Storage (buckets photos/thumbs).
 * Uso:  SUPABASE_SERVICE_KEY=... node scripts/upload-to-storage.mjs
 * (la service key está en Supabase → Project Settings → API)
 */
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const URL = "https://udistfvjicapcfmyqwut.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!KEY) {
  console.error("Falta SUPABASE_SERVICE_KEY");
  process.exit(1);
}
const sb = createClient(URL, KEY);

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

async function uploadDir(localBase, bucket, ctype) {
  const files = await walk(localBase);
  console.log(`${bucket}: ${files.length} archivos`);
  let done = 0;
  const CONC = 8;
  const queue = [...files];
  await Promise.all(
    Array.from({ length: CONC }, async () => {
      while (queue.length) {
        const f = queue.pop();
        const rel = path.relative(localBase, f).split(path.sep).join("/");
        const body = await readFile(f);
        const { error } = await sb.storage
          .from(bucket)
          .upload(rel, body, { contentType: ctype, upsert: true });
        if (error) console.error(rel, error.message);
        if (++done % 100 === 0) console.log(`${bucket}: ${done}/${files.length}`);
      }
    })
  );
  console.log(`${bucket}: listo (${done})`);
}

await uploadDir("public/photos", "photos", "image/jpeg");
await uploadDir("public/thumbs", "thumbs", "image/webp");
console.log("✔ Migración completa. Define NEXT_PUBLIC_IMG_BASE / NEXT_PUBLIC_THUMB_BASE en Vercel.");
