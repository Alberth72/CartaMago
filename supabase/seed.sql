insert into public.branches (
  id,
  name,
  short_name,
  whatsapp_number,
  location,
  headline,
  description,
  fulfillment_modes,
  hero_image_url,
  social_handle
) values (
  'brasas-sazon',
  'Brasas & Sazón',
  'Brasas & Sazón',
  '573104217941',
  'Asadero y Restaurante',
  'Tenemos el mejor sabor',
  'Menu digital para armar pedidos de pollo, asados, bandejas, sopas, bebidas y adiciones por WhatsApp.',
  array['pickup', 'local_delivery', 'didi_food', 'table'],
  '/client-assets/brasas-sazon/processed/product-placeholder-preparing.png',
  '@brasasysazon1'
) on conflict (id) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  whatsapp_number = excluded.whatsapp_number,
  location = excluded.location,
  headline = excluded.headline,
  description = excluded.description,
  fulfillment_modes = excluded.fulfillment_modes,
  hero_image_url = excluded.hero_image_url,
  social_handle = excluded.social_handle;

insert into public.categories (id, branch_id, name, description, image_url, sort_order) values
  ('pollos', 'brasas-sazon', 'Pollo', 'Pollo asado al carbon o apanado.', null, 10),
  ('asados', 'brasas-sazon', 'Asados', 'Carnes de 300 gr con papas, arepa, queso y ensalada dulce.', null, 20),
  ('bandejas', 'brasas-sazon', 'Bandejas', 'Bandejas con sopa, arroz, frijol, maduro, huevo, ensalada y bebida.', null, 30),
  ('tipicos', 'brasas-sazon', 'Tipicos', 'Mondongo, sancocho, pescados y picada.', null, 40),
  ('sopas', 'brasas-sazon', 'Sopas', 'Sopas y consomes con arepa.', null, 50),
  ('infantil', 'brasas-sazon', 'Infantil', 'Opciones pequenas y jugos.', null, 60),
  ('bebidas', 'brasas-sazon', 'Bebidas', 'Limonadas, jugos y gaseosas.', null, 70),
  ('adiciones', 'brasas-sazon', 'Adiciones', 'Acompanamientos y extras.', null, 80)
on conflict (id) do update set
  branch_id = excluded.branch_id,
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order;

insert into public.products (id, branch_id, category_id, name, description, price_cop, badge, available, sort_order) values
  ('pollo-entero', 'brasas-sazon', 'pollos', '1 Pollo asado al carbon', 'Incluye 4 arepas, 4 papas y maduro.', 26000, 'Especialidad', true, 10),
  ('medio-asado', 'brasas-sazon', 'pollos', '1/2 asado', 'Media porcion de pollo asado al carbon.', 26000, null, true, 20),
  ('cuarto-asado', 'brasas-sazon', 'pollos', '1/4 asado', 'Cuarto de pollo asado al carbon.', 26000, null, true, 30),
  ('pollo-apanado', 'brasas-sazon', 'pollos', '1 Pollo apanado', 'Incluye 4 arepas, 4 papas y maduro.', 26000, null, true, 40),
  ('combo-pollo', 'brasas-sazon', 'pollos', 'Pollo en combo', 'Pollo asado al carbon o apanado con 4 arepas, 4 papas, maduro y gaseosa litro.', 26000, 'Combo', true, 50),
  ('churrasco', 'brasas-sazon', 'asados', 'Churrasco 300 gr', 'Con papa a la francesa, arepa, queso y ensalada dulce.', 26000, null, true, 60),
  ('lomo-cerdo', 'brasas-sazon', 'asados', 'Lomo de cerdo 300 gr', 'Con papa a la francesa, arepa, queso y ensalada dulce.', 26000, null, true, 70),
  ('punta-anca', 'brasas-sazon', 'asados', 'Punta de anca 300 gr', 'Con papa a la francesa, arepa, queso y ensalada dulce.', 26000, null, true, 80),
  ('filete-pollo', 'brasas-sazon', 'asados', 'Filete de pollo 300 gr', 'Con papa a la francesa, arepa, queso y ensalada dulce.', 26000, null, true, 90),
  ('chuzo-pollo', 'brasas-sazon', 'asados', 'Chuzo de pollo 300 gr', 'Con papa a la francesa, arepa, queso y ensalada dulce.', 26000, null, true, 100),
  ('bandeja-res', 'brasas-sazon', 'bandejas', 'Bandeja con res', 'Con sopa, arroz, frijol, maduro, huevo, ensalada, jugo o limonada.', 26000, null, true, 110),
  ('bandeja-pollo', 'brasas-sazon', 'bandejas', 'Bandeja con pollo', 'Con sopa, arroz, frijol, maduro, huevo, ensalada, jugo o limonada.', 26000, null, true, 120),
  ('bandeja-cerdo', 'brasas-sazon', 'bandejas', 'Bandeja con cerdo', 'Con sopa, arroz, frijol, maduro, huevo, ensalada, jugo o limonada.', 26000, null, true, 130),
  ('bandeja-paisa', 'brasas-sazon', 'bandejas', 'Bandeja paisa', 'Con frijol, arroz, huevo, arepa, maduro, ensalada, aguacate, chicharron, morcilla y chorizo.', 26000, 'Completa', true, 140),
  ('mondongo', 'brasas-sazon', 'tipicos', 'Mondongo', 'Con porcion de arroz, arepa, aguacate y ensalada.', 26000, null, true, 150),
  ('sancocho', 'brasas-sazon', 'tipicos', 'Sancocho', 'Con porcion de arroz, arepa, aguacate y ensalada.', 26000, null, true, 160),
  ('tilapia', 'brasas-sazon', 'tipicos', 'Tilapia', 'Plato tipico con arroz, frijol, ensalada y acompanamientos.', 26000, null, true, 170),
  ('picada', 'brasas-sazon', 'tipicos', 'Picada', 'Res, cerdo, pollo, chicharron, chorizo, arepas, papas y ensalada.', 26000, null, true, 180),
  ('sopa-pollo', 'brasas-sazon', 'sopas', 'Sopa de pollo', 'Sopa o consome con arepa. Grande o pequena.', 26000, null, true, 190),
  ('sopa-frijol', 'brasas-sazon', 'sopas', 'Sopa de frijol', 'Sopa con arepa. Grande o pequena.', 26000, null, true, 200),
  ('salchipapas', 'brasas-sazon', 'infantil', 'Salchipapas', 'Menu infantil con papas y salchicha.', 26000, null, true, 210),
  ('nuggets-pollo', 'brasas-sazon', 'infantil', 'Nuggets de pollo', 'Menu infantil con nuggets y papas.', 26000, null, true, 220),
  ('jugo-agua', 'brasas-sazon', 'bebidas', 'Jugo en agua', 'Sabores: fresa, mora, mango, maracuya y guanabana.', 26000, null, true, 230),
  ('jugo-leche', 'brasas-sazon', 'bebidas', 'Jugo en leche', 'Sabores: fresa, mora, mango, maracuya y guanabana.', 26000, null, true, 240),
  ('limonada-natural', 'brasas-sazon', 'bebidas', 'Limonada natural', 'Limonada de la casa.', 26000, null, true, 250),
  ('soda-michelada', 'brasas-sazon', 'bebidas', 'Soda michelada', 'Bebida refrescante preparada.', 26000, null, true, 260),
  ('maduro-entero', 'brasas-sazon', 'adiciones', 'Maduro entero', 'Adicion para acompanar el pedido.', 26000, null, true, 270),
  ('papas-francesa', 'brasas-sazon', 'adiciones', 'Papas a la francesa', 'Porcion de papas a la francesa.', 26000, null, true, 280),
  ('arepa-quesito', 'brasas-sazon', 'adiciones', 'Arepa con quesito', 'Adicion para acompanar el pedido.', 26000, null, true, 290),
  ('para-llevar', 'brasas-sazon', 'adiciones', 'Para llevar', 'Empaque para llevar. En el menu fisico aparece con $500 adicionales.', 26000, null, true, 300),
  ('ensalada-dulce', 'brasas-sazon', 'adiciones', 'Ensalada dulce', 'Adicion para acompanar el pedido.', 26000, null, true, 310)
on conflict (id) do update set
  branch_id = excluded.branch_id,
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  price_cop = excluded.price_cop,
  badge = excluded.badge,
  available = excluded.available,
  sort_order = excluded.sort_order;

insert into public.formulas (id, branch_id, product_id, active)
values ('formula_brasas_pollo_entero', 'brasas-sazon', 'pollo-entero', true)
on conflict (branch_id, product_id) do update set
  active = true,
  updated_at = now();

insert into public.formula_ingredients (id, formula_id, item_id, quantity_per_unit, merma_percent)
values ('fing_brasas_pollo_entero', 'formula_brasas_pollo_entero', 'pollo-entero', 1, 0)
on conflict (formula_id, item_id) do update set
  quantity_per_unit = excluded.quantity_per_unit,
  merma_percent = excluded.merma_percent;

delete from public.menu_photos where branch_id = 'brasas-sazon';

insert into public.orders (id, branch_id, status, payment_status, payment_method, payment_provider, customer_name, customer_note, fulfillment_mode, delivery_address, table_number, total_items, total_cop, whatsapp_message, whatsapp_link, created_at) values
  ('ord_demo_001', 'brasas-sazon', 'pending', 'pending', 'cash', 'manual', 'Carlos Mendez', 'Sin cebolla en las papas', 'delivery', 'Calle 10 #5-20, Barrio Centro', '', 3, 78000, 'Hola, quiero hacer este pedido en Brasas & Sazón:\n\n- 1 x 1 Pollo asado al carbon: $26.000\n- 2 x Churrasco 300 gr: $52.000\n\nTotal aproximado: $78.000\nEntrega: Domicilio\nPago: Efectivo\nDireccion: Calle 10 #5-20, Barrio Centro\nNombre: Carlos Mendez\nNotas: Sin cebolla en las papas\n\nQuedo atento a confirmacion de disponibilidad y tiempo de entrega.', 'https://wa.me/573104217941?text=...', now() - interval '2 hours'),
  ('ord_demo_002', 'brasas-sazon', 'confirmed', 'paid', 'bank_transfer', 'manual', 'Maria Gutierrez', '', 'pickup', '', '', 2, 52000, 'Hola, quiero hacer este pedido en Brasas & Sazón:\n\n- 1 x Bandeja paisa: $26.000\n- 1 x Limonada natural: $26.000\n\nTotal aproximado: $52.000\nEntrega: Recoger en el local\nPago: Transferencia\nNombre: Maria Gutierrez\n\nQuedo atento a confirmacion de disponibilidad y tiempo de entrega.', 'https://wa.me/573104217941?text=...', now() - interval '1 hour'),
  ('ord_demo_003', 'brasas-sazon', 'preparing', 'pending', 'card_at_table', 'manual', 'Pedro Ramirez', 'Bien asada la carne', 'table', '', '5', 4, 104000, 'Hola, quiero hacer este pedido en Brasas & Sazón:\n\n- 2 x Punta de anca 300 gr: $52.000\n- 1 x Sopa de pollo: $26.000\n- 1 x Jugo en agua: $26.000\n\nTotal aproximado: $104.000\nEntrega: Mesa\nMesa: 5\nPago: Tarjeta en mesa\nNombre: Pedro Ramirez\nNotas: Bien asada la carne\n\nQuedo atento a confirmacion de disponibilidad y tiempo de entrega.', 'https://wa.me/573104217941?text=...', now() - interval '30 minutes')
on conflict (id) do nothing;

insert into public.order_items (id, order_id, product_id, product_name, quantity, unit_price_cop, line_note, sort_order) values
  ('itm_demo_001', 'ord_demo_001', 'pollo-entero', '1 Pollo asado al carbon', 1, 26000, '', 10),
  ('itm_demo_002', 'ord_demo_001', 'churrasco', 'Churrasco 300 gr', 2, 26000, 'Sin cebolla', 20),
  ('itm_demo_003', 'ord_demo_002', 'bandeja-paisa', 'Bandeja paisa', 1, 26000, '', 10),
  ('itm_demo_004', 'ord_demo_002', 'limonada-natural', 'Limonada natural', 1, 26000, '', 20),
  ('itm_demo_005', 'ord_demo_003', 'punta-anca', 'Punta de anca 300 gr', 2, 26000, 'Bien asada', 10),
  ('itm_demo_006', 'ord_demo_003', 'sopa-pollo', 'Sopa de pollo', 1, 26000, '', 20),
  ('itm_demo_007', 'ord_demo_003', 'jugo-agua', 'Jugo en agua', 1, 26000, 'Mora', 30)
on conflict (id) do nothing;
