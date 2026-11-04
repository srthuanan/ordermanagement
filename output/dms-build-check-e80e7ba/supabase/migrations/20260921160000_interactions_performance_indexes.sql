-- Migration: Thêm index cho bảng interactions để fix lỗi statement timeout (57014)
-- Nguyên nhân: query dùng .or(target_id.eq, metadata->>orderNumber.eq) không có index → full table scan

-- Index 1: target_id (dùng nhiều nhất - audit log, notification lookup)
CREATE INDEX IF NOT EXISTS idx_interactions_target_id
    ON public.interactions (target_id)
    WHERE target_id IS NOT NULL;

-- Index 2: category + target_id (cho notification queries)
CREATE INDEX IF NOT EXISTS idx_interactions_category_target_id
    ON public.interactions (category, target_id)
    WHERE target_id IS NOT NULL;

-- Index 3: created_at DESC (cho order by)
CREATE INDEX IF NOT EXISTS idx_interactions_created_at_desc
    ON public.interactions (created_at DESC);

-- Index 4: metadata->>'orderNumber' bằng expression index (fix slow JSON scan)
CREATE INDEX IF NOT EXISTS idx_interactions_metadata_order_number
    ON public.interactions ((metadata->>'orderNumber'))
    WHERE metadata->>'orderNumber' IS NOT NULL;

-- Index 5: category + recipient + is_read (cho notification badge queries)
CREATE INDEX IF NOT EXISTS idx_interactions_notif_recipient
    ON public.interactions (category, recipient, is_read)
    WHERE category = 'NOTIFICATION';
