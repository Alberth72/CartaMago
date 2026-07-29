# Security Front

## Objetivo

Mantener CartaMago listo para crecer hacia pagos online sin introducir cambios de dependencias a ciegas.

El MVP actual no procesa pagos dentro de la app. Cuando se integren pagos o DidiFood, el objetivo debe ser reducir alcance de seguridad:

- No guardar tarjetas.
- No manejar datos sensibles de pago en frontend.
- Preferir checkout, tokenizacion o handoff alojado por el proveedor.
- Validar webhooks del proveedor en backend, no en el cliente.
- Registrar solo estados de pedido/pago necesarios para operacion.

## Politica De Dependencias

No usar como primer paso:

```powershell
npm.cmd audit fix --force
```

Ese comando puede aplicar upgrades mayores o downgrades inesperados.

Flujo recomendado:

1. Ejecutar `npm.cmd audit --json`.
2. Identificar paquete, severidad, alcance y si es runtime o dev-only.
3. Consultar `npm.cmd ls <package>` para ver de donde viene.
4. Aplicar el cambio mas pequeno posible.
5. Preferir versiones exactas cuando el fix corrige seguridad.
6. Correr `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run test:e2e`.
7. Ejecutar `npm.cmd audit` y exigir 0 vulnerabilidades conocidas antes de deploy.

## Criterio De Upgrade

Patch/minor:

- Permitido si `audit` lo recomienda y los gates pasan.

Major:

- Requiere nota de impacto.
- Requiere E2E verde.
- Requiere revisar rutas criticas: menu publico, admin, WhatsApp.
- Si toca autenticacion, pagos, storage o datos, requiere prueba manual adicional.

Downgrade:

- Solo si no reintroduce advisories anteriores.
- Debe verificarse con `npm.cmd audit`.

## Estado Actual

React Router tenia advisories conflictivas al usar `react-router-dom`.

Decision aplicada:

- Remover `react-router-dom`.
- Usar `react-router@8.3.0` directo.
- Mantener imports de rutas desde `react-router`.

Validacion:

```powershell
npm.cmd audit
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
```

Resultado esperado:

```text
0 vulnerabilities
lint ok
build ok
E2E ok
```

## Gate Para Pagos Online

Antes de integrar pagos:

- Definir proveedor y flujo exacto: redirect, hosted checkout, wallet, webhook o API server-to-server.
- Agregar backend o edge function para webhooks y secretos.
- No exponer claves secretas en variables `VITE_`.
- Validar firmas de webhooks.
- Hacer idempotentes los eventos de pago.
- Registrar estados: `pending`, `paid`, `failed`, `cancelled`, `refunded` solo cuando aplique.
- Separar estados de pedido de estados de pago.
- Agregar E2E o integration tests con sandbox del proveedor.
- Documentar rollback y modo manual por WhatsApp si el pago falla.

## Gate Para DidiFood

Antes de integrar DidiFood:

- Confirmar si la integracion sera enlace externo, menu sincronizado, pedido entrante, promocion o pago.
- Mantener CartaMago como capturador del pedido y bandeja unica de pedidos, salvo que la API oficial exija otro flujo.
- Evitar copiar datos sensibles del proveedor al cliente.
- Si hay API privada o tokens, deben vivir en backend/edge function.
- Si hay webhooks, validar firma, timestamp e idempotencia.
- Mantener WhatsApp como fallback operacional mientras la integracion se prueba con pedidos reales.
