-- BUG: posts.likes_count / comments_count / views_count / reports_count never update from REST.
--
-- The trigger functions (fn_post_likes_count, fn_post_comments_count,
-- fn_post_views_count, trg_post_reports_count_fn) try to UPDATE posts when a
-- like/comment/view/report row is inserted. But the posts UPDATE RLS policy
-- restricts updates to the post's own author:
--
--   posts_update USING (user_id = auth.uid())
--
-- When user A likes user B's post, the trigger runs as user A. RLS rejects the
-- UPDATE on user B's row → 0 rows affected → count stays at 0. Silent failure.
--
-- Fix: mark all 4 trigger functions SECURITY DEFINER so they execute as the
-- function owner (postgres) and bypass RLS for the count maintenance UPDATE.
-- Then backfill existing counts from actual row counts.

ALTER FUNCTION fn_post_likes_count() SECURITY DEFINER;
ALTER FUNCTION fn_post_comments_count() SECURITY DEFINER;
ALTER FUNCTION fn_post_views_count() SECURITY DEFINER;
ALTER FUNCTION trg_post_reports_count_fn() SECURITY DEFINER;

-- Backfill: recompute every counter from the source-of-truth row counts.
UPDATE posts p SET
  likes_count = (
    SELECT COUNT(*) FROM likes
    WHERE likeable_type = 'post' AND likeable_id = p.id
  ),
  comments_count = (
    SELECT COUNT(*) FROM comments
    WHERE post_id = p.id AND deleted_at IS NULL
  ),
  views_count = (
    SELECT COUNT(*) FROM post_views
    WHERE post_id = p.id
  ),
  reports_count = (
    SELECT COUNT(*) FROM reports
    WHERE reportable_type = 'post' AND reportable_id = p.id
  )
WHERE p.deleted_at IS NULL;
