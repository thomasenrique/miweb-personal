-- Mi vida · Hábitos: calendario mensual con un ícono por hábito cumplido
-- Ejecutar en Supabase → SQL Editor después de 0004_sueldo.sql.

create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  nombre text not null check (char_length(nombre) between 1 and 24),
  -- Emoji (🥊) o ícono propio con prefijo "svg:" (svg:mancuerna)
  icono text not null default '✔',
  -- Token de color del sistema de diseño: --h-cat-1 … --h-cat-6
  color text not null default '--h-cat-1' check (color ~ '^--h-cat-[1-6]$'),
  -- Veces por semana; 0 = sin meta
  meta_semanal smallint not null default 0 check (meta_semanal between 0 and 7),
  orden smallint not null default 0,
  -- Archivar oculta el hábito pero conserva sus marcas
  archivado_at timestamptz,
  created_at timestamptz not null default now()
);

-- Una fila = un hábito cumplido en un día (como máximo una vez por día)
create table habit_marks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  habit_id uuid not null references habits on delete cascade,
  fecha date not null default current_date,
  created_at timestamptz not null default now(),
  unique (habit_id, fecha)
);

create index habits_user on habits (user_id, orden) where archivado_at is null;
-- El calendario pide las marcas de un mes completo
create index habit_marks_user_fecha on habit_marks (user_id, fecha);

alter table habits enable row level security;
alter table habit_marks enable row level security;

create policy "habitos propios" on habits for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- La marca debe apuntar a un hábito del mismo usuario
create policy "marcas propias" on habit_marks for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from habits h where h.id = habit_id and h.user_id = auth.uid()));

-- Hábitos de ejemplo (opcional). En el SQL Editor no hay sesión, así que auth.uid() es null:
-- reemplaza <TU_USER_ID> por tu id (Authentication → Users), descomenta y ejecuta.
-- insert into habits (user_id, nombre, icono, color, meta_semanal, orden) values
--   ('<TU_USER_ID>', 'Gimnasio',   'svg:mancuerna', '--h-cat-3', 3, 1),
--   ('<TU_USER_ID>', 'Kickboxing', '🥊',            '--h-cat-1', 2, 2),
--   ('<TU_USER_ID>', 'Aseo casa',  '🧹',            '--h-cat-2', 2, 3);
