# Migración ya aplicada manualmente

Si al ejecutar `prisma migrate deploy` ves:

```
Error: P3018 - relation "CenterZoomConfig" already exists
```

Es porque las tablas ya existen en la base de datos pero la migración no está marcada como aplicada. Ejecuta:

```bash
npx prisma migrate resolve --applied 20260315000000_add_zoom_google_meet_config
```

Luego vuelve a aplicar migraciones:

```bash
npx prisma migrate deploy
```
