insert into public.email_segments (slug, name, description)
values
  ('newsletter_subscribers', 'Newsletter Subscribers', 'All active newsletter subscribers eligible for general marketing emails.'),
  ('liquidation_leads', 'Liquidation Leads', 'Subscribers interested in last-minute and liquidation opportunities.')
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description;
