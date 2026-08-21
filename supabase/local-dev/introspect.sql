-- Emits the schema metadata needed to hand-generate a Supabase-shaped
-- Database type, as a single JSON value on stdout. Used by
-- generate-types.mjs because `supabase gen types --db-url` also shells
-- out to a Docker container internally, which isn't available in this
-- sandbox (see supabase/local-dev/README.md).
select jsonb_pretty(jsonb_build_object(
  'tables', (
    select coalesce(jsonb_agg(t order by t->>'name'), '[]'::jsonb)
    from (
      select jsonb_build_object(
        'name', c.relname,
        'kind', case c.relkind when 'r' then 'table' when 'v' then 'view' end,
        'columns', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'name', a.attname,
            'udt_name', ty.typname,
            'is_array', ty.typcategory = 'A',
            'element_udt_name', et.typname,
            'nullable', not a.attnotnull,
            'has_default', a.atthasdef,
            'is_generated', a.attgenerated <> ''
          ) order by a.attnum), '[]'::jsonb)
          from pg_attribute a
          join pg_type ty on ty.oid = a.atttypid
          left join pg_type et on et.oid = ty.typelem
          where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
        ),
        -- Real Supabase types include this per table so
        -- @supabase/postgrest-js's generics (GenericTable requires
        -- Relationships) resolve correctly, and so nested
        -- `.select('*, other_table(*)')` joins type-check.
        'relationships', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'foreignKeyName', con.conname,
            'columns', (
              select jsonb_agg(a.attname order by ord)
              from unnest(con.conkey) with ordinality as k(attnum, ord)
              join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum
            ),
            'referencedRelation', rc.relname,
            'referencedColumns', (
              select jsonb_agg(a.attname order by ord)
              from unnest(con.confkey) with ordinality as k(attnum, ord)
              join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.attnum
            )
          )), '[]'::jsonb)
          from pg_constraint con
          join pg_class rc on rc.oid = con.confrelid
          where con.conrelid = c.oid and con.contype = 'f'
        )
      ) as t
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'v')
    ) sub
  ),
  'enums', (
    select coalesce(jsonb_object_agg(t.typname, labels), '{}'::jsonb)
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join lateral (
      select jsonb_agg(e.enumlabel order by e.enumsortorder) as labels
      from pg_enum e where e.enumtypid = t.oid
    ) l on true
    where n.nspname = 'public' and t.typtype = 'e'
  )
));
