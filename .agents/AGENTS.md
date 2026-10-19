# Agent Rules

- **Quy Tắc Ghi Nhận Chỉ Đạo Quan Trọng (Important Directives & Memory Protocol)**:
  1. Kể từ hôm nay, bất cứ khi nào Người dùng (USER) đưa ra chỉ đạo quan trọng, lưu ý cốt lõi, quyết định kiến trúc hoặc quy chuẩn nghiệp vụ, AI Agent **BẮT BUỘC PHẢI CHỦ ĐỘNG GHI NHẬN VÀ LƯU NGAY** vào hệ thống quy tắc `.agents/AGENTS.md`.
  2. Mọi chỉ đạo sau khi ghi nhận phải được lưu trữ và commit vào Git để vĩnh viễn không bị lãng quên hay mai một, đảm bảo toàn bộ các phiên làm việc tiếp theo luôn tự động kế thừa và tuân thủ tuyệt đối.
  3. **Tuyệt Đối Không Đề Xuất Lại**: Không bao giờ đề xuất lại các tính năng: Cổng hành trình xe cho khách hàng (Customer Tracking Portal), Báo giá lăn bánh PDF 1-chạm, Bot Telegram/Zalo cảnh báo, Biên bản bàn giao PDI ký số, Bảng vinh danh TVBH trên Smart TV. Mọi đề xuất tiếp theo phải tập trung vào nghiệp vụ quản trị nội bộ sâu hơn.


- **Deployment Protocol**: NEVER run `npm run deploy` or deploy the application to production unless explicitly requested by the user. Do not assume a deployment is needed after making code changes.

- **Cyber MSSQL Query Protocol**: Khi viết script hoặc thực hiện truy vấn cơ sở dữ liệu CyberSoft (`SQLVanDao.Cybersoft.com.vn`), luôn bắt buộc tuân thủ:
  1. Khai báo `appname='CyberAppGolden'` và `autocommit=True` trong connection parameters.
  2. Luôn sử dụng `WITH (NOLOCK)` trên tất cả các bảng hoặc thiết lập `SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;` để đảm bảo truy vấn phi khóa (không gây lag/treo ứng dụng Cyber của nhân viên).
  3. Luôn dùng tham số hóa câu lệnh (`%s` hoặc `?`) thay vì nối chuỗi trực tiếp.
  4. Luôn đảm bảo đóng kết nối ngay sau khi query xong bằng khối `try ... finally: conn.close()` hoặc Context Manager (`with`).

- **Tuân Thủ Pháp Luật & Quy Định Doanh Nghiệp (Compliance & Legal Integrity)**:
  1. Tuyệt đối tuân thủ quy định pháp luật và các quy chế, chính sách bảo mật dữ liệu của công ty.
  2. Tuyệt đối không thực hiện bất kỳ hành vi nào làm sai lệch, hư hại, phá hoại hoặc gây ảnh hưởng tiêu cực đến tính toàn vẹn của dữ liệu và hệ thống phần mềm CyberSoft cũng như các hệ thống nội bộ khác.
  3. Mọi truy vấn và đồng bộ dữ liệu chỉ nhằm mục đích phục vụ công tác điều hành hợp pháp của showroom; luôn đảm bảo an toàn thông tin, bảo mật dữ liệu khách hàng và chỉ đọc (Read-only) khi không có chỉ định nghiệp vụ được phê duyệt rõ ràng.

- **Quy Tắc Thực Thi Lệnh Terminal (Single Command Execution & Concise Summary)**:
  1. **Một Lệnh Duy Nhất (Single Command)**: Khi phát sinh vấn đề cần xử lý, debug hoặc sửa lỗi, luôn gom toàn bộ các bước kiểm tra, sửa code, cập nhật công thức và đồng bộ vào **ĐÚNG 1 LỆNH DUY NHẤT** để xử lý dứt điểm, tuyệt đối không chạy lắt nhắt nhiều lệnh rời rạc.
  2. **Ghi Ngắn Gọn Mục Đích**: Trước khi thực thi bất kỳ lệnh cmd / terminal nào, luôn ghi **ngắn gọn đúng 1 câu** nêu rõ mục đích và tác dụng của lệnh đó để người dùng nắm rõ.

- **Supabase & Vercel Environment Variables Protocol (Phòng Ngừa Tuyệt Đối Lỗi Màn Hình Trắng)**:
  1. **Tuyệt đối KHÔNG BAO GIỜ viết lệnh `throw new Error(...)`** hoặc chặn sập luồng render khi các biến môi trường `VITE_SUPABASE_URL` hoặc `VITE_SUPABASE_ANON_KEY` bị rỗng / undefined.
  2. **Bản chất cốt lõi**: File `.env` bị chặn bởi `.gitignore` nên khi Vercel Cloud build ứng dụng từ xa, máy ảo Vercel không có file `.env`. Nếu code throw exception, toàn bộ ứng dụng React sẽ crash thành màn hình trắng (White Screen of Death) ngay lập tức trước khi kịp vẽ giao diện.
  3. Mọi vị trí gọi `import.meta.env.VITE_SUPABASE_URL` và `import.meta.env.VITE_SUPABASE_ANON_KEY` (hoặc khởi tạo `createClient`) PHẢI LUÔN LUÔN có giá trị Fallback mặc định an toàn:
     - Fallback URL: `'https://jwvgxqrkjlbewvpkvucj.supabase.co'`
     - Fallback Anon Key: `'sb_publishable_0lT3OnREc0Qg1R9s672KBg_aDeBTdJX'`
  4. Mọi component và hook phải ưu tiên import client từ [services/supabaseClient.ts](file:///c:/Users/Pham%20Thanh%20Nhan/Documents/ordermanagement/services/supabaseClient.ts) thay vì tự khởi tạo lại client mới.

- **Cấu Trúc DMS Radar & Máy Trạm Văn Phòng (Port 3001 & Schedule Sync)**:
  1. **Cổng Dịch Vụ Máy Văn Phòng**: Mặc định cố định là cổng `3001` (`http://localhost:3001` hoặc IP LAN) cho các dịch vụ cầu nối `server-cyber.mjs` và `cyber_server.py`.
  2. **Lịch Đồng Bộ DMS Tự Động**:
     - Ban ngày (07:30 – 18:30 GMT+7): Quét kiểm tra đơn hàng và tồn kho mỗi 15 phút/lần.
     - Ban đêm (18:30 – 07:30 sáng hôm sau): Tự động ngừng hoàn toàn (Skip), không quét để tiết kiệm tài nguyên mạng và máy chủ.
  3. **Cơ Chế Cookie DMS Tập Trung**: Lưu cấu hình cookie đại lý trong `dms_dealers_config.json`. Khi 1 tài khoản cập nhật Cookie còn hạn, toàn bộ nhân sự TVBH trong đại lý đó đều tự động được chia sẻ quyền tra cứu qua backend/Vercel serverless.

- **Hiệu Năng & Tối Ưu Tải Trang (Code-Splitting & Lazy Loading)**:
  1. Các Modal, Form hoặc báo cáo có dung lượng lớn (như `RequestInvoiceModal`, Báo cáo doanh số...) bắt buộc phải sử dụng `React.lazy()` và `<Suspense>` để tách chunk độc lập.
  2. Không để bundle chính (index chunk) vượt quá giới hạn khuyến nghị, đảm bảo tải siêu tốc trên cả thiết bị di động và đường truyền yếu.



