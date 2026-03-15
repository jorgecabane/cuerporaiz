# Plan maestro — Cuerporaiz

**Última actualización:** 2026-03-13  
**Objetivo:** Un solo documento en el repo para retomar sin re-explicar. Marcar con `[x]` lo listo y actualizar "Paso actual".

---

## Paso actual

**Donde estamos:** Mejoras UI amplias (C.8–C.11) aplicadas en Mi cuenta; plan de ejecución Notion creado en `docs/plans/PLAN_EJECUCION_NOTION.md`.  
**Siguiente acción:** Seguir **Fase 1** del plan de ejecución (E2E flujos críticos, skeletons/empty states, colores a tokens) o **Fase 2** (Horarios, Políticas, Profesores, etc.).

---

## Documentación de referencia (Notion)

- **Cotización CuerpoRaíz:** [Notion](https://www.notion.so/Cotizaci-n-CuerpoRa-z-31bbec2684938091a154c1f5e98a73e6) — Alcance: sitio, reservas, videoteca, membresía, tienda, blog, portal alumna, portal admin, infra.
- **Updates de producto:** [Notion](https://www.notion.so/Updates-de-producto-31ebec26849380b0945fce3b5b6c7b7e) — Visión SaaS multi-centro, conceptos, requisitos no funcionales, roles, módulos del panel, experiencia alumna, estados, wireframes.
- **Tareas subagentes:** [Notion DB](https://www.notion.so/69f526aa743b4ac7b3883f8d7617f37a?v=13ad480d29774de18bdaab2986aa394a) — Base de tareas (Estado, Rama, Responsable, etc.). Opcional: mantener este plan en repo como fuente de verdad y usar Notion como espejo o solo para tareas externas.

---

## Parte A — Mejoras del code review (panel)

*Orden: hacer estas antes de avanzar con nuevas features. Marcar `[x]` al terminar.*

### A.1 Server Action y formularios

- [x] **Sign out desde Client Component:** Mover `"use server"` a archivo separado (`app/panel/actions.ts`), form `action={signOutAction}`. *Hecho 2026-03-13.*
- [x] **ApproveOrderForm (pagos):** Server Action con FormData (`orderId`), confirm en cliente con `onSubmit` + `requestSubmit`. *Hecho 2026-03-13.*

### A.2 Navegación y DRY

- [x] **Un solo lugar para cerrar sesión:** Solo PanelShell tiene "Cerrar sesión"; página Mi cuenta no.
- [x] **Enlaces del panel:** `lib/panel-nav.ts` exporta `PANEL_NAV_ITEMS` y `PANEL_ADMIN_ITEMS`; PanelShell y página Mi cuenta los importan. *Hecho 2026-03-13.*

### A.3 Accesibilidad

- [x] **Focus trap en drawer móvil (PanelShell):** Al abrir, foco al primer elemento; al cerrar, devolver foco al botón "Abrir menú". *Hecho en rediseño 2026-03-13.*

### A.4 Robustez

- [x] **signOutAction:** `try/catch` y en error `redirect("/panel")`. *Hecho 2026-03-13.*

### A.5 Tests

- [x] **E2E panel Mi cuenta:** `e2e/panel-mi-cuenta.spec.ts`: login, heading "Mi cuenta", link "Clases y reservas", botón "Cerrar sesión", y al hacer click redirige a home. *Hecho 2026-03-13.*

---

## Parte B — Plan de producto (desde Notion)

*Resumen para no depender de Notion en cada sesión. Detalle completo en los enlaces de arriba.*

### Visión

- SaaS **multi-centro**. Centro = tenant (estudio). Usuarios con roles: Administradora, Profesora, Alumna.
- Panel de administración por centro: horarios, planes, clientes, pagos, plugins, políticas, comunicaciones, reportes.

### Módulos panel (prioridad según cotización y Updates)

1. Horarios (calendario tipo Google, series, edición “solo este / desde aquí”).
2. Políticas del centro (ventanas reserva/cancelación, no-show, clase de prueba, etc.).
3. Planes (por días, por período, Live / On-demand / Membresía).
4. Clientes (listado, alta, gestión manual de planes).
5. Pagos (MercadoPago, transferencias, conciliación manual).
6. Profesores, Plugins, Clases On-demand, Comunicaciones, Reportes.

### Requisitos no funcionales (Updates)

- Skeletons/spinners/empty states en cargas y acciones.
- Design system consistente, mínimo layout shift.
- Tests unitarios + E2E flujos críticos (compra, reserva/cancelación, pago, conciliación).
- Coverage mínimo 90%, pre-commit con lint/typecheck/test/build.
- Seguridad: tenant isolation, sesiones seguras, RBAC, webhooks idempotentes y validados.

### Tareas / avances

- Para tareas granulares y estado “En progreso / Hecho”, se puede seguir usando la base **Tareas subagentes** en Notion o replicar ítems aquí en **Parte A/C** con checkboxes.
- **Plan de ejecución Notion:** `docs/plans/PLAN_EJECUCION_NOTION.md` (fases 1–5).
- Al cerrar sesión y reabrir Cursor: leer este doc y la sección **Paso actual** para retomar.

---

## Parte C — Mejoras UX página “Mi cuenta”

*Revisión post code review + feedback “le falta mucho a Mi cuenta para ser una página con buen UI”.*

### Estado actual (vista de usuario)

- Una sola tarjeta con: Email, Nombre, Rol, Centro (hoy se muestra **centerId** crudo).
- Párrafo: “Usa el menú para ir a…”
- Sin CTAs destacados, sin resumen de “qué puedo hacer ahora”, sin nombre del centro legible.

### Mejoras priorizadas (orden sugerido)

- [x] **C.1 Mostrar nombre del centro**  
  Resolver centro en layout + página; mostrar nombre en tarjeta y en header/user menu. *Hecho en rediseño 2026-03-13.*

- [x] **C.2 Accesibilidad drawer**  
  Focus trap implementado en PanelShell (A.3).

- [x] **C.3 CTAs rápidos**  
  Tarjetas “Acciones rápidas”: Clases y reservas, Planes y comprar; si admin, Administración · Planes. *Hecho en rediseño 2026-03-13.*

- [x] **C.4 Feedback “Cerrar sesión”**  
  `useFormStatus()` en componente `SignOutButton`: “Cerrando sesión…” y disabled. *Hecho en PanelShell 2026-03-13.*

- [x] **C.5 Títulos de página**  
  `metadata` en `app/panel/page.tsx`: “Mi cuenta | Cuerpo Raíz”. Resto de rutas panel: añadir cuando se trabaje cada una.

- [x] **C.6 Nombre vacío**  
  En Mi cuenta se muestra “No configurado”. *Hecho 2026-03-13.*

- [x] **C.7 Ítem activo “Planes y comprar”**  
  En PanelShell, `isActive` para `href="/planes"` solo true cuando `pathname === "/planes"`. *Hecho 2026-03-13.*

### Mejoras de UI más amplias (para que “Mi cuenta” se sienta una página con buen UI)

- [x] **C.8 Jerarquía visual**  
  Diferenciar mejor bloque “Tu perfil” del bloque “Acciones” (CTAs). Usar espaciado, subtítulos o cards separadas.

- [x] **C.9 Resumen útil**  
  Card "Tu resumen" con placeholder: "Cuando tengas clases reservadas o un plan activo, aquí verás tu próxima clase y cupos restantes." *Hecho 2026-03-13.*

- [x] **C.10 Consistencia con el resto del sitio**  
  Revisar que tipografía (font-display, font-sans), colores y radios del panel coincidan con la landing (design system). Evitar sensación de “otra app”.

- [x] **C.11 Mobile**  
  `min-h-[3.5rem]` y `py-5` en cards de acciones para touch targets; `px-1 sm:px-0` en contenedor. *Hecho 2026-03-13.*

---

## Log de feedback (no volver a tropezar)

*Anotar aquí todo feedback recibido (code review, usuario, UX) para no repetir errores en otras sesiones.*

| Fecha     | Origen        | Feedback |
|----------|----------------|----------|
| 2026-03-13 | Code review   | No definir Server Actions inline en Client Components; exportar desde archivo con `"use server"` al inicio. |
| 2026-03-13 | Code review   | ApproveOrderForm: preferir `action={serverAction}` + FormData para orderId en lugar de lógica toda en cliente. |
| 2026-03-13 | Code review   | Un solo lugar para “Cerrar sesión” (PanelShell); no duplicar en página Mi cuenta. |
| 2026-03-13 | Code review   | Navegación del panel en una sola fuente (constante compartida) para DRY. |
| 2026-03-13 | Code review   | Drawer móvil: implementar focus trap y devolución de foco al abrir/cerrar. |
| 2026-03-13 | Code review   | signOutAction: opcional try/catch para errores. |
| 2026-03-13 | Usuario      | “Mi cuenta le falta muchísimo para ser una página con buen UI” — priorizar C.8–C.11 y CTAs. |
| 2026-03-13 | Plan UX      | Mostrar nombre del centro, no centerId crudo. |
| 2026-03-13 | Plan UX      | Estados vacíos claros; skeletons/spinners en cargas (alineado con requisitos no funcionales Notion). |
| 2026-03-13 | Usuario      | Rehacer panel Mi cuenta de 0; base bonita, header con volver al home, experiencia espectacular; preservar solo Planes (resto no testeado). Aplicar skill ui-ux-pro-max. |

---

## Cómo usar este doc

1. **Al empezar sesión:** Leer “Paso actual” y la parte (A, B o C) en la que se esté trabajando.
2. **Al terminar un ítem:** Marcar con `[x]` y actualizar “Paso actual” si cambia el siguiente paso.
3. **Nuevo feedback:** Añadir una fila al “Log de feedback” con fecha, origen y resumen.
4. **Notion:** Usar como referencia; este archivo es la fuente de verdad en el repo para estado y pasos siguientes.
