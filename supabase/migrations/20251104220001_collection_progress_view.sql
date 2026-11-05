create or replace view public.collection_progress_summary as
with entry_owned as (
  select
    ce.collection_id,
    ce.id as entry_id,
    exists (
      select 1
      from public.owned_copies oc
      join public.collections col on col.id = ce.collection_id
      where oc.card_id = ce.card_id and oc.user_id = col.user_id
    ) as is_owned
  from public.collection_entries ce
)
select
  c.id as collection_id,
  c.user_id,
  c.name,
  c.description,
  c.cover_image_path,
  c.sort_order,
  count(eo.entry_id)::integer as total_entries,
  count(eo.entry_id) filter (where eo.is_owned)::integer as owned_entries,
  case
    when count(eo.entry_id) = 0 then 0::numeric
    else round(
      100.0 * count(eo.entry_id) filter (where eo.is_owned) / count(eo.entry_id),
      1
    )
  end as owned_percent
from public.collections c
left join entry_owned eo on eo.collection_id = c.id
group by c.id;

create or replace view public.collection_progress as
select
  collection_id,
  user_id,
  name,
  total_entries,
  owned_entries,
  owned_percent
from public.collection_progress_summary;
