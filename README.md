# portafolio-alan

Portfolio inmersivo de **Alan Kugelmass** — fotógrafo y visual storyteller (Nairobi, Kenya).

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4**
- **React Three Fiber / Three.js** — experiencia 3D "The Swarm" (Documentary)
- **Supabase** — catálogo de fotos (tabla `photos`) y mensajes de contacto (`contact_messages`)
  - Proyecto: `portafolio-alan` (`udistfvjicapcfmyqwut`)

## Secciones

| Ruta | Experiencia |
|---|---|
| `/` | Landing: hero con retrato, About (bio LinkedIn/IG), 4 mundos, contacto |
| `/weddings` | **The Film** — reel cinematográfico manejado por scroll, intertítulos por actos, muro de créditos (838 IG + 184 ziggyweddings) |
| `/hotels` | **Architecture of Calm** — travesía horizontal por "cuartos", tipografía arquitectónica |
| `/documentary` | **The Swarm** — túnel 3D de 230 fotos flotantes (vuelas con scroll, click = lightbox) + archivo completo (759) |
| `/prints` | **The Gallery** — galería virtual con marcos, spotlights y etiquetas de museo; inquire por WhatsApp |
| `/contact` | Formulario → Supabase + WhatsApp + redes |

## Desarrollo

```bash
npm install
cp .env.example .env.local   # y completa las claves
npm run dev
```

## Imágenes

Las 1,068 fotos viven en `public/photos/<categoria>/` con miniaturas webp en
`public/thumbs/`. La metadata (categoría, dimensiones, orden) vive en Supabase
(`photos`), y los captions/ubicaciones de Instagram en `public/captions.json`.

**Migrar imágenes a Supabase Storage** (cuando se quiera sacar el peso del repo):

```bash
SUPABASE_SERVICE_KEY=xxx node scripts/upload-to-storage.mjs
```

y luego en Vercel definir:

```
NEXT_PUBLIC_IMG_BASE=https://udistfvjicapcfmyqwut.supabase.co/storage/v1/object/public/photos
NEXT_PUBLIC_THUMB_BASE=https://udistfvjicapcfmyqwut.supabase.co/storage/v1/object/public/thumbs
```

(los buckets `photos` y `thumbs` ya existen y son públicos).

## Deploy (Vercel)

1. Sube este repo a GitHub.
2. Importa en Vercel; framework autodetectado (Next.js).
3. Variables de entorno: copia las de `.env.example` con los valores de `.env.local`.

## Pendientes

- **Email de contacto de Alan**: cuando exista, definir `NEXT_PUBLIC_CONTACT_EMAIL`
  y/o conectar un servicio de correo (Resend) para reenviar los mensajes que hoy
  quedan guardados en la tabla `contact_messages`.
- **Foto de perfil en alta**: la actual viene de IG (320px, mejorada a 640). Pedir a Alan el original.
- Reemplazar fotos 1080px por originales cuando Alan pase su archivo.
