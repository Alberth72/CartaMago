# E2E Testing Plan

## Estado Actual

CartaMago ya tiene una base estable para empezar pruebas E2E:

- La app compila con `npm.cmd run build`.
- El lint corre con `npm.cmd run lint`, con 2 warnings de hooks pendientes.
- El flujo publico esta documentado y funciona con seed local si Supabase no esta configurado.
- Los gates manuales ya existen en `docs/quality-gates.md`.
- No hay runner de pruebas, scripts E2E, fixtures ni selectores de prueba dedicados.

## Hallazgos

El mejor primer frente E2E es el menu publico porque:

- No requiere login.
- Puede correr sin secretos usando el fallback seed.
- Cubre el camino critico del producto: menu, carrito, detalle y enlace de WhatsApp.
- Es el flujo que abre el QR y debe permanecer confiable en movil.

El admin debe entrar en una segunda fase porque depende de Supabase, credenciales y datos mutables. Para automatizarlo sin riesgo se necesita una estrategia clara de ambiente de prueba.

## Herramienta Recomendada

Usar Playwright.

Razones:

- Funciona bien con Vite y apps estaticas.
- Permite probar mobile viewport y desktop.
- Puede interceptar navegaciones a `wa.me` sin enviar mensajes reales.
- Genera trazas, screenshots y videos utiles para QA visual.
- Encaja con Netlify preview o `vite preview`.

## Scripts Propuestos

```json
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:headed": "playwright test --headed"
}
```

Comando base recomendado para CI/local:

```powershell
npm.cmd run build
npm.cmd run test:e2e
```

## Estructura Propuesta

```text
playwright.config.ts
tests/
  e2e/
    public-menu.spec.ts
    whatsapp.spec.ts
    admin-auth.spec.ts
    admin-menu.spec.ts
    smoke-production.spec.ts
```

## Fase 1: Public Menu Sin Supabase

Objetivo: cubrir el QR flow usando seed fallback.

Casos:

- Carga la pagina publica en viewport movil.
- Muestra nombre del restaurante, categorias y productos.
- El carrito inicia vacio y el boton de WhatsApp esta deshabilitado.
- Agregar un producto actualiza cantidad, total y resumen sticky.
- Restar/quitar producto vuelve al estado vacio.
- Agregar nota por producto conserva la nota en el pedido.
- Elegir `Recoger`, `Domicilio` y `Mesa` muestra los campos correctos.
- El enlace de WhatsApp contiene `wa.me`, numero del restaurante y texto encodeado.
- El mensaje decodeado incluye restaurante, items, cantidades, total, modo de entrega y no confirma la orden.

Notas tecnicas:

- Ejecutar sin `VITE_SUPABASE_URL` ni `VITE_SUPABASE_ANON_KEY`.
- Usar `page.goto('/')` contra `webServer` de Playwright.
- Validar el `href` del enlace de WhatsApp en vez de abrir WhatsApp.

## Fase 2: Visual Y Mobile

Objetivo: convertir parte del Web Gate en checks repetibles.

Casos:

- Viewports: mobile small, mobile common, desktop.
- No hay overflow horizontal en la pagina publica.
- El panel de pedido es alcanzable desde el resumen sticky.
- Los controles principales tienen texto visible y no quedan fuera del viewport.
- Capturar screenshot de menu publico y pedido armado.

Esto no reemplaza la revision en telefono real, pero reduce regresiones obvias antes de compartir el QR.

## Fase 3: Admin Sin Mutar Produccion

Objetivo: cubrir login y validaciones sin tocar datos productivos.

Estado inicial implementado:

- `/admin` muestra aviso de setup cuando Supabase no esta configurado.
- El shell admin permite volver al menu publico.
- `npm.cmd run test:e2e:admin` ejecuta una suite admin con Supabase mockeado por `VITE_E2E_ADMIN_MOCK=true`.
- La suite mock cubre login invalido, login valido, logout, validaciones de restaurante, creacion de categoria/producto y cambio de estado de pedido.

Prerequisitos:

- Supabase project separado para test o branch/ambiente dedicado.
- Usuario admin de prueba.
- `VITE_RESTAURANT_ID` de prueba.
- Datos seed reproducibles.

Casos:

- `/admin` muestra aviso de setup cuando Supabase no esta configurado.
- Con Supabase configurado, muestra formulario de login.
- Login invalido muestra error claro.
- Login valido carga tabs `Pedidos` y `Menu`.
- Validaciones de restaurante rechazan nombre/WhatsApp vacios o numero invalido.
- Validaciones de producto rechazan nombre o categoria vacios.

## Fase 4: Admin Con Mutaciones Controladas

Objetivo: probar que el owner puede cambiar datos y que el menu publico refleja cambios.

Casos:

- Crear categoria de prueba.
- Crear producto de prueba con precio numerico.
- Editar precio y disponibilidad.
- Verificar que el producto aparece/desaparece intencionalmente en el menu publico.
- Cambiar WhatsApp en restaurante de prueba y verificar el enlace publico.
- Cambiar estado de un pedido de prueba en el panel de pedidos.

Regla:

- Cada test debe crear datos con prefijo unico y limpiar lo que cree, o correr contra un ambiente descartable.

## Fase 5: Smoke Production

Objetivo: verificar la URL y QR target sin tocar datos.

Casos:

- `https://brasas-sazon-menu.netlify.app/` responde y muestra el restaurante.
- `/admin` carga la pantalla esperada.
- El enlace de WhatsApp publico tiene numero no vacio.
- No se ejecutan acciones de guardado ni login real.

## Cambios Previos Recomendados

Antes de implementar los tests completos:

- Agregar selectores estables `data-testid` solo en puntos criticos: cart, total, whatsapp link, fulfillment controls, admin login, admin tabs.
- Corregir los warnings de hooks detectados por `npm.cmd run lint`.
- Revisar `saveOrder`: hoy usa `restaurant.name` como `restaurantId` en el flujo publico. Si Supabase esta activo, esto puede afectar pruebas de pedidos y datos reales.
- Definir si E2E con Supabase usa proyecto separado, Supabase local o datos de staging.

## Orden De Implementacion

1. Instalar Playwright y browsers.
2. Crear `playwright.config.ts` con `webServer` usando `npm.cmd run dev -- --host 127.0.0.1`.
3. Agregar scripts E2E a `package.json`.
4. Crear tests de Fase 1 para menu publico y WhatsApp.
5. Agregar screenshots basicos de Fase 2.
6. Documentar como correr E2E localmente.
7. Preparar ambiente Supabase de prueba antes de automatizar admin mutante.

## Definition Of Done Para La Primera Slice

```text
Playwright instalado
+ scripts E2E disponibles
+ public menu E2E pasa en mobile y desktop
+ WhatsApp href/message validado sin abrir WhatsApp
+ build sigue pasando
+ docs actualizados
+ riesgos de Supabase/admin nombrados
```
