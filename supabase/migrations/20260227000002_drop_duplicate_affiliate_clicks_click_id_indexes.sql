-- Drop redundant indexes on affiliate_clicks(click_id)
-- Keep ONE unique index only. We will keep: affiliate_clicks_click_id_key
-- because it likely came from a UNIQUE constraint or earlier canonical index.

DROP INDEX IF EXISTS public.affiliate_clicks_click_id_unique;
DROP INDEX IF EXISTS public.affiliate_clicks_click_id_idx;
