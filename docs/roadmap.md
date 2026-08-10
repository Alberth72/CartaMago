# CartaMago — Ruta de Producto (Roadmap)

**Objetivo de la aplicación** (ver `AGENTS.md` y `docs/product-identity.md`):

```text
Plataforma ligera de menú QR + pedidos por WhatsApp, reutilizable para varias
negocios. El flujo core validado es:
QR -> Menú público -> Carrito -> Pedido WhatsApp -> Negocio confirma.
```

La prioridad es entregar un producto vendible y estable primero; la expansión
multi-sede es una oportunidad de cliente que **solo se construye cuando un
segundo pagador lo justifica** (regla dura: no backend pesado en el MVP).

---

## Fases

### Fase 0 — Estabilizar y consolidar (actual)
Hacer que el repositorio y el build vuelvan a ser reproducibles y verdes.

| Acción | Estado |
|---|---|
| Build `npm run build` y lint `npm run lint` en verde | Hecho |
| Silenciar falso warning de chunk (PowerShell) en `vite.config.ts` | Hecho |
| Commit del trabajo pendiente coherente (inventario/merma + docs + migraciones) | Pendiente |
| Documentar el roadmap y actualizar `progress-dashboard.md` | Hecho |
| **Salida:** árbol limpio, build verde, historial reproducible. | — |

### Fase 1 — Cerrar MVP de Brasas & Sazón (primer cliente)
Cerrar el ciclo comercial del restaurante real.

| Acción | Evidencia / Gate |
|---|---|
| Confirmar precios reales y reemplazar temporales | `src/data/restaurantSeed.ts`, Supabase |
| Guardar número oficial de WhatsApp | `docs/whatsapp-launch-checklist.md` |
| Re-verificar QR → menú → carrito → WhatsApp → confirmación | Test manual en móvil |
| QA visual móvil y densidad del product-card | Deploy en Netlify |
| Push a GitHub (`main`) | `docs/github-publish-checklist.md` |
| **Salida:** primer cliente operando con pagos fuera del app (WhatsApp). | — |

### Fase 2 — Multi-sede / multi-marca (solo con 2º pagador)
Pivote hacia bodegas/sedes/fórmulas cuando exista justificación.

```
Frente: activar el eje brands -> warehouses -> branches
```

| Acción | Gate |
|---|---|
| Aplicar en orden y en staging: `202608080001` y `202608080002` | Supabase staging |
| Alinear el código a `branch_id` (hoy usa `restaurant_id`) | Build verde |
| Reescribir `adminInventoryRepository` y consultas de menú/pedidos | E2E admin ok |
| RLS por tenant verificada | `supabase/tests/security_rls_check.sql` |
| **Salida:** multi-tenant operativo. | — |

### Fase 3 — Operaciones (inventario transaccional, POS, DIAN)
Núcleo operativo pesado; requiere arquitectura SaaS y decisión de negocio.

| Acción | Nota |
|---|---|
| Inventario transaccional + fórmulas (`sell_product`) | Ya diseñado en migraciones |
| POS multi-sede / cajero | Requiere app dedicada |
| Facturación electrónica DIAN | Integración con operador; es el límite real |
| **Salida:** plataforma operativa (no solo menú). | — |

---

## Reglas de avance

- No se inicia una fase nueva sin cerrar la salida de la anterior.
- Prioridad del usuario final: leer y ordenar rápido (móvil). Nada debe bloquear el pedido.
- Backend propio solo cuando Supabase no pueda expresar la regla.
- El código y las migraciones deben quedar coherentes entre sí antes de commitear.
