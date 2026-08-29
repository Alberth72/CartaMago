# Release PDN: Confirmacion Automatica Por WhatsApp

## Objetivo

Liberar a produccion el flujo:

```text
QR -> Menu publico -> Carrito -> Confirmar pedido -> create-order -> WhatsApp Cloud API -> Cliente recibe confirmacion
```

El pedido se guarda en Supabase y la Edge Function `create-order` intenta enviar
una plantilla WhatsApp al cliente. El link manual `wa.me` queda solo como
respaldo en la pantalla de confirmacion.

## Estado Actual

- Conectividad Meta validada localmente con `hello_world/en_US`.
- `pedido_recibido` esta pendiente de aprobacion/revision en Meta.
- Mientras `pedido_recibido` no este aprobada, PDN no debe activar esa plantilla
  como obligatoria.
- El flujo de pedido debe seguir guardando ordenes aunque WhatsApp falle.

## Cambios Incluidos

- `supabase/functions/create-order/index.ts`: envia plantilla WhatsApp despues
  de guardar la orden y registra el resultado en `order_notifications`.
- `supabase/migrations/202608280002_order_whatsapp_notifications.sql`: tabla de
  auditoria para intentos de notificacion.
- `src/features/menu/hooks/usePublicMenuOrder.ts`: confirma pedido sin abrir
  WhatsApp automaticamente.
- `src/features/menu/components/OrderConfirmation.tsx`: muestra recibo y estado
  de notificacion.
- `src/features/menu/components/OrderPanel.tsx`: boton principal `Confirmar pedido`.

## Prerequisitos Meta

Para liberar la plantilla real:

```text
Template name: pedido_recibido
Category: Utility
Language: es_CO
Status: Approved
Body parameters: 6
```

Body sugerido:

```text
Hola {{1}}, recibimos tu pedido {{2}} en {{3}}.

Entrega: {{4}}
Total aproximado: {{5}}

Puedes seguir el estado aqui: {{6}}

El restaurante confirmara disponibilidad, tiempo estimado y pago por WhatsApp.
```

Orden de parametros enviado por `create-order`:

```text
{{1}} nombre del cliente
{{2}} numero de ticket
{{3}} sede
{{4}} tipo de entrega
{{5}} total aproximado
{{6}} enlace de rastreo
```

## Secretos Supabase PDN

Configurar en Supabase Cloud, no en el repositorio:

```powershell
npx.cmd supabase secrets set WHATSAPP_ACCESS_TOKEN=<token-permanente> --project-ref <project-ref>
npx.cmd supabase secrets set WHATSAPP_PHONE_NUMBER_ID=<phone-number-id> --project-ref <project-ref>
npx.cmd supabase secrets set WHATSAPP_TEMPLATE_NAME=pedido_recibido --project-ref <project-ref>
npx.cmd supabase secrets set WHATSAPP_TEMPLATE_LANGUAGE=es_CO --project-ref <project-ref>
npx.cmd supabase secrets set WHATSAPP_GRAPH_VERSION=v23.0 --project-ref <project-ref>
npx.cmd supabase secrets set WHATSAPP_DEFAULT_COUNTRY_CODE=57 --project-ref <project-ref>
npx.cmd supabase secrets set PUBLIC_SITE_URL=https://brasas-sazon-menu.netlify.app --project-ref <project-ref>
```

En PDN debe estar vacio o eliminado:

```powershell
npx.cmd supabase secrets unset WHATSAPP_CONFIRMATION_TO_OVERRIDE --project-ref <project-ref>
```

`WHATSAPP_CONFIRMATION_TO_OVERRIDE` solo se usa en local/staging para mandar
todas las confirmaciones a un numero permitido de prueba.

## Orden De Release

1. Confirmar que `pedido_recibido/es_CO` este `Approved` en Meta.
2. Correr validaciones locales:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e -- tests/e2e/whatsapp.spec.ts tests/e2e/public-menu.spec.ts
```

3. Aplicar migraciones Supabase en PDN, incluyendo:

```text
supabase/migrations/202608280002_order_whatsapp_notifications.sql
```

4. Configurar secretos Supabase PDN.
5. Desplegar Edge Function `create-order`.
6. Desplegar frontend Netlify.
7. Ejecutar smoke test con un pedido real controlado.

## Smoke Test PDN

1. Abrir `https://brasas-sazon-menu.netlify.app`.
2. Agregar un producto.
3. Escribir nombre y telefono real con WhatsApp.
4. Tocar `Confirmar pedido`.
5. Confirmar que no se abre WhatsApp automaticamente.
6. Confirmar pantalla de recibo.
7. Confirmar que el pedido aparece en `/admin`.
8. Confirmar recepcion del WhatsApp automatico en el celular.
9. Consultar auditoria:

```sql
select order_id, destination_phone, template_name, status, error_code, created_at
from public.order_notifications
order by created_at desc
limit 5;
```

Resultado esperado:

```text
template_name = pedido_recibido
status = sent
error_code is null
```

## Rollback

Si el frontend falla:

- Revertir al ultimo deploy estable de Netlify.

Si WhatsApp falla pero los pedidos se guardan:

- Mantener PDN activo.
- Cambiar temporalmente a fallback manual desde la pantalla de confirmacion.
- Revisar `order_notifications.error_code` y `response_json`.

Si la plantilla no esta aprobada:

```powershell
npx.cmd supabase secrets set WHATSAPP_TEMPLATE_NAME=hello_world --project-ref <project-ref>
npx.cmd supabase secrets set WHATSAPP_TEMPLATE_LANGUAGE=en_US --project-ref <project-ref>
```

Ese rollback solo valida conectividad; no es el mensaje final al cliente.

## Gate De Salida

No marcar el release como cerrado hasta tener:

- Migracion aplicada en Supabase PDN.
- Edge Function desplegada.
- Frontend desplegado.
- Pedido guardado en PDN.
- Fila `order_notifications.status = sent`.
- Mensaje recibido en el celular de prueba.
