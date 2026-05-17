-- profiles cascade 체인의 나머지 NO ACTION FK 3개 일괄 CASCADE 전환

ALTER TABLE public.ad_events
  DROP CONSTRAINT IF EXISTS ad_events_subscription_id_fkey;
ALTER TABLE public.ad_events
  ADD CONSTRAINT ad_events_subscription_id_fkey
  FOREIGN KEY (subscription_id) REFERENCES public.ad_subscriptions(id) ON DELETE CASCADE;

ALTER TABLE public.point_transactions
  DROP CONSTRAINT IF EXISTS point_transactions_wallet_id_fkey;
ALTER TABLE public.point_transactions
  ADD CONSTRAINT point_transactions_wallet_id_fkey
  FOREIGN KEY (wallet_id) REFERENCES public.point_wallets(id) ON DELETE CASCADE;

ALTER TABLE public.quote_bids
  DROP CONSTRAINT IF EXISTS quote_bids_portfolio_id_fkey;
ALTER TABLE public.quote_bids
  ADD CONSTRAINT quote_bids_portfolio_id_fkey
  FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;
