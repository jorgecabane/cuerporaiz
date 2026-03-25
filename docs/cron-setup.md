# Cron Jobs

## Crons actuales

| Ruta | Horario | Descripción |
|------|---------|-------------|
| `/api/cron/plan-expiring` | Todos los días a las 11:00 UTC | Envía email a usuarios cuyo plan vence en 7 días |

## Configuración

### 1. Variable de entorno

En Vercel → Settings → Environment Variables, agregar:

```
CRON_SECRET=<un-string-aleatorio-seguro>
```

Todas las rutas cron validan `Authorization: Bearer $CRON_SECRET`.

### 2. vercel.json

La configuración de crons está en `vercel.json` en la raíz del proyecto:

```json
{
  "crons": [
    {
      "path": "/api/cron/plan-expiring",
      "schedule": "0 11 * * *"
    }
  ]
}
```

El formato de `schedule` es cron estándar (minuto hora día mes día-semana).

### 3. Test local

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/plan-expiring
```

Respuesta esperada:
```json
{ "ok": true, "sent": 2, "total": 3 }
```

- `sent`: emails enviados (respetando preferencias)
- `total`: planes que vencen en 7 días

## Agregar un nuevo cron

1. Crear la ruta en `app/api/cron/<nombre>/route.ts`
2. Validar `Authorization: Bearer $CRON_SECRET` al inicio
3. Agregar entrada en `vercel.json` → `crons[]`
4. Documentar en esta tabla
