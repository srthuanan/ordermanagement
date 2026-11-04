
-- Migration: Tự động hóa trạng thái xe giữa donhang, khoxe và yeucauxhd
-- Ngày: 2026-04-04
-- Mục đích: Đảm bảo tính nhất quán dữ liệu mà không cần chạy bảo trì thủ công.

-- 1. Định nghĩa danh sách các trạng thái được coi là "Đã ghép"
-- Mẹo: Dùng hàm helper để kiểm tra cho gọn
CREATE OR REPLACE FUNCTION public.is_matched_status(status TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN status IS NOT NULL AND (
        status ILIKE '%Đã ghép%' OR 
        status ILIKE '%Chờ phê duyệt%' OR 
        status ILIKE '%Yêu cầu bổ sung%' OR 
        status ILIKE '%Đã phê duyệt%' OR 
        status ILIKE '%Chờ ký hóa đơn%' OR 
        status ILIKE '%Đã xuất hóa đơn%' OR 
        status ILIKE '%Đã hoàn tất%'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Function xử lý đồng bộ trạng thái từ donhang sang khoxe
CREATE OR REPLACE FUNCTION public.sync_khoxe_status_from_donhang()
RETURNS TRIGGER AS $$
BEGIN
    -- Trường hợp 1: UPDATE hoặc DELETE - Giải phóng VIN cũ
    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
        IF (OLD.vin IS NOT NULL AND OLD.vin <> '') THEN
            -- Chỉ giải phóng nếu xe này không bị "giữ" bởi chính record này (trong trường hợp UPDATE)
            -- Hoặc đơn giản là giải phóng, rồi bước INSERT/UPDATE sau sẽ giữ lại nếu cần
            UPDATE public.khoxe 
            SET trang_thai = 'Chưa ghép', 
                nguoi_giu_xe = NULL, 
                thoi_gian_het_han_giu = NULL
            WHERE vin = OLD.vin;
        END IF;
    END IF;

    -- Trường hợp 2: INSERT hoặc UPDATE - Chiếm giữ VIN mới
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        IF (NEW.vin IS NOT NULL AND NEW.vin <> '' AND public.is_matched_status(NEW.ket_qua)) THEN
            -- Kiểm tra xem xe có trong yeucauxhd chưa. Nếu có rồi thì không cần cập nhật khoxe (vì xe sẽ bị xóa khỏi kho)
            IF NOT EXISTS (SELECT 1 FROM public.yeucauxhd WHERE vin = NEW.vin) THEN
                UPDATE public.khoxe 
                SET trang_thai = 'Đã ghép', 
                    nguoi_giu_xe = NEW.ten_tu_van_ban_hang,
                    thoi_gian_het_han_giu = 'Vô thời hạn'
                WHERE vin = NEW.vin;
            ELSE
                -- Nếu xe đã có trong yêu cầu hóa đơn, thực hiện xóa khỏi kho luôn cho chắc
                DELETE FROM public.khoxe WHERE vin = NEW.vin;
            END IF;
        END IF;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Tạo Trigger trên bảng donhang
DROP TRIGGER IF EXISTS trg_sync_khoxe_status ON public.donhang;
CREATE TRIGGER trg_sync_khoxe_status
AFTER INSERT OR UPDATE OF vin, ket_qua OR DELETE ON public.donhang
FOR EACH ROW
EXECUTE FUNCTION public.sync_khoxe_status_from_donhang();

-- 4. Đảm bảo Trigger xóa xe khi có yeucauxhd hoạt động tốt
-- (Cập nhật lại function cũ cho đồng nhất logic)
CREATE OR REPLACE FUNCTION public.auto_delete_khoxe_on_yeucauxhd()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.vin IS NOT NULL AND NEW.vin <> '') THEN
        DELETE FROM public.khoxe 
        WHERE vin = NEW.vin;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_delete_khoxe_on_yeucauxhd ON public.yeucauxhd;
CREATE TRIGGER trg_auto_delete_khoxe_on_yeucauxhd
AFTER INSERT OR UPDATE OF vin ON public.yeucauxhd
FOR EACH ROW
EXECUTE FUNCTION public.auto_delete_khoxe_on_yeucauxhd();

-- 5. [Bổ sung] Tự động cập nhật xe khi mới nhập kho mà đã được ghép trong đơn hàng
CREATE OR REPLACE FUNCTION public.auto_match_new_car_in_khoxe()
RETURNS TRIGGER AS $$
DECLARE
    v_order_status TEXT;
    v_tvbh TEXT;
BEGIN
    -- Tìm xem có đơn hàng nào đang khớp với VIN này không
    SELECT ket_qua, ten_tu_van_ban_hang INTO v_order_status, v_tvbh
    FROM public.donhang
    WHERE vin = NEW.vin
    LIMIT 1;

    IF v_order_status IS NOT NULL AND public.is_matched_status(v_order_status) THEN
        -- Kiểm tra nếu đã có yêu cầu hóa đơn thì xóa luôn
        IF EXISTS (SELECT 1 FROM public.yeucauxhd WHERE vin = NEW.vin) THEN
            RETURN NULL; -- Ngăn việc chèn xe vào kho nếu đã xuất hóa đơn
        ELSE
            -- Cập nhật trạng thái thành Đã ghép
            NEW.trang_thai := 'Đã ghép';
            NEW.nguoi_giu_xe := v_tvbh;
            NEW.thoi_gian_het_han_giu := 'Vô thời hạn';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_match_new_car ON public.khoxe;
CREATE TRIGGER trg_auto_match_new_car
BEFORE INSERT ON public.khoxe
FOR EACH ROW
EXECUTE FUNCTION public.auto_match_new_car_in_khoxe();

COMMENT ON TRIGGER trg_sync_khoxe_status ON public.donhang IS 'Tự động cập nhật trạng thái kho xe khi đơn hàng thay đổi VIN hoặc Trạng thái.';
COMMENT ON TRIGGER trg_auto_delete_khoxe_on_yeucauxhd ON public.yeucauxhd IS 'Xóa xe khỏi kho ngay khi có yêu cầu xuất hóa đơn.';
COMMENT ON TRIGGER trg_auto_match_new_car ON public.khoxe IS 'Tự động ghép xe ngay khi vừa nhập kho nếu có đơn hàng đang chờ VIN đó.';
