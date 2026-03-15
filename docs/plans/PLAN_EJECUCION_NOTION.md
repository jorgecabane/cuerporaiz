# Plan de ejecución — Alcance Notion (Cotización + Updates)

**Fuente:** Cotización CuerpoRaíz, Updates de producto (Notion).  
**Objetivo:** Marcar lo hecho y ordenar lo pendiente para cerrar el sistema según lo pactado.

---

## Estado actual (resumen)

| Área | Estado | Notas |
|------|--------|--------|
| Sitio / landing | Hecho | Identidad, mobile-first, secciones |
| Auth (login, signup) | Hecho | Credentials, centro, sesión |
| Panel shell + Mi cuenta | Hecho | Header, sidebar, drawer, UX mejorada |
| Planes (admin) | Hecho | CRUD, tipos, vigencia; **testeado y aprobado** |
| Clientes (admin) | Parcial | Listado + detalle; falta alta masiva/gestión planes |
| Políticas del centro | Parcial | Página y form; falta validación completa y uso en reservas |
| Plugins | Parcial | Página; MercadoPago toggle; faltan Zoom, Meet, Vimeo, etc. |
| Pagos | Parcial | Listado, filtro estado, conciliación manual (aprobar orden) |
| Reservas (alumna) | Parcial | Página con clases y reservas; flujo reservar/cancelar por validar |
| Horarios (admin) | No | Calendario tipo Google, series, edición recurrencia |
| Profesores | No | ABM profesoras del centro |
| Clases On-demand | No | Prácticas, sesiones, Vimeo, desbloqueo por plan |
| Comunicaciones | No | Emails: confirmación reserva, recordatorio, cupo liberado |
| Reportes | No | Ingresos, ocupación, etc. |
| Blog | No | Editor y publicación |
| Checkout / tienda pública | Parcial | Packs, membresía, gracias; flujo MP por validar |
| Videoteca (acceso alumna) | No | Contenido por compra/membresía |
| Infra / emails | Parcial | Resend configurado; falta integrar en flujos |

---

## Fase 1 — Estabilizar y validar lo existente

*Objetivo: que lo ya construido esté estable, con tests y sin deuda obvia.*

- [x] **1.1 E2E flujos críticos**  
  - Login → panel → Mi cuenta → Cerrar sesión (hecho).  
  - Login admin → Planes → Crear / Editar / Eliminar plan (E2E completo en `e2e/panel-planes.spec.ts`).  
  - (Opcional) Reservas: listar clases, reservar, cancelar (si API estable).  
  - (Opcional) Checkout: compra plan hasta gracias (si flujo MP estable).

- [x] **1.2 Skeletons / empty states**  
  - Reservas: skeleton mientras cargan clases y reservas.  
  - Clientes, Pagos, Planes: empty state claro cuando no hay datos.

- [x] **1.3 Migrar colores panel a design tokens**  
  - Tokens en `globals.css`: `--color-success`, `--color-success-hover`, `--color-error`, `--color-error-bg`, `--color-error-text`.  
  - Sustituido en ApproveOrderForm, DeletePlanForm, PlanFormCreate, PlanFormEdit, PoliticasForm, reservas.

---

## Fase 2 — Módulos panel prioritarios (Updates)

*Orden sugerido según dependencias y valor.*

- [ ] **2.1 Horarios (calendario)**  
  - **Design:** [2026-03-14-horarios-disciplinas-design.md](./2026-03-14-horarios-disciplinas-design.md)  
  - **Plan de ejecución (tareas):** [2026-03-14-horarios-plan-ejecucion.md](./2026-03-14-horarios-plan-ejecucion.md)  
  - Flujo mínimo (C): Disciplinas, calendario semana, clase suelta, recurrencia básica.  
  - Flujo total: edición serie (solo esta / desde aquí / toda), feriados, vistas día/mes/lista, filtros.  
  - Calendario vista semana/mes para clases Live.  
  - Alta de clase (fecha, hora, cupos, profesora, recurrencia opcional).  
  - Edición recurrencia: “solo este” / “desde aquí en adelante”.  
  - *Depende:* modelo Serie/Clase Live en DB si no existe.

- [ ] **2.2 Políticas del centro (completar)**  
  - Ventana reservar / cancelar (horas), no-show, clase de prueba, etc.  
  - Que las políticas se usen en el flujo de reserva (validación al reservar/cancelar).

- [ ] **2.3 Profesores**  
  - Listado, alta, edición, baja de profesoras del centro.  
  - Usar en Horarios (asignar profesora a clase) y en reservas si aplica.

- [ ] **2.4 Clientes (completar)**  
  - Alta de cliente (nombre, email, teléfono, RUT, etc.).  
  - Gestión manual de planes: asignar plan a persona, activar/desactivar.

- [ ] **2.5 Pagos (completar)**  
  - Flujo MercadoPago ya existe; validar webhook y estados.  
  - Transferencias: datos bancarios del centro en UI, conciliación manual (ya hay “Aprobar”).  
  - Reembolsos/anulaciones: solo meses futuros en recurrentes (v1).

---

## Fase 3 — Experiencia alumna y contenido

- [ ] **3.1 Reservas (estable)**  
  - Flujo completo: ver clases → reservar (con políticas) → confirmación.  
  - Cancelación dentro de ventana.  
  - Email confirmación reserva (Fase 4 Comunicaciones).

- [ ] **3.2 Checkout y planes públicos**  
  - Flujo compra plan (one-time y/o recurrente) con MercadoPago.  
  - Página /planes (o /packs) clara; redirección a gracias y actualización de estado.

- [ ] **3.3 Clases On-demand (videoteca)**  
  - Modelo: Prácticas (categorías) → Sesiones (vídeo Vimeo).  
  - Plan con N clases a desbloquear; alumna elige sesiones hasta N.  
  - Plugin Vimeo para links privados.  
  - *Depende:* planes tipo On-demand y permisos por plan.

- [ ] **3.4 Membresía recurrente**  
  - Cobro automático (MercadoPago suscripción o similar).  
  - Acceso ilimitado a On-demand mientras esté activa; baja/reingreso.

---

## Fase 4 — Comunicaciones y reportes

- [ ] **4.1 Emails transaccionales**  
  - Confirmación de reserva (+ link añadir a calendario).  
  - Recordatorio antes de la clase.  
  - Aviso “cupo liberado”.  
  - Aviso pago fallido (centro y alumno).  
  - *Base:* Resend ya en proyecto; integrar en acciones de reserva/pago.

- [ ] **4.2 Reportes (v1)**  
  - Ingresos por período (por método, por tipo plan).  
  - Ocupación por clase/franja.  
  - Reservas por plan; clientes activos vs churn (si hay datos).

---

## Fase 5 — Plugins, blog y super admin

- [ ] **5.1 Plugins restantes**  
  - Zoom / Meet: generar link de clase Live (videollamada).  
  - ClassPass: recibir reservas (si aplica).  
  - Google Auth: login con Google (opcional).

- [ ] **5.2 Blog editorial**  
  - Editor en panel (rich text o markdown).  
  - Publicación y listado público; diseño coherente con la marca.

- [ ] **5.3 Super admin (plataforma)**  
  - Rol super admin: crear centros, asignar admins, “entrar como” centro.  
  - Onboarding centro: estados Pendiente / Activo / En gracia / Suspendido (v2 cobro interno o manual).

---

## Requisitos no funcionales (recordatorio)

- **Skeletons / spinners / empty states** en cargas y acciones.  
- **Design system** consistente (tokens), mínimo layout shift.  
- **Tests:** unitarios lógica negocio; E2E en compra, reserva/cancelación, pago, conciliación.  
- **Coverage** mínimo 90% en CI; pre-commit lint/typecheck/test/build.  
- **Seguridad:** tenant isolation, RBAC, webhooks validados e idempotentes.

---

## Cómo usar este plan

1. **Siguiente paso sugerido:** Fase 1 (estabilizar y validar).  
2. Marcar con `[x]` cada ítem al completarlo.  
3. Añadir notas bajo cada ítem si hay bloqueos o decisiones (ej. “pendiente definición API Vimeo”).  
4. Cruzar con **PLAN_MAESTRO.md** para no duplicar ítems de code review/UX ya cerrados.
