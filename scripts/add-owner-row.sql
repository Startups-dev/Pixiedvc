insert into owners (id, verification, created_at)
values ('e61be5b6-3539-405b-abd4-9918a08f2cdf', 'pending', now())
on conflict (id) do nothing;
