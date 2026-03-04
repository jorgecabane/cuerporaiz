# Contexto del proyecto — Cuerpo Raíz

Documento de referencia: quién es, objetivo del producto, decisiones de pago, políticas, modelo de catálogo, arquitectura y roadmap.

---

## 1. Sobre ella / el proyecto

- **Quién es:** Trinidad Cáceres (Trini). Profesora de yoga + sexóloga. Combina cuerpo, respiración, placer, sensualidad y yoga para sanar.
- **Marca:** Cuerpo Raíz — *"cuerpo, respiración y placer. el camino de regreso a ti."*
- **Links:** [linktr.ee/cuerporaiz_](https://linktr.ee/cuerporaiz_), [instagram.com/cuerporaiz.cl](https://www.instagram.com/cuerporaiz.cl/)
- **Hace:** varios tipos de yoga, charlas de sexualidad, retiros, prácticas somáticas, meditación.
- **Hoy usa:** Boxmagic para agenda y planes (Av. Luis Pasteur 5728, Vitacura). Planes vistos: Ilimitado $96k, Pack 12 clases $88k, Pack 8 $60k, Pack 6 $48k.
- **Origen de la idea:** cuando se fue 2 meses de vacaciones, las alumnas quedaron sin material. Quieren una plataforma donde puedan tener clases/videos para hacer a su ritmo, con la misma dedicación que en presencial/online.

---

## 1b. Voz de marca y copy (referencia)

Texto y tono que reflejan su identidad; usar como guía para CTAs, landings y comunicaciones.

**Tagline oficial (Linktree / redes):**  
*"cuerpo, respiración y placer. el camino de regreso a ti."*

**Sobre sexualidad y espacio consciente (ella):**  
*"hablar de sexualidad también es hablar de cuerpo, emociones y bienestar. durante años muchas crecimos con silencio, culpa o desinformación. este espacio nace para abrir conversaciones más conscientes, desde el respeto, la educación, la conexión y el placer."*

**Sobre retiros / comunidad:**  
Retiros como espacio de contención y expansión; cuerpos respirando juntos, historias vistas sin juicio y escuchadas con amor; pertenencia; compartir en tribu como medicina; *"el cuerpo sana cuando se siente seguro"*; *"vinimos a hacerlo en compañía, en comunidad"*; *"rena-ser no se explica, se vive"*.

**Podcast (Spotify – CuerpoRaíz):**  
*"Conversaciones encarnadas sobre cuerpo, sexualidad, yoga y bienestar. Un espacio creado y guiado por Trinidad Cáceres. Junto a distintas mujeres y hombres, abrimos diálogos sobre cómo habitamos el cuerpo, cómo nos vinculamos con el placer, cómo se mueve nuestra energía vital y los procesos de transformación que atravesamos."*

**Linktree actual (antes de reemplazar Boxmagic):**  
Clase de prueba gratis → Boxmagic; APP Clases y Planes → Boxmagic; Escríbeme (WhatsApp 56975196093); Meditaciones guiadas (Spotify); CuerpoRaíz Podcast; Playlists “para viajar hacia dentro” (Spotify).  
Al lanzar la nueva plataforma, estos enlaces de clases/planes apuntarán al nuevo sitio; el resto (podcast, playlists, WhatsApp) se mantiene.

---

## 2. Objetivo del producto (ecosistema propio)

- **Reemplazar Boxmagic** (no integrarse).
- Permitir:
  - **Agendar horas de clases presenciales** (unitarias y packs).
  - **Comprar packs de clases online** (a tu tiempo; videos en Vimeo).
  - **Comprar membresía online** (acceso a recursos que se van sumando mes a mes).
- Todo mantenible con **CMS headless Sanity** para contenido y catálogo.
- **Cuentas de alumnas:** historial de clases, pagos, ver qué tienen acceso.
- Foco: **Chile primero**, solo **web** (mobile responsive first).

---

## 3. Decisiones de pago

- **Proveedor:** MercadoPago (Chile).
- **Checkout MVP:** redirección (**Checkout Pro**), no embebido.
- **Membresía:** obligatoria en el MVP (Suscripciones de MercadoPago).
- **Cuotas:** sí, habilitar (MercadoPago las muestra en su página).
- Un solo proveedor para empezar; después ver si sumar más.

**Tipos de checkout MP:**  
- Checkout Pro = redirect, simple, buena aprobación → elegido para MVP.  
- Bricks = módulos embebidos.  
- Checkout API = control total.  
Más adelante se puede pasar a Bricks si quieren checkout dentro del sitio.

---

## 4. Políticas de negocio (propuesta)

- **Cancelación de reserva:** hasta X h antes (ej. 12 h) → devolver cupo/clase al pack. Después → clase consumida.
- **Expiración de packs:** ej. pack 6 = 2 meses de validez, pack 12 = 3 meses; sin uso en plazo = expiran restantes (o una prórroga con costo).
- **No-show:** cuenta como clase usada; tras X no-shows (ej. 2 en un mes) → advertencia o bloqueo temporal de reserva.
- **Reprogramación:** cancelar y reservar otro horario; o 1 cambio por reserva hasta X h antes.
- **Membresía:** baja cuando quiera; acceso hasta fin del período pagado. Reintentos de cobro vía MP; definir después de cuántos fallos se da de baja el acceso.

*(Boxmagic no tenía términos públicos visibles; estas son propuestas para definir con ella.)*

---

## 5. Modelo de catálogo

- **Una sede:** Av. Luis Pasteur 5728, Vitacura.
- **Tipos de oferta:** clase presencial suelta, pack presencial (6/8/12 clases), curso/pack online (N videos), membresía online (acceso recurrente + contenido nuevo mensual).
- **Tipos de clase/contenido:** yoga (vinyasa, hatha, yin, etc.), práctica somática, meditación/respiración, charla/taller (sexualidad), retiro (evento).
- **Sesión presencial:** tipo de clase, sede, día/hora, cupo máximo, duración; se vincula a “clase suelta” o “pack” al reservar.
- **Contenido online:** un ítem por video (Vimeo); título, descripción, duración, etiquetas; acceso controlado por backend según compra/membresía.
- **Niveles:** principiante, intermedio, avanzado, todos.

**Vimeo:** privado, sin descarga ni compartir; dominio permitido solo el de la app; backend valida acceso y sirve embed/URL firmada.

---

## 6. Arquitectura acordada

- **Sanity:** contenido y catálogo (qué existe, textos, programas, retiros, landing). **No es fuente de verdad de pagos.** Solo describe la oferta y el contenido.
- **Backend propio:** fuente de verdad de usuarios, compras, suscripciones, reservas, permisos de video, historial. Todo lo transaccional y de acceso vive en el backend.
- **Frontend:** portal alumna + panel admin mínimo.

---

## 7. Roadmap resumido

- **MVP:** cuenta alumna, agenda presencial (reservar/cancelar), biblioteca online (Vimeo) + membresía mensual, checkout MercadoPago (Pro + Suscripciones), Sanity para contenido, políticas básicas.
- **V1:** reglas de packs (expiración, clases restantes), asistencia/no-show, cupones, waitlist, notificaciones (email/WhatsApp).
- **V2:** comunidad, retiros con postulación, recomendaciones de contenido, analítica. (App móvil no está en el plan.)

---

## 8. Qué NO va en este proyecto

- **App móvil nativa:** no está en el plan; solo web responsive.
- Integración con Toteat, widget de notificaciones, Firebase para notificaciones, JWT/TRM, preguntas para el equipo dev de Toteat. Eso pertenece al proyecto de notificaciones.

---

## 9. Referencia: MercadoPago Checkout Pro (redirect)

Para no desarrollar la UI de pago nosotros: el usuario es redirigido a Checkout Pro. Configuración en el backend al crear la preferencia.

- **back_urls:** tres URLs que controlamos (GET):
  - `success` — pago aprobado
  - `failure` — pago rechazado
  - `pending` — pago pendiente (ej. pago en efectivo en punto físico)
- **auto_return:** `"approved"` para redirigir automáticamente al sitio cuando se aprueba (hasta ~40 s); también se muestra botón "Volver al sitio".
- **Parámetros en el GET al volver:** `payment_id`, `status` (approved | pending | rejected), `external_reference` (para sincronizar con nuestro sistema), `merchant_order_id`, `collection_id`, `collection_status`. Usar `external_reference` para asociar el pago a la orden/reserva/membresía en nuestro backend.
- **Notificaciones (webhooks):** configurar notificaciones de pago para que cuando un pago pase de pendiente a aprobado (ej. efectivo en punto físico), el servidor actualice el estado en nuestra base de datos. No depender solo del redirect para pagos pending.

Doc: [Configurar URLs de retorno - Checkout Pro](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/configure-back-urls).

---

*Contexto vivo: actualizar cuando se definan políticas con Trini o cambien decisiones de producto.*
