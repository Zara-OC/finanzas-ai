-- 002_seed_categories.sql
-- Finanzas AI: Argentine-focused system categories
-- System categories have user_id = NULL and is_system = true

-- Helper: insert parent, then children referencing parent
-- We use a DO block so we can reference parent IDs

do $$
declare
  v_vivienda uuid;
  v_alimentacion uuid;
  v_delivery uuid;
  v_transporte uuid;
  v_salud uuid;
  v_entretenimiento uuid;
  v_compras uuid;
  v_educacion uuid;
  v_impuestos uuid;
  v_transferencias uuid;
  v_ingresos uuid;
begin

  -- Vivienda
  insert into public.categories (id, user_id, name, icon, color, parent_id, is_system)
  values (gen_random_uuid(), null, 'Vivienda', '🏠', '#6366f1', null, true)
  returning id into v_vivienda;

  insert into public.categories (user_id, name, icon, color, parent_id, is_system) values
    (null, 'Alquiler', '🔑', '#6366f1', v_vivienda, true),
    (null, 'Expensas', '🏢', '#6366f1', v_vivienda, true),
    (null, 'Servicios', '💡', '#6366f1', v_vivienda, true);

  -- Alimentación
  insert into public.categories (id, user_id, name, icon, color, parent_id, is_system)
  values (gen_random_uuid(), null, 'Alimentación', '🛒', '#22c55e', null, true)
  returning id into v_alimentacion;

  insert into public.categories (user_id, name, icon, color, parent_id, is_system) values
    (null, 'Supermercado', '🏪', '#22c55e', v_alimentacion, true),
    (null, 'Verdulería', '🥬', '#22c55e', v_alimentacion, true),
    (null, 'Carnicería', '🥩', '#22c55e', v_alimentacion, true);

  -- Delivery
  insert into public.categories (id, user_id, name, icon, color, parent_id, is_system)
  values (gen_random_uuid(), null, 'Delivery', '🛵', '#f97316', null, true)
  returning id into v_delivery;

  insert into public.categories (user_id, name, icon, color, parent_id, is_system) values
    (null, 'Rappi', '📱', '#f97316', v_delivery, true),
    (null, 'PedidosYa', '📱', '#f97316', v_delivery, true),
    (null, 'Uber Eats', '📱', '#f97316', v_delivery, true);

  -- Transporte
  insert into public.categories (id, user_id, name, icon, color, parent_id, is_system)
  values (gen_random_uuid(), null, 'Transporte', '🚗', '#3b82f6', null, true)
  returning id into v_transporte;

  insert into public.categories (user_id, name, icon, color, parent_id, is_system) values
    (null, 'Nafta', '⛽', '#3b82f6', v_transporte, true),
    (null, 'SUBE', '🚌', '#3b82f6', v_transporte, true),
    (null, 'Uber/Cabify', '🚕', '#3b82f6', v_transporte, true),
    (null, 'Peajes', '🛣️', '#3b82f6', v_transporte, true);

  -- Salud
  insert into public.categories (id, user_id, name, icon, color, parent_id, is_system)
  values (gen_random_uuid(), null, 'Salud', '🏥', '#ef4444', null, true)
  returning id into v_salud;

  insert into public.categories (user_id, name, icon, color, parent_id, is_system) values
    (null, 'Obra social', '🏥', '#ef4444', v_salud, true),
    (null, 'Farmacia', '💊', '#ef4444', v_salud, true),
    (null, 'Médicos', '👨‍⚕️', '#ef4444', v_salud, true);

  -- Entretenimiento
  insert into public.categories (id, user_id, name, icon, color, parent_id, is_system)
  values (gen_random_uuid(), null, 'Entretenimiento', '🎬', '#a855f7', null, true)
  returning id into v_entretenimiento;

  insert into public.categories (user_id, name, icon, color, parent_id, is_system) values
    (null, 'Streaming', '📺', '#a855f7', v_entretenimiento, true),
    (null, 'Cine', '🎥', '#a855f7', v_entretenimiento, true),
    (null, 'Salidas', '🍻', '#a855f7', v_entretenimiento, true);

  -- Compras
  insert into public.categories (id, user_id, name, icon, color, parent_id, is_system)
  values (gen_random_uuid(), null, 'Compras', '🛍️', '#ec4899', null, true)
  returning id into v_compras;

  insert into public.categories (user_id, name, icon, color, parent_id, is_system) values
    (null, 'Ropa', '👕', '#ec4899', v_compras, true),
    (null, 'Electrónica', '💻', '#ec4899', v_compras, true),
    (null, 'Hogar', '🏡', '#ec4899', v_compras, true);

  -- Educación
  insert into public.categories (id, user_id, name, icon, color, parent_id, is_system)
  values (gen_random_uuid(), null, 'Educación', '📚', '#14b8a6', null, true)
  returning id into v_educacion;

  insert into public.categories (user_id, name, icon, color, parent_id, is_system) values
    (null, 'Cursos', '🎓', '#14b8a6', v_educacion, true),
    (null, 'Libros', '📖', '#14b8a6', v_educacion, true);

  -- Impuestos
  insert into public.categories (id, user_id, name, icon, color, parent_id, is_system)
  values (gen_random_uuid(), null, 'Impuestos', '🏛️', '#78716c', null, true)
  returning id into v_impuestos;

  insert into public.categories (user_id, name, icon, color, parent_id, is_system) values
    (null, 'ABL', '🏛️', '#78716c', v_impuestos, true),
    (null, 'Patente', '🚗', '#78716c', v_impuestos, true),
    (null, 'Monotributo', '📋', '#78716c', v_impuestos, true);

  -- Transferencias (no children)
  insert into public.categories (user_id, name, icon, color, parent_id, is_system)
  values (null, 'Transferencias', '🔄', '#64748b', null, true);

  -- Ingresos
  insert into public.categories (id, user_id, name, icon, color, parent_id, is_system)
  values (gen_random_uuid(), null, 'Ingresos', '💰', '#10b981', null, true)
  returning id into v_ingresos;

  insert into public.categories (user_id, name, icon, color, parent_id, is_system) values
    (null, 'Sueldo', '💵', '#10b981', v_ingresos, true),
    (null, 'Freelance', '💻', '#10b981', v_ingresos, true),
    (null, 'Otros', '📦', '#10b981', v_ingresos, true);

end $$;
