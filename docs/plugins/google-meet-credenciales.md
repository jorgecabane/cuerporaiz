# Cómo obtener credenciales de Google Meet

Para que los centros puedan conectar su cuenta de Google y generar links de Meet automáticamente en clases online, la plataforma debe tener un **proyecto en Google Cloud** con la **Calendar API** y **credenciales OAuth 2.0**.

## Pasos

1. **Entrá a Google Cloud Console**  
   [https://console.cloud.google.com/](https://console.cloud.google.com/).

2. **Creá un proyecto (o usá uno existente)**  
   **Select a project** → **New Project**. Dale un nombre (ej. “CuerpoRaíz”) y crealo.

3. **Activá la Calendar API**  
   **APIs & Services** → **Library** → buscá **Google Calendar API** → **Enable**.

4. **Creá credenciales OAuth 2.0**  
   **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.  
   Si te pide configurar la pantalla de consentimiento, completala (modo “External” para que cualquier cuenta de Google pueda conectar).

   - **Application type:** Web application  
   - **Name:** p. ej. “CuerpoRaíz Web”  
   - **Authorized redirect URIs:** añadí  
     ```text
     https://tudominio.com/api/admin/google-meet/oauth/callback
     ```  
     Reemplazá por tu dominio. En desarrollo: `http://localhost:3000/api/admin/google-meet/oauth/callback`.

5. **Copiá Client ID y Client Secret**  
   Al crear el cliente OAuth, Google muestra **Client ID** y **Client Secret**. Configuralos en el servidor:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

6. **Scope usado por la app**  
   La app solicita el scope restringido:  
   `https://www.googleapis.com/auth/calendar.events`  
   (“Ver y editar eventos en todos tus calendarios”). Con eso basta para crear eventos con link de Meet y suele implicar una revisión de Google más liviana que el scope completo de Calendar.

7. **En el panel**  
   Cada centro irá a **Panel → Plugins → Google Meet** y hará clic en **Conectar con Google**. Tras autorizar, ese centro podrá generar links de Meet al marcar una clase como online en Horarios.

## Referencia

- [Google Calendar API](https://developers.google.com/calendar/api/guides/overview)
- [Crear eventos con Meet](https://developers.google.com/calendar/api/guides/create-events#conference_solutions)
