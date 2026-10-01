# 🛡️ CỔNG ĐIỀU HÀNH DỰ PHÒNG KHẨN CẤP - VINFAST THUẬN AN
*(Emergency Standby & Disaster Recovery Portal)*

Hệ thống web con độc lập hoàn toàn, được thiết kế để giải quyết bài toán: **Khi ứng dụng chính bị nghẽn mạng, lỗi build, treo máy hoặc máy chủ Supabase / Cloud gặp sự cố**, toàn bộ đội ngũ bán hàng và điều hành vẫn có thể tra cứu, lập đơn hàng và duy trì hoạt động kinh doanh 100%.

---

## 🚀 1. Cách Khởi Động Nhanh (1 Click)

### Cách 1 (Tiện lợi nhất cho nhân viên):
- Vào thư mục gốc của dự án và **nhấp đúp chuột vào file**:
  👉 `Chay_Web_Du_Phong.bat`
- Trình duyệt sẽ tự động mở trang web tại địa chỉ: **`http://localhost:5180`**

### Cách 2 (Dành cho kỹ thuật viên qua dòng lệnh):
```bash
npm run standby
```
hoặc:
```bash
cd emergency-web
npm start
```

---

## ⚡ 2. Cơ Chế Chống Sập & Vận Hành Kép (Dual Failover Engine)

| Chế độ | Nguyên lý hoạt động | Khi nào nên dùng? |
| :--- | :--- | :--- |
| ⚡ **Tự Động (Auto-Failover)** | Mặc định truy vấn trực tiếp vào **Supabase Cloud**. Nếu Supabase bị timeout (> 3.5s) hoặc trả về lỗi mạng, hệ thống **tự động chuyển ngay lập tức sang dữ liệu Local Backup JSON**. | Khi mạng bình thường hoặc chập chờn. |
| 🛡️ **Thuần Offline (Chống Sập)** | Ngắt toàn bộ truy vấn ra Internet, đọc dữ liệu trực tiếp 100% từ đĩa cứng (`backups/live_backup/*.json`). Tốc độ phản hồi cực đại (< 10ms). | Khi mất mạng Internet hoàn toàn hoặc máy chủ Cloud sập. |

---

## 📊 3. Toàn Bộ 9 Chức Năng Cốt Lõi Đã Tích Hợp

1. 🚗 **Kho Xe (Stock / Inventory)**:
   - Thống kê thời gian thực: Tổng xe trong kho, Xe có sẵn (sẵn sàng bán), Xe đang giữ cọc, Xe đã ghép đơn, Xe chờ xuất HĐ, Xe quá hạn giữ.
   - Tìm kiếm đa năng siêu tốc: Tra cứu theo số VIN (hỗ trợ nhập 6-8 số cuối hoặc toàn bộ), Số máy, Mã DMS, Tên người giữ xe.
   - Lọc nhanh theo Dòng xe (VF 3, VF 5, VF 6, VF 7, VF 8, VF 9, Limo...), Tình trạng và Kho bãi (N31913, N31920).
   - Nút **"Xuất Excel Kho Xe"** 1-click để in ấn hoặc chuyển tiếp.

2. 📋 **Đơn Hàng (Orders)**:
   - Xem và lọc đơn hàng từ cả 2 bảng dữ liệu `donhang` và `donhanghienhuu`.
   - Tìm theo: Số hợp đồng (VSO), Tên khách hàng, SĐT, TVBH, Số VIN ghép.
   - **Nút "+ TẠO ĐƠN HÀNG KHẨN CẤP"**: Cho phép TVBH tạo nhanh đơn cọc của khách hàng ngay giữa lúc hệ thống chính sập. Đơn sẽ được lưu an toàn vào Hàng đợi Khẩn cấp (Outbox) và tự động đồng bộ lên Cloud khi có mạng.
   - Nút **"Xuất Excel Đơn Hàng"**.

3. 📑 **Yêu Cầu Xuất Hóa Đơn (`yeucauxhd`)**:
   - Tra cứu hồ sơ xuất hóa đơn, trạng thái XHD, hoa hồng ứng, VPoint, chương trình chính sách.
   - Mở xem trực tiếp Hợp đồng mua bán, Đề nghị XHD, Hóa đơn điện tử VAT.
   - Nút **"+ Gửi Đề Nghị Xuất HĐ Khẩn Cấp"**.

4. 🚚 **Vận Chuyển Xe (`yeucauvc`)**:
   - Theo dõi hành trình điều phối xe giữa các kho bãi / nhà máy / showroom.
   - Xem tài xế, số điện thoại, điểm đi, điểm đến, ngày giao xe.
   - Nút **"+ Tạo Yêu Cầu Vận Chuyển Khẩn Cấp"**.

5. 🏎️ **Lịch Lái Thử (`test_drive_schedule`)**:
   - Lịch hẹn lái thử, khách hàng, số điện thoại, dòng xe trải nghiệm, TVBH phụ trách.
   - Nút **"+ Đăng Ký Lái Thử Khẩn Cấp"**.

6. 🏷️ **Bảng Giá & Công Cụ Dự Toán Siêu Tốc**:
   - Tra cứu bảng giá niêm yết và thông số kỹ thuật (`thongtinxe`).
   - Danh mục chính sách ưu đãi hiện hành (`chinhsach`).
   - **Bộ tính giá lăn bánh & Trả góp tự động**: Chọn xe, khu vực biển số, ưu đãi, tỷ lệ vay và số năm vay -> Tự động tính số tiền lăn bánh, số tiền trả trước và tiền góp mỗi tháng để báo giá ngay cho khách.

7. 🗄️ **Kho Lưu Trữ (`archived_orders`)**:
   - Tra cứu lại lịch sử các hợp đồng cũ đã hoàn tất.

8. 👥 **Danh Bạ TVBH & Nhân Sự (`users`)**:
   - Tra cứu nhanh số liên lạc, email, chức vụ của toàn thể TVBH và Quản trị viên để gọi điện khẩn cấp khi hệ thống gặp sự cố.

9. 🛡️ **Radar Chống Sập & Hộp Thư Khẩn Cấp (Outbox)**:
   - Đồng hồ đo độ trễ Ping thời gian thực của Supabase Cloud & CyberSync API.
   - Xem toàn bộ danh sách các đơn hàng đã tạo lúc offline.
   - Nút **"Đồng Bộ Hộp Thư Khẩn Cấp Lên Supabase"**.
   - Nút **"Sao Lưu Toàn Bộ DB Từ Cloud Về Máy Bây Giờ"** (làm mới snapshot).
   - Nút **"Tải Trọn Bộ Backup Offline (.JSON)"** về máy lưu trữ an toàn.

---

## ⌨️ Phím Tắt Tiện Ích
- **`Ctrl + K`**: Mở khung **Tra Cứu Toàn Năng (Global Search)** tìm kiếm đồng thời trên toàn bộ các bảng dữ liệu (Kho xe, Đơn hàng, Hóa đơn...).
- **`ESC`**: Đóng nhanh bất kỳ hộp thoại nào đang mở.
