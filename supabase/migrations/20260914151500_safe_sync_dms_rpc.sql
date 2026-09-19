-- RPC: Cập nhật an toàn Mã DMS & Số máy cho xe trong kho
-- NGUYÊN TẮC TUYỆT ĐỐI: CHỈ UPDATE xe đã có trong kho, KHÔNG BAO GIỜ INSERT xe mới!

CREATE OR REPLACE FUNCTION public.rpc_sync_dms_metadata(p_cars jsonb)
RETURNS int AS $$
DECLARE
    v_count int := 0;
BEGIN
    UPDATE public.khoxe k
    SET 
        ma_dms = COALESCE(NULLIF((c->>'ma_dms'), ''), k.ma_dms),
        so_may = COALESCE(NULLIF((c->>'so_may'), ''), k.so_may)
    FROM jsonb_array_elements(p_cars) c
    WHERE k.vin = (c->>'vin');

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
