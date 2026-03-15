# Diseño: Módulo Horarios + Disciplinas + Profesoras

**Fecha:** 2026-03-14 (actualizado 2026-03-15)  
**Estado:** Aprobado (brainstorming + decisiones cerradas)  
**Referencias:** [BoxMagic Horarios](https://help.boxmagicapp.com/es/horarios), [Crear programa](https://help.boxmagicapp.com/es/como-crear-un-programa), Updates de producto (Notion), wireframes compartidos.

---

## 1. Objetivo y alcance

Permitir a la **administradora** del centro cargar y gestionar las **clases Live** (presenciales o online): crear clases sueltas y series recurrentes, ver el calendario por día/semana/mes o lista, filtrar por disciplina/profesor/modalidad, y gestionar feriados. Las alumnas siguen reservando desde el flujo existente (panel → Clases y reservas).

**Nombre en UI:** En el panel usamos **Disciplina** (en lugar de "Programa" tipo BoxMagic) para la agrupación de clases (Yoga, Pilates, TRX, etc.).

---

## 2. Conceptos

| Concepto | Descripción |
|----------|-------------|
| **Disciplina** | Agrupación de clases por tipo de práctica. CRUD en panel; cada clase Live pertenece a una disciplina. Sirve para filtrar y para color en calendario. |
| **Profesora** | Instructor del centro. Gestionadas via CRUD en /panel/profesoras. Internamente = User con rol INSTRUCTOR en el centro. |
| **Clase Live** | Una instancia concreta: fecha, hora inicio, duración, cupos, título, disciplina, profesora, color, si acepta clase de prueba, si es online, ClassPass, etc. |
| **Serie** | Regla de recurrencia que genera varias clases (ej. "cada semana los lunes y miércoles a las 10:00 hasta el 30 de junio"). Una clase puede ser suelta (sin serie) o instancia de una serie. |
| **Feriado** | Fecha en la que el centro no opera: no se muestran ni crean clases; si se agrega feriado sobre un día con clases, ver reglas más abajo. |

---

## 3. Modelo de datos (resumen)

- **Disciplina:** `id`, `centerId`, `name`, `color` (opcional, hex), `active` (boolean). Relación 1:N con LiveClass.
- **LiveClass (ampliado):** `title`, `startsAt`, `durationMinutes`, `maxCapacity`, `disciplineId`, `instructorId` (FK a User, opcional), `isOnline`, `isTrialClass`, `trialCapacity`, `color` (nullable; si null hereda de disciplina), `classPassEnabled`, `classPassCapacity`, `seriesId` (nullable), `status` (ACTIVE | CANCELLED | ARCHIVED).
- **LiveClassSeries:** mismos campos de clase + regla de recurrencia (`repeatFrequency`, `repeatOnDaysOfWeek`, `repeatEveryN`, `endsAt`, `repeatCount`) + `color`, `classPassEnabled`, `classPassCapacity`.
- **Feriado (CenterHoliday):** `id`, `centerId`, `date` (unique per center), `label`.
- **Center (settings calendario):** `calendarStartHour` (default 7), `calendarEndHour` (default 22). Configurables desde "Configuración del centro".

---

## 4. Comportamiento acordado

### 4.1 Disciplinas

- CRUD en panel: listado + alta / edición / baja.
- Campos: nombre, activo, color (presets).
- Al crear clase, se selecciona disciplina (dropdown).

### 4.2 Profesoras

- CRUD completo en /panel/profesoras.
- Crear: nombre + email → crea User (si no existe) + asigna rol INSTRUCTOR.
- Editar: nombre. Desactivar: elimina rol INSTRUCTOR del centro.
- Pensado para futuro: historial de clases impartidas, reemplazos, métricas.

### 4.3 Clases: sueltas y recurrentes

- **Clase suelta:** formulario completo con todos los campos.
- **Clase recurrente:** mismo formulario + bloque "Repetición" con 3 opciones:
  - "No se repite"
  - "Cada semana" (automático, repite el día seleccionado)
  - "Personalizado…" (dialog estilo Google Calendar con: frecuencia, días de la semana, condición de fin)
- **Color:** hereda de la disciplina como default; permite override por clase.
- **Clase online:** deshabilitado hasta que exista plugin Zoom/Meet.
- **Clase de prueba:** cuando se marca, muestra campo "Cupos de prueba".
- **ClassPass:** campos en schema, ocultos en UI hasta que exista plugin ClassPass.
- **No past dates:** validación en form (min datetime) y en server action.
- **Click en slot:** al hacer click en una hora del calendario, abre crear clase con fecha/hora pre-llenada.

### 4.4 Edición de series (flujo total)

Al editar una clase que pertenece a una serie, el sistema pregunta:
- **Solo esta instancia**: se desvincula esa instancia de la serie.
- **Esta y las siguientes**: se aplica el cambio desde esa fecha.
- **Toda la serie**: se actualiza la regla y se regeneran instancias.

### 4.5 Feriados

- Lista de feriados por centro.
- Si el día tiene clases sin reservas: se cancelan.
- Si tiene clases con reservas: se bloquea el feriado; se ofrece mover la clase.
- No se muestran clases en fechas feriadas; no se pueden crear.

### 4.6 Vistas y filtros (flujo total)

- Vistas: día, semana, mes, lista.
- Filtros: disciplina, profesor, físicas vs online.
- Calendario tipo Google: bloques con color de disciplina/clase.

### 4.7 Settings de calendario

- `calendarStartHour` y `calendarEndHour` configurables en "Configuración del centro".
- El calendario semanal usa estos valores dinámicamente.

---

## 5. Criterios de aceptación (resumen)

- La administradora puede crear y editar disciplinas y profesoras.
- Puede ver el calendario en vista semana con horas configurables.
- Puede crear clase suelta y recurrente (con dialog personalizado).
- Las clases muestran color heredado de disciplina o personalizado.
- Puede asignar profesora a cada clase.
- No puede agendar clases en el pasado.
- Puede hacer click en un slot del calendario para crear clase pre-llenada.
- Toggle online deshabilitado hasta plugin.
- Campo "cupos de prueba" aparece al marcar "clase de prueba".

---

## 6. Dependencias

- **Plugins Zoom/Meet:** para habilitar toggle "es online" y generar link.
- **Plugin ClassPass:** para habilitar classPassEnabled/classPassCapacity en UI.
- **Políticas:** ya existen; se usan en flujo de reserva, no cambian este diseño.

---

## 7. Próximo paso

Completar Fase 2 del plan de ejecución: feriados, edición de series, vistas adicionales, filtros.
