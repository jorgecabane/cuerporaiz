# Calidad de integración y webhooks en local (Mercado Pago)

Este documento resume el **quality checklist** de Mercado Pago para la app CuerpoRaíz y cómo **probar webhooks en localhost** usando un túnel.

## 1. Resumen del quality checklist

Mercado Pago evalúa requisitos obligatorios y buenas prácticas. Estado actual de nuestra integración:

### Requisitos que ya cumplimos

| Requisito | API Name | Cómo lo cumplimos |
|-----------|----------|-------------------|
| Notificaciones webhooks | `webhooks_ipn` | Enviamos `notification_url` en el request de la preferencia (por centro). |
| Referencia externa | `external_reference` | Enviamos `external_reference` único por orden (`ord_<uuid>`). |
| Email del comprador | `email` | Enviamos `payer.email` cuando hay sesión. |
| Nombre del ítem | `item_title` | Enviamos `items.title` (nombre del plan). |
| Cantidad | `item_quantity` | Enviamos `items.quantity` (1). |
| Precio del ítem | `item_unit_price` | Enviamos `items.unit_price`. |
| Consulta el pago notificado | `payment_get_or_search_api` | En el webhook re-consultamos el pago con la API de MP antes de actualizar la orden. |
| PCI / datos de tarjeta | `secure_form` | No capturamos tarjeta: redirigimos a Checkout Pro; ningún dato de tarjeta pasa por nuestros servidores. |

### Mejoras opcionales (recomendadas para mejor tasa de aprobación)

| Requisito | API Name | Acción |
|-----------|----------|--------|
| Descripción en resumen de tarjeta | `statement_descriptor` | Enviar `statement_descriptor` en la preferencia (ej. "CUERPORAIZ" o nombre del centro, máx. 22 caracteres). |
| Código del ítem | `item_id` | Enviar `items.id` (ej. `plan.id`). |
| Descripción del ítem | `item_description` | Enviar `items.description` (ej. descripción corta del plan). |
| Categoría del ítem | `item_category_id` | Enviar `items.category_id` (categoría de Mercado Pago, ej. servicios). |
| Nombre / apellido del comprador | `payer_first_name` / `payer_last_name` | Enviar si tenemos el dato (ej. desde perfil de usuario). |

### No aplican o son para producción

- **Backend SDK / Frontend SDK**: Usamos API REST y redirección a Checkout Pro; no es obligatorio usar el SDK para este flujo.
- **SSL / TLS**: Requisito de producción (dominio con HTTPS y TLS 1.2+).
- **Chargebacks, cancelaciones, devoluciones, reportes**: Buenas prácticas para más adelante; no bloquean el flujo actual.

En el código ya se aplican **statement_descriptor**, **item id**, **item description** e **item category_id** en la preferencia cuando hay datos disponibles.

---

## 2. Probar webhooks en localhost

Mercado Pago envía las notificaciones a una **URL pública**. `http://localhost:3000` no es accesible desde los servidores de MP, así que en local hay que exponer el servidor con un **túnel** (ngrok, Cloudflare Tunnel, etc.).

### Paso 1: Exponer localhost con un túnel

Ejemplo con **ngrok**:

```bash
ngrok http 3000
```

Ngrok te dará una URL pública (ej. `https://abc123.ngrok-free.app`). Mientras ngrok esté corriendo, todo lo que llegue a esa URL se reenviará a tu `localhost:3000`.

### Paso 2: Registrar la URL de webhook en Mercado Pago (sandbox)

Tienes dos opciones:

**Opción A – Desde el MCP de Mercado Pago (recomendado)**  
Si tienes el MCP de Mercado Pago conectado en Cursor, puedes pedirle al asistente que ejecute la tool **`save_webhook`** con:

- **callback_sandbox**: `https://TU_URL_DE_NGROK/api/webhooks/mercadopago/TU_CENTER_ID`
- **topics**: `["payment"]`
- **application_id**: `2762435779232350` (app CuerpoRaiz)

Reemplaza:

- `TU_URL_DE_NGROK` por la URL que te dio ngrok (ej. `abc123.ngrok-free.app`).
- `TU_CENTER_ID` por el ID del centro con el que estás probando (mismo que en la URL del panel; si usaste el seed, está en la base de datos).

**Opción B – Manual en Mercado Pago**  
En [Tus integraciones](https://www.mercadopago.com.ar/developers/panel/app) → aplicación CuerpoRaiz → Notificaciones / Webhooks, configura la URL de prueba con la misma forma:  
`https://TU_TUNNEL/api/webhooks/mercadopago/TU_CENTER_ID`

### Paso 3: Probar el flujo

1. Deja corriendo `npm run dev` y ngrok.
2. Entra a tu app usando la URL de ngrok (ej. `https://abc123.ngrok-free.app`) para que las `back_urls` y el origen del checkout coincidan con el dominio que MP ve.
3. Conecta Mercado Pago para ese centro (Panel → Plugins → Mercado Pago) si aún no está conectado.
4. Haz una compra de prueba (credenciales de prueba y [tarjetas de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/additional-content/test-cards)).
5. Cuando MP procese el pago, enviará el webhook a `https://tu-ngrok.../api/webhooks/mercadopago/{centerId}` y tu endpoint local lo recibirá.

### Simular un webhook sin pagar

Si en el MCP de Mercado Pago tienes la tool **`simulate_webhook`**, puedes simular una notificación de pago indicando:

- **topic**: `payment`
- **resource_id**: un `payment_id` de prueba o uno real si lo tienes
- **url_callback**: `https://TU_NGROK/api/webhooks/mercadopago/TU_CENTER_ID`
- **callback_env_production**: `false` (sandbox)

Así verificas que tu endpoint responde bien y que la firma y el procesamiento son correctos.

### Importante

- La URL registrada en MP (sandbox o producción) debe ser **exactamente** la que recibe el webhook, incluido el `centerId` en el path.
- Cada centro tiene su propio `webhookSecret` en la base de datos (generado al conectar OAuth). La validación de `x-signature` usa ese secret; no hace falta configurarlo en el panel de MP.
- Si cambias de túnel (otra URL de ngrok), vuelve a registrar la nueva URL en `save_webhook` (callback_sandbox).

---

## 3. Referencia rápida MCP

Para revisar o configurar cosas desde Cursor usando el MCP de Mercado Pago:

| Tool | Uso |
|------|-----|
| `application_list` | Ver aplicaciones y App ID. |
| `quality_checklist` | Listado de requisitos y buenas prácticas. |
| `quality_evaluation` | Medir calidad con un `payment_id` real (producción). |
| `save_webhook` | Configurar o actualizar URLs de notificación (callback y callback_sandbox) y tópicos. |
| `notifications_history` | Diagnóstico de notificaciones enviadas por MP. |

Si quieres, en el siguiente paso podemos aplicar juntos las mejoras de preferencia (statement_descriptor, item id/description/category) en el código o revisar un pago con `quality_evaluation`.
