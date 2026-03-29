# Auth Hardening — Forgot Password, Email Verification, Google OAuth, Rate Limiting

**Goal:** Completar el sistema de autenticación para lanzamiento público: recuperación de contraseña, verificación de email obligatoria, login con Google, protección contra brute force, y refresh de sesión.

**Context:** El auth actual tiene signup (credentials) + login + cambio de contraseña (logueado). Faltan flujos críticos para producción. NextAuth 5 beta ya está configurado con credentials provider.

**Depends on:** Nada — independiente del resto de features.

---

## Data Model

### Campos nuevos en User

```prisma
model User {
  // ... campos existentes ...
  googleId        String?   @unique
  emailVerifiedAt DateTime?
}
```

- `googleId`: ID de Google del usuario. Null para cuentas solo-credentials. Unique para evitar duplicados.
- `emailVerifiedAt`: Null = no verificado. Se llena al confirmar email o al registrarse con Google (auto-verificado).

### Nuevos modelos

```prisma
model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
}

model EmailVerificationToken {
  id        String    @id @default(cuid())
  userId    String
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
}

model LoginAttempt {
  id        String   @id @default(cuid())
  email     String
  centerId  String
  ip        String
  success   Boolean
  createdAt DateTime @default(now())

  @@index([email, centerId, createdAt])
  @@index([ip, createdAt])
}
```

### Relaciones en User

```prisma
model User {
  // ... existentes ...
  passwordResetTokens     PasswordResetToken[]
  emailVerificationTokens EmailVerificationToken[]
}
```

---

## 1. Forgot Password

### Flujo

1. Usuario navega a `/auth/forgot-password`
2. Ingresa email + selecciona centro (mismo pattern que login)
3. `POST /api/auth/forgot-password` con `{ email, centerId }`
4. Backend valida:
   - Rate limit: max 3 requests por email+centerId en 1 hora (cuenta en `LoginAttempt` con `success: false` y tipo "reset")
   - Busca usuario por email + centro
   - Si no existe: responde 200 igual (no revelar si el email existe)
5. Genera token: `crypto.randomBytes(32).toString("hex")` (64 chars hex)
6. Crea `PasswordResetToken` con `expiresAt = now + 1 hora`
7. Envía email con link: `{baseUrl}/auth/reset-password?token={token}`
8. Responde 200: "Si el email existe, recibirás un enlace"

### Página de reset: `/auth/reset-password`

1. Lee `token` del query param
2. `POST /api/auth/reset-password` con `{ token, newPassword }`
3. Backend valida:
   - Token existe, no usado (`usedAt` null), no expirado (`expiresAt > now`)
   - Password cumple mínimo 8 caracteres
4. Actualiza `passwordHash` del usuario
5. Marca token como usado (`usedAt = now`)
6. Invalida sesiones: incrementar un `tokenVersion` o cambiar el JWT secret salt (ver sección Session Refresh)
7. Redirige a `/auth/login?reset=1` con mensaje de éxito

### Email

**Subject:** `Recupera tu contraseña — {centerName}`
**Body:**
- Greeting con nombre
- "Solicitaste recuperar tu contraseña"
- Botón CTA: "Crear nueva contraseña" → link con token
- "Este enlace expira en 1 hora"
- "Si no solicitaste esto, ignora este correo"
- Footer con centro

**Preference key:** No configurable (siempre se envía, es transaccional de seguridad).

---

## 2. Email Verification (obligatoria)

### Flujo post-signup (credentials)

1. Signup crea usuario normalmente (como ahora)
2. Además genera `EmailVerificationToken` con `expiresAt = now + 24 horas`
3. Envía email con link: `{baseUrl}/auth/verify-email?token={token}`
4. Redirige a `/auth/login?registered=1&verify=1`

### Flujo post-signup (Google OAuth)

- `emailVerifiedAt = now()` automáticamente (Google ya verificó)
- No se envía email de verificación

### Estado no verificado

- El usuario puede hacer login normalmente
- En el panel, ve un banner sticky arriba: "Verifica tu email para acceder a todas las funciones. [Reenviar email]"
- **Acciones bloqueadas** hasta verificar:
  - Reservar clase
  - Canjear lección on-demand
  - Comprar plan / checkout
- **Acciones permitidas** sin verificar:
  - Ver panel, navegar
  - Ver perfil, cambiar datos
  - Ver catálogo, ver Replay (explorar sin actuar)

### Verificación

1. Click en link del email → `GET /auth/verify-email?token={token}`
2. La página server component valida el token
3. Si válido: marca `emailVerifiedAt = now()`, marca token como usado
4. Redirige a `/panel?verified=1` con mensaje de éxito
5. Si inválido/expirado: muestra error con botón "Reenviar email de verificación"

### Reenvío

- Botón en banner del panel y en página de error de verificación
- `POST /api/auth/resend-verification`
- Rate limit: max 3 reenvíos por usuario en 1 hora
- Invalida tokens anteriores no usados (solo el último es válido)

### Email

**Subject:** `Verifica tu email — {centerName}`
**Body:**
- Greeting
- "Confirma tu email para acceder a todas las funciones"
- Botón CTA: "Verificar email" → link con token
- "Este enlace expira en 24 horas"

---

## 3. Google OAuth + Account Linking

### Configuración

- Agregar `Google` provider a `auth.ts` (NextAuth config)
- Variables de entorno: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Authorized redirect URI en Google Cloud Console: `{domain}/api/auth/callback/google` (uno por dominio de centro)

### Flujo

1. Usuario ve botón "Continuar con Google" en login y signup
2. Click → redirect a Google → autoriza → callback con `{ email, name, googleId, image }`
3. Backend en el callback de NextAuth (`signIn` callback):

**Caso A: Email ya existe en el centro**
- Vincula `googleId` al User existente (si no tenía)
- Si `emailVerifiedAt` es null, lo marca como verificado
- Login directo

**Caso B: Email no existe en el centro**
- Crea User con `{ email, name, googleId, emailVerifiedAt: now(), passwordHash: null }`
- Crea UserCenterRole con rol STUDENT
- Envía welcome email
- Login directo

**Caso C: Email existe pero en otro centro**
- Crea UserCenterRole para el nuevo centro (mismo User)
- Vincula googleId si no tenía
- Login directo

### CenterId en Google OAuth

El centerId se determina de una de estas formas:
- **Por dominio:** middleware o config mapea dominio → centerId
- **Por query param:** `/auth/login?centerId=cuerporaiz` → se pasa como state en el OAuth flow
- **Por cookie/session:** el centro se guarda en una cookie temporal antes de iniciar el flow

Recomendación: **query param pasado como state**. El botón "Continuar con Google" incluye el centerId actual como parámetro. NextAuth lo persiste en el flow y lo recupera en el callback.

### Usuarios sin password

- Si `passwordHash` es null, el usuario solo puede hacer login con Google
- En perfil, ven un campo "Crear contraseña" (en vez de "Cambiar contraseña")
- Al crear contraseña, se guarda `passwordHash` y pueden usar ambos métodos

### UI

- Botón "Continuar con Google" con logo de Google en login y signup
- Separador "o" entre Google y credentials form
- Si el usuario tiene `googleId`, en perfil se muestra "Cuenta vinculada con Google ✓"

---

## 4. Rate Limiting (DB)

### Tabla LoginAttempt

Registra cada intento de login, forgot password, y signup.

### Límites

| Acción | Límite | Ventana | Key |
|--------|--------|---------|-----|
| Login (failed) | 5 intentos | 15 min | email + centerId |
| Forgot password | 3 requests | 1 hora | email + centerId |
| Signup | 5 registros | 1 hora | IP |
| Resend verification | 3 reenvíos | 1 hora | userId |

### Implementación

Utility function `checkRateLimit(key, maxAttempts, windowMinutes)`:
1. Cuenta registros en LoginAttempt donde `key` matches y `createdAt > now - window`
2. Si count >= max: retorna `{ allowed: false, retryAfter: seconds }`
3. Si allowed: registra el nuevo intento
4. Retorna `{ allowed: true }`

### Respuesta al usuario

Cuando rate limited: HTTP 429 con `{ code: "RATE_LIMITED", retryAfter: 900 }` (segundos).
UI muestra: "Demasiados intentos. Espera {X} minutos e intenta de nuevo."

### Limpieza

LoginAttempt records > 24 horas se pueden limpiar con un cron job (Vercel Cron) o dejar que crezcan (son pequeños, ~100 bytes cada uno). Para MVP: no limpiar, solo indexar bien.

---

## 5. Session Refresh

### Problema

Después de cambiar o resetear contraseña, las sesiones existentes (JWT) siguen siendo válidas por hasta 24 horas.

### Solución

Agregar campo `tokenVersion` (Int, default 0) al modelo User. Cada vez que se cambia la contraseña:
1. Incrementar `tokenVersion`
2. El JWT contiene `tokenVersion` al momento de la emisión
3. En el callback `jwt` de NextAuth, comparar `token.tokenVersion` con el de la DB
4. Si no coincide: invalidar la sesión (retornar null → forzar re-login)

### Cuándo incrementar tokenVersion

- Cambio de contraseña (perfil)
- Reset de contraseña (forgot password flow)
- Vinculación de cuenta Google (por seguridad)

### Impacto

- El JWT callback ya existe en `auth.ts` — solo agregar la verificación de version
- **Trade-off:** una query extra por request para verificar version. Aceptable dado que ya hacemos queries de sesión.
- Alternativa: verificar solo cada N minutos (ej. guardar `lastChecked` en el token y re-verificar cada 5 min). Recomiendo esto para no pegar a la DB en cada request.

---

## Páginas nuevas

| Ruta | Tipo | Descripción |
|------|------|-------------|
| `/auth/forgot-password` | Pública | Form: email + centro → envía email de reset |
| `/auth/reset-password` | Pública | Form: nueva contraseña (lee token de query) |
| `/auth/verify-email` | Pública | Server component que valida token → redirige |

## Páginas modificadas

| Ruta | Cambio |
|------|--------|
| `/auth/login` | Agregar botón Google, link a forgot password, mensaje post-reset |
| `/auth/signup` | Agregar botón Google |
| `/panel/layout.tsx` | Banner de verificación de email si `emailVerifiedAt` es null |
| `/panel/mi-perfil` | "Crear contraseña" si no tiene, "Vinculada con Google ✓" |

## API Routes nuevas

| Method | Route | Auth | Descripción |
|--------|-------|------|-------------|
| POST | `/api/auth/forgot-password` | No | Envía email de reset |
| POST | `/api/auth/reset-password` | No | Valida token + cambia password |
| GET | `/auth/verify-email` | No | Page server component que verifica token |
| POST | `/api/auth/resend-verification` | Sí | Reenvía email de verificación |

## API Routes modificadas

| Route | Cambio |
|-------|--------|
| `POST /api/auth/signup` | Genera verification token + envía email de verificación |
| NextAuth config (`auth.ts`) | Agregar Google provider + account linking logic + tokenVersion check |

## Emails nuevos

| Email | Subject | Trigger |
|-------|---------|---------|
| `forgotPassword` | "Recupera tu contraseña — {center}" | POST forgot-password |
| `emailVerification` | "Verifica tu email — {center}" | Signup o resend |

## Testing

### Unit tests
- Token generation + validation (expiry, used, not found)
- Rate limit logic (allow, block, window expiry)
- Account linking logic (existing user, new user, cross-center)
- Password reset flow (valid token, expired, already used)

### E2E tests
- Forgot password: request → email link → reset → login con nueva password
- Signup → banner de verificación visible → verify → banner desaparece
- Google OAuth: login → creates account (mock Google provider en E2E)
- Rate limiting: 6 intentos fallidos → muestra error de rate limit

---

## Scope — Qué NO incluye

- MFA / 2FA
- Apple Sign In, Facebook Login (futuro: agregar provider a NextAuth)
- CAPTCHA (futuro: agregar si hay spam)
- Magic links (login sin password vía email)
- Account deletion / GDPR self-service
- Admin-side user blocking/banning
- Audit log de auth events (más allá de LoginAttempt)
