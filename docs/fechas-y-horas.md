# Fechas y Horas: Convenciones del Proyecto

Este documento define reglas para evitar errores de zona horaria (UTC vs local), corrimientos de dia y desfases de hora.

## Regla 1: Diferenciar "instante" vs "fecha civil"

- **Instante**: fecha/hora exacta en el tiempo (ej. `startsAt` de una clase).
- **Fecha civil**: solo dia calendario (`YYYY-MM-DD`), sin hora (ej. cumpleanos, "valido desde", feriados).

No mezclar ambos modelos en el mismo flujo.

## Regla 2: Clases/reservas (instantes)

- En cliente, cuando el origen es `input type="datetime-local"`, convertir a ISO antes de enviar:
  - `new Date(value).toISOString()`
- En servidor, parsear con `new Date(iso)` y persistir ese instante.
- Para mostrar al usuario, usar `toLocaleDateString` / `toLocaleTimeString` en zona local del navegador.

## Regla 3: Claves de dia para UI local

Para agrupar o seleccionar clases por dia en vistas de calendario/sheet:

- Usar claves locales `YYYY-MM-DD` derivadas de `getFullYear/getMonth/getDate`.
- No usar `toISOString().slice(0, 10)` para estas claves de UI local.
- Referencia: `lib/datetime/local-ymd.ts`.

## Regla 4: Datos "solo fecha" (date-only)

Ejemplos: cumpleanos, vigencia de plan, feriados.

- Si el dato representa un dia civil y se guarda como fecha sin hora (o medianoche UTC):
  - Al mostrar, formatear con `timeZone: "UTC"` para evitar corrimiento al dia anterior en zonas UTC-.
- Evitar renderizar date-only con `toLocaleDateString()` sin timezone explicita.

## Regla 5: Anti-patrones a evitar

- `toISOString().split("T")[0]` para defaults de formularios de fecha local.
- `toISOString().slice(0, 10)` para claves de calendario local.
- Enviar `datetime-local` crudo al servidor cuando el servidor puede correr en otra timezone.

## Checklist rapido para PRs

- Si toca calendario/reservas: confirmar que la clave de dia usada es local.
- Si toca `datetime-local`: confirmar envio como ISO.
- Si toca date-only: confirmar display con `timeZone: "UTC"` (o estrategia explicita equivalente).
- Probar al menos un caso cerca de borde de dia (noche local).
