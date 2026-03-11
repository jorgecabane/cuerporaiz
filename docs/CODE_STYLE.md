# Code style and conventions

Reference for contributors. See also [ARCHITECTURE.md](./ARCHITECTURE.md) for architecture and [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) for product context.

---

## Language: code in English

- **Variables, function names, types, and constants** must be in English.
- **Comments** should be in English so the codebase stays consistent and is readable by any developer.
- **Enum values and identifiers** (e.g. `ADMINISTRATOR`, `INSTRUCTOR`, `STUDENT`) are in English. No magic strings: use constants and helpers from the domain (e.g. `lib/domain/role`).
- **User-facing copy** (landing text, emails to end users, validation messages shown in the UI) may remain in Spanish until the app has i18n. Internal dev-only messages (e.g. logs, test fixtures) are preferred in English.

---

## Roles: centralised and typed

- Role values live in **`lib/domain/role.ts`**: `ROLES`, `ADMIN_ROLE`, `DEFAULT_SIGNUP_ROLE`, `ROLE_LABELS`, `isAdminRole()`, `isRole()`.
- The Prisma `Role` enum matches these values (ADMINISTRATOR, INSTRUCTOR, STUDENT).
- Never use string literals like `"ADMINISTRADORA"` or `"ADMINISTRATOR"` in business logic; use the constants or `isAdminRole(role)`.

---

## No magic numbers or strings

- Centralise constants (e.g. default signup role, admin role, status labels) in domain or ports.
- Use typed records (e.g. `Record<Role, string>`) for labels so every value is covered.

---

*Update this doc when new conventions are agreed.*
