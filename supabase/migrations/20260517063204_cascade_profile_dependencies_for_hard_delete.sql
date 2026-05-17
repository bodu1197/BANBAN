-- profiles 하드 삭제를 위한 NO ACTION FK 4개를 CASCADE 로 전환
-- 이유: 컬럼들이 NOT NULL 이라 SET NULL 불가, NO ACTION 은 사용자 삭제 차단

-- conversations.participant_1
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_participant_1_fkey;
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_participant_1_fkey
  FOREIGN KEY (participant_1) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- conversations.participant_2
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_participant_2_fkey;
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_participant_2_fkey
  FOREIGN KEY (participant_2) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- messages.sender_id (conversation 자체가 cascade 되면 cascade 되지만 안전장치)
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- point_wallets.user_id (1:1 매핑, 사용자 삭제 시 자동 정리)
ALTER TABLE public.point_wallets
  DROP CONSTRAINT IF EXISTS point_wallets_user_id_fkey;
ALTER TABLE public.point_wallets
  ADD CONSTRAINT point_wallets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
