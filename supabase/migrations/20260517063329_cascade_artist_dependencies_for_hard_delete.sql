-- artists 하드 삭제 차단 FK 3개를 CASCADE 로 전환

ALTER TABLE public.ad_subscriptions
  DROP CONSTRAINT IF EXISTS ad_subscriptions_artist_id_fkey;
ALTER TABLE public.ad_subscriptions
  ADD CONSTRAINT ad_subscriptions_artist_id_fkey
  FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE CASCADE;

ALTER TABLE public.contact_clicks
  DROP CONSTRAINT IF EXISTS contact_clicks_artist_id_fkey;
ALTER TABLE public.contact_clicks
  ADD CONSTRAINT contact_clicks_artist_id_fkey
  FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE CASCADE;

ALTER TABLE public.quote_bids
  DROP CONSTRAINT IF EXISTS quote_bids_artist_id_fkey;
ALTER TABLE public.quote_bids
  ADD CONSTRAINT quote_bids_artist_id_fkey
  FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE CASCADE;
