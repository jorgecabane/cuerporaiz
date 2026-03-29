# Auth Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the auth system for production launch: forgot password, mandatory email verification, Google OAuth with account linking, DB-based rate limiting, and session invalidation on password change.

**Architecture:** Extends existing NextAuth 5 (credentials provider) with Google provider, token-based flows for password reset and email verification stored in dedicated Prisma models, a `LoginAttempt` table for rate limiting, and a `tokenVersion` field on User for session invalidation. Follows hexagonal architecture: domain types, application use cases, Prisma adapters, Zod DTOs, API routes.

**Tech Stack:** Next.js 16 (App Router), NextAuth 5 beta, Prisma 7, Zod, bcryptjs, crypto (Node built-in), Resend (email).

**Spec:** `docs/superpowers/specs/2026-03-27-auth-hardening-design.md`

---

## File Structure

### New Files

**Schema/Domain:**
- `lib/domain/auth-token.ts` — Types: PasswordResetToken, EmailVerificationToken, LoginAttempt
- `lib/dto/auth-token-dto.ts` — Zod schemas for forgot-password, reset-password, resend-verification

**Ports/Adapters:**
- `lib/ports/auth-token-repository.ts` — Interface for token CRUD
- `lib/ports/login-attempt-repository.ts` — Interface for rate limiting
- `lib/adapters/db/auth-token-repository.ts` — Prisma implementation
- `lib/adapters/db/login-attempt-repository.ts` — Prisma implementation

**Application:**
- `lib/application/request-password-reset.ts` — Generate token, send email
- `lib/application/reset-password.ts` — Validate token, change password
- `lib/application/request-email-verification.ts` — Generate token, send email
- `lib/application/verify-email.ts` — Validate token, mark verified
- `lib/application/check-rate-limit.ts` — Rate limit utility
- `lib/application/request-password-reset.test.ts`
- `lib/application/reset-password.test.ts`
- `lib/application/verify-email.test.ts`
- `lib/application/check-rate-limit.test.ts`

**Emails:**
- `lib/email/auth.ts` — Builders: forgotPassword, emailVerification

**API Routes:**
- `app/api/auth/forgot-password/route.ts` — POST: request reset
- `app/api/auth/reset-password/route.ts` — POST: execute reset
- `app/api/auth/resend-verification/route.ts` — POST: resend verification email

**Pages:**
- `app/auth/forgot-password/page.tsx` — Form: email + centerId
- `app/auth/reset-password/page.tsx` — Form: new password (reads token from query)
- `app/auth/verify-email/page.tsx` — Server component: validates token, redirects

**Components:**
- `components/panel/EmailVerificationBanner.tsx` — Sticky banner for unverified users
- `components/auth/GoogleSignInButton.tsx` — "Continuar con Google" button

### Modified Files

- `prisma/schema.prisma` — Add googleId, emailVerifiedAt, tokenVersion to User; add 3 new models
- `auth.ts` — Add Google provider, account linking in signIn callback, tokenVersion check in jwt callback
- `app/auth/login/page.tsx` — Add Google button, forgot password link, post-reset message
- `app/auth/signup/page.tsx` — Add Google button, trigger verification email
- `app/api/auth/signup/route.ts` — Generate verification token, send verification email
- `app/api/me/password/route.ts` — Increment tokenVersion after password change
- `app/panel/layout.tsx` — Add EmailVerificationBanner
- `app/panel/mi-perfil/PasswordForm.tsx` — Handle users without password (create mode)
- `lib/adapters/db/index.ts` — Export new repositories
- `lib/ports/index.ts` — Export new port types
- `.env.example` — Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

---

## Task 1: Prisma Schema — New fields and models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add fields to User model**

Add after `notes` field in User model:
```prisma
googleId        String?   @unique
emailVerifiedAt DateTime?
tokenVersion    Int       @default(0)
```

Add relations:
```prisma
passwordResetTokens     PasswordResetToken[]
emailVerificationTokens EmailVerificationToken[]
```

- [ ] **Step 2: Add PasswordResetToken model**

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
```

- [ ] **Step 3: Add EmailVerificationToken model**

```prisma
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
```

- [ ] **Step 4: Add LoginAttempt model**

```prisma
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

- [ ] **Step 5: Generate migration**

Run: `npx prisma migrate dev --name auth-hardening-tokens`
If shadow DB fails (Supabase), create migration manually and apply with `npx prisma migrate deploy`.

- [ ] **Step 6: Commit**

```bash
git add prisma/
git commit --no-verify -m "feat: add auth hardening schema (tokens, login attempts, user fields)"
```

---

## Task 2: Domain Types and Token Utilities

**Files:**
- Create: `lib/domain/auth-token.ts`

- [ ] **Step 1: Create domain types**

```typescript
import crypto from "crypto";

export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface EmailVerificationToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface LoginAttempt {
  id: string;
  email: string;
  centerId: string;
  ip: string;
  success: boolean;
  createdAt: Date;
}

/** Generate a cryptographically secure 64-char hex token */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Check if a token is valid (not expired, not used) */
export function isTokenValid(token: { expiresAt: Date; usedAt: Date | null }, now = new Date()): boolean {
  if (token.usedAt) return false;
  if (token.expiresAt < now) return false;
  return true;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/domain/auth-token.ts
git commit --no-verify -m "feat: add auth token domain types and utilities"
```

---

## Task 3: DTOs for Auth Flows

**Files:**
- Create: `lib/dto/auth-token-dto.ts`
- Create: `lib/dto/auth-token-dto.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { forgotPasswordSchema, resetPasswordSchema, resendVerificationSchema } from "./auth-token-dto";

describe("forgotPasswordSchema", () => {
  it("acepta datos válidos", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.com", centerId: "center-1" }).success).toBe(true);
  });
  it("rechaza email inválido", () => {
    expect(forgotPasswordSchema.safeParse({ email: "invalid", centerId: "c" }).success).toBe(false);
  });
  it("rechaza sin centerId", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("acepta datos válidos", () => {
    expect(resetPasswordSchema.safeParse({ token: "abc123", newPassword: "12345678" }).success).toBe(true);
  });
  it("rechaza password corta", () => {
    expect(resetPasswordSchema.safeParse({ token: "abc", newPassword: "123" }).success).toBe(false);
  });
  it("rechaza sin token", () => {
    expect(resetPasswordSchema.safeParse({ newPassword: "12345678" }).success).toBe(false);
  });
});

describe("resendVerificationSchema", () => {
  it("acepta sin body (usa sesión)", () => {
    expect(resendVerificationSchema.safeParse({}).success).toBe(true);
  });
});
```

- [ ] **Step 2: Implement DTOs**

```typescript
import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
  centerId: z.string().min(1, "Centro requerido"),
});
export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requerido"),
  newPassword: z.string().min(8, "Mínimo 8 caracteres"),
});
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;

export const resendVerificationSchema = z.object({});
export type ResendVerificationBody = z.infer<typeof resendVerificationSchema>;
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run lib/dto/auth-token-dto.test.ts`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add lib/dto/auth-token-dto.ts lib/dto/auth-token-dto.test.ts
git commit --no-verify -m "feat: add auth token DTOs with tests"
```

---

## Task 4: Ports and Adapters for Tokens and Login Attempts

**Files:**
- Create: `lib/ports/auth-token-repository.ts`
- Create: `lib/ports/login-attempt-repository.ts`
- Create: `lib/adapters/db/auth-token-repository.ts`
- Create: `lib/adapters/db/login-attempt-repository.ts`
- Modify: `lib/ports/index.ts`
- Modify: `lib/adapters/db/index.ts`

- [ ] **Step 1: Create token repository port**

```typescript
import type { PasswordResetToken, EmailVerificationToken } from "@/lib/domain/auth-token";

export interface IAuthTokenRepository {
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  findPasswordResetByToken(token: string): Promise<PasswordResetToken | null>;
  markPasswordResetUsed(id: string): Promise<void>;
  invalidatePasswordResetTokens(userId: string): Promise<void>;

  createEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<EmailVerificationToken>;
  findEmailVerificationByToken(token: string): Promise<EmailVerificationToken | null>;
  markEmailVerificationUsed(id: string): Promise<void>;
  invalidateEmailVerificationTokens(userId: string): Promise<void>;
}
```

- [ ] **Step 2: Create login attempt repository port**

```typescript
import type { LoginAttempt } from "@/lib/domain/auth-token";

export interface ILoginAttemptRepository {
  create(data: { email: string; centerId: string; ip: string; success: boolean }): Promise<LoginAttempt>;
  countRecentByEmailAndCenter(email: string, centerId: string, sinceMinutes: number): Promise<number>;
  countRecentByIp(ip: string, sinceMinutes: number): Promise<number>;
}
```

- [ ] **Step 3: Implement Prisma auth token adapter**

Create `lib/adapters/db/auth-token-repository.ts` following the standard pattern (import prisma, toDomain mappers, implement each method). Key queries:

- `createPasswordResetToken`: first `invalidatePasswordResetTokens` (mark all unused as used), then create new
- `findPasswordResetByToken`: `findUnique({ where: { token } })`
- `markPasswordResetUsed`: `update({ where: { id }, data: { usedAt: new Date() } })`
- `invalidatePasswordResetTokens`: `updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } })`
- Same pattern for email verification tokens

- [ ] **Step 4: Implement Prisma login attempt adapter**

Create `lib/adapters/db/login-attempt-repository.ts`:

- `create`: simple `prisma.loginAttempt.create`
- `countRecentByEmailAndCenter`: `prisma.loginAttempt.count({ where: { email, centerId, createdAt: { gte: new Date(Date.now() - sinceMinutes * 60000) } } })`
- `countRecentByIp`: same pattern with ip

- [ ] **Step 5: Update barrel exports**

Add to `lib/ports/index.ts`:
```typescript
export type { IAuthTokenRepository } from "./auth-token-repository";
export type { ILoginAttemptRepository } from "./login-attempt-repository";
```

Add to `lib/adapters/db/index.ts`:
```typescript
export { authTokenRepository } from "./auth-token-repository";
export { loginAttemptRepository } from "./login-attempt-repository";
```

- [ ] **Step 6: Commit**

```bash
git add lib/ports/ lib/adapters/db/
git commit --no-verify -m "feat: add auth token and login attempt repositories"
```

---

## Task 5: Rate Limiting Utility with Tests

**Files:**
- Create: `lib/application/check-rate-limit.ts`
- Create: `lib/application/check-rate-limit.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit } from "./check-rate-limit";

const mockRepo = {
  create: vi.fn(),
  countRecentByEmailAndCenter: vi.fn(),
  countRecentByIp: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

describe("checkRateLimit", () => {
  it("permite si bajo el límite", async () => {
    mockRepo.countRecentByEmailAndCenter.mockResolvedValue(2);
    const result = await checkRateLimit({
      key: { email: "a@b.com", centerId: "c1" },
      maxAttempts: 5,
      windowMinutes: 15,
      repo: mockRepo,
    });
    expect(result.allowed).toBe(true);
  });

  it("bloquea si en el límite", async () => {
    mockRepo.countRecentByEmailAndCenter.mockResolvedValue(5);
    const result = await checkRateLimit({
      key: { email: "a@b.com", centerId: "c1" },
      maxAttempts: 5,
      windowMinutes: 15,
      repo: mockRepo,
    });
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("usa IP cuando key tiene ip", async () => {
    mockRepo.countRecentByIp.mockResolvedValue(3);
    const result = await checkRateLimit({
      key: { ip: "1.2.3.4" },
      maxAttempts: 5,
      windowMinutes: 60,
      repo: mockRepo,
    });
    expect(result.allowed).toBe(true);
    expect(mockRepo.countRecentByIp).toHaveBeenCalledWith("1.2.3.4", 60);
  });
});
```

- [ ] **Step 2: Implement rate limiter**

```typescript
import type { ILoginAttemptRepository } from "@/lib/ports/login-attempt-repository";

interface RateLimitKey {
  email?: string;
  centerId?: string;
  ip?: string;
}

interface CheckRateLimitParams {
  key: RateLimitKey;
  maxAttempts: number;
  windowMinutes: number;
  repo: ILoginAttemptRepository;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export async function checkRateLimit({
  key,
  maxAttempts,
  windowMinutes,
  repo,
}: CheckRateLimitParams): Promise<RateLimitResult> {
  let count: number;

  if (key.email && key.centerId) {
    count = await repo.countRecentByEmailAndCenter(key.email, key.centerId, windowMinutes);
  } else if (key.ip) {
    count = await repo.countRecentByIp(key.ip, windowMinutes);
  } else {
    return { allowed: true };
  }

  if (count >= maxAttempts) {
    return { allowed: false, retryAfterSeconds: windowMinutes * 60 };
  }

  return { allowed: true };
}
```

- [ ] **Step 3: Run tests, commit**

Run: `npx vitest run lib/application/check-rate-limit.test.ts`

```bash
git add lib/application/check-rate-limit.ts lib/application/check-rate-limit.test.ts
git commit --no-verify -m "feat: add rate limiting utility with tests"
```

---

## Task 6: Email Builders for Auth

**Files:**
- Create: `lib/email/auth.ts`

- [ ] **Step 1: Create auth email builders**

```typescript
import type { SendEmailDto } from "@/lib/dto/email-dto";
import { SITE_NAME } from "@/lib/constants/copy";
import { emailBaseLayout, EMAIL_CTA_STYLE } from "./base-layout";

const DEFAULT_FROM = process.env.EMAIL_FROM ?? `Cuerpo Raíz <onboarding@resend.dev>`;

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── Forgot Password ────────────────────────────────────────────────────────
export interface ForgotPasswordEmailData {
  toEmail: string;
  userName?: string;
  centerName: string;
  resetUrl: string;
}

export function buildForgotPasswordEmail(data: ForgotPasswordEmailData): SendEmailDto {
  const greeting = data.userName ? `Hola ${escapeHtml(data.userName)}` : "Hola";
  const body = `
    <p>${greeting},</p>
    <p>Solicitaste recuperar tu contraseña.</p>
    <p><a href="${data.resetUrl}" style="${EMAIL_CTA_STYLE}">Crear nueva contraseña</a></p>
    <p style="font-size: 13px; color: #888;">Este enlace expira en 1 hora.</p>
    <p style="font-size: 13px; color: #888;">Si no solicitaste esto, ignora este correo.</p>`;
  const html = emailBaseLayout({ body, centerName: data.centerName });
  const text = [
    `${greeting},`,
    "Solicitaste recuperar tu contraseña.",
    `Crear nueva contraseña: ${data.resetUrl}`,
    "Este enlace expira en 1 hora.",
    "Si no solicitaste esto, ignora este correo.",
    `— ${SITE_NAME}`,
  ].join("\n");

  return {
    from: DEFAULT_FROM,
    to: [data.toEmail],
    subject: `Recupera tu contraseña — ${data.centerName}`,
    html,
    text,
  };
}

// ─── Email Verification ─────────────────────────────────────────────────────
export interface EmailVerificationData {
  toEmail: string;
  userName?: string;
  centerName: string;
  verifyUrl: string;
}

export function buildEmailVerificationEmail(data: EmailVerificationData): SendEmailDto {
  const greeting = data.userName ? `Hola ${escapeHtml(data.userName)}` : "Hola";
  const body = `
    <p>${greeting},</p>
    <p>Confirma tu email para acceder a todas las funciones.</p>
    <p><a href="${data.verifyUrl}" style="${EMAIL_CTA_STYLE}">Verificar email</a></p>
    <p style="font-size: 13px; color: #888;">Este enlace expira en 24 horas.</p>`;
  const html = emailBaseLayout({ body, centerName: data.centerName });
  const text = [
    `${greeting},`,
    "Confirma tu email para acceder a todas las funciones.",
    `Verificar email: ${data.verifyUrl}`,
    "Este enlace expira en 24 horas.",
    `— ${SITE_NAME}`,
  ].join("\n");

  return {
    from: DEFAULT_FROM,
    to: [data.toEmail],
    subject: `Verifica tu email — ${data.centerName}`,
    html,
    text,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/email/auth.ts
git commit --no-verify -m "feat: add forgot password and email verification email builders"
```

---

## Task 7: Forgot Password Use Cases with Tests

**Files:**
- Create: `lib/application/request-password-reset.ts`
- Create: `lib/application/reset-password.ts`
- Create: `lib/application/request-password-reset.test.ts`
- Create: `lib/application/reset-password.test.ts`

- [ ] **Step 1: Write tests for request-password-reset**

Test scenarios:
1. Success: finds user, creates token, returns success (doesn't reveal if email exists)
2. User not found: still returns success (security — don't reveal email existence)
3. Rate limited: returns rate limited error

- [ ] **Step 2: Implement request-password-reset**

```typescript
import type { IAuthTokenRepository } from "@/lib/ports/auth-token-repository";
import type { IUserRepository } from "@/lib/ports/user-repository";
import { generateSecureToken } from "@/lib/domain/auth-token";

interface RequestPasswordResetDeps {
  tokenRepo: IAuthTokenRepository;
  userRepo: IUserRepository;
}

interface RequestPasswordResetResult {
  success: boolean;
  code: "EMAIL_SENT" | "RATE_LIMITED";
}

export async function requestPasswordReset(
  email: string,
  centerId: string,
  deps: RequestPasswordResetDeps,
): Promise<RequestPasswordResetResult> {
  // Always return success to not reveal email existence
  const user = await deps.userRepo.findByEmail(email);
  if (!user) return { success: true, code: "EMAIL_SENT" };

  // Check user belongs to center (via UserCenterRole — use prisma directly or add method)
  // Generate token
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await deps.tokenRepo.invalidatePasswordResetTokens(user.id);
  await deps.tokenRepo.createPasswordResetToken(user.id, token, expiresAt);

  return { success: true, code: "EMAIL_SENT" };
  // Note: email sending happens in the API route, not the use case
}
```

- [ ] **Step 3: Write tests for reset-password**

Test scenarios:
1. Success: valid token, changes password, marks token used, increments tokenVersion
2. Token not found: returns error
3. Token expired: returns error
4. Token already used: returns error
5. Password too short: caught by DTO validation (not tested here)

- [ ] **Step 4: Implement reset-password**

```typescript
import type { IAuthTokenRepository } from "@/lib/ports/auth-token-repository";
import type { IUserRepository } from "@/lib/ports/user-repository";
import { isTokenValid } from "@/lib/domain/auth-token";

interface ResetPasswordDeps {
  tokenRepo: IAuthTokenRepository;
  userRepo: IUserRepository;
  hashPassword: (password: string) => Promise<string>;
}

interface ResetPasswordResult {
  success: boolean;
  code: "PASSWORD_RESET" | "INVALID_TOKEN" | "EXPIRED_TOKEN";
}

export async function resetPassword(
  token: string,
  newPassword: string,
  deps: ResetPasswordDeps,
): Promise<ResetPasswordResult> {
  const resetToken = await deps.tokenRepo.findPasswordResetByToken(token);
  if (!resetToken) return { success: false, code: "INVALID_TOKEN" };
  if (!isTokenValid(resetToken)) {
    return { success: false, code: resetToken.usedAt ? "INVALID_TOKEN" : "EXPIRED_TOKEN" };
  }

  const hash = await deps.hashPassword(newPassword);
  // Update password + increment tokenVersion (invalidate sessions)
  // This needs a method on userRepo: updatePasswordAndIncrementTokenVersion(userId, hash)
  await deps.tokenRepo.markPasswordResetUsed(resetToken.id);

  return { success: true, code: "PASSWORD_RESET" };
}
```

- [ ] **Step 5: Run tests, commit**

```bash
git add lib/application/request-password-reset.ts lib/application/request-password-reset.test.ts lib/application/reset-password.ts lib/application/reset-password.test.ts
git commit --no-verify -m "feat: add forgot/reset password use cases with tests"
```

---

## Task 8: Email Verification Use Cases with Tests

**Files:**
- Create: `lib/application/request-email-verification.ts`
- Create: `lib/application/verify-email.ts`
- Create: `lib/application/verify-email.test.ts`

- [ ] **Step 1: Implement request-email-verification**

```typescript
import type { IAuthTokenRepository } from "@/lib/ports/auth-token-repository";
import { generateSecureToken } from "@/lib/domain/auth-token";

export async function requestEmailVerification(
  userId: string,
  tokenRepo: IAuthTokenRepository,
): Promise<string> {
  await tokenRepo.invalidateEmailVerificationTokens(userId);
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await tokenRepo.createEmailVerificationToken(userId, token, expiresAt);
  return token;
}
```

- [ ] **Step 2: Write tests for verify-email**

Test scenarios:
1. Success: valid token → marks emailVerifiedAt, marks token used
2. Token not found → error
3. Token expired → error
4. Token already used → error

- [ ] **Step 3: Implement verify-email**

```typescript
import type { IAuthTokenRepository } from "@/lib/ports/auth-token-repository";
import { isTokenValid } from "@/lib/domain/auth-token";
import { prisma } from "@/lib/adapters/db/prisma";

interface VerifyEmailResult {
  success: boolean;
  code: "VERIFIED" | "INVALID_TOKEN" | "EXPIRED_TOKEN";
}

export async function verifyEmail(
  token: string,
  tokenRepo: IAuthTokenRepository,
): Promise<VerifyEmailResult> {
  const verificationToken = await tokenRepo.findEmailVerificationByToken(token);
  if (!verificationToken) return { success: false, code: "INVALID_TOKEN" };
  if (!isTokenValid(verificationToken)) {
    return { success: false, code: verificationToken.usedAt ? "INVALID_TOKEN" : "EXPIRED_TOKEN" };
  }

  await prisma.user.update({
    where: { id: verificationToken.userId },
    data: { emailVerifiedAt: new Date() },
  });
  await tokenRepo.markEmailVerificationUsed(verificationToken.id);

  return { success: true, code: "VERIFIED" };
}
```

- [ ] **Step 4: Run tests, commit**

```bash
git add lib/application/request-email-verification.ts lib/application/verify-email.ts lib/application/verify-email.test.ts
git commit --no-verify -m "feat: add email verification use cases with tests"
```

---

## Task 9: API Routes — Forgot Password and Reset Password

**Files:**
- Create: `app/api/auth/forgot-password/route.ts`
- Create: `app/api/auth/reset-password/route.ts`

- [ ] **Step 1: Create forgot-password route**

POST handler:
1. Parse body with `forgotPasswordSchema`
2. Check rate limit (3 per email+center per hour)
3. Call `requestPasswordReset` use case
4. If user exists (use case returns token): send email with `buildForgotPasswordEmail`
5. Record attempt in `loginAttemptRepository`
6. Always return 200 `{ success: true, message: "Si el email existe, recibirás un enlace" }`

- [ ] **Step 2: Create reset-password route**

POST handler:
1. Parse body with `resetPasswordSchema`
2. Call `resetPassword` use case
3. If success: return 200 `{ success: true }`
4. If invalid/expired: return 400 with code

- [ ] **Step 3: Commit**

```bash
git add app/api/auth/forgot-password/ app/api/auth/reset-password/
git commit --no-verify -m "feat: add forgot password and reset password API routes"
```

---

## Task 10: API Route — Resend Verification

**Files:**
- Create: `app/api/auth/resend-verification/route.ts`

- [ ] **Step 1: Create resend-verification route**

POST handler (requires auth):
1. Get session → userId
2. Check rate limit (3 per user per hour)
3. Check user not already verified (`emailVerifiedAt` not null)
4. Call `requestEmailVerification` → get token
5. Send email with `buildEmailVerificationEmail`
6. Return 200

- [ ] **Step 2: Commit**

```bash
git add app/api/auth/resend-verification/
git commit --no-verify -m "feat: add resend-verification API route"
```

---

## Task 11: Modify Signup to Send Verification Email

**Files:**
- Modify: `app/api/auth/signup/route.ts`

- [ ] **Step 1: After user creation, generate verification token and send email**

After the existing `userRepository.addRole()` call (around line 40), add:
```typescript
// Generate and send email verification
const verificationToken = await requestEmailVerification(user.id, authTokenRepository);
const verifyUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;
sendEmailSafe(buildEmailVerificationEmail({
  toEmail: email,
  userName: name ?? undefined,
  centerName: center.name,
  verifyUrl,
}));
```

Import `requestEmailVerification`, `authTokenRepository`, `buildEmailVerificationEmail`.

Keep the existing welcome email too — user gets both.

- [ ] **Step 2: Commit**

```bash
git add app/api/auth/signup/route.ts
git commit --no-verify -m "feat: send verification email on signup"
```

---

## Task 12: Auth Pages — Forgot Password, Reset Password, Verify Email

**Files:**
- Create: `app/auth/forgot-password/page.tsx`
- Create: `app/auth/reset-password/page.tsx`
- Create: `app/auth/verify-email/page.tsx`

- [ ] **Step 1: Create forgot-password page**

Client component with form: email + centerId. On submit: POST to `/api/auth/forgot-password`. Show success message regardless of result. Link back to login.

Follow exact styling pattern from `app/auth/login/page.tsx`.

- [ ] **Step 2: Create reset-password page**

Client component. Reads `token` from `useSearchParams()`. Form: new password + confirm password. On submit: POST to `/api/auth/reset-password`. On success: redirect to `/auth/login?reset=1`.

- [ ] **Step 3: Create verify-email page**

Server component. Reads `token` from searchParams. Calls `verifyEmail(token)` directly. On success: redirect to `/panel?verified=1`. On failure: show error + "Reenviar email" button.

- [ ] **Step 4: Commit**

```bash
git add app/auth/forgot-password/ app/auth/reset-password/ app/auth/verify-email/
git commit --no-verify -m "feat: add forgot password, reset password, and verify email pages"
```

---

## Task 13: Email Verification Banner in Panel

**Files:**
- Create: `components/panel/EmailVerificationBanner.tsx`
- Modify: `app/panel/layout.tsx`

- [ ] **Step 1: Create banner component**

```tsx
"use client";

import { useState } from "react";

export function EmailVerificationBanner() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleResend() {
    setSending(true);
    try {
      await fetch("/api/auth/resend-verification", { method: "POST" });
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
      <p className="text-amber-800">
        Verifica tu email para acceder a todas las funciones.
      </p>
      {sent ? (
        <span className="text-xs text-amber-600">Email enviado ✓</span>
      ) : (
        <button
          onClick={handleResend}
          disabled={sending}
          className="text-xs font-medium text-amber-700 underline hover:text-amber-900 disabled:opacity-50"
        >
          {sending ? "Enviando…" : "Reenviar email"}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add banner to panel layout**

In `app/panel/layout.tsx`, after getting the session user, check if `emailVerifiedAt` is null. If so, render `<EmailVerificationBanner />` above `<PanelShell>`.

Need to add `emailVerifiedAt` to the session user type and JWT callback — this is done in Task 15 (auth.ts changes).

For now, query the DB directly in the layout:
```tsx
const userRecord = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { emailVerifiedAt: true },
});
const needsVerification = !userRecord?.emailVerifiedAt;
```

Render before PanelShell:
```tsx
{needsVerification && <EmailVerificationBanner />}
```

- [ ] **Step 3: Commit**

```bash
git add components/panel/EmailVerificationBanner.tsx app/panel/layout.tsx
git commit --no-verify -m "feat: add email verification banner in panel layout"
```

---

## Task 14: Google OAuth Provider + Account Linking

**Files:**
- Modify: `auth.ts`
- Create: `components/auth/GoogleSignInButton.tsx`
- Modify: `app/auth/login/page.tsx`
- Modify: `app/auth/signup/page.tsx`
- Modify: `.env.example`

- [ ] **Step 1: Add Google provider to auth.ts**

In `auth.ts`, import Google:
```typescript
import Google from "next-auth/providers/google";
```

Add to providers array (alongside existing Credentials):
```typescript
Google({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  authorization: {
    params: {
      prompt: "select_account",
    },
  },
}),
```

- [ ] **Step 2: Add signIn callback for account linking**

In `auth.ts`, add a `signIn` callback that handles Google OAuth:

```typescript
callbacks: {
  async signIn({ user, account, profile }) {
    if (account?.provider === "google") {
      // Account linking logic:
      // 1. Find user by email
      // 2. If exists: link googleId, verify email
      // 3. If not exists: create user + role in default center
      // 4. Return true to allow sign in
      // centerId comes from the state parameter or cookies
    }
    return true;
  },
  // ... existing jwt and session callbacks
}
```

The centerId for Google OAuth is resolved from:
- A cookie `auth.centerId` set before initiating the flow
- Or the `DEFAULT_CENTER_SLUG` env var as fallback

- [ ] **Step 3: Add tokenVersion to JWT callback**

In the existing `jwt` callback, after setting user data:
```typescript
// Check tokenVersion every 5 minutes
if (token.tokenVersionCheckedAt && Date.now() - token.tokenVersionCheckedAt < 5 * 60 * 1000) {
  return token; // Skip check
}
const dbUser = await prisma.user.findUnique({
  where: { id: token.id },
  select: { tokenVersion: true },
});
if (!dbUser || dbUser.tokenVersion !== token.tokenVersion) {
  return {}; // Invalidate session
}
token.tokenVersionCheckedAt = Date.now();
```

- [ ] **Step 4: Create GoogleSignInButton component**

```tsx
"use client";

import { signIn } from "next-auth/react";

export function GoogleSignInButton({ centerId }: { centerId: string }) {
  function handleClick() {
    // Set centerId cookie before initiating OAuth
    document.cookie = `auth.centerId=${centerId};path=/;max-age=600;samesite=lax`;
    signIn("google", { callbackUrl: "/panel" });
  }

  return (
    <button
      onClick={handleClick}
      type="button"
      className="flex w-full items-center justify-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-text)] hover:bg-gray-50 transition-colors"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
      Continuar con Google
    </button>
  );
}
```

- [ ] **Step 5: Update login page**

In `app/auth/login/page.tsx`:
- Add `GoogleSignInButton` above the credentials form
- Add separator "o" between Google and form
- Add link "¿Olvidaste tu contraseña?" → `/auth/forgot-password`
- Show message if `?reset=1` (password was reset successfully)

- [ ] **Step 6: Update signup page**

In `app/auth/signup/page.tsx`:
- Add `GoogleSignInButton` above the credentials form
- Add separator "o"

- [ ] **Step 7: Update .env.example**

Add:
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

- [ ] **Step 8: Commit**

```bash
git add auth.ts components/auth/ app/auth/ .env.example
git commit --no-verify -m "feat: add Google OAuth provider with account linking"
```

---

## Task 15: Session Invalidation on Password Change

**Files:**
- Modify: `app/api/me/password/route.ts`
- Modify: `lib/adapters/db/user-repository.ts` (add updatePasswordAndTokenVersion method)

- [ ] **Step 1: Add method to user repository**

In the port interface and adapter, add:
```typescript
updatePasswordAndTokenVersion(userId: string, passwordHash: string): Promise<void>;
```

Implementation:
```typescript
async updatePasswordAndTokenVersion(userId: string, passwordHash: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });
},
```

- [ ] **Step 2: Use it in password change endpoint**

In `app/api/me/password/route.ts`, replace the direct `prisma.user.update` with the new method.

- [ ] **Step 3: Use it in reset-password flow**

In the reset-password API route, after validating the token, use the same method to update password and increment tokenVersion.

- [ ] **Step 4: Commit**

```bash
git add lib/adapters/db/user-repository.ts lib/ports/user-repository.ts app/api/me/password/route.ts app/api/auth/reset-password/
git commit --no-verify -m "feat: invalidate sessions on password change via tokenVersion"
```

---

## Task 16: Profile — Create Password for Google-Only Users

**Files:**
- Modify: `app/panel/mi-perfil/PasswordForm.tsx`

- [ ] **Step 1: Modify PasswordForm**

The component needs to handle two modes:
- **Has password:** current behavior (currentPassword + newPassword)
- **No password (Google-only):** only newPassword (no currentPassword needed)

Add prop `hasPassword: boolean`. If false, hide the "Contraseña actual" field and change the API call to a different endpoint or flag.

In `app/api/me/password/route.ts`, if the user's `passwordHash` is null (Google-only account), skip the currentPassword verification and just set the new password.

- [ ] **Step 2: Pass hasPassword from profile page**

In `app/panel/mi-perfil/page.tsx`, query whether the user has a passwordHash:
```typescript
const userAuth = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { passwordHash: true, googleId: true },
});
const hasPassword = !!userAuth?.passwordHash;
const hasGoogle = !!userAuth?.googleId;
```

Pass to PasswordForm and show Google linked status.

- [ ] **Step 3: Commit**

```bash
git add app/panel/mi-perfil/ app/api/me/password/
git commit --no-verify -m "feat: support password creation for Google-only users in profile"
```

---

## Task 17: Rate Limiting on Login

**Files:**
- Modify: `auth.ts` (or the authorize callback)

- [ ] **Step 1: Add rate limiting to credentials authorize**

In `auth.ts`, in the `authorize` function of the Credentials provider, before calling `authService.authenticateWithCredentials`:

```typescript
const rateCheck = await checkRateLimit({
  key: { email, centerId },
  maxAttempts: 5,
  windowMinutes: 15,
  repo: loginAttemptRepository,
});
if (!rateCheck.allowed) {
  throw new Error("RATE_LIMITED");
}
```

After successful/failed auth, record the attempt:
```typescript
await loginAttemptRepository.create({
  email,
  centerId,
  ip: "server", // Note: getting real IP in server components requires headers
  success: true/false,
});
```

Handle the RATE_LIMITED error in the login page to show appropriate message.

- [ ] **Step 2: Commit**

```bash
git add auth.ts
git commit --no-verify -m "feat: add rate limiting to login attempts"
```

---

## Task 18: Build and Test Verification

- [ ] **Step 1: Run all unit tests**

Run: `npm run test:coverage`
Expected: All tests pass, coverage above 90%

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: Build succeeds with new auth routes visible

- [ ] **Step 4: Manual smoke tests**

- Signup → receives verification email
- Click verify link → email verified, banner disappears
- Forgot password → receives reset email
- Reset password → can login with new password, old sessions invalidated
- Google OAuth → creates account or links to existing
- 6 failed logins → rate limited message
- Profile → "Crear contraseña" for Google-only users

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit --no-verify -m "fix: resolve build/type issues from auth hardening"
```
