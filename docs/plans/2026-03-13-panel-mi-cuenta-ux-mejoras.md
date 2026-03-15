# Plan de mejoras UX — Página Mi cuenta (panel)

**Fecha:** 2026-03-13  
**Alcance:** `/panel` (Mi cuenta) y shell del panel (navegación, drawer).

> **Nota:** El plan vivo con pasos marcables, code review y log de feedback está en **[docs/plans/PLAN_MAESTRO.md](./PLAN_MAESTRO.md)**. Usar ese doc para retomar sesiones; este archivo queda como detalle histórico del primer plan UX.

---

## Estado actual

- **Mi cuenta:** Tarjeta con email, nombre, rol, centro (ID crudo). Texto de ayuda: “Usa el menú para…”
- **Shell:** Sidebar desktop, drawer móvil, ítems Mi cuenta / Clases y reservas / Planes, bloque Admin colapsable, Cerrar sesión e Ir al inicio.

---

## Mejoras priorizadas

### 1. Mostrar nombre del centro en lugar del ID (Alta)

- **Problema:** Se muestra `user.centerId` (UUID/identificador técnico). El usuario no identifica “su centro” por ID.
- **Solución:** En el layout o en la página del panel, resolver el centro con `centerRepository.findById(session.user.centerId)` y pasar el nombre (o slug) al contenido. En la tarjeta mostrar “Centro: **Cuerpo Raíz**” (o el nombre que corresponda). Si falla la carga, mostrar el ID como fallback.
- **Archivos:** `app/panel/page.tsx`, opcionalmente `app/panel/layout.tsx` si se quiere reutilizar el nombre en el shell.

### 2. Accesibilidad del drawer móvil (Alta)

- **Problema:** Al abrir el menú móvil no hay focus trap ni devolución de foco; al cerrar, el foco no vuelve al botón “Abrir menú”.
- **Solución:** Al abrir el drawer: mover foco al primer elemento interactivo (p. ej. botón Cerrar o primer enlace). Al cerrar: devolver foco al botón que abrió el menú. Opciones: implementar a mano con `useRef` + `useEffect` o usar una lib tipo `focus-trap-react`.
- **Archivo:** `components/panel/PanelShell.tsx`.

### 3. Acción rápida desde Mi cuenta (Media)

- **Problema:** La página es solo informativa; el usuario no tiene un CTA claro para la siguiente acción típica (reservar clase, ver planes).
- **Solución:** Añadir 1–2 botones o enlaces destacados debajo de la tarjeta, según rol, por ejemplo:
  - Alumna: “Ver clases y reservas” (enlace a `/panel/reservas`), “Ver planes” (enlace a `/planes`).
  - Admin: además “Ir a administración” o enlace a la primera sección admin (p. ej. Clientes).
- Mantener el texto actual “Usa el menú para…” como apoyo, o acortarlo si los CTAs son suficientes.

### 4. Feedback al cerrar sesión (Media)

- **Problema:** El botón “Cerrar sesión” no indica estado de carga; en redes lentas puede parecer que no pasa nada.
- **Solución:** Usar `useFormStatus()` en un componente hijo del formulario para mostrar “Cerrando sesión…” o deshabilitar el botón mientras se envía la action. La Server Action ya redirige a `/` al terminar.

### 5. Título de página y document title (Media)

- **Problema:** En subpáginas del panel (reservas, planes, etc.) el título del documento podría no reflejar la sección actual.
- **Solución:** En cada página del panel exportar `metadata` con `title` (p. ej. “Mi cuenta | Cuerpo Raíz”, “Clases y reservas | Cuerpo Raíz”). La página principal ya tiene contexto por el layout; asegurar que el layout raíz o el de panel no pisen el título de forma confusa.

### 6. Mensaje cuando el nombre está vacío (Baja)

- **Problema:** Se muestra “—” cuando `user.name` es null/undefined. Funcional pero frío.
- **Solución:** Mostrar un texto tipo “No configurado” o “Completa tu nombre en…” (si en el futuro hay edición de perfil) para que sea más claro que es un dato opcional pendiente.

### 7. Consistencia del ítem activo en el shell (Baja)

- **Problema:** “Mi cuenta” es la ruta `/panel`; el sidebar marca activo por `pathname === href` o `pathname.startsWith(href)`. Para `/panel` y `/panel/reservas` está correcto; revisar que subrutas como `/panel/planes/nuevo` no marquen “Planes” del menú principal si “Planes” apunta a `/planes` (sitio público).
- **Solución:** Revisar lógica de `isActive` en `PanelShell` para que “Planes y comprar” (href `/planes`) solo esté activo en exactamente `/planes`, no en `/panel/planes/*`.

---

## No hacer por ahora

- **Edición de perfil en Mi cuenta:** Fuera de alcance; cuando exista, se añadirá formulario y validación.
- **Cambio de centro:** Flujo multi-tenant más complejo; no asumir en este plan.

---

## Orden sugerido de implementación

1. Corregir error de Server Action (hecho: `signOutAction` en `app/panel/actions.ts`).
2. Mostrar nombre del centro en la tarjeta de Mi cuenta.
3. Focus trap y devolución de foco en el drawer (PanelShell).
4. CTAs rápidos en la página Mi cuenta.
5. Feedback de carga en “Cerrar sesión” (`useFormStatus`).
6. Metadata/título por página del panel y copy para nombre vacío.

---

## Referencias

- Code review panel: 2026-03-13 (subagent code-reviewer).
- Next.js: [use server](https://nextjs.org/docs/app/api-reference/directives/use-server#using-server-functions-in-a-client-component), [useFormStatus](https://react.dev/reference/react-dom/hooks/useFormStatus).
