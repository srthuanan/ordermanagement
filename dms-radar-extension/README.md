# Tự đồng bộ phiên NDP

1. Mở edge://extensions (hoặc chrome://extensions), bật Chế độ nhà phát triển.
2. Nếu đã cài VinFast DMS Auto Silent Sync: bấm Tải lại tiện ích. Nếu chưa cài: Tải tiện ích đã giải nén, chọn thư mục dms-radar-extension.
3. Tải lại tab https://dealer-portal.vinfast.com và đăng nhập VHKD_01 của Hoàng Thị Hạnh.
4. Góc dưới bên phải hiện “Đã đồng bộ phiên với quản lý đơn” khi kết nối localhost:3001 thành công.

Tiện ích kiểm tra mã mới mỗi 15 giây khi tab hoạt động và mỗi phút qua background. Chỉ gửi access token về backend trên chính máy này, không gửi mật khẩu, cookie hay refresh token lên cloud. Khi NDP tự gia hạn, backend tự nhận mã mới; không phải sao chép token. Không tạo request quét xe hoặc tự chuyển trạng thái đơn.

Cần giữ tab NDP mở và backend chạy. Nếu NDP kết thúc phiên hoặc yêu cầu xác nhận gia hạn, thao tác trên NDP rồi tiện ích sẽ đồng bộ tiếp. Đóng tab/tắt máy không thể gia hạn từ cookie trình duyệt trên máy khác.
