# Load Testing With k6

## Decision

Use Grafana k6 for load and stress tests.

Why:

- It is open source and scriptable in JavaScript.
- It is designed for load, stress, spike and soak tests.
- It supports thresholds, so performance expectations can fail CI.
- It can test HTTP APIs now and browser journeys later.

Official references:

- Grafana k6 documentation: https://grafana.com/docs/k6/latest/
- Running k6: https://grafana.com/docs/k6/latest/get-started/running-k6/
- Thresholds: https://grafana.com/docs/k6/latest/using-k6/thresholds/
- Grafana Cloud k6 CLI: https://grafana.com/docs/grafana-cloud/testing/k6/get-started/run-cloud-tests-from-the-cli/

## Scalability Assessment

CartaMago already has event-shaped behavior:

```text
order_created
order_status_changed
didi_food_draft_created
didi_food_webhook_received
payment_status_changed
```

Current architecture is enough for MVP and early restaurants:

- Netlify serves static React cheaply.
- Supabase handles reads/writes with RLS.
- Admin polling every 15 seconds keeps the kitchen panel simple.
- `orders` is the operational source of truth.
- `integration_events` is ready as an external event inbox.

The architecture will need another layer when events grow:

- Edge/backend function for `create_order`.
- Realtime subscription for kitchen updates.
- Event history table for state transitions.
- Idempotency keys for DiDiFood/payment webhooks.
- Rate limit or anti-abuse before public order writes.
- Observability for order creation latency and webhook failures.

## Test File

```text
tests/stress/cartamago-load.js
```

Default mode reads only:

- Static app shell.
- `restaurants`.
- `categories`.
- `products`.

Write mode is opt-in:

- Calls `functions/v1/create-order`.
- Validates idempotent order creation through the Edge Function.
- Should run only in local or staging.

## Install k6

Install the `k6` binary and make sure it is available in PATH.

Windows PowerShell example:

```powershell
winget install GrafanaLabs.k6
k6 version
```

Si PowerShell no refresca el PATH despues de instalar:

```powershell
& 'C:\Program Files\k6\k6.exe' version
```

En este repo `npm.cmd run test:stress` resuelve automaticamente `k6` desde PATH o desde `C:\Program Files\k6\k6.exe`.

```powershell
npm.cmd run test:stress
npm.cmd run test:stress:cloud
```

## Local Read Test

Use this when Supabase local and preview local are running:

```powershell
npm.cmd run build:localdb
npm.cmd run preview:local
```

In another terminal:

```powershell
$env:BASE_URL="http://127.0.0.1:4175"
$env:SUPABASE_URL="http://127.0.0.1:54321"
$env:SUPABASE_ANON_KEY="<local anon key>"
$env:RESTAURANT_ID="brasas-sazon"
npm.cmd run test:stress
```

## Local Write Test

Only for local or staging:

```powershell
$env:BASE_URL="http://127.0.0.1:4175"
$env:SUPABASE_URL="http://127.0.0.1:54321"
$env:SUPABASE_ANON_KEY="<local anon key>"
$env:RESTAURANT_ID="brasas-sazon"
$env:K6_WRITE_ORDERS="true"
$env:K6_ORDER_RATE="2"
$env:K6_ORDER_DURATION="1m"
npm.cmd run test:stress
```

`create-order` applies rate limiting. For write-load testing, run against local/staging and temporarily raise the Edge Function environment values:

```text
ORDER_RATE_LIMIT_MAX_REQUESTS
ORDER_RATE_LIMIT_WINDOW_SECONDS
```

Do not raise those limits in production just to make a load test pass.

This will create rows with ids prefixed by:

```text
ord_k6_
itm_k6_
```

Cleanup:

```powershell
@"
delete from public.order_items where id like 'itm_k6_%';
delete from public.orders where id like 'ord_k6_%';
"@ | docker exec -i supabase_db_CartaMago psql -U postgres -d postgres
```

## Grafana Cloud Report

Para ver el reporte interactivo en Grafana Cloud k6 necesitas:

- Cuenta de Grafana Cloud.
- Token personal de Grafana Cloud k6.
- Stack de Grafana Cloud.

Segun la documentacion oficial, el token se copia desde:

```text
Testing & synthetics -> Performance -> Settings
```

Login desde PowerShell:

```powershell
k6 cloud login --token "<K6_CLOUD_API_TOKEN>" --stack "<stack-slug-o-url>"
```

Si `k6` no existe en el PATH:

```powershell
& 'C:\Program Files\k6\k6.exe' cloud login --token "<K6_CLOUD_API_TOKEN>" --stack "<stack-slug-o-url>"
```

Ejecutar y publicar reporte:

```powershell
$env:BASE_URL="https://brasas-sazon-menu.netlify.app"
$env:SUPABASE_URL="https://<project-ref>.supabase.co"
$env:SUPABASE_ANON_KEY="<anon-or-publishable-key>"
$env:RESTAURANT_ID="brasas-sazon"
npm.cmd run test:stress:cloud
```

El script `npm.cmd run test:stress:cloud` tambien usa `C:\Program Files\k6\k6.exe` como fallback.

Al terminar, k6 imprime la URL del run. Tambien queda visible en Grafana Cloud:

```text
Testing & synthetics -> Performance -> Test runs
```

No ejecutes `K6_WRITE_ORDERS=true` contra produccion salvo que sea una ventana controlada de prueba y con limpieza acordada.

## Grafana Prometheus Alternative

Si queremos dashboards propios en Grafana con Prometheus Remote Write, configurar:

```powershell
$env:K6_PROMETHEUS_RW_USERNAME="<grafana-prometheus-username>"
$env:K6_PROMETHEUS_RW_PASSWORD="<access-policy-token-metrics-write>"
$env:K6_PROMETHEUS_RW_SERVER_URL="<remote-write-endpoint>"
k6 run -o experimental-prometheus-rw tests\stress\cartamago-load.js
```

Este camino sirve cuando queremos mezclar resultados k6 con metricas de infraestructura o dashboards Prometheus.

## Thresholds

Current baseline:

```text
http_req_failed < 2%
p95 http_req_duration < 1200 ms
checks > 98%
```

These are early-stage thresholds. Tighten them after collecting real baseline numbers from local and staging.

## What This Does Not Prove

- It does not prove browser rendering performance.
- It does not prove WhatsApp delivery.
- It does not prove DiDiFood webhook behavior.
- It does not prove payment correctness.

Those need separate E2E, webhook contract tests, and provider sandbox tests.
