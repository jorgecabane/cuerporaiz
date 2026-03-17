# Cómo configurar Mercado Pago (credenciales y OAuth)

Para que los centros puedan cobrar a sus alumnas con tarjeta, débito y otros medios de pago a través de Mercado Pago, la plataforma debe tener una **aplicación** en Mercado Pago Developers y configurar **Client ID** y **Client Secret**. Cada centro conecta su propia cuenta de Mercado Pago desde el panel (OAuth).

## Qué configura la plataforma (una sola vez)

Son credenciales de la **aplicación** que identifican a CuerpoRaíz frente a Mercado Pago. No son las credenciales de cada centro: esas se obtienen cuando cada centro hace “Conectar mi cuenta” (OAuth).

## Pasos en Mercado Pago

1. **Entrá a Mercado Pago Developers**  
   [https://www.mercadopago.com.ar/developers/panel/app](https://www.mercadopago.com.ar/developers/panel/app) (o el dominio de tu país: `.com.mx`, `.com.br`, etc.). Iniciá sesión con tu cuenta de Mercado Pago.

2. **Creá una aplicación**  
   **Tus integraciones** → **Crear aplicación**. Dale un nombre (ej. “CuerpoRaíz”) y elegí el producto que corresponda (p. ej. “Pagos con Checkout” o el que uses para cobrar). Guardá.

3. **Configurá la URL de redirección**  
   Entrá a la aplicación → **Detalles de la aplicación** (o **Application details**) → **Editar**. En **URLs de redireccionamiento** añadí **cada** URL por la que los usuarios puedan entrar al flujo (la app usa la misma URL que ve el navegador):
   - Producción: `https://tudominio.com/api/admin/mercadopago/oauth/callback`
   - Con ngrok: `https://tu-subdominio.ngrok-free.dev/api/admin/mercadopago/oauth/callback`
   - Local: `http://localhost:3000/api/admin/mercadopago/oauth/callback`
   La URL debe coincidir **exactamente** (mismo protocolo, dominio y path; sin `/` final). Si entrás al panel por ngrok, la URL de redirección en MP tiene que ser la de ngrok.

4. **Obtené las credenciales**  
   En el menú lateral: **Producción** → **Credenciales de producción** (o **Pruebas** → **Credenciales de prueba** para desarrollo). Ahí vas a ver:
   - **Client ID** (a veces mostrado como App ID) → va en `MP_APP_ID`
   - **Client Secret** → va en `MP_CLIENT_SECRET`

   **Importante:** En la misma pantalla MP muestra también **Access Token** y **Public Key**. Para el flujo OAuth (Conectar mi cuenta) necesitás **Client ID** y **Client Secret**, no el Access Token ni la Public Key. Si ponés el Access Token en `MP_CLIENT_SECRET`, el intercambio fallará con "invalid client_id or client_secret".

   Para poder usar credenciales de **producción** primero tenés que activarlas (completar datos del negocio en el panel).

5. **Configuralas en el proyecto**  
   En el servidor donde corre la app, definí estas variables de entorno:
   - `MP_APP_ID` = **Client ID** de la aplicación
   - `MP_CLIENT_SECRET` = **Client Secret** de la aplicación

   Ejemplo en `.env`:
   ```env
   MP_APP_ID=1234567890123456
   MP_CLIENT_SECRET=AbCdEfGhIjKlMnOpQrStUvWxYz123456
   ```

   **Pruebas vs producción:** Si usás **Credenciales de prueba**, el Client Secret suele empezar por `TEST-` (ej. `TEST-2762435779232350-...`). La app detecta ese prefijo y envía `test_token: true` en el intercambio OAuth para obtener tokens de sandbox. En producción usá el Client Secret de **Credenciales de producción** (sin prefijo `TEST-`); en ese caso no se envía `test_token` y los tokens serán de producción.

   **Client Secret en desarrollo:** En muchas aplicaciones, en **Credenciales de prueba** MP solo muestra **Public Key** y **Access Token** (no un "Client Secret" aparte). En ese caso el **Client Secret es único**: es el que está en **Credenciales de producción**. Para OAuth en dev podés usar ese mismo Client Secret de producción; la app no envía `test_token` (porque el valor no empieza con `TEST-`). No hace falta una variable de entorno extra tipo "modo pruebas": el indicador de sandbox lo da MP cuando el Client Secret es de prueba (prefijo `TEST-`). Si tu tipo de app no tiene Client Secret en la pestaña Pruebas, usá el de producción en dev y en prod.

   **Si aparece "invalid client_id or client_secret":** (1) Usá **Client Secret**, no el Access Token ni la Public Key. (2) Client ID y Client Secret deben ser de la **misma aplicación** y de la **misma pestaña** (ambos de Pruebas o ambos de Producción). Para comprobar que las env están bien, ejecutá: `npx tsx scripts/validate-mercadopago-env.ts` (ver más abajo).

## Validar que las credenciales están bien

Desde la raíz del proyecto, con `MP_APP_ID` y `MP_CLIENT_SECRET` en `.env`:

```bash
npx tsx scripts/validate-mercadopago-env.ts
```

El script hace una llamada a Mercado Pago con solo Client ID + Client Secret (flujo "client_credentials"). Si responde OK, ese par es válido. Si responde "invalid_client", casi seguro estás usando el **Access Token** en lugar del **Client Secret** en `MP_CLIENT_SECRET`.

## Probar pagos sin gastar dinero real

Para probar el flujo "Comprar plan" → checkout de MP sin cobros reales:

1. **Tarjetas de prueba**  
   MP publica [tarjetas de prueba](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/test/cards) (número, CVV, vencimiento) y el **nombre del titular** define el resultado (ej. `APRO` = aprobado, `OTHE` = rechazado). Usando esos datos en el checkout se simula el pago. Si tu integración usa Checkout Pro/Bricks con credenciales de **producción** y una cuenta real conectada, conviene confirmar en la doc de MP si las tarjetas de prueba aplican igual (en algunos productos solo aplican con tokens de prueba).

2. **Usuarios de prueba**  
   En el panel de MP: **Pruebas → Cuentas de prueba** podés crear hasta 15 cuentas (vendedor/comprador) con dinero ficticio. Sirven para probar flujos end-to-end: una cuenta "vendedor" puede conectarse por OAuth a tu app y otra "comprador" puede pagar con tarjetas de prueba. Las cuentas de prueba no ven Credenciales de prueba en el panel.

3. **Plan de acción recomendado**  
   - Para **probar solo el checkout** (redirección, vuelta, webhook): usá tu cuenta real conectada y, al pagar, usá una **tarjeta de prueba** de la doc de MP (número + titular `APRO`). Si el cobro aparece como real, entonces tu app está en modo producción y las tarjetas de prueba pueden no aplicar en ese producto — en ese caso usá **cuentas de prueba** (crear vendedor y comprador en Pruebas, conectar el vendedor a tu app, pagar con el comprador y tarjeta de prueba).  
   - Para **no tocar dinero real**: creá cuentas de prueba en MP, conectá una cuenta vendedor de prueba a CuerpoRaíz, y que un comprador de prueba pague con tarjeta de prueba. Todo queda en sandbox.

## Desvincular / revocar la conexión OAuth

Si ya autorizaste la app y querés probar el flujo de nuevo desde cero: en tu cuenta de Mercado Pago andá a **Ventas → Preferencias de Venta → Aplicaciones externas** y quitá los permisos de la aplicación. Después podés volver a hacer "Conectar mi cuenta" desde el panel. El código de autorización que devuelve MP es de un solo uso; si recargás la página del callback o usás el mismo link dos veces, puede dar error — en ese caso iniciar de nuevo el flujo desde "Conectar mi cuenta" (nuevo code) y no recargar la URL del callback.

## Qué hace cada centro (desde el panel)

1. Un admin del centro entra a **Panel** → **Plugins** → **Mercado Pago**.
2. Hace clic en **Conectar mi cuenta de Mercado Pago**.
3. Es redirigido a Mercado Pago, inicia sesión y autoriza la aplicación.
4. Vuelve al panel con la cuenta ya vinculada. Opcionalmente puede activar/desactivar el plugin con el toggle.

Después de eso, ese centro puede cobrar planes (checkout) con Mercado Pago. Los pagos se procesan con la cuenta de Mercado Pago del centro; la plataforma solo usa `MP_APP_ID` y `MP_CLIENT_SECRET` para el flujo OAuth y para que cada centro tenga sus propios tokens (access token, refresh token) guardados en la base de datos.

## Webhooks

La app ya registra la **URL de notificación** por cada preferencia de pago (`notification_url`). Mercado Pago enviará notificaciones a:

```text
https://tudominio.com/api/webhooks/mercadopago/{centerId}
```

No hace falta configurar esta URL manualmente en el panel de Mercado Pago; se envía al crear cada preferencia. El **secret** con el que se verifica la firma `x-signature` se genera y guarda por centro al conectar la cuenta (OAuth).

**Importante:** La `notification_url` se arma con la misma base URL que usa el request (cuando hay proxy tipo ngrok se usan los headers `x-forwarded-proto` y `x-forwarded-host`). Si creás el checkout entrando por ngrok, la URL de notificación será la de ngrok y MP podrá llamarla. Si en cambio la base quedara en `localhost`, MP no podría alcanzar tu servidor y no recibirías el webhook de pago aprobado.

## Monto mínimo por país

Para definir un plan “mínimo” sin cobrar de más en pruebas: el monto mínimo depende del medio de pago y del país. Como referencia (consultar en [ayuda MP Chile](https://www.mercadopago.cl/ayuda/_1811) o [Argentina](https://www.mercadopago.com.ar/ayuda/monto-minimo-maximo-medios-de-pago_620)): Chile tarjeta ~$1.000 CLP; Argentina tarjeta ~$100 ARS. No hay un único valor para Bricks; conviene usar el mínimo del país para planes de prueba.

## Resumen de variables de entorno

| Variable            | Dónde se obtiene                    | Uso                          |
|---------------------|-------------------------------------|------------------------------|
| `MP_APP_ID`         | Mercado Pago → Tu app → Credenciales → Client ID | OAuth (inicio y callback)    |
| `MP_CLIENT_SECRET`  | Mercado Pago → Tu app → Credenciales → Client Secret | OAuth (intercambio de código por tokens) |

Para checklist de calidad de la integración y **cómo probar webhooks en localhost** (con túnel ngrok), ver [mercadopago-calidad-y-webhooks.md](./mercadopago-calidad-y-webhooks.md).

## Referencia

- [Credenciales Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/credentials)
- [OAuth Authorization Code](https://www.mercadopago.com.ar/developers/es/docs/security/oauth/creation#bookmark_authorization_code)
- [Detalles de la aplicación (URLs de redireccionamiento)](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/application-details)
