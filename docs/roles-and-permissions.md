# Roles y Permisos

Cuerpo Raíz usa 3 roles asignados por centro (`UserCenterRole`). Un usuario puede tener diferentes roles en diferentes centros.

## Roles

| Rol | Código | Descripción |
|-----|--------|-------------|
| Administración | `ADMINISTRATOR` | Gestión completa del centro |
| Profesor | `INSTRUCTOR` | Dicta clases, toma asistencia |
| Estudiante | `STUDENT` | Reserva clases, compra planes |

## Permisos por Funcionalidad

### Panel Home

| Funcionalidad | Admin | Instructor | Student |
|--------------|-------|-----------|---------|
| Greeting + resumen de plan | Sí | Sí | Sí |
| Calendario: ver todas las clases | Sí | — | — |
| Calendario: ver mis clases (como profe) | — | Sí (solo las suyas) | — |
| Calendario: ver clases disponibles para reservar | — | — | Sí |
| Quick access: Horarios, Clientes, Pagos | Sí | — | — |
| Quick access: Mis clases (sheet) | — | Sí | — |
| Quick access: Mis reservas (sheet) | — | — | Sí |
| Quick access: Planes (tienda) | — | Sí | Sí |
| Quick access: Mis pagos | — | Deshabilitado | Sí |

### Reservas y Asistencia

| Funcionalidad | Admin | Instructor | Student |
|--------------|-------|-----------|---------|
| Reservar clase para sí mismo | — | — | Sí |
| Cancelar su propia reserva | — | — | Sí |
| Reservar por un estudiante | Sí | Sí* | — |
| Cancelar reserva de un estudiante | Sí | Sí | — |
| Marcar asistencia (ATTENDED/NO_SHOW) | Sí | Sí | — |
| Ver lista de estudiantes | Sí | Sí | — |
| Clase de prueba gratis | — | — | Sí (si habilitado) |

\* Requiere que el centro tenga `instructorCanReserveForStudent: true` (default: true).

### Administración (sidebar Admin)

| Funcionalidad | Admin | Instructor | Student |
|--------------|-------|-----------|---------|
| Horarios (crear/editar clases) | Sí | — | — |
| Disciplinas CRUD | Sí | — | — |
| Profesores (crear/desactivar) | Sí | — | — |
| Feriados | Sí | — | — |
| Clientes (lista + detalle) | Sí | — | — |
| Configuración del centro | Sí | — | — |
| Plugins (MercadoPago, Zoom, Meet) | Sí | — | — |
| Planes CRUD | Sí | — | — |
| On Demand (categorías, prácticas, lecciones) | Sí | — | — |
| Pagos (admin: ver todos, aprobar) | Sí | — | — |
| Sitio (branding, secciones, contacto) | Sí | — | — |

### Tienda y Pagos

| Funcionalidad | Admin | Instructor | Student |
|--------------|-------|-----------|---------|
| Ver planes disponibles | Sí | Sí | Sí |
| Comprar plan (pago único) | Sí | Sí | Sí |
| Suscribirse (recurrente) | Sí | Sí | Sí |
| Ver mis planes (activos/históricos) | Sí | Sí | Sí |
| Ver mis pagos | Sí | — | Sí |

### On Demand / Replay

| Funcionalidad | Admin | Instructor | Student |
|--------------|-------|-----------|---------|
| Catálogo público | Todos | Todos | Todos |
| Replay (videoteca) | Redirige a admin on-demand | Redirige a admin on-demand | Sí |
| Canjear clase grabada | — | — | Sí (con plan activo) |
| Admin CRUD categorías/prácticas/lecciones | Sí | — | — |

### Perfil y Cuenta

| Funcionalidad | Admin | Instructor | Student |
|--------------|-------|-----------|---------|
| Ver/editar perfil | Sí | Sí | Sí |
| Cambiar contraseña | Sí | Sí | Sí |
| Preferencias de email | Sí | Sí | Sí |
| Crear contraseña (Google users) | Sí | Sí | Sí |

## Configuración por Centro

| Setting | Efecto |
|---------|--------|
| `instructorCanReserveForStudent` | Habilita/deshabilita que instructores reserven por estudiantes (default: true) |
| `cancelBeforeMinutes` | Tiempo mínimo para cancelar sin cargo |
| `allowTrialClassPerPerson` | Habilita clase de prueba gratis para estudiantes |
| `maxNoShowsPerMonth` | Límite de inasistencias por mes |

## Helpers de Código

```typescript
import { isAdminRole, isInstructorRole, isStudentRole, isStaffRole } from "@/lib/domain/role";

isAdminRole(role)       // true si ADMINISTRATOR
isInstructorRole(role)  // true si INSTRUCTOR
isStudentRole(role)     // true si STUDENT
isStaffRole(role)       // true si ADMINISTRATOR o INSTRUCTOR
```

**Convención:** Nunca comparar con strings (`role === "ADMINISTRATOR"`). Usar siempre los helpers.
