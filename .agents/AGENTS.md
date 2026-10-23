# Agent Rules

- **Quy Tắc Ghi Nhận Chỉ Đạo Quan Trọng (Important Directives & Memory Protocol)**:
  1. Kể từ hôm nay, bất cứ khi nào Người dùng (USER) đưa ra chỉ đạo quan trọng, lưu ý cốt lõi, quyết định kiến trúc hoặc quy chuẩn nghiệp vụ, AI Agent **BẮT BUỘC PHẢI CHỦ ĐỘNG GHI NHẬN VÀ LƯU NGAY** vào hệ thống quy tắc `.agents/AGENTS.md`.
  2. Mọi chỉ đạo sau khi ghi nhận phải được lưu trữ và commit vào Git để vĩnh viễn không bị lãng quên hay mai một, đảm bảo toàn bộ các phiên làm việc tiếp theo luôn tự động kế thừa và tuân thủ tuyệt đối.
  3. **Tuyệt Đối Không Đề Xuất Lại**: Không bao giờ đề xuất lại các tính năng: Cổng hành trình xe cho khách hàng (Customer Tracking Portal), Báo giá lăn bánh PDF 1-chạm, Bot Telegram/Zalo cảnh báo, Biên bản bàn giao PDI ký số, Bảng vinh danh TVBH trên Smart TV. Mọi đề xuất tiếp theo phải tập trung vào nghiệp vụ quản trị nội bộ sâu hơn.

- **Kỷ Luật Kiểm Thử Bắt Buộc Trước Khi Báo Cáo (Mandatory Test Verification Protocol)**:
  1. **Bắt Buộc Phải Test Lại Thực Tế**: Sau khi sửa code, thêm tính năng, chỉnh sửa giao diện hay xử lý bất kỳ tác vụ nào, AI Agent **BẮT BUỘC PHẢI TEST LẠI NGAY LẬP TỨC** xem có hoạt động thành công thực tế hay không trước khi báo cáo với người dùng.
  2. **Tuyệt Đối Không Giả Định**: Tuyệt đối không phỏng đoán, không nói suông "đã xong" khi chưa tự mình chạy thử để kiểm chứng kết quả (kiểm tra tính đúng đắn của dữ liệu, kiểm tra giao diện hiển thị, kiểm tra log không có lỗi).
  3. **Minh Bạch Kết Quả Test**: Luôn nêu rõ bằng chứng kết quả kiểm thử (thời gian chạy, số lượng bản ghi cập nhật, trạng thái trả về) để người dùng nắm bắt và yên tâm tuyệt đối.



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

- **Kỷ Luật Thép Về Một Lệnh Duy Nhất & Tự Động Thực Thi Tuyệt Đối (Single Command & Zero Permission Prompts)**:
  1. **Tự Động Thực Thi Không Xin Quyền (Zero Permission Prompts)**: Khi người dùng yêu cầu xử lý bất cứ việc gì, AI Agent phải tự chủ thực thi hoàn tất ngay. Tuyệt đối không chạy các lệnh shell tra cứu phức tạp (như grep, Select-String qua shell) vì sẽ làm IDE bật popup modal hỏi quyền xác nhận gây phiền hà và chậm trễ. Mọi thao tác đọc, tìm kiếm, sửa file code BẮT BUỘC dùng công cụ bản địa (`view_file`, `replace_file_content`, `multi_replace_file_content`).
  2. **Một Lệnh Duy Nhất Xử Lý Dứt Điểm (Single Command Only)**: Khi cần chạy terminal, AI Agent **BẮT BUỘC PHẢI GOM TOÀN BỘ CÁC BƯỚC** vào **ĐÚNG 1 LỆNH TERMINAL DUY NHẤT** (chỉ dùng duy nhất để commit và push lên Git).
  3. **Ghi Ngắn Gọn Đúng 1 Câu Mục Đích**: Trước khi thực thi lệnh duy nhất đó, luôn ghi **ngắn gọn đúng 1 câu** nêu rõ mục đích để người dùng nắm rõ tức thì.

- **Quy Chuẩn Hiển Thị Nút Tác Nghiệp Đơn Hàng (Action Button Visibility Protocol)**:
  1. **Nút "TB Giao Xe" (Thông Báo Giao Xe)**: Đơn hàng có trạng thái từ *Chờ phê duyệt* đến *Đã xuất hoá đơn* (bao gồm: Chờ duyệt, Yêu cầu XHĐ, Đã ghép, Chờ ký, Đã xuất hóa đơn) **TUYỆT ĐỐI KHÔNG HIỂN THỊ** nút "TB Giao Xe". Nút này chỉ xuất hiện khi đơn hàng đã hoàn tất xuất hóa đơn và chuyển sang giai đoạn bàn giao xe.

- **Supabase & Vercel Environment Variables Protocol (Phòng Ngừa Tuyệt Đối Lỗi Màn Hình Trắng)**:
  1. **Tuyệt đối KHÔNG BAO GIỜ viết lệnh `throw new Error(...)`** hoặc chặn sập luồng render khi các biến môi trường `VITE_SUPABASE_URL` hoặc `VITE_SUPABASE_ANON_KEY` bị rỗng / undefined.
  2. **Bản chất cốt lõi**: File `.env` bị chặn bởi `.gitignore` nên khi Vercel Cloud build ứng dụng từ xa, máy ảo Vercel không có file `.env`. Nếu code throw exception, toàn bộ ứng dụng React sẽ crash thành màn hình trắng (White Screen of Death) ngay lập tức trước khi kịp vẽ giao diện.
  3. Mọi vị trí gọi `import.meta.env.VITE_SUPABASE_URL` và `import.meta.env.VITE_SUPABASE_ANON_KEY` (hoặc khởi tạo `createClient`) PHẢI LUÔN LUÔN có giá trị Fallback mặc định an toàn:
     - Fallback URL: `'https://jwvgxqrkjlbewvpkvucj.supabase.co'`
     - Fallback Anon Key: `'sb_publishable_0lT3OnREc0Qg1R9s672KBg_aDeBTdJX'`
  4. Mọi component và hook phải ưu tiên import client từ [services/supabaseClient.ts](file:///c:/Users/Pham%20Thanh%20Nhan/Documents/ordermanagement/services/supabaseClient.ts) thay vì tự khởi tạo lại client mới.

- **Quy Định Kích Hoạt Quét Ngầm DMS Radar & Lưu Supabase Theo 4 Thao Tác Cốt Lõi (Action-Triggered Sync Protocol)**:
  1. **Quy Định Kích Hoạt**: Tuyệt đối **không quét định kỳ 15 phút** và **không quét khi chỉ mở app, xem danh sách hoặc đổi tab**.
  2. **4 Thao Tác Duy Nhất Được Kích Hoạt Quét Ngầm**:
     - **(1) TVBH bấm Giữ xe** (`holdCar`).
     - **(2) TVBH bấm Yêu cầu xuất hóa đơn** (`requestInvoice`).
     - **(3) TVBH bấm Tạo đơn hàng mới** (`addRequest`).
     - **(4) TVBH bấm Yêu cầu ghép xe** (`addRequest` / `pairVinToOrder`).
  3. **Cơ Chế Quét & Lưu Supabase Khi Thao Tác**:
     - Khi TVBH thực hiện 1 trong 4 thao tác trên, hệ thống kiểm tra thời điểm quét gần nhất (`last_dms_radar_auto_sync_ts`).
     - **Nếu đã quá 15 phút** (hoặc bấm Quét cưỡng bức thủ công): Kích hoạt tải dữ liệu mới nhất từ DMS Radar đa showroom ngầm và **LƯU TOÀN BỘ VÀO SUPABASE** (`donhanghienhuu`, `khoxe`, `car_telemetry`).
     - **Nếu trong vòng 15 phút (Smart Cooldown)**: Không gửi thêm request lên DMS để bảo toàn băng thông, giữ cho hệ thống phản hồi tức thì 0.00s.
     - **Tiến trình chạy ngầm (Non-blocking)**: Hoàn toàn không làm ảnh hưởng đến tốc độ hoàn tất thao tác của TVBH. Khi lưu Supabase xong, phát sự kiện `dms-radar-synced` để cập nhật giao diện.
  4. **Đồng Bộ Đa Showroom**: Tự động nhận diện và quét qua **toàn bộ các showroom có cookie còn hạn** (N31913, N31911, N31903, N31923, N31920,...), gom toàn bộ đơn hàng mở vào bảng `donhanghienhuu` mà không bỏ sót bất kỳ chi nhánh nào.
  5. **Cơ Chế Cookie DMS Tập Trung**: Lưu cấu hình cookie đại lý trong `dms_dealers_config.json`. Khi 1 tài khoản cập nhật Cookie còn hạn, toàn bộ nhân sự TVBH trong đại lý đó đều tự động được chia sẻ quyền tra cứu qua backend/Vercel serverless.

- **Kiến Trúc Hạ Tầng Đám Mây & Vercel Python Serverless (Cloud-First & Zero-Downtime Fallback)**:
  1. **API Python Serverless Trên Vercel Luôn Khả Dụng**: Toàn bộ các API Python nghiệp vụ (bao gồm tự động lấy hóa đơn M-Invoice `sync-and-notify`, DMS Radar, `cyber_server.py`) đã được triển khai chạy trực tiếp trên Vercel Serverless (`api/index.py` tại `vinfastthuanan.vercel.app`).
  2. **Hoạt Động Độc Lập Khi Không Có Máy Văn Phòng**: Khi máy tính văn phòng tắt (offline) hoặc khi Admin/User sử dụng điện thoại di động, máy tính bảng từ xa ngoài showroom, hệ thống tự động định tuyến gọi thẳng tới API Python Serverless trên Vercel Cloud (`vinfastthuanan.vercel.app/api/*`).
  3. **Tự Chủ 100% Không Phụ Thuộc Máy Trạm**: Cookie M-Invoice và cấu hình hệ thống đều được lưu trữ tập trung trên Supabase Cloud Storage. Mọi tác vụ lấy hóa đơn, tự động xuất file PDF, lưu trữ và tự động gửi email cho TVBH đều chạy độc lập hoàn tất 100% trên nền tảng đám mây mà không bắt buộc máy tính văn phòng phải mở.

- **Kiến Trúc Giao Diện Đơn Hàng (Tri-Column Automotive Cockpit & Digital Twin)**:
  1. Tab Đơn Hàng tuân theo chuẩn mực hệ thống xe hơi hiện đại (Tesla Fleet Hub & Porsche One Cockpit): Không gian Studio ánh sáng vô cực (Cinematic Studio Lighting), mô phỏng xe 3D tương tác dạng Digital Twin với bóng gầm mềm mại.
  2. Bố cục 3 khối công thái học: Danh sách hàng đợi đơn hàng ➔ Bản sao số của xe & Hộ chiếu xe (VIN Monospace, kho bãi, thông số) ➔ Trung tâm tác nghiệp & dòng tiền (Tiến độ 5 bước, chính sách, đối soát).
  3. Loại bỏ hoàn toàn các chi tiết đồ họa decor gây xao nhãng (hình nền lưới caro, hoạt ảnh lễ hội che dữ liệu, icon thời tiết vụn vặt) để tập trung 100% vào tốc độ và tính chính xác của dữ liệu nghiệp vụ.
  4. Thanh tác vụ hỗ trợ Nút hành động chính thông minh (Smart Contextual CTA) tự động đổi màu và trạng thái tương thích theo quy trình (Xuất HĐ, Xác thực VinClub, Chuyển xe).

- **Quy Chuẩn Cảnh Báo Lỗi Đối Soát DMS & Đơn Hàng (Actionable & Direct Error Note Protocol)**:
  1. Khi phát hiện bất kỳ lỗi sai / không khớp nào giữa thông tin đơn hàng, số VIN xe ghép và dữ liệu VinFast DMS (Tên khách hàng, Dòng xe, Phiên bản, Ngoại thất, Nội thất, Trạng thái VSO):
  2. Tuyệt đối không dùng các từ ngữ viết tắt thô khó hiểu (như `PLUS`, `SLIDING`) hoặc mô tả chung chung không rõ căn cứ.
  3. Bắt buộc hiển thị theo cấu trúc cực kỳ ngắn gọn, đi thẳng vào bản chất hành động TVBH cần làm:
     - **Tiêu đề**: `Lệch [Mục sai]: DMS [Giá trị DMS hiện tại] ⇄ Xe [Giá trị chuẩn của VIN xe]`
     - **Hướng dẫn hành động**: `Sửa [Mục sai] trên DMS thành [Giá trị chuẩn của VIN xe] rồi bấm Tra lại.`

- **Quy Chuẩn Báo Cáo KPI Xuất Hóa Đơn & Triển Khai Google Apps Script (KPI Sync & Clasp Protocol)**:
  1. **Danh Mục 14 Dòng Xe Chuẩn Cho Xuất Hóa Đơn**: Luôn bắt buộc đồng bộ danh sách 14 dòng xe chuẩn 1-1 giữa bảng `XUẤT HÓA ĐƠN` (`backend-gas/06_kpi.js`) và `THUẬN AN - BÁO CÁO KPI` (`gas-showroom/KPI.js`):
     `'VF 2', 'VF 3', 'VF 5', 'VF 6', 'VF 7', 'VF 8', 'VF 8 New', 'VF 9', 'Herio', 'Nerio', 'Limo', 'EC Van', 'Minio', 'VF Limo'`.
  2. **Quy Tắc Phân Loại VF 8 All New**: Trong bảng `yeucauxhd`, xe VF 8 All New có `dong_xe = 'VF 8'` và `phien_ban = 'All New'`. Do đó, công thức tính KPI phải phân tách:
     - Cột `VF 8` (bản cũ): Đếm các xe `VF 8` có phiên bản không chứa `'New'`.
     - Cột `VF 8 New`: Đếm các xe `VF 8` có phiên bản chứa `'*New*'` (hoặc `dong_xe` ghi rõ `VF 8 New`).
  3. **Kỷ Luật Đẩy Code Apps Script Qua Clasp**: Bất kỳ khi nào chỉnh sửa code trong `backend-gas/` hoặc `gas-showroom/`, sau khi sửa file cục bộ, AI Agent **BẮT BUỘC PHẢI CHẠY NGAY LỆNH `npx --yes @google/clasp push -f`** trong thư mục tương ứng để đẩy code trực tiếp lên Google Cloud của Google Sheets, tránh tình trạng Google Sheets vẫn chạy code cũ.

- **Quy Chuẩn Đối Soát Kho & Phân Loại Xe Tồn TD4 (TD4 Exclusion in K83 Yard Reconciliation)**:
  1. **Trách Nhiệm Lập Phiếu TD4**: Phiếu TD4 (Phiếu xuất xe bán cho khách hàng / Giấy ra cổng) trên phần mềm CyberSoft ERP **do Tư vấn bán hàng (TVBH) phụ trách lập**. Kế toán trưởng (KTT) và Ban Giám Đốc (BGĐ) kiểm tra và ký phê duyệt; Thủ kho / Bảo vệ bãi căn cứ phiếu TD4 đã duyệt để cho xe ra cổng. Mọi chỉ dẫn tác nghiệp trên hệ thống bắt buộc quy đúng trách nhiệm: *TVBH lập phiếu TD4*, tuyệt đối không ghi Kế toán lập TD4.
  2. **Bản Chất Xe Tồn TD4**: Xe đã lập phiếu TD4 trên CyberSoft bản chất là xe đã bước vào quy trình xuất bán và đang chờ bàn giao khách.
  3. **Tuyệt Đối Không Tính Là Thừa Bãi K83**: Các xe đã có phiếu TD4 trên CyberSoft **TUYỆT ĐỐI KHÔNG TÍNH** vào nhóm *"Thừa bãi thực tế / Thiếu Cyber K83"* và không bao giờ được bắt Kế toán làm thủ tục ĐNX hoặc PNK nhập vào kho K83 (vì xe đã được xuất bán theo phiếu TD4).
  4. **Theo Dõi Đúng Phân Hệ TD4**: Các trường hợp xe đã có phiếu TD4 đã duyệt nhưng vẫn nằm tại bãi xe thực tế quá 48h chỉ được phép theo dõi trong phân hệ **TD4 Quá Hạn Tồn Bãi** để đôn đốc TVBH hoàn tất bàn giao xe cho khách hàng.


