# Design Guidelines — Cuerporaiz

## Core principles

Estos principios aplican a diseño y a implementación de UI. No son opcionales.

1. **Simplicity first**  
   Cada elemento debe justificar su existencia. Menos capas, menos variantes, menos estados. Si se puede quitar sin perder claridad o función, se quita.

2. **No laziness**  
   No atajos que degraden la experiencia o la mantenibilidad. Estilos y valores vienen de variables configurables; no números mágicos ni estilos inline. Código de UI reutilizable y consistente.

3. **Minimal impact**  
   Cambios localizados. El diseño debe ser predecible: cambiar un token (color, espacio, tipo) no debe obligar a tocar componentes uno a uno. Configuración centralizada.

---

## Reglas de implementación de estilos

- **No magic numbers.** Cualquier valor numérico (tamaño, espacio, radio, duración) debe definirse como variable/token en la configuración del diseño (CSS variables o tema Tailwind).
- **No inline styles.** Los componentes usan clases (o variantes de componentes) que referencian variables. Excepción: valores dinámicos calculados en runtime (ej. `width` en % desde datos), que deben ser los mínimos necesarios.
- **Configurable.** La paleta, la tipografía, el espaciado y las duraciones viven en un único origen de verdad (p. ej. `globals.css` o `tailwind.config` que consuma variables CSS). Cambiar de tema o ajustar la marca es cuestión de editar esa configuración.

---

## Paleta: Tierra y cuerpo

Narrativa: **raíz** (anclaje, calma profunda), **cuerpo** (calor, vida), **espacio** (respiro, claridad). Evitamos los clichés del yoga (arena, beige, lavanda, menta).

### Colores principales

Todos los valores se definen como variables CSS. No se usan hex/códigos directos en componentes.

| Rol | Variable CSS | Valor | Uso |
|-----|--------------|--------|-----|
| **Primario** | `--color-primary` | `#2D3B2A` | Verde raíz: anclaje, naturaleza profunda. Nav, títulos fuertes, CTA principal. |
| **Secundario** | `--color-secondary` | `#B85C38` | Terracotta: cuerpo, calor, barro cocido. Acentos, hover, botones secundarios, detalles. |
| **Terciario** | `--color-tertiary` | `#F5F0E9` | Hueso cálido: espacio, respiro. Fondo principal de la UI. |

### Variantes (opcionales, para estados y jerarquía)

| Variable | Valor | Uso |
|----------|--------|-----|
| `--color-primary-hover` | Definir en config (p. ej. oscurecer 5–10%) | Hover sobre elementos primarios. |
| `--color-primary-light` | Definir en config (tinte suave) | Fondos sutiles, badges. |
| `--color-secondary-hover` | Definir en config | Hover sobre elementos secundarios. |
| `--color-secondary-light` | Definir en config | Fondos de acento suave. |

### Neutros

| Variable | Valor | Uso |
|----------|--------|-----|
| `--color-text` | `#1C1C1A` | Texto principal. Casi negro con ligera calidez. |
| `--color-text-muted` | `#5C5A56` | Texto secundario, metadatos. |
| `--color-border` | `#E5E2DC` | Bordes, divisores. Gris muy claro cálido. |
| `--color-surface` | `#FFFFFF` o `var(--color-tertiary)` | Fondos de cards, modales. |

### Contraste y accesibilidad

- **Primario sobre terciario:** ratio alto (~10:1). Válido para texto y botones (WCAG AA).
- **Secundario sobre terciario:** ~4.5:1. Usar para texto solo en tamaños ≥ 16px, o como fondo de botón con texto blanco (`--color-text-inverse` o `#FFFFFF`).
- Todos los pares de color deben documentarse con ratio y cumplir al menos WCAG AA para el uso previsto.

---

## Origen de verdad: variables CSS

Ejemplo de bloque a incluir en el origen de verdad (p. ej. `app/globals.css` o archivo de tokens importado ahí). Todo lo que use colores, espacios, tipografía o radios debe referenciar estas variables (o variables derivadas en Tailwind).

```css
:root {
  /* --- Paleta Tierra y cuerpo --- */
  --color-primary: #2D3B2A;
  --color-primary-hover: #232F21;
  --color-primary-light: rgba(45, 59, 42, 0.08);
  --color-secondary: #B85C38;
  --color-secondary-hover: #9E4F2F;
  --color-secondary-light: rgba(184, 92, 56, 0.1);
  --color-tertiary: #F5F0E9;
  --color-text: #1C1C1A;
  --color-text-muted: #5C5A56;
  --color-border: #E5E2DC;
  --color-surface: #FFFFFF;
  --color-text-inverse: #FFFFFF;

  /* --- Espaciado (base-8, configurable) --- */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  --space-24: 6rem;
  --space-32: 8rem;

  /* --- Radios --- */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;

  /* --- Tipografía (nombres de variable; valores en rem) --- */
  --font-display: '…', serif;
  --font-sans: '…', sans-serif;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 2rem;
  --text-4xl: 2.5rem;
  --text-5xl: 3.5rem;
  --leading-tight: 1.2;
  --leading-normal: 1.6;
  --leading-relaxed: 1.7;

  /* --- Duraciones (animaciones/transiciones) --- */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
}
```

Cualquier nuevo token (p. ej. sombras, breakpoints si se exponen como variable) se añade aquí y se reutiliza por nombre. No se inventan números en componentes.

---

## Tipografía

- **Display:** Una fuente con carácter para títulos (identidad). Definir en `--font-display` y usar solo para headings.
- **Sans:** Una fuente legible para cuerpo. Definir en `--font-sans`. Escala mediante variables `--text-*` y `--leading-*`.
- Tamaños y line-heights siempre desde variables; sin valores sueltos en componentes.

---

## Espaciado

- Sistema base-8 con variables `--space-*`. Uso por contexto (botones, cards, secciones, hero) documentado en guía de componentes.
- No usar valores arbitrarios (ej. `p-[13px]`) salvo que exista una variable que lo defina.

---

## Componentes base

- **Botones:** Variantes primary (primario), secondary (secundario), ghost. Colores y padding desde variables (ej. `--color-primary`, `--space-3`, `--space-6`, `--radius-md`).
- **Cards, inputs, badges:** Mismos criterios: bordes, radios, sombras y espaciado desde tokens.
- **Estados:** success, error, warning con variables propias (ej. `--color-success`, `--color-error`) para mantener consistencia y minimal impact.

---

## Narrativa y copy

- **Identidad:** Yoga con raíz; tierra y cuerpo. No “spa genérico”.
- **CTAs:** “Comenzar a practicar”, “Ver packs”, “Sumarme a la membresía”, “Acceder al contenido”. Evitar “Comprar ya”, “Añadir al carrito” como protagonistas.
- **Tono:** Cercano, claro, con identidad. Placeholders y mensajes de éxito/error alineados con ese tono.

---

## Animaciones y motion

- Animaciones con propósito (entrada, hover, feedback). Preferir `transform` y `opacity`.
- Duraciones desde variables (`--duration-*`). Respetar `prefers-reduced-motion` en todos los componentes con motion.

---

## Responsive y accesibilidad

- Breakpoints definidos en config (sm/md/lg/xl/2xl); componentes referencian breakpoints, no números mágicos.
- Contraste según uso (ver sección de contraste). Focus visible, alt en imágenes, jerarquía de headings, skip links cuando aplique.

---

**Resumen:** Paleta Tierra y cuerpo en variables; core principles Simplicity first, No laziness, Minimal impact; cero números mágicos y cero estilos inline; todo configurable desde un único origen de verdad.
