# Setup de Sanity CMS (blog)

Cuerpo Raíz usa Sanity como CMS headless para el blog. El Studio está embebido en `/studio` y las rutas públicas viven en `/blog`.

Mientras no se configuren las variables de entorno, las rutas devuelven 404 y el toggle del panel queda deshabilitado — la app sigue funcionando normal.

## 1. Crear proyecto en Sanity

1. Ir a [sanity.io](https://www.sanity.io) y crear cuenta (free plan: hasta 20k requests/mes, 3 usuarios, 10k docs).
2. Desde [manage.sanity.io](https://manage.sanity.io) crear un proyecto nuevo → nombre: `cuerporaiz`.
3. Dataset: dejar `production` (es el default).
4. Copiar el **Project ID** que aparece en la página del proyecto.

## 2. Crear API Read Token

En `manage.sanity.io` → **API** → **Tokens** → **Add API token**:

- **Name**: `cuerporaiz-read`
- **Permissions**: `Viewer`
- Copiar el token (solo se muestra una vez).

Este token se usa para:

- Draft mode (preview de posts no publicados desde el Studio).
- Consultas server-side con autenticación (si en el futuro el dataset queda privado).

## 3. Configurar CORS

En `manage.sanity.io` → **API** → **CORS origins** → agregar:

- `http://localhost:3000` (con credentials habilitado)
- `https://cuerporaiz.cl` (dominio de producción, con credentials)
- `https://*.vercel.app` (previews de Vercel, opcional)

Esto permite que el Studio embebido en `/studio` pueda hablar con la API.

## 4. Setear variables de entorno

### Local (`.env.local`)

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=xxxxxxxx
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2026-04-23
SANITY_API_READ_TOKEN=sk...
# Para preview desde el Studio: generar con `openssl rand -hex 32`
SANITY_PREVIEW_SECRET=<hex aleatorio>
```

### Vercel (production + preview)

Desde el proyecto en Vercel → Settings → Environment Variables, agregar las mismas claves con los mismos valores.

## 5. Primer deploy

1. Reiniciar el dev server: `npm run dev`.
2. Ir a [`http://localhost:3000/panel/sitio?tab=blog`](http://localhost:3000/panel/sitio?tab=blog) y verificar que ya no aparece el banner de "Sanity no está configurado".
3. Click en "Abrir Studio" — abre `/studio` en nueva pestaña.
4. Autenticar con la cuenta de Sanity (solo se hace una vez).
5. Crear primer autor (Trini), primera categoría (Yoga, Respiración, Retiros, Vida cotidiana).
6. Crear un artículo de prueba y darle publish.
7. Ir a `/blog` — el artículo debería aparecer.

## 6. Activar el link en el header

En `/panel/sitio?tab=blog`:

- Marcar "Mostrar link en el header".
- Definir el texto (default: "Blog").
- Guardar.

El nav público refleja el cambio sin necesidad de redeploy (cada request rearma los links).

## 7. (Opcional) Sembrar posts de ejemplo

Hay un script en `scripts/seed-sanity.ts` que crea autor + 2 categorías + 2 posts de ejemplo:

```bash
npx tsx scripts/seed-sanity.ts
```

Requiere que las env vars estén setteadas.

## Troubleshooting

| Síntoma | Causa | Solución |
|---------|-------|----------|
| `/blog` devuelve 404 | env vars faltantes | Reiniciar dev server después de agregar env vars |
| `/studio` pide login infinito | CORS mal configurado | Agregar el origen exacto en `manage.sanity.io` → API → CORS |
| Posts nuevos no aparecen | ISR de 60s | Esperar 60s o hacer hard refresh |
| Draft mode no funciona | falta `SANITY_PREVIEW_SECRET` | Generar uno con `openssl rand -hex 32` y agregar al env |

## Permisos

- Cualquier usuario autenticado en Sanity puede acceder al Studio público, pero solo los administradores del sitio (rol ADMINISTRATOR) pueden abrir `/studio`. El middleware + layout verifican esto.
- Para sumar más editores: `manage.sanity.io` → Members → Invite (plan free admite 3 usuarios).
