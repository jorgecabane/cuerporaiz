# Refactor home del panel (/panel) — Brainstorming + Mobile-first

**Objetivo:** Dashboard operativo por rol (estudiante, profesora, admin), sin sección "Tu perfil" en la vista principal, y **mobile-first: lo importante debe verse sin hacer scroll**.

---

## 1. Principio: mobile-first y above the fold

- **Viewport de referencia (móvil):** ~360×640 px a ~390×700 px de altura útil. Descontar header del shell + posible barra inferior o navegación. **Zona útil sin scroll ≈ 400–500 px de alto**.
- **Regla:** En esa zona debe caber todo lo que el usuario necesita para decidir su siguiente acción (reservar, ver agenda, ver planes, etc.). Nada crítico puede quedar "abajo" del primer pantallazo.
- **Implicaciones:**
  - Una sola **acción principal (CTA)** por pantalla, bien visible.
  - Bloques de resumen **muy compactos**: 1 línea por ítem o 2 como máximo; listas cortas (ej. 2–3 reservas "hoy", 2–3 "próximas", 1–2 planes activos).
  - "Ver más / Ver todas" como **enlace** a la sección completa (reservas, planes, etc.), no listas largas en el home.
  - Evitar párrafos largos; bienvenida en una línea si se mantiene.

---

## 2. Por rol: qué debe verse sin scroll

### Estudiante

| Orden | Contenido | Formato compacto |
|-------|-----------|------------------|
| 1 | **CTA principal:** "Reservar clase" (o "Ver clases y reservar") | Botón ancho, destacado |
| 2 | **Reservas hoy** (si hay): 1–2 ítems, línea cada uno (ej. "Yoga 10:00") | Lista mínima; enlace "Ver todas" → reservas |
| 3 | **Próximas reservas:** 1–2 ítems (mañana / esta semana) | Idem |
| 4 | **Planes activos:** 1–2 planes con solo "Nombre · X clases left · hasta dd/mm" (o "ilimitadas") | 1 línea por plan; enlace "Ver planes" → /planes |
| 5 | Si no hay plan activo: **CTA clase de prueba** | 1 línea o botón secundario |

**Cap:** Máximo 2 reservas "hoy", 2 "próximas", 2 planes activos. El resto solo vía "Ver todas / Ver planes".

### Profesora

| Orden | Contenido | Formato compacto |
|-------|-----------|------------------|
| 1 | **CTA principal:** "Ver agenda de clases" (→ /panel/reservas) | Botón ancho |
| 2 | **Mis clases hoy:** 1–2 ítems (título + hora) | 1 línea por clase; "Ver calendario" si hay más |
| 3 | **Próxima clase** (si no hay hoy): 1 ítem (mañana o próximo día) | 1 línea |

**Cap:** 2 clases como máximo visibles en el home; el resto en la agenda.

### Administradora

| Orden | Contenido | Formato compacto |
|-------|-----------|------------------|
| 1 | **Resumen hoy:** "Hoy: N clases" (y opcional "M reservas") | 1 línea |
| 2 | **Accesos rápidos:** 2–4 ítems en grid 2×2 (ej. Horarios, Reservas, Clientes, Pagos) | Icono + etiqueta corta |
| 3 | Opcional: 1 línea de alerta ("Pagos pendientes: N") si hay | Solo si hay datos |

**Cap:** Sin listas largas; accesos como botones/links compactos. El resto de ítems admin en el menú lateral/drawer.

---

## 3. Contenido que no va en el home (o se relega)

- **"Tu perfil"** (nombre, apellido, email, rol, centro): **no** en el contenido principal del home. Opción: enlace "Datos de mi cuenta" en el shell (pie o menú) → `/panel/cuenta` o similar.
- **Reservas pasadas / historial:** solo detrás de "Ver todas" en la página de reservas.
- **Listado completo de planes:** en `/planes`; en el home solo resumen de activos (1–2 líneas cada uno).
- **Texto largo de bienvenida:** una sola línea tipo "Hola, [nombre]. Tu próxima clase y planes, aquí." o similar; sin párrafos.

---

## 4. Patrones de UI mobile-first para el home

- **Una sola columna** en móvil; sin sidebar de contenido en esta página.
- **Espaciado vertical medido:** entre secciones, usar `gap` o `margin` fijos (ej. 16–24 px) para que quepan 4–5 bloques en ~400 px.
- **Cards compactas:** padding reducido (12–16 px), tipografía 1 línea por dato (ej. `text-sm`), iconos pequeños.
- **Listas:** `max-height` o "mostrar solo N ítems" (N=2 o 3) + "Ver más" como link.
- **CTA principal:** único, full-width o casi, estilo primario; el resto de links como texto o botones secundarios.
- **Header del panel:** revisar que en móvil no ocupe más de lo necesario (barra con menú + título corto).

---

## 5. Resumen de decisiones

1. **Home por rol:** contenido distinto para STUDENT, INSTRUCTOR, ADMINISTRATOR; sin "Tu perfil" en la vista principal.
2. **Mobile-first:** diseñar para ~400–500 px de alto útil; lo importante visible sin scroll.
3. **Límites por sección:** máx. 2–3 ítems por lista en el home; "Ver todas / Ver planes / Ver agenda" para el resto.
4. **Un CTA principal** por rol; el resto accesos secundarios o enlaces.
5. **Datos:** reutilizar APIs existentes; valorar endpoint "dashboard summary" (reservas hoy/próximas/pasadas, planes activos, clases staff) para una sola carga.

---

## 6. Próximos pasos de implementación

1. Definir API o carga server-side de "dashboard summary" por rol.
2. Implementar layout del home en `app/panel/page.tsx` con bloques condicionados por `session.user.role`.
3. Diseñar componentes compactos (ReservasHoy, ProximasReservas, PlanesActivosResumen, AccesosRapidos) con tope de ítems y enlace "Ver más".
4. Quitar sección "Tu perfil" del home; opcional: añadir `/panel/cuenta` y enlace en PanelShell.
5. Ajustar espaciado y tipografía para cumplir "no scroll" en viewport móvil de referencia (validar en 360px y 390px de ancho).
