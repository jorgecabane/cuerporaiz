# Configuración y secretos — CuerpoRaíz

Esta guía indica **dónde obtener** cada secreto o variable y **cómo configurarla**. Si un subagente o tarea necesita algo que solo tú puedes proporcionar (API keys, URLs, contraseñas), debe quedar documentado aquí y marcado en Notion en la página [Configuración que requiere tu ayuda](https://www.notion.so/31fbec2684938074a62bd6492d5d4c2b) (o bloque equivalente).

---

## 1. Supabase (Postgres)

### Qué necesitas

- **`DATABASE_URL`**: cadena de conexión a la base Postgres del proyecto Supabase.

### Dónde obtenerlo

1. Entra en [Supabase Dashboard](https://supabase.com/dashboard) y abre tu proyecto.
2. **Project Settings** (icono de engranaje) → **Database**.
3. En **Connection string** elige el modo:
   - **URI** (recomendado para Prisma): copia la URI y sustituye `[YOUR-PASSWORD]` por la contraseña de la base de datos del proyecto (la que definiste al crear el proyecto, o una nueva en **Database → Reset database password** si la perdiste).
   - Para usar el **connection pooler** (recomendado en producción): usa la URI que diga "Transaction" o "Session" (puerto 6543). Ejemplo:
     ```
     postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
     ```
4. Pega el valor en tu `.env`:
   ```bash
   DATABASE_URL="postgresql://..."
   ```

### Migraciones

- **Quién las ejecuta:** tú (o un pipeline con acceso a la DB). Los agentes no tienen tus credenciales.
- **Primera vez** (crear tablas en Supabase):
  ```bash
  npm run build   # por si acaso genera el cliente Prisma
  npx prisma migrate deploy
  ```
  Usa la misma `DATABASE_URL` que en `.env`. Si quieres seed inicial:
  ```bash
  npm run db:seed
  ```
- **En desarrollo** con cambios de schema:
  ```bash
  npx prisma migrate dev --name nombre_descriptivo
  ```
  Eso aplica migraciones y actualiza la carpeta `prisma/migrations/` (eso sí puede hacerlo un agente en su rama; aplicar contra tu Supabase lo haces tú con `migrate deploy` o `migrate dev`).

---

## 2. Auth (NextAuth)

### Qué necesitas

- **`AUTH_SECRET`**: secreto para firmar cookies y tokens de sesión. Debe ser un string aleatorio y seguro.

### Cómo generarlo

En la raíz del proyecto hay un script:

```bash
./scripts/gen-auth-secret.sh
```

O manualmente:

```bash
openssl rand -base64 32
```

Copia la salida y en `.env`:

```bash
AUTH_SECRET="la_salida_del_comando"
```

Opcional (por defecto NextAuth usa `AUTH_URL`):

- **`AUTH_URL`**: URL de la app (ej. `http://localhost:3000` en dev, tu dominio en prod).
- **`NEXTAUTH_URL`** / **`NEXTAUTH_SECRET`**: alias; puedes poner el mismo valor que `AUTH_URL` y `AUTH_SECRET` si usas variables con ese nombre.

---

## 3. Seed (opcional)

Para crear un usuario admin inicial con `npm run db:seed`:

- **`SEED_ADMIN_EMAIL`**: email del admin (ej. `admin@cuerporaiz.cl`).
- **`SEED_ADMIN_PASSWORD`**: contraseña en claro; el seed la hashea antes de guardar.

Solo hace falta si vas a ejecutar el seed; no son obligatorios para arrancar la app.

---

## 4. MercadoPago (checkout por centro)

Cada **centro (tenant)** que tenga el plugin MercadoPago activo tiene sus propias credenciales, guardadas en la tabla `CenterMercadoPagoConfig`. No hay una sola config global.

### Para desarrollo / seed

Si ejecutás `npm run db:seed` y querés que el centro de ejemplo tenga MercadoPago configurado:

- **`MERCADOPAGO_ACCESS_TOKEN`**: Access Token de la aplicación de MercadoPago (modo prueba o producción). Lo creás en [Tus integraciones](https://www.mercadopago.com.ar/developers/panel/app).
- **`MERCADOPAGO_WEBHOOK_SECRET`**: Secret para validar la firma de los webhooks. Se genera al configurar la URL de notificaciones en el panel de MP.

El seed crea un registro de config con estos valores si existen en `.env`. Si no, usa placeholders y podés editar la fila en la BD o volver a ejecutar el seed después de configurar las variables.

### Webhook por centro

La URL de webhook es por centro: `https://tu-dominio.com/api/webhooks/mercadopago/[centerId]`. En el panel de MercadoPago, configurá esta URL y el evento "Pagos" para recibir notificaciones. El `centerId` es el ID (cuid) del centro en la BD.

### Seguridad

- Nunca se almacenan ni manejan datos de tarjeta; el pago se realiza en la página de MercadoPago (Checkout Pro).
- Los webhooks validan la firma `x-signature` con el secret del centro y usan idempotencia por `x-request-id`.

---

## Regla para agentes y tareas

Cuando una tarea o subagente **necesite algo que solo el usuario puede proporcionar** (credenciales, crear proyecto en un dashboard, aprobar acceso, etc.):

1. **Documentar aquí** en `docs/SETUP_SECRETS.md`: qué se necesita, dónde se obtiene y cómo se configura.
2. **Marcar en Notion** en la página de avances / tracker que esa tarea o ítem "Requiere ayuda del usuario" o "Configuración pendiente", con enlace a esta doc o a la sección concreta.

Así siempre hay un solo lugar (esta doc + Notion) donde ver qué te piden que configures.
