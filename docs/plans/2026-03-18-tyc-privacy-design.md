## Términos y Condiciones + Política de Privacidad (Google OAuth)

**Goal:** Publicar páginas accesibles sin login en `/tyc` y `/privacy` para cumplir requisitos de verificación/autorización de Google (Google Meet OAuth).

**Alcance:**
- Crear ruta `/tyc` con “Términos y Condiciones”.
- Crear ruta `/privacy` con “Política de Privacidad”.
- Incluir email de contacto parametrizable por env, con default.
- Linkear ambas páginas desde el footer.

**Tech:** Next.js App Router (`app/.../page.tsx`), Tailwind (estilos ya existentes).

---

## Requisitos de contenido (versión completa, pero pragmática)

### `/tyc`
- Identificación del servicio (Cuerpo Raíz).
- Reglas generales de uso (cuentas, panel, reservas).
- Pagos, cancelaciones y reembolsos (a nivel general; referir a políticas del centro si aplica).
- Responsabilidad y limitaciones.
- Propiedad intelectual.
- Suspensión/terminación de cuenta.
- Modificaciones de los términos.
- Contacto.

### `/privacy`
- Qué datos se recopilan (cuenta, reservas, pagos/ordenes, integraciones).
- Finalidades (operación del servicio, soporte, comunicaciones transaccionales).
- Base legal/consentimiento (explicado de forma simple).
- Terceros/proveedores (Google, Zoom, MercadoPago, Resend, hosting).
- Retención y seguridad (alto nivel).
- Derechos del usuario (acceso, rectificación, eliminación, etc.).
- Cookies/analítica (alto nivel).
- Contacto.

---

## Parametrización del contacto

- Variable: `NEXT_PUBLIC_SUPPORT_EMAIL`
- Default: `cuerporaiztrinidad@gmail.com`
- Se usa en `/tyc`, `/privacy` y en links del footer.
- Se documenta en `.env.example`.

---

## UI/UX

- Página simple y legible: contenedor ancho máximo, tipografía del sitio, índice inicial con anchors.
- “Última actualización” visible.
- Copy en español neutro (tú) y sin género.

---

## Test plan

- Navegar a `/tyc` y `/privacy` y validar que cargan sin login.
- Verificar que los links aparecen en el footer.
- Confirmar que el email se toma de `NEXT_PUBLIC_SUPPORT_EMAIL` cuando está definido.

