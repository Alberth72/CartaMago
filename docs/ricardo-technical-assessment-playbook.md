# Playbook para prueba tecnica backend

## Objetivo

Ayudar a Ricardo a pasar una prueba tecnica de 45 minutos para una API backend con:

- Node.js
- Express
- PostgreSQL
- Knex.js
- Docker
- JavaScript

La meta no es terminar todo a la fuerza. La meta es mostrar buen criterio tecnico, comunicacion clara, validacion y control del tiempo.

## Mentalidad de la prueba

La prueba evalua dos cosas:

1. Que puedas resolver una tarea real de backend.
2. Que el evaluador vea como piensas mientras trabajas.

Ricardo debe trabajar como si estuviera en un equipo real:





Frase base:

```text
Voy a entender primero el flujo existente, correr el proyecto, reproducir la tarea, hacer el cambio minimo y validarlo.
```

## Antes de la prueba

Validar herramientas:

```bash
docker --version
docker compose version
docker run hello-world
node --version
npm --version
git --version
```

Tener listo:

- Editor abierto y actualizado.
- Terminal funcionando.
- Docker Desktop encendido.
- Camara y microfono probados.
- Pantalla completa lista para compartir.
- Postman, Insomnia o curl disponible.
- Agente de IA listo, pero no como piloto automatico.

## Primeros 5 minutos

Objetivo: entender el proyecto y arrancarlo.

Comandos utiles:

```bash
ls
find . -maxdepth 2 -type f | sort
npm install
docker compose up --build
docker compose ps
docker compose logs -f
```

Si esta en Windows PowerShell:

```powershell
Get-ChildItem
Get-ChildItem -Recurse -Depth 2 -File
```

Que decir:

```text
Primero voy a revisar la estructura del proyecto para ubicar rutas, configuracion, migraciones y tests.
```

```text
Voy a levantar Docker temprano para descubrir problemas de entorno antes de tocar codigo.
```

Buscar rapidamente:

- `package.json`
- `README.md`
- `docker-compose.yml`
- `src/`, `routes/`, `controllers/`, `services/`, `db/`
- `knexfile.js`
- `migrations/`
- `seeds/`
- `tests/`

## Minutos 5 a 10

Objetivo: encontrar el flujo exacto que hay que modificar.

Comandos utiles:

```bash
rg "router|app.get|app.post|app.put|app.delete" .
rg "knex|db\\(" .
rg "order|restaurant|menu|item|user|delivery" .
```

Que decir:

```text
Estoy ubicando el endpoint relacionado con la tarea y despues voy a seguir el flujo hacia la capa de datos.
```

```text
Antes de cambiarlo quiero ver si ya existe un patron para respuestas, errores y queries.
```

Buscar patrones:

- Como responden errores.
- Como validan parametros.
- Como acceden a PostgreSQL con Knex.
- Si hay servicios/repositorios o si todo esta en rutas.
- Si existen tests.

## Minutos 10 a 30

Objetivo: implementar el cambio minimo correcto.

Orden recomendado:

1. Reproducir el comportamiento actual.
2. Hacer un cambio pequeno.
3. Validar.
4. Repetir si falta.

Frases utiles:

```text
Voy a mantener el cambio pequeno y consistente con el estilo actual del proyecto.
```

```text
No voy a introducir una abstraccion nueva si el proyecto ya tiene un patron simple.
```

```text
Aqui prefiero validar entrada y devolver un status code claro en vez de dejar que falle profundo en la base de datos.
```

Para rutas Express:

```js
router.get('/orders/:id', async (req, res, next) => {
  try {
    const order = await orderRepository.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.json(order);
  } catch (error) {
    return next(error);
  }
});
```

Criterios de backend que se ven bien:

- `400` para entrada invalida.
- `404` cuando no existe el recurso.
- `201` cuando se crea algo.
- `204` cuando se elimina o actualiza sin body.
- `500` solo para errores inesperados.
- No exponer errores internos de PostgreSQL al cliente.
- Usar queries parametrizadas o Knex, no SQL concatenado.
- Validar datos antes de insertar.
- Mantener consistencia con el codigo existente.

## Knex rapido

Seleccionar:

```js
const rows = await knex('restaurants').select('*');
```

Filtrar:

```js
const restaurant = await knex('restaurants')
  .where({ id })
  .first();
```

Insertar:

```js
const [created] = await knex('orders')
  .insert(payload)
  .returning('*');
```

Actualizar:

```js
const [updated] = await knex('orders')
  .where({ id })
  .update(payload)
  .returning('*');
```

Eliminar:

```js
const deletedCount = await knex('orders')
  .where({ id })
  .del();
```

Transaccion:

```js
await knex.transaction(async (trx) => {
  const [order] = await trx('orders')
    .insert(orderPayload)
    .returning('*');

  await trx('order_items').insert(
    items.map((item) => ({
      order_id: order.id,
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
    }))
  );
});
```

Frase buena para transacciones:

```text
Como esta operacion escribe en mas de una tabla, la voy a envolver en una transaccion para evitar datos parciales.
```

## Docker rapido

Levantar:

```bash
docker compose up --build
```

Ver contenedores:

```bash
docker compose ps
```

Logs:

```bash
docker compose logs api
docker compose logs db
```

Entrar al contenedor:

```bash
docker compose exec api sh
```

Entrar a PostgreSQL:

```bash
docker compose exec db psql -U postgres
```

Migraciones comunes:

```bash
npm run migrate
npm run seed
npx knex migrate:latest
npx knex seed:run
```

Si Docker falla:

```text
Voy a revisar primero si los contenedores estan levantados y despues los logs del servicio que falla.
```

## Validacion

Siempre cerrar cambios con evidencia.

Tests:

```bash
npm test
npm run test
npm run lint
```

Probar endpoints:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/restaurants
```

POST con JSON:

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"restaurantId":1,"items":[{"menuItemId":2,"quantity":1}]}'
```

Que decir:

```text
Ahora voy a validar el camino feliz y al menos un caso de error para asegurar que el endpoint responde correctamente.
```

Casos minimos:

- Camino feliz.
- Recurso inexistente.
- Body invalido.
- Cantidad invalida.
- Lista vacia si aplica.

## Minutos 30 a 40

Objetivo: endurecer lo necesario.

Revisar:

- Errores manejados.
- Status codes.
- Nombres claros.
- Duplicacion innecesaria.
- Queries que puedan devolver `undefined`.
- Datos requeridos.
- Tests existentes actualizados.

Frase util:

```text
Ya tengo el flujo principal funcionando. Voy a usar estos minutos para revisar bordes y dejar evidencia de validacion.
```

## Minutos 40 a 45

Objetivo: cerrar profesionalmente.

No empezar refactors grandes.

Hacer:

- Correr test/lint si aplica.
- Probar endpoint final.
- Revisar diff.
- Explicar que quedo hecho y que faltaria si hubiera mas tiempo.

Comandos:

```bash
git diff
npm test
docker compose ps
```

Cierre en voz alta:

```text
Implemente el cambio en el flujo de pedidos, lo valide con el endpoint principal y revise un caso de error. Si tuviera mas tiempo agregaria mas cobertura para casos borde y revisaria rendimiento de queries con datos mas grandes.
```

## Como usar IA durante la prueba

Bien:

```text
Voy a pedirle al agente que me ayude a ubicar rutas relacionadas con orders, pero voy a revisar el codigo antes de aplicar cambios.
```

```text
Voy a usar el agente para generar una hipotesis de test y luego la ajusto al estilo del proyecto.
```

Mal:

```text
Pegar toda la tarea, esperar respuesta y aplicar sin leer.
```

Regla:

```text
La IA ayuda a buscar y acelerar. Ricardo decide, revisa y valida.
```

Prompts utiles:

```text
Lee la estructura del proyecto y dime donde parece estar el flujo de orders. No edites archivos todavia.
```

```text
Ayudame a identificar el patron de manejo de errores en estas rutas.
```

```text
Propón el cambio minimo para este endpoint siguiendo el estilo existente.
```

```text
Revisa este diff como code review: busca bugs, status codes incorrectos y casos sin validar.
```

## Checklist de seniority visible

Durante la prueba, Ricardo debe mostrar:

- Calma.
- Lectura inicial del proyecto.
- Buen uso de terminal.
- Cambios pequenos.
- Validacion frecuente.
- Comunicacion clara.
- Criterio para no sobreconstruir.
- Manejo de errores.
- Entendimiento de base de datos.
- Conciencia de casos borde.

## Practica previa recomendada

Hacer 3 ejercicios cortos antes del examen:

1. Crear un endpoint `GET /orders/:id` que traiga una orden con sus items.
2. Crear un endpoint `POST /orders` con validacion y transaccion.
3. Corregir un bug donde un endpoint devuelve `200` aunque el recurso no exista.

Cada practica debe hacerse en maximo 45 minutos con este cierre:

```text
Que cambie, como lo valide, que riesgo queda.
```

## Guion corto para memorizar

```text
Voy a empezar entendiendo estructura, dependencias y como se levanta el proyecto.
Luego ubico la ruta relacionada con la tarea y sigo el flujo hacia la base de datos.
Despues hago el cambio minimo siguiendo el estilo existente.
Finalmente valido con test o curl, y reviso casos de error.
```

## Errores que debe evitar

- Tocar muchos archivos sin necesidad.
- Refactorizar antes de entender.
- Quedarse callado.
- No correr el proyecto.
- No validar.
- Ignorar Docker.
- Copiar codigo de IA sin revisarlo.
- Cambiar el estilo del proyecto por gusto.
- Dejar errores sin explicar.
- Mentir si algo no funciona.

## Si algo se rompe

Frase recomendada:

```text
Tengo un fallo. Voy a reducirlo: primero confirmo si es entorno, dependencias, base de datos o codigo de aplicacion.
```

Orden de diagnostico:

1. Leer el error completo.
2. Revisar logs.
3. Confirmar contenedores.
4. Confirmar variables de entorno.
5. Confirmar migraciones.
6. Reproducir con el endpoint minimo.
7. Hacer rollback mental del ultimo cambio.

## Cierre ideal

```text
Complete el flujo principal, mantuve el cambio pequeno, segui el patron del proyecto y valide con [test/curl]. El principal riesgo pendiente es [caso borde], que atacaria despues con [test o mejora concreta].
```
