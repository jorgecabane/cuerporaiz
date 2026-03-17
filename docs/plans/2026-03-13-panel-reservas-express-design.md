# Diseño: Panel reservas express por rol

**Fecha:** 2026-03-13  
**Contexto:** Plan "Vista express Clases y reservas por rol". Insumos de ui-ux-pro-max (Data-Dense Dashboard, tabs, CTA above fold) y DESIGN_GUIDELINES (tokens Cuerporaiz).

---

## Estructura de pestañas (alumno)

- **Pestaña 1 — Mis reservas (por defecto)**  
  Sub-pestañas o toggle: **Futuras** | **Pasadas**. Objetivo: ver rápido las próximas reservas sin scroll.
  - Futuras: lista corta (5–10 ítems), "Ver más" si hay más.
  - Pasadas: lista paginada o "Ver más".

- **Pestaña 2 — Calendario**  
  Vista por semana: lunes–domingo (o `center.calendarWeekStartDay`). Navegación "Semana anterior" / "Semana siguiente". Listado de clases de esa semana con fecha, hora, título, cupos, botón Reservar (o "Ya reservaste" / "Sin cupos").

## Móvil

- Tabs principales horizontales (Mis reservas | Calendario), scroll horizontal si hace falta. Dentro de "Mis reservas", Futuras por defecto.
- Evitar scroll largo antes de ver próximas reservas; listado semanal escaneable (fecha/hora destacados, CTA claro).

## Componentes compartidos

- **WeekNav:** anterior / siguiente + etiqueta "Semana 11–17 Mar".
- **ClassCard / LiveClassRow:** fecha, hora, título, cupos; variante alumno (Reservar / Ya reservada), variante staff (alumnos + asistencia).
- **ReservationsList:** reservas futuras o pasadas con estado y cancelar (alumno).
- **Tabs:** ARIA, teclado, tokens (borde, activo = primario).

## Roles en la misma ruta

- **Alumno:** pestañas Mis reservas + Calendario; reservar y cancelar.
- **Profe:** misma idea de semana; sus clases; lista de alumnos por clase; tomar asistencia (ATTENDED / NO_SHOW).
- **Admin:** igual que profe + "Reservar por alumno" (selector alumno, luego clase, luego plan si aplica).

## Flujo de reserva en UI

- **422 NO_ACTIVE_PLAN:** bloque/modal con mensaje "Para reservar necesitás un plan activo", CTA "Ver planes", y si aplica CTA "Reservar clase de prueba gratis".
- **422 PLAN_SELECTION_REQUIRED + plans:** selector de plan (modal o inline); al elegir, reenviar POST con `userPlanId` y mismo `liveClassId`.

## Clase de prueba

- Mostrar CTA "Podés reservar una clase de prueba gratis" cuando: nunca reservó en el centro + centro permite trial + hay clase futura trial con cupo.
- DTO de clases: incluir `isTrialClass` (y cupo trial si aplica) para badge en lista y lógica del CTA.

## Tokens y accesibilidad

- Usar variables existentes: `--color-primary`, `--color-border`, `--radius-lg`, etc. (DESIGN_GUIDELINES).
- Focus visible, cursor-pointer en clickables, hover con transición 150–300 ms.
- Responsive: 375px, 768px, 1024px.
