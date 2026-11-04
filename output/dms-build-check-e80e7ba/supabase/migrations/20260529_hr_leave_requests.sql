-- =========================================================
-- HR Leave Requests: Nghỉ phép & Đi trễ
-- Ngày: 2026-05-29
-- =========================================================

CREATE TABLE IF NOT EXISTS public.hr_leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Người gửi
    requester_id UUID, -- auth.uid()
    requester_name TEXT NOT NULL,
    requester_username TEXT NOT NULL,

    -- Loại yêu cầu
    type TEXT NOT NULL CHECK (type IN ('nghi_phep', 'di_tre')),

    -- Thời gian
    start_date DATE NOT NULL,
    end_date DATE,           -- NULL nếu đi trễ (chỉ 1 buổi)
    late_time TEXT,          -- Giờ đến dự kiến nếu là đi trễ, e.g. "09:30"
    session TEXT,            -- 'sang' | 'chieu' | 'ca_ngay' — áp dụng cho nghỉ phép

    -- Nội dung
    reason TEXT NOT NULL,

    -- Phê duyệt
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewer_note TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ
);

-- Tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION public.set_hr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hr_leave_updated_at ON public.hr_leave_requests;
CREATE TRIGGER trg_hr_leave_updated_at
    BEFORE UPDATE ON public.hr_leave_requests
    FOR EACH ROW EXECUTE FUNCTION public.set_hr_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hr_requester ON public.hr_leave_requests(requester_username);
CREATE INDEX IF NOT EXISTS idx_hr_status ON public.hr_leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_hr_created_at ON public.hr_leave_requests(created_at DESC);

-- RLS
ALTER TABLE public.hr_leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access on hr_leave_requests" ON public.hr_leave_requests;
CREATE POLICY "Allow full access on hr_leave_requests"
    ON public.hr_leave_requests
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'hr_leave_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_leave_requests;
    END IF;
END $$;

COMMENT ON TABLE public.hr_leave_requests IS 'Yêu cầu nghỉ phép và đi trễ của nhân sự, chờ Admin phê duyệt.';
