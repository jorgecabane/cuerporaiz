# Plan de ejecución: Horarios + Disciplinas + Profesoras

**Design doc:** [2026-03-14-horarios-disciplinas-design.md](./2026-03-14-horarios-disciplinas-design.md)  
**Objetivo:** Flujo mínimo (C) primero; luego flujo total.

---

## Estado general

| Área | Diseño / criterios | Implementación |
|------|--------------------|----------------|
| Disciplinas | ✅ Definido | ✅ Hecho |
| Profesoras (CRUD) | ✅ Definido | ✅ Hecho |
| Calendario vista semana | ✅ Definido | ✅ Hecho |
| Crear clase suelta | ✅ Definido | ✅ Hecho |
| Recurrencia básica + personalizada | ✅ Definido | ✅ Hecho |
| Color de clase (hereda disciplina + override) | ✅ Definido | ✅ Hecho |
| Select de profesora en form | ✅ Definido | ✅ Hecho |
| Clase de prueba + cupos de prueba | ✅ Definido | ✅ Hecho |
| Validación no-past-dates | ✅ Definido | ✅ Hecho |
| Toggle online (deshabilitado sin plugin) | ✅ Definido | ✅ Hecho |
| Click en slot para crear clase | ✅ Definido | ✅ Hecho |
| Settings horas calendario (Center) | ✅ Definido | ✅ Hecho |
| ClassPass campos en schema | ✅ Definido | ✅ Schema listo, oculto en UI |
| Edición serie (solo esta / desde aquí / toda) | ✅ Definido | ⬜ Pendiente |
| Feriados | ✅ Definido | ⬜ Pendiente |
| Vistas día / mes / lista | ✅ Definido | ⬜ Pendiente |
| Filtros (disciplina, profesor, físico/online) | ✅ Definido | ⬜ Pendiente |

---

## Fase 1 — Flujo mínimo (COMPLETADA)

### 1.1 Modelo y backend

- [x] Disciplina (modelo y CRUD backend)
- [x] LiveClass: campos nuevos (disciplineId, instructorId, isOnline, isTrialClass, trialCapacity, color, classPassEnabled, classPassCapacity, seriesId, status)
- [x] Serie (modelo y generación)
- [x] API y Server Actions

### 1.2 Panel: Disciplinas

- [x] Ruta y navegación
- [x] CRUD UI Disciplinas (listado, crear, editar, desactivar)

### 1.3 Panel: Calendario y clases

- [x] Ruta Horarios + vista calendario semana
- [x] HOURS dinámico desde Center (calendarStartHour / calendarEndHour)
- [x] Header sticky con z-index (no se tapa con eventos)
- [x] Click en slot para crear clase pre-llenada con fecha/hora
- [x] Crear clase suelta (todos los campos)
- [x] Recurrencia personalizada (dialog estilo Google Calendar)
- [x] Validación no agendar clases en el pasado (form + server)
- [x] Color de clase (hereda de disciplina, override por clase)
- [x] Clase de prueba muestra campo cupos de prueba
- [x] Toggle "Clase online" deshabilitado (hasta plugin Zoom/Meet)
- [x] Select de profesora en form (desde CRUD profesoras)

### 1.4 Panel: Profesoras (CRUD)

- [x] Port: IInstructorRepository (findByCenterId, create, update, deactivate)
- [x] Adapter: instructor-repository.ts (User + UserCenterRole INSTRUCTOR)
- [x] Server Actions (createInstructor, updateInstructor, deactivateInstructor)
- [x] UI: /panel/profesoras (listado, crear, editar, desactivar)
- [x] Navegación: "Profesoras" en admin items

### 1.5 Configuración del centro

- [x] Renombrar "Políticas del centro" → "Configuración del centro" en nav
- [x] Subsección "Preferencias del calendario" (calendarStartHour, calendarEndHour)
- [x] Campos en schema Center + dominio + port + adapter
- [x] Validación en server action

### 1.6 Integración y validación

- [x] **E2E + pruebas visuales (browser)**
  - 17 tests Playwright (panel-horarios.spec.ts): calendario, navegación, nueva clase, color picker, recurrencia, duración default, profesoras, disciplinas, configuración.
  - Verificación visual en browser de todos los cambios UX (horas pasadas en gris, dropdown repetición, color picker nativo, duración configurable).

---

## Fase 2 — Flujo total

*Edición de series, feriados, más vistas y filtros.*

### 2.1 Feriados

- [x] Modelo Feriado (CenterHoliday — dominio, puerto, adaptador DB)
- [x] Reglas al agregar feriado (clases sin reservas → cancelar; con reservas → bloquear)
- [x] UI Lista de feriados (/panel/feriados con CRUD)
- [x] Integración con calendario (días feriados bloqueados, no clickeables, fondo rojo)
- [ ] Mover clase (una instancia) — pendiente para iteración futura

### 2.2 Edición de series

- [x] Editar clase individual (página /panel/horarios/[id], formulario, server actions update/cancel)
- [x] Editar clase de serie (selector alcance: solo esta / esta y siguientes / toda la serie)
- [x] Cancelar clase con confirmación y aviso de reservas

### 2.3 Vistas y filtros

- [x] CalendarShell: componente orquestador de vistas y filtros
- [x] Vista día
- [x] Vista mes
- [x] Vista lista (próximos 30 días, agrupado por fecha)
- [x] Filtros (disciplina, profesor, físicas/online)

### 2.4 ClassPass (cuando exista plugin)

- [ ] Habilitar classPassEnabled + classPassCapacity en form de crear clase
- [ ] Toggle visible solo si plugin ClassPass activo

### 2.5 Profesoras: features avanzadas

- [ ] Vista de clases impartidas por profesora
- [ ] Historial de reemplazos
- [ ] Métricas de alumnos por profesora

### 2.6 Ajustes y calidad

- [x] Skeletons y empty states (CalendarSkeleton, ListSkeleton)
- [x] E2E flujo total (28 tests pasando)
- [ ] Documentación

---

## Resumen de tareas por fase

| Fase | Tareas | Hecho | Pendiente |
|------|--------|-------|-----------|
| **1 — Flujo mínimo** | 1.1–1.6 | ✅ Completa | 0 |
| **2 — Flujo total** | 2.1–2.6 | ✅ Mayormente completa | 5 ítems (ClassPass, profesoras avanzadas, mover clase, docs) |
