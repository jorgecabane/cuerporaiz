# Diseño: Plugins Zoom y Google Meet para videollamadas en clases online

**Fecha:** 2026-03-15  
**Estado:** Borrador para aprobación

---

## 1. Objetivos y alcance

- Los centros pueden **configurar Zoom y/o Google Meet** (OAuth o credenciales en el plugin según corresponda) desde Panel → Plugins.
- Al marcar **"Clase online"** al crear/editar una clase o serie, la app **crea la reunión en el proveedor elegido** y guarda el link en `meetingUrl`, mostrándolo como **URL copiable** en el horario.
- Si **Zoom y Meet están ambos activos**, se pregunta al usuario **cuál usar** antes de crear la videollamada.
- Si la **creación falla** (token caducado, red, límites): se muestra el **error**, se deja un **campo manual** para pegar URL y opción de **reintentar** generar la videollamada.
- **Una reunión por serie** (opción A): la misma URL se reutiliza para todas las instancias generadas de esa serie.
- Al **desmarcar "Clase online"**: solo se **borra `meetingUrl` en la base de datos**; no se llama a Zoom/Meet para cancelar la reunión.

---

## 2. Enfoques considerados

| Enfoque | Descripción | Pros | Contras |
|--------|-------------|------|--------|
| **A. OAuth por centro** | Cada centro conecta su cuenta Zoom y/o Google; credenciales OAuth de la app en ENV (como MercadoPago). | Reuniones en la cuenta del centro, límites y facturación suyos, coherente con MP. | Implementar dos flujos OAuth (Zoom + Google). |
| **B. Solo ENV (una cuenta plataforma)** | Una cuenta Zoom y una Google por plataforma; centros usan esas reuniones. | Un solo OAuth/config. | Reuniones no son “del” centro, límites y billing centralizados, menos estándar. |

**Recomendación:** **Enfoque A** — OAuth por centro, con credenciales de la app (Client ID / Secret) en ENV. Cada centro hace “Conectar Zoom” / “Conectar Meet” y guardamos tokens por centro.

---

## 3. Modelo de configuración

- **ENV (plataforma):** credenciales OAuth de la aplicación (no de cada centro).
  - Zoom: `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` (y redirect URI configurado en Zoom Developer).
  - Google Meet (Calendar): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (scopes: `calendar` para crear eventos con Meet).
- **Base de datos:** una tabla por proveedor (por claridad y evolución independiente):
  - **CenterZoomConfig:** `centerId`, `accessToken`, `refreshToken`, `tokenExpiresAt`, `enabled`, timestamps. Relación 1:1 con Center.
  - **CenterGoogleMeetConfig** (o nombre similar): mismo esquema para Google; el token da acceso a Calendar para crear eventos con Meet.
- **Plugins:** dos páginas, como MercadoPago y Transferencia:
  - `/panel/plugins/zoom` — Conectar cuenta Zoom (OAuth), toggle activo, estado “Conectado” / “Reconectar”.
  - `/panel/plugins/meet` — Idem para Google (cuenta que tendrá el calendario y los Meet).
- En la lista de plugins, Zoom y Meet muestran **Activo** si el centro tiene config válida y `enabled=true`. Si no hay credenciales ENV, mensaje “Contactar al administrador de la plataforma”.

---

## 4. Flujo en horarios (clase / serie)

- **Habilitar “Clase online”:** solo si al menos un plugin (Zoom o Meet) está activo para el centro. Si no, el checkbox sigue deshabilitado con tooltip “Configurá Zoom o Meet en Plugins”.
- **Al marcar “Clase online”:**
  1. Si **solo uno** está activo → se llama a la API de ese proveedor para crear la reunión (con título/fecha/duración de la clase o serie).
  2. Si **ambos** están activos → se muestra un **selector** (modal o inline): “Crear con Zoom” / “Crear con Google Meet”. Tras elegir, se crea la reunión con ese proveedor.
  3. Se guarda la **join URL** en `meetingUrl` y se muestra en la UI como **texto copiable** (y en detalle de clase/serie en el horario).
- **Serie:** al guardar una serie con “Clase online” y proveedor elegido, se crea **una reunión** (Zoom recurrente o evento único reutilizable; Meet un evento con la primera fecha o recurrencia según API). Esa **misma URL** se asigna a la serie y se copia a todas las instancias generadas (comportamiento actual de `meetingUrl` en serie → instancias).
- **Clase única (no serie):** una reunión por clase, misma lógica de creación y guardado de `meetingUrl`.

---

## 5. Fallback ante error al crear la reunión

- Si la llamada a Zoom/Meet **falla** (token expirado, refresh fallido, rate limit, red):
  - Mostrar **mensaje de error** claro (ej. “No se pudo crear la reunión. Revisá la conexión o reconectá Zoom/Meet en Plugins.”).
  - Dejar **visible el campo “URL de reunión (manual)”** para que peguen un link creado por su cuenta.
  - Botón **“Reintentar”** que vuelve a intentar crear la reunión con el proveedor ya elegido (sin volver a preguntar Zoom vs Meet si ya se eligió).
- Si luego **reconectan** el plugin, el flujo normal vuelve a estar disponible; el campo manual sigue disponible siempre como respaldo.

---

## 6. Desmarcar “Clase online”

- Al desmarcar: se pone `meetingUrl = null` (y `isOnline = false`) en la clase o serie.
- **No** se llama a Zoom/Meet para cancelar o borrar la reunión (la reunión puede seguir existiendo en su cuenta; solo dejamos de usarla en la app).

---

## 7. APIs a usar (resumen)

- **Zoom:** OAuth 2.0; crear reunión con `POST /users/me/meetings` (topic, start_time, duration, timezone). Respuesta: `join_url`. Para serie: se puede crear una reunión “recurring” o una única y reutilizar el mismo `join_url` para todas las instancias (opción A acordada).
- **Google Meet:** OAuth con scope Calendar; crear evento con `events.insert` y `conferenceData.createRequest` (`conferenceSolutionKey.type: 'hangoutsMeet'`), parámetro de query `conferenceDataVersion=1`. Del response se toma `hangoutLink` y se guarda en `meetingUrl`. Recurrencia: un evento recurrente en Calendar da un solo link para todas las ocurrencias.

---

## 8. Documentación self-service (por centro)

- **Conexión por centro (opción A):** Cada centro conecta su propia cuenta Zoom y/o Google desde Panel → Plugins. Las credenciales OAuth de la *aplicación* (Client ID / Secret) pueden estar en ENV de la plataforma o, en instalaciones self-hosted, configuradas por el centro.
- **Documentación para el cliente (centro):** Incluir en cada página de plugin (Zoom y Meet) una sección tipo “Cómo obtener tus credenciales” con:
  - **Zoom:** Enlace a Zoom Marketplace / App Marketplace, pasos para crear una app tipo “OAuth” (Server-to-Server o OAuth según lo que usemos), dónde copiar Client ID y Client Secret, y qué Redirect URL configurar (ej. `https://tudominio.com/api/admin/zoom/oauth/callback`). Texto breve en español.
  - **Google Meet:** Enlace a Google Cloud Console, pasos para crear proyecto (o usar uno existente), activar Calendar API, crear credenciales OAuth 2.0 (tipo “Aplicación web”), añadir URI de redirección, y dónde copiar Client ID y Client Secret. Scopes necesarios: `https://www.googleapis.com/auth/calendar`. Texto breve en español.
- Opcional: página o doc central “Configurar videollamadas” que enlace a ambas guías (Zoom y Meet) para que el centro elija según el proveedor que use.
- Objetivo: que un centro pueda hacer **self-service** sin depender del soporte para saber dónde y cómo obtener los valores necesarios (ya sea para dárselos al administrador de la plataforma o para configurarlos en su propio ENV si aplica).

---

## 9. Resumen de decisiones

| Tema | Decisión |
|------|----------|
| Momento de crear el link | Al marcar “Clase online” y guardar (o al elegir proveedor si hay dos). |
| Zoom y Meet ambos activos | Preguntar cuál usar antes de crear la reunión. |
| Una URL por serie | Sí (opción A). Misma URL para todas las instancias. |
| Error al crear | Mostrar error + campo manual + “Reintentar”. |
| Desmarcar online | Solo borrar URL en BD; no cancelar en Zoom/Meet. |
| Configuración | OAuth por centro; credenciales app en ENV. |

---

## Próximo paso

Plan de implementación: `docs/plans/2026-03-15-zoom-meet-plugins-plan.md`.
