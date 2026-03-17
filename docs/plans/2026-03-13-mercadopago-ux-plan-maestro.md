# Plan maestro: Webhook MP, recomendaciones MP, UX checkout/planes/panel y clase de prueba

**Fecha:** 2026-03-13  
**Estado:** En progreso (Fase 0 hecha)

Resumen de lo que se va a abordar en orden, por fases.

---

## Contexto

- El pago con Mercado Pago ya funciona (redirect a checkout MP, vuelta a la app).
- El webhook de “pago aprobado” no llegaba cuando se probaba por ngrok: la `notification_url` se armaba con base localhost.
- MP aprobó la app y recomendó enviar `payer.first_name` y `payer.last_name` en la preferencia.
- La página de término de checkout (`/checkout/gracias`) es muy básica y sin layout consistente.
- Como cliente no se ve qué planes/membresías están activos o pasados; falta reestructurar `/planes` y el panel con header/layout.
- En “Mi cuenta” (/panel) falta resumen de membresías, uso, vencimiento, aviso de plan vencido e historial de pagos.
- Se quiere CTA “reservar clase de prueba gratis” cuando aplica, y que el centro pueda tener configuración global de clase de prueba (ya existe `allowTrialClassPerPerson` y `isTrialClass` por serie).

---

## Fase 0 — Hecho (sin tener que hacer otro pago)

### 0.1 Causa del webhook que no llegaba

- **Causa:** En `POST /api/checkout` la `baseUrl` se tomaba de `request.headers.get("origin") ?? NEXTAUTH_URL ?? ...`. Cuando la petición no trae `Origin` (o llega por proxy), se usaba localhost y la `notification_url` quedaba `http://localhost:3000/api/webhooks/mercadopago/{centerId}`. MP no puede llamar a localhost.
- **Fix:** Se usa la misma lógica que en el callback OAuth: derivar la base de `x-forwarded-proto`, `x-forwarded-host` y `host` (`getBaseUrl(request)`). Así, si el usuario entra por ngrok, la preferencia se crea con `notification_url` de ngrok y MP puede enviar el webhook.
- **Verificación:** No hace falta volver a pagar. En el próximo checkout que hagas entrando por ngrok, la preferencia ya llevará la URL de ngrok; cuando MP confirme el pago, debería llamar a esa URL y vos deberías recibir el webhook (y la orden pasaría a APPROVED y se activaría el plan).

### 0.2 Recomendaciones MP (payer.first_name / payer.last_name)

- **Hecho:** Se añadieron `payerFirstName` y `payerLastName` al DTO de preferencia, al adapter de MP y al caso de uso de checkout. Se envían a MP en el objeto `payer` de la preferencia.
- El nombre se toma de la sesión (`session.user.name`), partido en primera palabra = nombre, resto = apellido. Si en el futuro tenés `firstName`/`lastName` en el usuario, se puede usar eso directamente.

### 0.3 Documentación

- En `docs/plugins/mercadopago-credenciales.md`:
  - Se aclaró que la `notification_url` se arma con la base del request (proxy/ngrok).
  - Se añadió sección **Monto mínimo por país** (Chile ~$1.000 CLP, Argentina ~$100 ARS; enlace a ayuda MP). Para un “plan mínimo” de prueba conviene usar el mínimo del país.

---

## Fase 1 — Página de término de checkout (`/checkout/gracias`)

**Objetivo:** Reestructurar la página de pago fallido/aprobado/pendiente con la skill UI Pro y brainstorming, siguiendo la línea de diseño del sitio.

**Insumos:**

- Ruta actual: `app/checkout/gracias/page.tsx`.
- Query: `order`, `centerId`, `result` (success | failure | pending), opcionalmente `payment_id`, `status`.
- Hoy: solo título, texto y 3 botones (Ir al panel, Ver más planes, Inicio); sin header ni layout común.

**Entregables:**

1. Brainstorming (skill) para alinear mensajes, jerarquía y acciones según `result`.
2. Design system (UI Pro) para la página y persistir si aplica.
3. Implementación:
   - Mismo layout/header que el resto del sitio (o el que definan para checkout).
   - Estados claros para success / failure / pending (icono, color, copy).
   - En success: resumen breve (plan, centro), link a panel y a “mis planes”.
   - En failure: mensaje amable, CTA “Ver más planes” y “Ir al panel”.
   - En pending: explicación de que se actualizará cuando MP confirme.
4. Documentar en `docs/plans/` el diseño (ej. `YYYY-MM-DD-checkout-gracias-design.md`) y, si hace falta, plan de implementación.

---

## Fase 2 — Planes: vista cliente y reestructuración de `/planes`

**Objetivo:** Que el cliente vea sus planes (activos y pasados) y que `/planes` tenga header/layout consistente.

**Hoy:**

- `/planes`: lista de planes del centro + botón comprar; sin header/layout unificado.
- No hay vista “Mis planes” (membresías activas/pasadas del usuario).

**Entregables:**

1. Brainstorming para:
   - Estructura de “Mis planes” (activos vs vencidos/cancelados).
   - Cómo integrar “Mis planes” en la misma zona que “Ver planes para comprar” (misma página `/planes` con secciones o pestañas, o subruta tipo `/planes/mis-planes`).
2. UI Pro: design system para la página Planes (layout, header, cards, estados).
3. Implementación:
   - Layout de `/planes` con header (y panel lateral si lo definen para el sitio).
   - Sección “Mis planes”: listar `UserPlan` del usuario para el centro (activos, vencidos), con nombre del plan, vigencia (validFrom–validUntil), uso (clases usadas/total si aplica), estado.
   - Sección “Planes disponibles”: la lista actual de planes del centro con “Comprar”.
   - En cada plan disponible, mostrar más información del plan: vigencia (días o período), `maxReservations` / `maxReservationsPerDay` / `maxReservationsPerWeek` si existen (según modelo `Plan`).
4. Diseño en `docs/plans/` y plan de implementación si hace falta.

---

## Fase 3 — Mi cuenta (/panel): resumen de membresías, uso, vencimiento y pagos

**Objetivo:** En el panel del usuario mostrar membresías activas, uso, tiempo restante, aviso de vencimiento e historial de pagos.

**Entregables:**

1. Brainstorming para:
   - Qué mostrar en la “vista principal” del panel (resumen de membresías, próximo vencimiento, uso).
   - Dónde y cómo mostrar “Tu plan venció – renová” y “Historial de pagos”.
2. UI Pro: criterios de diseño para las tarjetas de membresía y la sección de pagos.
3. Implementación:
   - Bloque “Membresías activas”: planes activos del usuario en el centro, con:
     - Nombre del plan.
     - Vigencia (desde / hasta).
     - Uso: “X de Y clases” (o “ilimitado”) y tiempo restante si aplica.
   - Aviso claro cuando el plan esté vencido: “Tu plan [nombre] venció. Renová desde Planes.”
   - Sección “Tus pagos” (o “Historial de pagos”): órdenes del usuario (Order) y pagos manuales si se muestran al cliente; al menos orden, plan, monto, estado, fecha.
   - Mantener los accesos rápidos actuales (reservas, planes, etc.).
4. Documentar diseño y pasos de implementación.

---

## Fase 4 — Clase de prueba: configuración global y CTA en panel

**Objetivo:** Que el centro pueda activar/desactivar la oferta de clase de prueba de forma global y que el usuario vea “Podés reservar una clase de prueba gratis” cuando corresponda.

**Hoy:**

- `Center.allowTrialClassPerPerson`: ya existe.
- `LiveClassSeries.isTrialClass`, `trialCapacity`: ya existen (factibilidad por serie/horario).

**Entregables:**

1. Brainstorming para:
   - Dónde el centro configura “permitir clases de prueba” (panel del centro, junto a otras políticas).
   - Cuándo mostrar al usuario el CTA “Reservar clase de prueba gratis” (ej.: nunca reservó + centro permite trial + hay al menos una clase con cupo trial).
2. Implementación:
   - Si no existe ya, exponer en el panel del centro la opción “Permitir clase de prueba por persona” (o similar) ligada a `allowTrialClassPerPerson`.
   - En “Mi cuenta” (o en la vista de reservas): si el usuario nunca reservó y el centro tiene `allowTrialClassPerPerson` y hay series/clases con `isTrialClass` y cupo disponible, mostrar un aviso/CTA: “Podés reservar una clase de prueba gratis” con link a la agenda/reservas.
   - Reutilizar la lógica existente de `isTrialClass` y `trialCapacity` por serie/horario.
3. Documentar en diseño o en este plan las reglas de negocio (quién ve el CTA, qué se considera “nunca reservó”, etc.).

---

## Fase 5 — Refinamientos y cierre

- Revisar que el webhook se reciba correctamente en entorno ngrok (y en producción con la URL pública).
- Revisar flujo completo: compra → redirect MP → pago → vuelta a gracias → webhook → orden APPROVED → UserPlan activado; y que en panel y “Mis planes” se vea el plan activo.
- Ajustes de copy, accesibilidad y responsive según lo definido en las fases anteriores.
- Actualizar este documento con el estado final de cada fase.

---

## Orden sugerido de ejecución

| Fase | Descripción | Dependencias |
|------|-------------|--------------|
| 0 | Webhook baseUrl + payer first/last name + doc | — (hecho) |
| 1 | Página checkout/gracias | — |
| 2 | Planes: layout + “Mis planes” + detalle plan | — |
| 3 | Panel: membresías, uso, vencimiento, pagos | Fase 2 (datos UserPlan/Order) |
| 4 | Clase de prueba: config + CTA | Fase 3 opcional (panel) |
| 5 | Refinamientos y verificación end-to-end | Fases 1–4 |

Las fases 1 y 2 se pueden hacer en paralelo después de la 0. La 3 usa los mismos datos que “Mis planes” de la 2. La 4 puede hacerse en paralelo o después de la 3.

---

## Referencias

- `app/api/checkout/route.ts` — getBaseUrl(request) para notification_url.
- `lib/application/checkout.ts` — createCheckoutUseCase, CreateCheckoutInput (payerFirstName, payerLastName).
- `lib/adapters/payment/mercadopago.adapter.ts` — payer.first_name, payer.last_name.
- `docs/plugins/mercadopago-credenciales.md` — webhooks, monto mínimo.
- `app/checkout/gracias/page.tsx` — página a reestructurar.
- `app/planes/page.tsx` — planes actuales (centro).
- `app/panel/page.tsx` — Mi cuenta.
- Prisma: `UserPlan`, `Plan`, `Order`, `Center.allowTrialClassPerPerson`, `LiveClassSeries.isTrialClass`, `trialCapacity`.
