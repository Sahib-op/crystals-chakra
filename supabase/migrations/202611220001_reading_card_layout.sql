alter table catalog.readings
  add column card_size text not null default 'standard'
    check (card_size in ('compact', 'standard', 'wide')),
  add column card_color text not null default 'default'
    check (card_color in ('default', 'navy', 'burgundy', 'emerald', 'indigo')),
  alter column sort_order set default 1000;

-- Move existing additions that inherited the old zero default. Preserve all
-- nonzero positions and the featured Tarot reading.
update catalog.readings
set sort_order = 1000
where sort_order = 0 and id not in ('tarot', 'birhaat', 'bhrigu', 'parashara');
