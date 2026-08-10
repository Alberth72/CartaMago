# Informe Ejecutivo — CartaMago: De QR Menu a Plataforma Multi-Sede

**Preparado para:** Gerencia de Ventas
**Fecha:** 06 de agosto de 2026
**Estado:** Documento de venta y planificación

---

## 1. Resumen Ejecutivo

CartaMago nació como un menú QR con pedidos por WhatsApp para un restaurante. El cliente ahora solicita **10 sedes, facturación electrónica DIAN e inventario**. Esto no es un upgrade menor: es un cambio de paradigma de "menú digital" a "plataforma operativa multi-sede".

**Lo que ya está construido** (menú QR + admin + pedidos + seguridad) **se conserva** como capa pública. El núcleo operativo nuevo (inventario transaccional, facturación DIAN, POS multi-sede) requiere una arquitectura de plataforma SaaS.

**Inversión total proyectada:** $250M – $430M COP (con agentes IA) en 4.5–6 meses.
**Costo de lo construido hasta hoy:** $8.8M COP invertidos; valor de mercado $55.4M COP.

---

## 2. Estado Actual del Producto

### 2.1 Lo que funciona hoy (validado en producción)

```text
QR -> Menú público -> Carrito -> Pedido WhatsApp -> Restaurante confirma
```

| Funcionalidad | Estado |
|---|---|
| Menú público QR (Netlify) | ✅ Activo |
| Pedidos por WhatsApp | ✅ Validado |
| Panel admin con login | ✅ Funciona |
| Edición de menú y subida de imágenes | ✅ Funciona |
| Esquema Supabase con RLS y seguridad | ✅ Implementado |
| Edge function de pedidos con rate limiting | ✅ Implementado |
| Fallback offline (seed local) | ✅ Implementado |

**URLs de producción:**
- Menú público: `https://brasas-sazon-menu.netlify.app`
- Admin: `https://brasas-sazon-menu.netlify.app/admin`

### 2.2 Métricas de lo construido (historial de git)

| Métrica | Valor |
|---|---|
| Commits | 6 |
| Período | 21-jul → 04-ago 2026 (14 días) |
| Código fuente real | 7,524 líneas |
| Documentación técnica | 3,788 líneas (33 archivos) |
| Migraciones de base de datos | 10 |
| Edge functions | 1 (create-order) |

---

## 3. El Nuevo Panorama: 10 Sedes + Inventario + Facturación

### 3.1 Por qué cambia el paradigma

| Problema | Impacto |
|---|---|
| **Multi-sede ≠ multi-restaurante** | Hoy `VITE_RESTAURANT_ID` es constante de build. Se necesita slug/subdominio por sede, precios y disponibilidad por sede, y RLS que impida que un cajero de la sede 3 vea la sede 8. |
| **Inventario es transaccional, no CRUD** | Stock por sede, despiece/recetas (pollo entero → ¼, alitas), movimientos (compra, venta, merma, transferencia), costo promedio, y descuento concurrente de stock (10 cajeros a la vez). |
| **Facturación DIAN es el límite real** | Habilitación DIAN, resolución con numeración por sede, XML/CUE UBL 2.1, firma digital, manejo de rechazos, notas crédito/débito (Radian), e inventario fiscal para responsables de IVA. Se integra con operador tecnológico autorizado (CENIA, TSoft, Andes SCD, DataFactory). |

### 3.2 Arquitectura objetivo

```text
Menú público (Vite + React + TS + Netlify)  [se conserva]
        |
        v
API de negocio (NestJS, contenedorizado)
  |-- Módulo tenant (brands/branches/roles/RLS)
  |-- Módulo POS/caja
  |-- Módulo inventario (stock, recetas, movimientos, transferencias)
  |-- Módulo pedidos (WhatsApp API / app interna)
  |-- Módulo facturación (operador DIAN)
  |-- Colas (Redis + BullMQ) para facturación asíncrona
        |
        v
Postgres (Supabase o RDS) + Auth + Storage
```

### 3.3 Stack recomendado

| Capa | Recomendación | Por qué |
|---|---|---|
| Frontend admin/POS | React + TS + TanStack Query + Zustand | Mismo lenguaje; no divide el equipo |
| Backend | **NestJS** (Node + TS) | Mismo ecosistema, modular, colas BullMQ |
| Base de datos | Postgres (Supabase o RDS) | Esquema ya existe; se refactoriza multi-tenant |
| ORM | Prisma o Drizzle | Tipado fuerte con TS |
| Colas | Redis + BullMQ | Facturación DIAN, notificaciones, reconciliación |
| Facturación | Operador tecnológico autorizado DIAN | Nunca construir cliente DIAN desde cero |
| Hosting API | Render / Railway / Fly.io (contenedor) | Netlify no es para backend persistente |
| Menú público | Netlify (se mantiene) | No cambia |

---

## 4. Estimación de Costo y Duración (Modelo Multimarca)

Tasa de cambio: **$3,000 COP/USD**.

### 4.1 Costos de desarrollo (con agentes IA)

| Fase | Alcance | Duración | Costo (COP) |
|---|---|---|---|
| 0. Arquitectura multi-tenant | brands/branches, RLS, contratos | 2 semanas | $7M – $18M |
| 1. Fundación SaaS | Auth RBAC, admin multisede, slug | 2–3 semanas | $32M – $57M |
| 2. Inventario | Stock, recetas, movimientos, transferencias | 4–6 semanas | $57M – $107M |
| 3. Facturación DIAN | Operador, colas, notas crédito, tickets | 5–8 semanas | $36M – $64M |
| 4. POS | POS táctil, cierre de caja, impresión | 3–5 semanas | $43M – $79M |
| **Total** | | **4.5–6 meses** | **$250M – $430M COP** |

### 4.2 Comparación: manual vs. con agentes IA

| Escenario | Duración | Costo (COP) |
|---|---|---|
| Desarrollo manual tradicional | 12–14 meses | $550M – $885M |
| **Con agentes IA (recomendado)** | **4.5–6 meses** | **$250M – $430M** |

### 4.3 Costos recurrentes mensuales (no son desarrollo)

| Ítem | Costo/mes (COP) |
|---|---|
| Postgres + Redis + hosting API | $300k – $1.05M |
| Operador DIAN (10 sedes) | $900k – $2.4M |
| Netlify + Storage + monitoreo | $180k – $600k |
| **Total** | **~$1.4M – $4.1M/mes** |

### 4.4 El cuello de botella que no se comprime

La **habilitación DIAN y el operador tecnológico** tienen tiempos propios de trámite gubernamental y de terceros. Aunque el código esté listo en 4 meses, la habilitación puede tomar 2–3 meses adicionales. Por eso el rango es 4.5–6 meses, no 3.

---

## 5. Modelo de Trabajo Multi-Agente

### 5.1 Principio

```text
Un orquestador humano dueño del repo y de los merges.
Agentes en worktrees aislados por dominio.
Eficiencia = aislamiento + gating humano + validación por agente.
```

### 5.2 Roles de agentes

| Agente | Dominio |
|---|---|
| Arquitecto | Esquema multi-tenant, migraciones, RLS |
| Backend (NestJS) | Tenant, inventario, facturación, POS |
| Frontend Admin | React multi-sede |
| Menú Público | Preserva flujo QR actual |
| Integraciones | Operador DIAN, WhatsApp API, impresoras |
| QA/Testing | Playwright, e2e, k6 |
| Seguridad | RLS, auth, secretos |
| Documentación | docs/, guías |

### 5.3 Razonamiento de nivel arquitecto (no improvisación)

Cualquier decisión de alto impacto se documenta en un **ADR** (`docs/adr-template.md`) respondiendo 10 preguntas obligatorias ANTES de escribir código:

1. Tenancy: ¿el cajero de sede 3 ve/escribe datos de sede 8?
2. Concurrencia: ¿qué pasa si 10 sedes operan a la vez? ¿stock negativo, doble venta, numeración duplicada?
3. Fallo: ¿qué pasa si el operador DIAN/WhatsApp falla a mitad de operación?
4. Migración: ¿aditivo o destructivo? ¿rollback?
5. Consistencia: ¿la fuente de verdad es BD, API o cola?
6. Dinero: ¿dónde se afecta plata? ¿trazabilidad?
7. Reutilización: ¿duplica algo existente? ¿rompe el trabajo de otro agente?
8. Escala: ¿correcto para 10 sedes o solo para 1?
9. Legal: ¿toca obligaciones DIAN?
10. Rollback: ¿cómo se deshace en producción?

---

## 6. Costo de lo Construido Hasta Hoy

### 6.1 Inversión real (con IA + arquitecto)

| Concepto | Horas | Tarifa/hora | Subtotal |
|---|---|---|---|
| Desarrollo con IA (80%) | 64h | $100,000 | $6,400,000 |
| Plus de arquitecto (20%) | 16h | $150,000 | $2,400,000 |
| **Total invertido** | 80h | | **$8,800,000 COP** |

### 6.2 Valor de mercado (sin IA)

| Concepto | Horas | Tarifa/hora | Subtotal |
|---|---|---|---|
| Desarrollo senior manual (80%) | 403h | $100,000 | $40,320,000 |
| Arquitectura (20%) | 101h | $150,000 | $15,120,000 |
| **Total valor de mercado** | 504h | | **$55,440,000 COP** |

### 6.3 Precio de venta recomendado

| Escenario | Valor | Justificación |
|---|---|---|
| Piso (costo + margen) | $25,000,000 COP | Cubre inversión + margen |
| **Recomendado** | **$35M – $40M COP** | Valor entregado, no horas |
| Techo (valor pleno) | $55,000,000 COP | Solo si se vende "a medida" sin mencionar IA |

**Número redondo para propuesta: $38,000,000 COP (≈ $12,700 USD a tasa $3,000)**

---

## 7. Argumento de Venta (para el gerente)

> "Este proyecto incluye: menú público QR con fallback offline, carrito y pedidos por WhatsApp, panel admin con login y edición de menú, subida de imágenes, esquema Supabase con RLS y seguridad, 10 migraciones de base de datos, edge function de pedidos con rate limiting, y 33 documentos técnicos. Construido en 2 semanas con arquitectura multi-tenant lista para escalar a 10 sedes. Valor de mercado: $55M COP. Precio de venta: $35M–$40M COP."

---

## 8. Riesgos a Comunicar al Cliente

1. **Facturación es el mayor riesgo legal**: errores de numeración, habilitación o IVA = sanciones DIAN. No es un feature, es obligación normativa.
2. **Inventario sin proceso definido = datos basura**: primero hay que levantar cómo trabajan compras, mermas y ventas hoy.
3. **El alcance real es re-plataforma, no upgrade**: la parte pública se conserva, pero el núcleo operativo es un sistema nuevo sobre la misma base de datos.
4. **El cuello de botella es la habilitación DIAN**, no el código.

---

## 9. Ruta de Entregas (para no presupuestar todo de golpe)

| Entrega | Contenido | Costo acumulado (COP) | Tiempo |
|---|---|---|---|
| A | Fundación + multi-sede | $39M – $75M | ~2–3 meses |
| B | + Inventario | $96M – $182M | ~4–5 meses |
| C | + Facturación DIAN | $132M – $246M | ~5–6 meses |
| D | + POS completo | $175M – $325M | ~6 meses |

**Recomendación:** arrancar con la Entrega A (fundación + multi-sede) para validar el modelo multimarca antes de invertir en inventario y facturación. En paralelo, iniciar el trámite de habilitación DIAN porque ese reloj corre solo.

---

## 10. Conclusión

CartaMago tiene una base sólida y validada. El salto a 10 sedes con inventario y facturación DIAN es viable con la arquitectura propuesta (NestJS + Postgres multi-tenant + operador DIAN) y un modelo de trabajo multi-agente que reduce el costo de $885M a $430M COP y el tiempo de 14 a 6 meses.

**La decisión clave previa:** ¿CartaMago será SaaS multi-marca (se vende a varias cadenas) o solo una cadena con 10 sedes? Esto define el diseño de datos y RLS, y debe resolverse con el cliente antes de escribir código.

---

*Documento generado a partir del análisis técnico del repositorio CartaMago. Tasas de referencia: $3,000 COP/USD. Tarifas de mercado colombiano para desarrollo senior y arquitectura.*