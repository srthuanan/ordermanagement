-- Bổ sung các trường dữ liệu bổ sung cho bảng Đơn hàng (donhang)
-- Ghi chú: Cột Số đơn hàng (so_don_hang) chính là mã VSO nên không tạo thêm cột ma_vso trùng lặp.
ALTER TABLE public.donhang 
ADD COLUMN IF NOT EXISTS so_tien_coc NUMERIC,
ADD COLUMN IF NOT EXISTS dia_chi_xhd TEXT,
ADD COLUMN IF NOT EXISTS ma_hop_dong TEXT,
ADD COLUMN IF NOT EXISTS tm_vay TEXT;

COMMENT ON COLUMN public.donhang.so_tien_coc IS 'Số tiền khách hàng đã đặt cọc';
COMMENT ON COLUMN public.donhang.dia_chi_xhd IS 'Địa chỉ xuất hóa đơn';
COMMENT ON COLUMN public.donhang.ma_hop_dong IS 'Mã hợp đồng kinh tế';
COMMENT ON COLUMN public.donhang.tm_vay IS 'Hình thức thanh toán: Tiền mặt hoặc Vay';
