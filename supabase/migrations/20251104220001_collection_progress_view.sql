-- Dashboard-friendly collection progress summary
create or replace view public.collection_progress_summary as
with entry_stats as (
  select
    ce.collection_id,
    count(*)::integer as total_entries,
    count(*) filter (where coalesce(oc.quantity, 0) > 0)::integer as owned_entries
  from public.collection_entries ce
  join public.collections col on col.id = ce.collection_id
  left join public.owned_copies oc
    on oc.card_id = ce.card_id and oc.user_id = col.user_id
  group by ce.collection_id
)
select
  c.id as collection_id,
  c.user_id,
  c.name,
  c.description,
  c.cover_image_path,
  c.goal_count,
  c.sort_order,
  coalesce(es.total_entries, 0) as total_entries,
  coalesce(es.owned_entries, 0) as owned_entries,
  case
    when coalesce(es.total_entries, 0) = 0 then 0::numeric
    else round(100.0 * es.owned_entries / es.total_entries, 1)
  end as owned_percent
from public.collections c
left join entry_stats es on es.collection_id = c.id;

-- Breakdown helper (called from app via RPC)
create or replace function public.collection_progress_breakdown(p_collection_id uuid)
returns jsonb
language sql
stable
security invoker
as $$
  select jsonb_build_object(
    'by_rarity', coalesce(
      (
        select jsonb_object_agg(rarity_key, stats)
        from (
          select
            coalesce(card.rarity, 'Unknown') as rarity_key,
            jsonb_build_object(
              'total', count(*)::integer,
              'owned', count(*) filter (where coalesce(oc.quantity, 0) > 0)::integer
            ) as stats
          from public.collection_entries ce
          join public.collections col on col.id = ce.collection_id
          join public.cards card on card.id = ce.card_id
          left join public.owned_copies oc
            on oc.card_id = ce.card_id and oc.user_id = col.user_id
          where ce.collection_id = p_collection_id
          group by coalesce(card.rarity, 'Unknown')
        ) r
      ),
      '{}'::jsonb
    ),
    'by_set', coalesce(
      (
        select jsonb_object_agg(set_key, stats)
        from (
          select
            coalesce(s.name, 'No set') as set_key,
            jsonb_build_object(
              'total', count(*)::integer,
              'owned', count(*) filter (where coalesce(oc.quantity, 0) > 0)::integer
            ) as stats
          from public.collection_entries ce
          join public.collections col on col.id = ce.collection_id
          join public.cards card on card.id = ce.card_id
          left join public.sets s on s.id = card.set_id
          left join public.owned_copies oc
            on oc.card_id = ce.card_id and oc.user_id = col.user_id
          where ce.collection_id = p_collection_id
          group by coalesce(s.name, 'No set')
        ) s
      ),
      '{}'::jsonb
    ),
    'by_category', coalesce(
      (
        select jsonb_object_agg(category_key, stats)
        from (
          select
            card.category::text as category_key,
            jsonb_build_object(
              'total', count(*)::integer,
              'owned', count(*) filter (where coalesce(oc.quantity, 0) > 0)::integer
            ) as stats
          from public.collection_entries ce
          join public.collections col on col.id = ce.collection_id
          join public.cards card on card.id = ce.card_id
          left join public.owned_copies oc
            on oc.card_id = ce.card_id and oc.user_id = col.user_id
          where ce.collection_id = p_collection_id
          group by card.category
        ) c
      ),
      '{}'::jsonb
    )
  );
$$;

-- Alias view name from spec
create or replace view public.collection_progress as
select
  collection_id,
  user_id,
  name,
  goal_count,
  total_entries,
  owned_entries,
  owned_percent
from public.collection_progress_summary;
