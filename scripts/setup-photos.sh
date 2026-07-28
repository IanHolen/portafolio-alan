#!/bin/bash
# Reconstruye public/photos desde la carpeta "fotos alan" del escritorio
# (por si clonas el repo sin las imágenes). Uso: ./scripts/setup-photos.sh "/ruta/a/fotos alan"
SRC="${1:-$HOME/Desktop/fotos alan}"
mkdir -p public/photos/{weddings,hotels,documentary,prints}
cp "$SRC/1-bodas/"*.jpg                      public/photos/weddings/ 2>/dev/null
cp "$SRC/2-hoteles-resorts-realestate/"*.jpg public/photos/hotels/ 2>/dev/null
cp "$SRC/3-documental-street/"*.jpg          public/photos/documentary/ 2>/dev/null
cp "$SRC/4-prints/"*.jpg                     public/photos/prints/ 2>/dev/null
echo "Fotos copiadas: $(find public/photos -name '*.jpg' | wc -l)"
echo "Nota: las fotos zw_ (ziggyweddings) vienen aparte (alan_extra_content.zip en Descargas)."
