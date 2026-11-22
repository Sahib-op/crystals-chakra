alter table catalog.readings
  drop constraint readings_card_color_check,
  add constraint readings_card_color_check
    check (
      card_color in ('default', 'navy', 'burgundy', 'emerald', 'indigo')
      or (length(card_color) = 7 and card_color ~ '^#[0-9a-fA-F]{6}$')
    );
