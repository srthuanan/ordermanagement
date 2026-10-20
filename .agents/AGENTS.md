# Agent Rules

- **Quy Tắc Ghi Nhận Chỉ Đạo Quan Trọng (Important Directives & Memory Protocol)**:
  1. Kể từ hôm nay, bất cứ khi nào Người dùng (USER) đưa ra chỉ đạo quan trọng, lưu ý cốt lõi, quyết định kiến trúc hoặc quy chuẩn nghiệp vụ, AI Agent **BẮT BUỘC PHẢI CHỦ ĐỘNG GHI NHẬN VÀ LƯU NGAY** vào hệ thống quy tắc `.agents/AGENTS.md`.
  2. Mọi chỉ đạo sau khi ghi nhận phải được lưu trữ và commit vào Git để vĩnh viễn không bị lãng quên hay mai một, đảm bảo toàn bộ các phiên làm việc tiếp theo luôn tự động kế thừa và tuân thủ tuyệt đối.
  3. **Tuyệt Đối Không Đề Xuất Lại**: Không bao giờ đề xuất lại các tính năng: Cổng hành trình xe cho khách hàng (Customer Tracking Portal), Báo giá lăn bánh PDF 1-chạm, Bot Telegram/Zalo cảnh báo, Biên bản bàn giao PDI ký số, Bảng vinh danh TVBH trên Smart TV. Mọi đề xuất tiếp theo phải tập trung vào nghiệp vụ quản trị nội bộ sâu hơn.


- **Quy Chuẩn Triển Khai & Vercel CI/CD (Deployment & Git Push Protocol)**:
  1. **Tuyệt Đối KHÔNG Chạy Lệnh `npm run deploy`**: Lệnh này là script cũ (từ thời GitHub Pages / Vercel CLI thủ công) và hoàn toàn dư thừa. Tuyệt đối không bao giờ đề xuất hoặc thực thi lệnh `npm run deploy` trong bất kỳ tình huống nào.
  2. **Cơ Chế CI/CD Tự Động Qua Git**: Toàn bộ dự án đã tích hợp Vercel CI/CD tự động liên kết trực tiếp với GitHub (`origin/main`). Khi cần triển khai code lên môi trường Production, **CHỈ CẦN VÀ DUY NHẤT LÀ CHẠY `git push origin main`**; Vercel sẽ tự động bắt webhook, tự build và tự deploy lên Production ngay lập tức.
  3. **Script Máy Trạm & Cầu Nối Cổng 3001**: Các file script máy trạm văn phòng (như `server-cyber.mjs`, `m_invoice_service.py`, `sync_thuan_an_allocations.py`) chạy trực tiếp tại máy nội bộ nên có hiệu lực tức thì tại chỗ ngay khi lưu file, không cần chờ đợi chu kỳ build đám mây của Vercel.

- **Cyber MSSQL Query Protocol**: Khi viết script hoặc thực hiện truy vấn cơ sở dữ liệu CyberSoft (`SQLVanDao.Cybersoft.com.vn`), luôn bắt buộc tuân thủ:
  1. Khai báo `appname='CyberAppGolden'` và `autocommit=True` trong connection parameters.
  2. Luôn sử dụng `WITH (NOLOCK)` trên tất cả các bảng hoặc thiết lập `SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;` để đảm bảo truy vấn phi khóa (không gây lag/treo ứng dụng Cyber của nhân viên).
  3. Luôn dùng tham số hóa câu lệnh (`%s` hoặc `?`) thay vì nối chuỗi trực tiếp.
  4. Luôn đảm bảo đóng kết nối ngay sau khi query xong bằng khối `try ... finally: conn.close()` hoặc Context Manager (`with`).

- **Tuân Thủ Pháp Luật & Quy Định Doanh Nghiệp (Compliance & Legal Integrity)**:
  1. Tuyệt đối tuân thủ quy định pháp luật và các quy chế, chính sách bảo mật dữ liệu của công ty.
  2. Tuyệt đối không thực hiện bất kỳ hành vi nào làm sai lệch, hư hại, phá hoại hoặc gây ảnh hưởng tiêu cực đến tính toàn vẹn của dữ liệu và hệ thống phần mềm CyberSoft cũng như các hệ thống nội bộ khác.
  3. Mọi truy vấn và đồng bộ dữ liệu chỉ nhằm mục đích phục vụ công tác điều hành hợp pháp của showroom; luôn đảm bảo an toàn thông tin, bảo mật dữ liệu khách hàng và chỉ đọc (Read-only) khi không có chỉ định nghiệp vụ được phê duyệt rõ ràng.

- **Kỷ Luật Thép Về Một Lệnh Duy Nhất (Strict Single Command Execution Protocol)**:
  1. **Một Lệnh Duy Nhất Xử Lý Dứt Điểm (Single Command Only)**: Khi phát sinh bất kỳ yêu cầu, vấn đề cần xử lý, debug hay cập nhật nào, AI Agent **BẮT BUỘC PHẢI GOM TOÀN BỘ CÁC BƯỚC** (từ kiểm tra, cập nhật code đến commit & push) vào **ĐÚNG 1 LỆNH TERMINAL DUY NHẤT**. Tuyệt đối không được chạy các lệnh thăm dò lắt nhắt, rời rạc làm mất thời gian và gây phiền hà cho người dùng.
  2. **Ghi Ngắn Gọn Đúng 1 Câu Mục Đích**: Trước khi thực thi lệnh duy nhất đó, luôn ghi **ngắn gọn đúng 1 câu** nêu rõ mục đích và tác dụng để người dùng nắm rõ tức thì.

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

- **Kiến Trúc Hạ Tầng Đám Mây & Vercel Python Serverless (Cloud-First & Zero-Downtime Fallback)**:
  1. **API Python Serverless Trên Vercel Luôn Khả Dụng**: Toàn bộ các API Python nghiệp vụ (bao gồm tự động lấy hóa đơn M-Invoice `sync-and-notify`, DMS Radar, `cyber_server.py`) đã được triển khai chạy trực tiếp trên Vercel Serverless (`api/index.py` tại `vinfastthuanan.vercel.app`).
  2. **Hoạt Động Độc Lập Khi Không Có Máy Văn Phòng**: Khi máy tính văn phòng tắt (offline) hoặc khi Admin/User sử dụng điện thoại di động, máy tính bảng từ xa ngoài showroom, hệ thống tự động định tuyến gọi thẳng tới API Python Serverless trên Vercel Cloud (`vinfastthuanan.vercel.app/api/*`).
  3. **Tự Chủ 100% Không Phụ Thuộc Máy Trạm**: Cookie M-Invoice và cấu hình hệ thống đều được lưu trữ tập trung trên Supabase Cloud Storage. Mọi tác vụ lấy hóa đơn, tự động xuất file PDF, lưu trữ và tự động gửi email cho TVBH đều chạy độc lập hoàn tất 100% trên nền tảng đám mây mà không bắt buộc máy tính văn phòng phải mở.

- **Kiến Trúc Giao Diện Đơn Hàng (Tri-Column Automotive Cockpit & Digital Twin)**:
  1. Tab Đơn Hàng tuân theo chuẩn mực hệ thống xe hơi hiện đại (Tesla Fleet Hub & Porsche One Cockpit): Không gian Studio ánh sáng vô cực (Cinematic Studio Lighting), mô phỏng xe 3D tương tác dạng Digital Twin với bóng gầm mềm mại.
  2. Bố cục 3 khối công thái học: Danh sách hàng đợi đơn hàng ➔ Bản sao số của xe & Hộ chiếu xe (VIN Monospace, kho bãi, thông số) ➔ Trung tâm tác nghiệp & dòng tiền (Tiến độ 5 bước, chính sách, đối soát).
  3. Loại bỏ hoàn toàn các chi tiết đồ họa decor gây xao nhãng (hình nền lưới caro, hoạt ảnh lễ hội che dữ liệu, icon thời tiết vụn vặt) để tập trung 100% vào tốc độ và tính chính xác của dữ liệu nghiệp vụ.
  4. Thanh tác vụ hỗ trợ Nút hành động chính thông minh (Smart Contextual CTA) tự động đổi màu và trạng thái tương thích theo quy trình (Xuất HĐ, Xác thực VinClub, Chuyển xe).



