# Cómo obtener credenciales de Zoom

Para que los centros puedan conectar su cuenta de Zoom y generar links de videollamada automáticamente en clases online, la plataforma debe tener configurada una **aplicación OAuth** en Zoom.

## Pasos

1. **Entrá a Zoom Marketplace**  
   [https://marketplace.zoom.us/](https://marketplace.zoom.us/) → **Develop** → **Build App**.

2. **Creá una app de tipo OAuth**  
   Elegí **OAuth** (tipo “Account-level app” o “User-managed app” según tu caso). Completá nombre y datos básicos.

3. **Configurá la Redirect URL**  
   En la configuración de la app, en **Redirect URL for OAuth**, añadí:
   ```text
   https://tudominio.com/api/admin/zoom/oauth/callback
   ```
   Reemplazá `tudominio.com` por la URL base de tu instalación (ej. `app.cuerporaiz.com`). En desarrollo podés usar `http://localhost:3000/api/admin/zoom/oauth/callback`.

4. **Scopes**  
   Habilitá al menos el scope que permita **crear reuniones** (p. ej. `meeting:write` o el que indique la documentación actual de Zoom).

5. **Credenciales**  
   En la app verás **Client ID** y **Client Secret**. Configuralos como variables de entorno en el servidor:
   - `ZOOM_CLIENT_ID`
   - `ZOOM_CLIENT_SECRET`

6. **En el panel**  
   Cada centro irá a **Panel → Plugins → Zoom** y hará clic en **Conectar mi cuenta de Zoom**. Tras autorizar, ese centro podrá generar links de Zoom al marcar una clase como online en Horarios.

## Referencia

- [Zoom OAuth](https://developers.zoom.us/docs/internal-apps/oauth/)
- [Zoom Meeting API](https://developers.zoom.us/docs/api/rest/meeting/)
