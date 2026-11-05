drop index if exists public.cards_rarity_idx;

alter table public.cards drop column if exists rarity;

create or replace function public.collection_progress_breakdown(p_collection_id uuid)
returns jsonb
language sql
stable
security invoker
as $$
  with entry_owned as (
    select
      ce.id as entry_id,
      card.category,
      s.name as set_name,
      exists (
        select 1
        from public.owned_copies oc
        join public.collections col on col.id = ce.collection_id
        where oc.card_id = ce.card_id and oc.user_id = col.user_id
      ) as is_owned
    from public.collection_entries ce
    join public.collections col on col.id = ce.collection_id
    join public.cards card on card.id = ce.card_id
    left join public.sets s on s.id = card.set_id
    where ce.collection_id = p_collection_id
  )
  select jsonb_build_object(
    'by_set', coalesce(
      (
        select jsonb_object_agg(set_key, stats)
        from (
          select
            coalesce(set_name, 'No set') as set_key,
            jsonb_build_object(
              'total', count(*)::integer,
              'owned', count(*) filter (where is_owned)::integer
            ) as stats
          from entry_owned
          group by coalesce(set_name, 'No set')
        ) s
      ),
      '{}'::jsonb
    ),
    'by_category', coalesce(
      (
        select jsonb_object_agg(category_key, stats)
        from (
          select
            category::text as category_key,
            jsonb_build_object(
              'total', count(*)::integer,
              'owned', count(*) filter (where is_owned)::integer
            ) as stats
          from entry_owned
          group by category
        ) c
      ),
      '{}'::jsonb
    )
  );
$$;
