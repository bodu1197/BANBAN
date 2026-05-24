-- RPC: reorder_quick_menu_items
-- Atomic 2-phase reorder of quick_menu_items inside a single function (trans-
-- action). Avoids UNIQUE(order_index) collisions during swap operations
-- (e.g. 1<->2) by first moving every row to a negative temporary index,
-- then assigning the final values. Both UPDATEs run inside the function's
-- implicit transaction.
--
-- Input  : p_items jsonb — [{ "id": "<uuid>", "order_index": <int> }, ...]
-- Output : SETOF quick_menu_items — final state (caller can use directly)

CREATE OR REPLACE FUNCTION public.reorder_quick_menu_items(p_items jsonb)
RETURNS SETOF public.quick_menu_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Phase 1: move every targeted row to a unique negative temporary index
    -- so the final assignments in Phase 2 cannot collide with each other.
    UPDATE public.quick_menu_items AS q
    SET order_index = -(1000000 + (item.value->>'order_index')::int)
    FROM jsonb_array_elements(p_items) AS item
    WHERE q.id = (item.value->>'id')::uuid;

    -- Phase 2: assign the final order_index values.
    UPDATE public.quick_menu_items AS q
    SET order_index = (item.value->>'order_index')::int,
        updated_at = now()
    FROM jsonb_array_elements(p_items) AS item
    WHERE q.id = (item.value->>'id')::uuid;

    RETURN QUERY
    SELECT * FROM public.quick_menu_items
    ORDER BY order_index ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_quick_menu_items(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_quick_menu_items(jsonb) TO service_role;

COMMENT ON FUNCTION public.reorder_quick_menu_items(jsonb) IS
'Atomic 2-phase reorder for quick_menu_items. Service role only.';
