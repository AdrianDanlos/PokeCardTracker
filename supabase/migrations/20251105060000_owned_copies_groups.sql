-- Allow multiple inventory copy groups per card
alter table public.owned_copies
  drop constraint if exists owned_copies_user_id_card_id_key;

create unique index if not exists owned_copies_group_idx on public.owned_copies (
  user_id,
  card_id,
  condition,
  coalesce(edition, ''),
  coalesce(variant, ''),
  coalesce(language, '')
);

-- Progress summary: owned = entry whose card has total quantity > 0 (no duplicate rows from joins)
create or replace view public.collection_progress_summary as
with entry_owned as (
  select
    ce.collection_id,
    ce.id as entry_id,
    coalesce(
      (
        select sum(oc.quantity)::integer
        from public.owned_copies oc
        join public.collections col on col.id = ce.collection_id
        where oc.card_id = ce.card_id and oc.user_id = col.user_id
      ),
      0
    ) as qty_sum
  from public.collection_entries ce
)
select
  c.id as collection_id,
  c.user_id,
  c.name,
  c.description,
  c.cover_image_path,
  c.goal_count,
  c.sort_order,
  count(eo.entry_id)::integer as total_entries,
  count(eo.entry_id) filter (where eo.qty_sum > 0)::integer as owned_entries,
  case
    when count(eo.entry_id) = 0 then 0::numeric
    else round(
      100.0 * count(eo.entry_id) filter (where eo.qty_sum > 0) / count(eo.entry_id),
      1
    )
  end as owned_percent
from public.collections c
left join entry_owned eo on eo.collection_id = c.id
group by c.id;

create or replace function public.collection_progress_breakdown(p_collection_id uuid)
returns jsonb
language sql
stable
security invoker
as $$
  with entry_qty as (
    select
      ce.id as entry_id,
      card.id as card_id,
      card.rarity,
      card.category,
      s.name as set_name,
      coalesce(
        (
          select sum(oc.quantity)::integer
          from public.owned_copies oc
          join public.collections col on col.id = ce.collection_id
          where oc.card_id = ce.card_id and oc.user_id = col.user_id
        ),
        0
      ) as qty_sum
    from public.collection_entries ce
    join public.collections col on col.id = ce.collection_id
    join public.cards card on card.id = ce.card_id
    left join public.sets s on s.id = card.set_id
    where ce.collection_id = p_collection_id
  )
  select jsonb_build_object(
    'by_rarity', coalesce(
      (
        select jsonb_object_agg(rarity_key, stats)
        from (
          select
            coalesce(rarity, 'Unknown') as rarity_key,
            jsonb_build_object(
              'total', count(*)::integer,
              'owned', count(*) filter (where qty_sum > 0)::integer
            ) as stats
          from entry_qty
          group by coalesce(rarity, 'Unknown')
        ) r
      ),
      '{}'::jsonb
    ),
    'by_set', coalesce(
      (
        select jsonb_object_agg(set_key, stats)
        from (
          select
            coalesce(set_name, 'No set') as set_key,
            jsonb_build_object(
              'total', count(*)::integer,
              'owned', count(*) filter (where qty_sum > 0)::integer
            ) as stats
          from entry_qty
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
              'owned', count(*) filter (where qty_sum > 0)::integer
            ) as stats
          from entry_qty
          group by category
        ) c
      ),
      '{}'::jsonb
    )
  );
$$;
