# Planes recurrentes (suscripciones MP + Bricks) — Design

**Objetivo:** Cobro automático recurrente con MercadoPago Subscriptions, UI de pago con Bricks, incentivo por recurrencia (descuento % opcional), tag "Recurrente" en planes del cliente, manejo de impago/cancelación, y reformulación de la **página del cliente** donde ve planes y compra (actual `/planes`) para que entienda visualmente las opciones uno-time y/o recurrente con descuento. Admin y cliente usan rutas distintas para no chocar.

**Fuentes:** Plan maestro, PLAN_EJECUCION_NOTION (3.2 Checkout, 3.4 Membresía recurrente), ideas de brainstorming previo.

---

## 1. Alcance y decisiones

- **Rutas (evitar choque):**
  - **Admin** configura los planes del centro en **`/panel/planes`** (ya existe: listado, crear, editar planes). Ahí se añaden los campos **Modalidad de cobro** (ONE_TIME, RECURRING, BOTH) y **Descuento % si recurrente**; no se reformula la página entera.
  - **Cliente (alumno)** ve "Planes y comprar" y "Mis planes" en una página **dentro del panel** pero con **otra ruta** para no reutilizar la del admin. Esa página es la actual **`/planes`**, que se **mueve** a **`/panel/tienda`** (o similar: ej. `/panel/comprar`). El ítem del nav "Planes y comprar" apuntará a **`/panel/tienda`**. La ruta **`/planes`** puede redirigir a **`/panel/tienda`** si el usuario está logueado, o a login, dejando `/planes` para un futuro uso público si se desea.
- **Cobro:** Automático vía MercadoPago Subscriptions (API preapproval). MP cobra cada período según frecuencia del plan.
- **UI de pago:** Checkout Bricks en nuestra app: el usuario ingresa la tarjeta en la página del cliente (**`/panel/tienda`**), se obtiene un token y el backend crea la suscripción en MP.
- **Reformulación (punto 5):** Va enfocada a la **página del cliente** (**`/panel/tienda`**), no al admin. Objetivo: que el cliente se entere visualmente de que un plan tiene posibilidad de pago único y/o recurrente, y que el recurrente puede tener descuento. Se usará la skill **ui-ux-pro-max** para el diseño de esa página en la implementación.

---

## 2. Modelo de datos

### 2.1 Plan (existentes + nuevos campos)

- **`recurringDiscountPercent`** (opcional, 0–100): Si el plan tiene `billingMode` RECURRING o BOTH, este % se aplica cuando el cliente elige pago recurrente. Ej.: 10 → 10% off en el precio mostrado al suscribirse.
- **`billingMode`** ya existe (ONE_TIME, RECURRING, BOTH). Se usa para:
  - Mostrar en admin qué planes pueden ser recurrentes.
  - En la página del cliente (**`/panel/tienda`**): mostrar opción "Suscribirme" (recurrente) solo si el plan tiene RECURRING o BOTH; precio con descuento si `recurringDiscountPercent` > 0.

### 2.2 Suscripción MP (nuevo concepto en nuestro dominio)

Necesitamos vincular la suscripción de MP con nuestro UserPlan para renovaciones.

- **Opción A — Tabla `Subscription`:**  
  `id`, `centerId`, `userId`, `planId`, `mpSubscriptionId` (único), `mpPayerId` (opcional), `status` (active, paused, cancelled, payment_failed), `currentPeriodStart`, `currentPeriodEnd`, `createdAt`, `updatedAt`.  
  Cada renovación exitosa crea o actualiza un UserPlan y registra el pago (Order o registro en historial). Un UserPlan puede tener `subscriptionId` (FK a Subscription) para saber que es recurrente.

- **Opción B — Solo en UserPlan y Order:**  
  UserPlan tiene `mpSubscriptionId` (nullable). Order tiene `subscriptionId` (nullable) para órdenes que son "cuota de suscripción". Al recibir webhook de pago recurrente, MP envía `subscription_id`; buscamos UserPlan por `mpSubscriptionId` y extendemos vigencia (o creamos nuevo UserPlan para el período). No hay tabla Subscription; la verdad está en MP y la reflejamos en UserPlan + historial de Orders/pagos.

**Recomendación:** Opción A (tabla Subscription) para tener un lugar explícito de estado de la suscripción (active, payment_failed, cancelled) y vincular fácilmente renovaciones a un mismo "contrato". UserPlan tendría `subscriptionId` (nullable); al renovar se puede extender el mismo UserPlan (validUntil) o crear uno nuevo por período según política.

### 2.3 UserPlan

- **`subscriptionId`** (nullable, FK a Subscription si existe tabla): Indica que este plan fue activado por una suscripción recurrente. Sirve para mostrar el tag "Recurrente" y para manejar renovaciones.
- **`paymentStatus`** ya existe (PENDING, PARTIAL, PAID). Para recurrentes: si MP notifica pago fallido o cancelación, ponemos un estado que impida reservar (ej. nuevo valor SUSPENDED o reutilizar lógica "plan inactivo hasta regularizar"). Si hay tabla Subscription, `Subscription.status = payment_failed` puede implicar desactivar el UserPlan (no permitir reservas) hasta nuevo pago.

### 2.4 Order

- **`subscriptionId`** (nullable): Si el pago fue una cuota de suscripción (renovación), referenciar la Subscription. Así en "Pagos" y en la ficha del cliente se ve que es "Pago recurrente - Plan X".
- Mantener `externalReference`, `mpPaymentId` para idempotencia y trazabilidad.

### 2.5 Historial de pagos recurrentes

- Cada cobro exitoso de MP (webhook) debe verse en:
  - Listado de Pagos (admin): tipo "Recurrente", plan, cliente, monto, fecha.
  - Ficha del cliente (admin): en "Pagos" o "Historial" del cliente, incluir pagos recurrentes con etiqueta y link al plan/suscripción.
- Se puede registrar cada renovación como una Order (status APPROVED, subscriptionId no null) o como un registro en una tabla de "RecurringPayment". Orders reutilizan lógica existente y filtros; una tabla dedicada da más flexibilidad. **Recomendación:** usar Order por renovación (orderId único por cuota), con `subscriptionId` y quizás `isRecurringRenewal: true` para filtros y reportes.

---

## 3. Flujo de alta de suscripción (checkout con Bricks)

1. Usuario en **`/panel/tienda`**: ve planes disponibles, "Mis planes" y para planes con RECURRING/BOTH ve botón "Suscribirme" (y precio con descuento si aplica).
2. Al hacer clic en "Suscribirme":
   - Se abre un flujo en la misma página (o modal/paso siguiente) que carga el **Card Payment Brick** (o Payment Brick) de MP con la public key del centro.
   - Usuario completa datos de tarjeta; el Brick devuelve un **token** (y opcionalmente payer data).
3. Frontend envía a nuestro backend: `planId`, `cardToken`, `payerEmail` (y datos que necesite MP).
4. Backend:
   - Valida sesión y que el plan sea recurrente y del centro del usuario.
   - Calcula monto (plan.amountCents con descuento si `recurringDiscountPercent`).
   - Llama a la API de MP **Create preapproval** (suscripción) con: token, payer_email, reason (nombre del plan), auto_recurring (frequency según plan.validityPeriod: MONTHLY → monthly, etc.), amount, currency, back_url a `/panel/tienda?subscription=success` o similar.
   - MP devuelve `preapproval_id` (id de la suscripción).
   - Crear registro **Subscription** (si se adopta tabla) con status active, mpSubscriptionId, userId, planId, centerId, currentPeriodStart/End.
   - Crear **Order** para este primer pago (status APPROVED tras confirmación de MP o vía webhook).
   - Crear **UserPlan** con validUntil según plan.validityPeriod, subscriptionId, paymentStatus PAID.
5. Redirigir o mostrar éxito y refrescar "Mis planes" (tag "Recurrente" visible).

**Frecuencia MP vs nuestro validityPeriod:** Mapear MONTHLY → monthly, QUARTERLY → quarterly, etc., según lo que permita la API de MP (weekly, monthly, yearly suelen estar; trimestral/semestral hay que revisar en docs).

---

## 4. Webhooks de MercadoPago (suscripciones)

MP envía notificaciones para suscripciones (pagos aprobados, rechazados, suscripción cancelada). Hay que:

- **Configurar** en MP la URL de webhook para el centro (puede ser la misma `/api/webhooks/mercadopago/[centerId]` o una ruta específica para subscriptions; según docs de MP).
- **Identificar** en el body del webhook si el evento es de tipo `subscription_preapproval` o similar (y no solo `payment`).
- **Pago aprobado (renovación):**
  - Obtener `subscription_id` y datos del pago.
  - Buscar Subscription por mpSubscriptionId; obtener userId, planId, centerId.
  - Crear Order para esta cuota (subscriptionId, status APPROVED) para trazabilidad.
  - Actualizar UserPlan: extender `validUntil` sumando un período (según plan.validityPeriod), o crear nuevo UserPlan para el siguiente período. Decisión: **extender el mismo UserPlan** (validUntil += 1 período) mantiene un solo ítem por suscripción y es más simple; la alternativa es crear un UserPlan nuevo por cada período.
- **Pago rechazado / fallido:**
  - Actualizar Subscription.status a `payment_failed` (o equivalente).
  - Marcar UserPlan como no disponible para reservas: opción 1) nuevo status en UserPlan (ej. SUSPENDED); opción 2) no cambiar status pero validar en reservas "si subscription.status === payment_failed, no permitir reservar". Recomendación: **status en Subscription** + en lógica de reserva comprobar "si tiene subscriptionId y la suscripción está en payment_failed, no puede reservar con ese plan".
- **Suscripción cancelada por el usuario o por MP:**
  - Subscription.status = cancelled.
  - El UserPlan sigue vigente hasta `validUntil` pero no se renovará más; no crear nuevos UserPlans. Opcional: mostrar en UI "Tu suscripción fue cancelada; tu plan sigue activo hasta dd/mm."

Idempotencia: usar `x-request-id` o el `id` del evento como ya se hace para pagos one-time.

---

## 5. Reformulación de la página del cliente (actual `/planes` → `/panel/tienda`)

Esta sección aplica **solo a la página donde el cliente ve y compra planes** (la que pasará a vivir en **`/panel/tienda`**). No a la página del admin (`/panel/planes`).

- **Objetivo:** Que el **cliente** se entere de forma clara y visual de que un plan tiene **dos posibilidades**: pago único y/o recurrente, y que si elige recurrente puede tener **descuento**. Que los planes con opción recurrente se promuevan visualmente (badges, precios comparados, etc.).
- **Contenido sugerido:**
  - **Planes disponibles:** Cada plan se muestra con indicación según `billingMode`: solo "Pago único", solo "Recurrente", o "Pago único o Recurrente" (BOTH). Si tiene RECURRING o BOTH, mostrar el precio recurrente (con descuento si `recurringDiscountPercent` > 0) y el ahorro respecto al único. Botones/CTAs: "Comprar una vez" y/o "Suscribirme" según corresponda.
  - **Mis planes:** Lista de planes activos del usuario (como hoy); tag "Recurrente" si el UserPlan tiene suscripción asociada.
- **Diseño:** Usar la skill **ui-ux-pro-max** en la implementación para esta página: búsqueda de design system (ej. "e-commerce plans subscription wellness"), persistir recomendaciones y aplicar jerarquía, cards y badges para que las dos opciones (una vez / recurrente con descuento) se entiendan de un vistazo.

**Admin (`/panel/planes`):** En el formulario de crear/editar plan se añaden los campos **Modalidad de cobro** (ONE_TIME, RECURRING, BOTH) y **Descuento % si recurrente** (visible solo si RECURRING o BOTH). No se reformula toda la página del admin; solo se agregan esos campos.

---

## 5.1 Dónde ve el admin las cancelaciones (y estado) de suscripciones MP

El admin debe poder ver cuándo una suscripción fue cancelada (o quedó en pago fallido) para seguimiento y atención al cliente. Propuesta de ubicación:

- **Pagos (`/panel/pagos`):** Añadir una pestaña o sección **"Suscripciones"** (o filtro por tipo "Recurrente") que liste las suscripciones del centro con: cliente, plan, estado (activa / cancelada / pago fallido), última fecha de cobro, y fecha de cancelación o fallo si aplica. Así el admin tiene una vista global de suscripciones y puede ver todas las cancelaciones en un solo lugar. Opcional: exportar o filtrar por "Solo canceladas" o "Solo con pago fallido".
- **Ficha del cliente (`/panel/clientes/[id]`):** En la sección de planes del cliente (o una subsección "Suscripciones"), mostrar las suscripciones de ese cliente: activas, canceladas y con pago fallido, con fecha de evento. Así, al atender a un cliente concreto, el admin ve si tuvo una suscripción cancelada o en fallo sin salir de la ficha.

Con esto las cancelaciones (y estados de suscripción) quedan visibles en **Pagos** (vista global) y en **Ficha cliente** (vista por alumno).

---

## 6. UI cliente: tag "Recurrente" e historial de pagos

- **Mis planes (en `/panel/tienda`):** En cada card/ítem de plan activo del usuario, si el UserPlan tiene `subscriptionId` (o subscription no null), mostrar tag/badge **"Recurrente"**. Opcional: "Se renueva el dd/mm" usando currentPeriodEnd de la Subscription.
- **Pagos (admin) y ficha cliente:** En listados de pagos, si la Order tiene `subscriptionId`, mostrar etiqueta "Recurrente" o "Cuota recurrente" y el nombre del plan. En la ficha del cliente, pestaña o sección Pagos debe incluir estos pagos con la misma etiqueta.

---

## 7. Resumen de integración técnica MP

- **Bricks:** Card Payment Brick (o Payment Brick) en front; SDK/script de MP con public key del centro; callback onSubmit con token.
- **Backend:** Endpoint nuevo ej. `POST /api/checkout/subscribe` que recibe planId, cardToken, payerEmail; crea preapproval en MP; crea Subscription, Order y UserPlan.
- **Webhook:** Extender `processWebhookUseCase` (o nuevo use case) para eventos de suscripción: tipo subscription_authorized_payment, subscription_payment_failed, subscription_cancelled; actualizar Subscription y UserPlan/Order según sección 4.

---

## 8. Próximos pasos

1. Validar este diseño (ajustes si hace falta).
2. Invocar **writing-plans** para generar el plan de implementación (tareas ordenadas).
3. En la tarea de UI de la **página del cliente** (**`/panel/tienda`**), invocar **ui-ux-pro-max** para el diseño (planes disponibles + Mis planes, opciones uno-time/recurrente y descuento).
4. Corregir documentación: "Planes y comprar" para el alumno = **`/panel/tienda`** (login requerido). Admin configura planes en **`/panel/planes`**. La ruta `/planes` puede redirigir a `/panel/tienda` si está logueado.
