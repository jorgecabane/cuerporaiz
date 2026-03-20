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
| Planes (admin) | Hecho | CRUD, tipos, vigencia; testeado y aprobado |
| Clientes (admin) | Hecho | Ficha única, crear/editar, planes, pagos, clases históricas/futuras |
| Políticas del centro | Hecho | UI + enforcement en reservas (book, cancel, trial, no-show) |
| Plugins | Parcial | MercadoPago OAuth Connect, transferencia bancaria; faltan Zoom, Meet, Vimeo API |
| Pagos | Hecho | MP webhook, checkout, conciliación manual, transferencia bancaria, pago manual, UserPlan activación |
| Reservas (alumna) | Hecho | Flujo completo con validación de políticas y selección de plan |
| Horarios (admin) | Hecho | Calendario semana, series, edición recurrencia, disciplinas, feriados, asistencia |
| Profesores | Hecho | CRUD + email bienvenida |
| Clases On-demand | No | Videoteca futura |
| Comunicaciones | Parcial | Email confirmación reserva y bienvenida profesora activos; recordatorio y cupo liberado con template listos |
| Reportes | No | Ingresos, ocupación, etc. |
| Blog | No | Editor y publicación |
| Checkout / tienda pública | Parcial | Packs, membresía, gracias; flujo MP validado con OAuth Connect |
| Videoteca (acceso alumna) | No | Contenido por compra/membresía |
| Infra / emails | Hecho | Resend configurado e integrado en reservas y onboarding staff |

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

- [x] **2.1 Horarios (calendario)**  
  - Calendario vista semana con clases Live.  
  - Alta de clase (fecha, hora, cupos, profesora, disciplina, recurrencia opcional).  
  - Series con edición recurrencia: "solo este" / "desde aquí" / "toda la serie".  
  - Feriados: CRUD, omitir generación de instancias en feriados.  
  - Vistas día/semana/mes/lista, filtros por disciplina y profesora.  
  - Asistencia: UI profesora con lista de alumnas, botones ATTENDED/NO_SHOW.  
  - Campo meetingUrl para clases online (Zoom/Meet manual).  
  - *Pendientes menores:* ClassPass, mover clase a otra fecha, vista por profesora.

- [x] **2.2 Políticas del centro (completar)**  
  - UI y formulario completos (ruta `/panel/configuracion`).  
  - `bookBeforeHours` validado al reservar.  
  - `cancelBeforeHours` validado al cancelar (tardía = consume clase).  
  - `maxNoShowsPerMonth` contado y validado.  
  - `allowTrialClassPerPerson` chequeado en reserva.  
  - Preferencias calendario (hora inicio/fin, duración por defecto).  
  - *Pendiente:* `instructorCanReserveForStudent` (UI profesora), trigger `notifyWhenSlotFreed`.

- [x] **2.3 Profesores**  
  - Listado, alta, edición, desactivación.  
  - Usado en Horarios (asignar profesora a clase).  
  - Email de bienvenida al crear profesora (con link para crear cuenta).

- [x] **2.4 Clientes (completar)**  
  - Listado filtrado solo alumnas (excluye admin e instructor).  
  - Crear alumna desde panel (`/panel/clientes/nueva`).  
  - Ficha única del cliente con: editar datos, planes activos (asignar manual), pagos (registrar pago manual), clases futuras e historial.  
  - *Pendiente:* búsqueda/filtros en listado, campos teléfono/RUT/observación.

- [x] **2.5 Pagos (completar)**  
  - Webhook MercadoPago validado e idempotente.  
  - Conciliación manual (aprobar orden → activa UserPlan).  
  - Transferencia bancaria: toggle on/off como plugin, datos bancarios con selector de bancos y tipos de cuenta chilenos.  
  - Pago manual desde ficha cliente (crea Order APPROVED + UserPlan).  
  - Order APPROVED activa UserPlan automáticamente.  
  - *Pendiente:* reembolsos/anulaciones, congelamiento de plan.

---

## Fase 3 — Experiencia alumna y contenido

- [x] **3.1 Reservas (estable)**  
  - Flujo completo: ver clases → reservar (con validación de políticas y plan) → confirmación.  
  - Selección de plan cuando hay múltiples activos.  
  - Cancelación dentro de ventana (tardía consume clase).  
  - Email confirmación reserva con link Google Calendar.  
  - Modelo UserPlan: múltiples planes activos, classesUsed/classesTotal, validFrom/validUntil.

- [ ] **3.2 Checkout y planes públicos**  
  - Flujo compra plan (one-time y/o recurrente) con MercadoPago.  
  - Página /planes (o /packs) clara; redirección a gracias y actualización de estado.  
  - MercadoPago OAuth Connect implementado (centros se autoconfiguran).

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
  - [x] Confirmación de reserva (+ link añadir a Google Calendar) — **conectado en flujo de reserva**.  
  - [x] Email bienvenida profesora/admin — **conectado al crear profesora**. 
  - [ ] Email bienvenida cliente — se debe enviar al agregar un cliente a mano.
  - [ ] Recordatorio antes de la clase — template listo, falta cron/trigger.  
  - [ ] Aviso "cupo liberado" — template listo, falta trigger al cancelar.  
  - [ ] Aviso pago fallido (centro y alumno) — template listo, falta trigger. 
  - [ ] Confirmación de pago plan
  - *Base:* Resend configurado; `sendEmailSafe` wrapper fire-and-forget.

- [ ] **4.2 Reportes (v1)**  
  - Ingresos por período (por método, por tipo plan).  
  - Ocupación por clase/franja.  
  - Reservas por plan; clientes activos vs churn (si hay datos).

---

## Fase 5 — Plugins, blog y super admin

- [ ] **5.1 Plugins restantes**  
  - [x] MercadoPago OAuth Connect — centros se autoconfiguran, refresh automático de tokens.  
  - [x] Transferencia bancaria — toggle, datos bancarios con selector de bancos/tipo cuenta chilenos.  
  - [x] Zoom / Meet — campo meetingUrl en clases (link manual). Falta integración API automática.  
  - [ ] ClassPass: recibir reservas (schema listo, UI oculta).  
  - [ ] Google Auth: login con Google (opcional).  
  - [ ] Vimeo: links privados para videoteca (futuro).  
  - Página plugins rediseñada como marketplace con cards.

- [ ] **5.2 Blog editorial**  
  - Editor en panel (rich text o markdown).  
  - Publicación y listado público; diseño coherente con la marca.

- [ ] **5.3 Super admin (plataforma)**  
  - Rol super admin: crear centros, asignar admins, "entrar como" centro.  
  - Onboarding centro: estados Pendiente / Activo / En gracia / Suspendido.  
  - Cobro de plataforma a centros (B2B con MercadoPago, por ahora manual).

---

## Requisitos no funcionales (recordatorio)

- **Skeletons / spinners / empty states** en cargas y acciones.  
- **Design system** consistente (tokens), mínimo layout shift.  
- **Tests:** unitarios lógica negocio; E2E en compra, reserva/cancelación, pago, conciliación.  
- **Coverage** mínimo 90% en CI; pre-commit lint/typecheck/test/build.  
- **Seguridad:** tenant isolation, RBAC, webhooks validados e idempotentes.

---

## Mejoras Planes (pendientes)

- **Orden de planes** — Campo de orden para mostrar los planes al cliente en el orden que defina el admin (p. ej. `sortOrder` o `displayOrder`).
- **Borrar vs desactivar** — Si un plan tiene usuarios asignados, no permitir borrarlo y mostrar un mensaje claro. Ofrecer **desactivar** plan (nadie más puede comprarlo; quienes ya lo tienen siguen usándolo). Poder desactivar/activar planes siempre.

---

## Qué se viene (próximas prioridades)

1. **Emails restantes** — Conectar triggers de recordatorio (cron), cupo liberado (al cancelar), y pago fallido (webhook).
2. **UX mobile horarios** — Brainstorming + implementación vista mobile del calendario admin.
3. **Búsqueda de clientes** — Filtro por nombre/email en listado de alumnas.
4. **Checkout público validado** — Verificar flujo end-to-end compra → MP → webhook → UserPlan.
5. **Reportes v1** — Dashboard básico de ingresos y ocupación.
6. **Videoteca / On-demand** — Modelo, plugin Vimeo, desbloqueo por plan.
7. **Blog** — Editor y publicación.
8. **Super admin** — Multi-centro, onboarding, cobro B2B.

---

## Cómo usar este plan

1. Marcar con `[x]` cada ítem al completarlo.  
2. Añadir notas bajo cada ítem si hay bloqueos o decisiones.  
3. Cruzar con **cruce_plan_notion.plan.md** para detalles de implementación.
