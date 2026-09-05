# 📘 ĐẠI CẨM NANG HƯỚNG DẪN SỬ DỤNG ỨNG DỤNG DÀNH CHO TƯ VẤN BÁN HÀNG (TVBH)
### *Hệ Thống Phân Phối, Điều Phối & Ghép Xe Trực Tuyến — VinFast Showroom Thuận An*

---

> [!NOTE]  
> **Mục đích tài liệu:** Cuốn cẩm nang này là tài liệu chuẩn hóa toàn diện quy trình tác nghiệp nội bộ dành riêng cho đội ngũ **Tư Vấn Bán Hàng (TVBH)** tại Showroom VinFast Thuận An. Toàn bộ 12 chức năng nghiệp vụ chuyên sâu của ứng dụng — từ bàn làm việc, tạo đơn cọc, chỉnh sửa cấu hình xe, hủy đơn/nhả VIN, yêu cầu xuất hóa đơn VAT, nộp bổ sung hồ sơ, giữ xe & gia hạn giữ xe, lập phiếu lái thử, bảng tính lăn bánh đến hoán đổi xe (Swap) — đều được **cắt trích xuất trực tiếp và phóng to chi tiết từng bước** từ hệ thống tác nghiệp thực tế.

---

## 📑 MỤC LỤC TOÀN DIỆN (12 CHƯƠNG NGHIỆP VỤ CHUYÊN SÂU)

1. [Chương 1: Tổng Quan Bàn Làm Việc Của TVBH (Workspace Header & Bộ Lọc Dòng Xe)](#chuong-1)
2. [Chương 2: Quản Lý Đơn Hàng & Theo Dõi Tiến Độ Ghép Xe](#chuong-2)
3. [Chương 3: Quy Trình Tạo Yêu Cầu Ghép Xe Mới (Nút ORDER & FLEX-MATCH)](#chuong-3)
4. [Chương 4: Chỉnh Sửa Đơn Hàng (Đổi Cấu Hình Xe) & Quy Trình Hủy Đơn (Nút "Sửa" & "Hủy")](#chuong-4)
5. [Chương 5: Quy Trình Lập Yêu Cầu Xuất Hóa Đơn VAT (Request Invoice - 2 Bước)](#chuong-5)
6. [Chương 6: Quy Trình Bổ Sung & Scan Lại Hồ Sơ Chứng Từ (Supplementary File)](#chuong-6)
7. [Chương 7: Tra Cứu Kho Xe Thực Tế, Quy Định Giữ Xe & Gia Hạn Giữ Xe](#chuong-7)
8. [Chương 8: Bản Đồ Radar Định Vị Xe Bãi Đỗ GPS (Live Map)](#chuong-8)
9. [Chương 9: Lập Phiếu Đăng Ký Lái Thử Điện Tử Chuẩn Nhận Diện](#chuong-9)
10. [Chương 10: Công Cụ Báo Giá Lăn Bánh & Dự Toán TrẢ Góp Ngân Hàng](#chuong-10)
11. [Chương 11: Tra Cứu Lịch Sử Xuất Hóa Đơn & Hồ Sơ Xe Đã Bán](#chuong-11)
12. [Chương 12: Hộp Thư Thông Báo & Tính Năng Hoán Đổi Xe (Swap Inbox)](#chuong-12)
13. [Phụ Lục: Quy Tắc Vàng Tác Nghiệp & Tiện Ích Thông Minh (FAQ)](#phu-luc)

---

<a id="chuong-1"></a>
## 🖥️ CHƯƠNG 1: TỔNG QUAN BÀN LÀM VIỆC CỦA TVBH (WORKSPACE HEADER)

### 1.1. Thanh điều hướng tác nghiệp (Top Header)
Toàn bộ các phân hệ chức năng hàng ngày của TVBH đều nằm tập trung trên thanh điều hướng phía trên cùng:

![Thanh điều hướng Header](./images/crop_02_header_nav.png)

| Phím tắt / Nút bấm | Vị trí | Chức năng chi tiết cho TVBH |
| :--- | :--- | :--- |
| **Logo VinFast Thuận An** | Góc trái | Bấm để làm mới dữ liệu và quay lại trang chính |
| **🚗 Đơn Hàng** | Tab 1 | Phân hệ theo dõi hợp đồng cọc, duyệt xe, hóa đơn VAT |
| **🏬 Kho xe** | Tab 2 | Quản lý kho xe thực tế, tình trạng xe rảnh và giữ xe |
| **⏱️ Lái Thử** | Tab 3 | Lập phiếu yêu cầu lái thử điện tử & in mẫu cam kết |
| **🧮 Báo Giá** | Tab 4 | Bảng dự toán chi phí lăn bánh và lãi vay ngân hàng |
| **🧾 Lịch Sử** | Tab 5 | Tra cứu các xe đã giao và hoàn tất hóa đơn VAT |
| **Nút `ORDER` (Xanh gradient)** | Góc phải | **Nút quan trọng:** Bấm để tạo hợp đồng cọc xe mới |
| **🔔 Quả Chuông** | Cạnh nút ORDER | Nhận thông báo xe rảnh mới về và đề xuất đổi xe |
| **🤖 Robot AI** | Cạnh quả chuông | Bật trợ lý ảo thông minh hỏi nhanh tồn kho & kỹ thuật |
| **👤 Tên TVBH & Avatar** | Góc phải ngoài cùng | Xem thông tin tài khoản, đổi mật khẩu định kỳ và Đăng xuất |

> 💡 **Mẹo bảo mật tài khoản:** TVBH bấm vào Avatar góc trên cùng bên phải ➔ Chọn **"Đổi mật khẩu"** để cập nhật mật khẩu định kỳ, bảo vệ an toàn thông tin khách hàng.

---

### 1.2. Thanh lọc nhanh theo dòng xe (Model Filter Bar)
Ngay dưới thanh Header là hàng phím lọc dòng xe theo số lượng thực tế:

![Thanh lọc dòng xe](./images/crop_02_model_filter_bar.png)

- **Tất cả:** Hiển thị toàn bộ hợp đồng và xe trong showroom.
- **Phím tắt từng model:** `LIMO`, `MINIO`, `VF 2`, `VF 3`, `VF 7`, `VF 8`... TVBH chỉ cần nhấp vào dòng xe mình đang theo dõi để lọc gọn danh sách trong 1 click.

---

<a id="chuong-2"></a>
## 📦 CHƯƠNG 2: QUẢN LÝ ĐƠN HÀNG & THEO DÕI TIẾN ĐỘ GHÉP XE

Tab **Đơn Hàng** được chia thành 3 phân khu làm việc rõ rệt từ Trái qua Phải.

### 2.1. Cột phân loại trạng thái đơn hàng (Cột bên trái)

![Cột danh sách trạng thái đơn hàng](./images/crop_03_order_status_tabs.png)

1. **🔵 Chờ Ghép Xe:** Đơn cọc hợp lệ đang đợi xe phù hợp từ kho hoặc lô xe nhà máy chuyển về.
2. **✏️ Đơn Có Xe:** Kho đã xuất hiện chiếc xe trùng khớp màu sắc & phiên bản khách đã cọc.
3. **✅ Đã Ghép Xe:** Xe đã được gán số khung (VIN) chính thức.
4. **Ô Tìm kiếm nhanh:** Gõ tên khách hàng hoặc mã đơn DMS để định vị tức thời hợp đồng.

---

### 2.2. Khu vực thông tin chi tiết đơn hàng & Mô phỏng xe 3D (Khu vực trung tâm)

![Chi tiết đơn hàng và xe 3D](./images/crop_03_order_detail_center.png)

Khi bấm chọn một đơn hàng (Ví dụ: khách hàng `DƯƠNG VĂN TRẮNG`):
- **Thông tin hợp đồng:** Tên khách hàng, Số điện thoại, Mã đơn hàng DMS (`N31913-VSO-26-09-0002`), TVBH quản lý, Ngày đặt cọc.
- **Mô phỏng 3D ngoại thất xe:** Hiển thị trực quan màu sơn thực tế (Ví dụ: *VF 3 Plus màu Xám Zenith Grey*).
- **Thước đo 4 bước tiến trình:**  
  `Nhận cọc` ➔ `Đã ghép VIN` ➔ `Yêu cầu xuất HĐ` ➔ `Bàn giao xe`.

---

### 2.3. Cụm nút hành động nghiệp vụ

![Cụm nút hành động](./images/crop_03_action_buttons.png)

- **`Đổi xe`:** Đề xuất hoán đổi xe với TVBH khác khi khách cần lấy xe sớm.
- **`Hủy`:** Nút màu đỏ, bấm để Hủy đơn rút cọc hoặc Nhả VIN về trạng thái Chờ xe.
- **`Sửa`:** Bấm để điều chỉnh thông tin khách hàng, đổi màu xe hoặc đổi phiên bản.
- **`Xuất Hóa Đơn`:** Nút màu xanh xuất hiện khi xe **đã ghép VIN**, bấm để lập yêu cầu xuất hóa đơn VAT.
- **`In`:** In phiếu thông tin đơn hàng lưu hồ sơ.

---

### 2.4. Khung đối soát xe thực tế trong kho (Cột bên phải)

![Kho xe phù hợp thực tế](./images/crop_03_matching_stock.png)

- Tự động quét toàn bộ kho xe thực tế để tìm những chiếc xe có cùng phiên bản và mã màu.
- Hiển thị rõ: **Số khung (VIN)**, **Số máy**, **Tình trạng pin**, và nút **`Ghép xe này`** để hoàn tất chỉ định xe cho khách.

---

<a id="chuong-3"></a>
## 📝 CHƯƠNG 3: QUY TRÌNH TẠO YÊU CẦU GHÉP XE MỚI (NÚT ORDER & FLEX-MATCH)

### 3.1. Nút tạo yêu cầu ORDER
Nhấp vào nút **`ORDER`** có viền sáng chuyển màu ở góc trên bên phải:

![Nút ORDER](./images/crop_04_order_btn.png)

---

### 3.2. Hộp thoại Cấu hình xe (Modal Step 1)

![Modal tạo yêu cầu đầy đủ](./images/crop_04_modal_full.png)

#### Bước 1.1: Lựa chọn Dòng xe (Model Grid)
Bấm chọn biểu tượng chiếc xe khách hàng đặt cọc trong lưới danh mục:

![Lưới chọn model xe](./images/crop_04_model_grid.png)

- Hỗ trợ đầy đủ: `VF 3`, `VF 5`, `VF 6`, `VF 7`, `VF 8`, `VF 9`, `LIMO`, `MINIO`, `EC VAN`, `VF 2`...

#### Bước 1.2: Chọn Phiên bản, Màu sắc & Bật FLEX-MATCH

![Bảng chọn màu sắc và tính năng Flex-match](./images/crop_04_colors_flexmatch.png)

1. **Phiên bản:** Chọn `Plus`, `Eco`, `Base`...
2. **Màu ngoại thất:** Chọn mã màu chính hãng từ bảng màu.
3. **Màu nội thất:** Chọn màu da ghế (Đen, Be, Nâu cát, Xám...).
4. **Tùy chọn độc quyền `FLEX-MATCH`:**
   > [!TIP]  
   > Khi khách hàng sẵn sàng nhận nhiều lựa chọn màu sơn (Ví dụ: ưu tiên Trắng nhưng chấp nhận Hồng hoặc Đỏ nếu có xe giao ngay), TVBH hãy **tích chọn ô FLEX-MATCH** và chọn thêm các màu dự phòng. Hệ thống sẽ ưu tiên ghép xe ngay khi có bất kỳ màu nào khả dụng, giúp khách **nhận xe sớm hơn 2 - 3 tuần!**

#### Bước 1.3: Điều hướng sang Bước 2

![Nút xác nhận bước](./images/crop_04_step_buttons.png)

Bấm nút **`Tiếp theo`** để chuyển sang màn hình nhập thông tin khách hàng.

---

### 3.3. Bước 2: Nhập thông tin khách hàng & Hoàn tất
1. Nhập **Họ và tên khách hàng** (Viết hoa có dấu).
2. Nhập **Số điện thoại** liên hệ chính.
3. Nhập **Mã đơn hàng DMS** (Bắt buộc theo phiếu thu cọc).
4. Nhập **Thời gian cần xe** (Ngày khách mong muốn nhận xe).
5. Nhấn nút màu xanh **`Xác nhận tạo yêu cầu`**. Đơn hàng sẽ lập tức xuất hiện trong danh sách đối soát kho xe.

---

<a id="chuong-4"></a>
## ✏️ CHƯƠNG 4: CHỈNH SỬA ĐƠN HÀNG (ĐỔI CẤU HÌNH XE) & QUY TRÌNH HỦY ĐƠN (NÚT "SỬA" & "HỦY")

Trong quá trình theo dõi đơn hàng, khách hàng có thể phát sinh nhu cầu đổi màu sơn, đổi phiên bản xe hoặc rút cọc. Ứng dụng cung cấp 2 tính năng điều chỉnh trực tiếp:

### 4.1. Chức năng Chỉnh sửa đơn hàng (Nút "Sửa")
Khi khách hàng muốn đổi số điện thoại, đổi ngày cần xe, hoặc đổi sang dòng xe / màu sơn khác:
1. Chọn đơn hàng trong danh sách.
2. Tại thanh Dock dưới cùng, bấm nút **`Sửa`** (icon `fa-pencil-alt`).
3. Giao diện chỉnh sửa tích hợp sẽ hiển thị:

![Chỉnh sửa đơn hàng và đổi cấu hình](./images/crop_edit_order_panel.png)

4. **Các trường có thể điều chỉnh:**
   - **Tên khách hàng:** Chuẩn hóa lại họ tên nếu có sai sót chính tả.
   - **Đổi cấu hình xe:** Chọn lại *Dòng xe*, *Phiên bản*, *Màu ngoại thất*, *Màu nội thất*. Hệ thống sẽ tự động đối soát lại kho xe theo cấu hình mới!
   - **Ngày cọc & Thời gian cần xe:** Cập nhật lại thời gian khách muốn nhận xe.
5. Bấm nút màu xanh **`Lưu Thay Đổi`** để hoàn tất.

---

### 4.2. Quy trình Hủy đơn & Nhả số VIN về Chờ xe (Nút "Hủy")
Khi khách hàng không còn nhu cầu lấy chiếc xe hiện tại hoặc xin rút cọc, TVBH bấm nút **`Hủy`** (màu đỏ, icon `fa-trash-alt`) tại thanh Dock:
1. Hộp thoại **Xác Nhận Hủy** sẽ hiển thị.
2. **TVBH chọn 1 trong 2 hình thức hủy:**
   - **Lựa chọn 1 — "Hủy luôn đơn hàng (Hủy đơn)":** Dành cho trường hợp khách hàng có đơn rút cọc hoàn toàn. Hệ thống sẽ chuyển hồ sơ lên Ban Quản Lý phê duyệt hủy hợp đồng.
   - **Lựa chọn 2 — "Hủy ghép VIN hiện tại - Đưa về Chờ xe":** Dành cho trường hợp xe đã gán VIN nhưng khách bận đi công tác chưa nhận xe đợt này. Hệ thống sẽ nhả chiếc xe này ra cho TVBH khác, đồng thời giữ nguyên hợp đồng cọc của khách bạn ở trạng thái *Chờ Ghép Xe* cho lô xe sau.
3. Nhập **Lý do hủy** rõ ràng và bấm **`Xác Nhận Hủy`**.

---

<a id="chuong-5"></a>
## 🧾 CHƯƠNG 5: QUY TRÌNH LẬP YÊU CẦU XUẤT HÓA ĐƠN VAT (REQUEST INVOICE)

Khi xe đã được ghép số khung (VIN) chính thức (trạng thái **Đã ghép xe**), TVBH cần tiến hành lập hồ sơ đề nghị xuất hóa đơn tài chính gửi Phòng Kế Toán.

### 5.1. Điều kiện hiển thị & Khởi chạy
Tại thanh Dock phía dưới cùng của đơn hàng đã ghép, TVBH nhấp vào nút màu xanh **`Xuất Hóa Đơn`** (có biểu tượng `fa-file-invoice-dollar`). Giao diện quy trình 3 bước sẽ hiển thị:

![Giao diện Yêu Cầu Xuất Hóa Đơn Bước 1](./images/crop_invoice_step1_full.png)

---

### 5.2. Bước 1: Thiết lập Thông tin & Chính sách bán hàng
Hệ thống tự động đồng bộ Số đơn hàng DMS, Tên khách hàng và Số khung (VIN). TVBH hoàn thiện các trường dữ liệu:

![Chọn chính sách bán hàng và thu cũ đổi mới](./images/crop_invoice_step1_policy.png)

1. **Chính sách bán hàng (Sales Policies):**  
   - Hệ thống tự động lọc các chính sách hợp lệ theo dòng xe và phiên bản (Ví dụ: *Ưu đãi hội viên VinClub, Voucher Vinhomes, Chiết khấu doanh nghiệp, Hỗ trợ trước bạ*).
   - Tích chọn một hoặc nhiều chính sách khách hàng được hưởng.
2. **Kê khai Thu cũ đổi mới xe xăng (Nếu có):**  
   - Tích chọn ô *Thu cũ đổi mới*.
   - Nhập **Số VIN xe xăng cũ**, **Hãng xe** và **Model xe**. Hệ thống sẽ tự động xác thực tính hợp lệ của số VIN xe cũ.
3. **Mã Voucher / Hoa hồng / VPoint:** Nhập mã ưu đãi bổ sung nếu có.
4. Nhấn nút **`Tiếp theo`** để chuyển sang Bước 2.

---

### 5.3. Bước 2: Đính kèm Hồ sơ Chứng từ pháp lý

![Khu vực tải lên Hợp đồng và Đề nghị xuất hóa đơn](./images/crop_invoice_step2_files.png)

Tại màn hình Bước 2, TVBH tải lên 2 tệp chứng từ bắt buộc:
1. **Hợp đồng mua bán đã ký (Tệp 1):**  
   - Bấm vào khung hoặc kéo thả tệp scan hợp đồng (định dạng PDF hoặc hình ảnh rõ nét).
   - Yêu cầu: Đầy đủ chữ ký của khách hàng, TVBH và dấu treo showroom.
2. **Giấy đề nghị xuất hóa đơn (Tệp 2):**  
   - Tải lên bản scan giấy đề nghị xuất hóa đơn có đầy đủ thông tin tên công ty/cá nhân, MST, địa chỉ nhận hóa đơn điện tử.

---

### 5.4. Bước 3: Xác nhận & Nộp hồ sơ lên Kế toán
1. Nhấn nút **`Gửi Yêu Cầu Xuất Hóa Đơn`**.
2. Hệ thống sẽ tự động tải các tệp tin lên máy chủ Cloud lưu trữ an toàn, chuyển trạng thái đơn hàng sang **`Chờ duyệt hóa đơn`** và gửi email thông báo kèm tệp đính kèm đến Phòng Kế Toán.

---

<a id="chuong-6"></a>
## 📂 CHƯƠNG 6: QUY TRÌNH BỔ SUNG & SCAN LẠI HỒ SƠ CHỨNG TỪ (SUPPLEMENTARY FILE)

Trong quá trình đối soát chứng từ, nếu hồ sơ bị mờ, thiếu trang hoặc cần chỉnh sửa, Kế toán sẽ chuyển đơn hàng sang trạng thái cảnh báo **`Yêu cầu bổ sung`** (kèm lý do cụ thể). TVBH thực hiện quy trình nộp bổ sung như sau:

### 6.1. Nhận biết đơn hàng cần bổ sung hồ sơ
- Đơn hàng xuất hiện nhãn cảnh báo màu vàng cam: **`Yêu cầu bổ sung`**.
- Tại thanh Dock phía dưới cùng, nút **`Bổ Sung`** (màu hổ phách, icon `fa-file-upload`) sẽ sáng lên.
- TVBH nhấp vào nút **`Bổ Sung`** để mở cửa sổ tác nghiệp chuyên biệt:

![Cửa sổ Bổ Sung Chứng Từ](./images/crop_supplement_modal_full.png)

---

### 6.2. Các thông tin trên Hộp thoại Bổ Sung Chứng Từ
1. **Thanh tiêu đề:** Hiển thị rõ chế độ: **`BỔ SUNG CHỨNG TỪ`** (hoặc *SCAN LẠI / CẬP NHẬT FILE*).
2. **Khung tóm tắt thông tin đơn:**  
   - *Số đơn hàng DMS*, *Tên khách hàng*, *Số VIN* và *Màu ngoại thất*.
3. **Khung cảnh báo lý do:**  
   - Hiển thị nguyên văn yêu cầu từ Kế toán (Ví dụ: *Thiếu chữ ký phụ lục hợp đồng* hoặc *Bản scan CMND bị mờ số*).

---

### 6.3. Vùng tải tệp bổ sung (Dropzones)

![Vùng tải tệp mới bổ sung](./images/crop_supplement_dropzones.png)

- **Hợp đồng mua bán (Mới):** Bấm để chọn tệp hợp đồng mới đã bổ sung trang hoặc scan lại với độ phân giải cao.
- **Đề nghị xuất hóa đơn (Mới):** Tải lên bản đề nghị mới nếu cần thay thế.
- > [!IMPORTANT]  
  > **Quy tắc an toàn dữ liệu:** TVBH chỉ cần tải lên đúng tệp cần thay thế hoặc bổ sung. Những tệp chứng từ cũ đã đạt chuẩn sẽ được hệ thống **giữ nguyên vẹn 100%** trên Cloud, không bị ghi đè mất.

---

### 6.4. Hoàn tất nộp bổ sung
1. Bấm nút màu xanh **`Xác Nhận Nộp Bổ Sung`**.
2. Hệ thống thực thi quy trình đồng bộ 4 giai đoạn:  
   `Tải tệp lên Cloud` ➔ `Mã hóa bảo mật` ➔ `Chuyển trạng thái đơn sang "Đã bổ sung"` ➔ `Gửi email biên nhận tự động cho Kế toán và TVBH`.
3. Kế toán sẽ nhận được thông báo ngay lập tức để tiếp tục xuất hóa đơn cho khách.

---

<a id="chuong-7"></a>
## 🏬 CHƯƠNG 7: TRA CỨU KHO XE THỰC TẾ, QUY ĐỊNH GIỮ XE & GIA HẠN GIỮ XE

Chuyển sang tab **Kho xe** trên thanh Header:

### 7.1. Thống kê số lượng xe rảnh theo từng phân khúc

![Thanh thống kê kho xe](./images/crop_05_stock_counter_bar.png)

Các nhãn đếm hiển thị số lượng tức thời:  
*Tất cả | EC Van | LIMO | VF 2 | VF 3 | VF 5 | VF 6 | VF 7 | VF 8 | VF LIMO*

---

### 7.2. Cấu trúc Thẻ xe trong kho (Stock Card)

![Thẻ xe chi tiết](./images/crop_05_single_card.png)

Mỗi thẻ xe cung cấp đầy đủ thông số nhận diện:
- Ảnh mô phỏng 3D đúng màu sơn xe.
- **Tên phiên bản & Mã màu:** (Ví dụ: `VF 3 Plus`, màu `Zenith Grey - CE21`).
- **Số khung (VIN):** 17 ký tự chuẩn nhà máy.
- **Trạng thái:**
  - `Chưa ghép` (Màu xanh/xám): Xe rảnh 100%, có thể bấm **`Giữ xe`**.
  - `Đang giữ` (Màu vàng cam): Đang có TVBH khác tạm khóa giữ.
  - `Đã ghép` (Màu xanh lá): Đã chỉ định cho một hợp đồng cọc.

---

### 7.3. Quy định giữ xe & Quy trình Gia hạn giữ xe (Hold Extension)
> [!IMPORTANT]  
> **Quy định thời gian giữ xe (Hold Vehicle):**
> 1. Thời hạn giữ xe tối đa là **24 tiếng (24 giờ)**.
> 2. Quá thời hạn 24 tiếng nếu TVBH chưa hoàn tất tạo hợp đồng cọc trên hệ thống, xe sẽ **tự động mở khóa rảnh** để đảm bảo công bằng cho toàn showroom.
> 3. **Quy trình Gia hạn giữ xe:** Trường hợp khách hàng cần thêm thời gian để hoàn tất thủ tục ngân hàng hoặc chuyển khoản:
>    - TVBH bấm vào nút **`Gia hạn giữ xe`** trên thẻ xe đang giữ.
>    - Tải lên ảnh chụp chứng từ chứng minh (Ví dụ: Ảnh chụp màn hình ủy nhiệm chi chuyển khoản cọc, phiếu thu tạm, thông báo duyệt vay).
>    - Nhập lý do xin gia hạn và bấm **Gửi yêu cầu**. Ban Quản Lý sẽ xem xét phê duyệt gia hạn thêm.

---

<a id="chuong-8"></a>
## 🗺️ CHƯƠNG 8: BẢN ĐỒ RADAR ĐỊNH VỊ XE BÃI ĐỖ GPS (LIVE MAP)

Tab Kho xe tích hợp bản đồ vệ tinh thời gian thực ở nửa bên phải màn hình:

![Bản đồ GPS vị trí xe](./images/crop_05_gps_radar_map.png)

- Cung cấp tọa độ chính xác của từng xe theo số VIN: Bãi đỗ xe chính Showroom Thuận An, Kho vệ tinh Miền Nam, hay đang trên xe lồng chuyên dụng từ Hải Phòng di chuyển vào.
- TVBH chỉ cần mở bản đồ để dẫn khách hàng ra tận vị trí xe xem màu sắc thực tế mà không cần tìm kiếm thủ công trong bãi.

---

<a id="chuong-9"></a>
## 🚗 CHƯƠNG 9: LẬP PHIẾU ĐĂNG KÝ LÁI THỬ ĐIỆN TỬ CHUẨN NHẬN DIỆN

Tab **Lái Thử** giúp số hóa 100% quy trình tiếp nhận và in biên bản lái thử xe demo:

### 9.1. Biểu mẫu đăng ký lái thử (Cột bên trái)

![Biểu mẫu đăng ký lái thử](./images/crop_06_test_drive_form.png)

1. **Lịch trình & Phương tiện Demo:**
   - Ngày lái thử, Loại xe demo (VF 3, VF 5, VF 6, VF 7, VF 8, VF 9).
   - Biển số xe lái thử tương ứng của Showroom.
   - Khung giờ lái thử & Cung đường trải nghiệm.
2. **Thông tin khách hàng & Bằng lái:**
   - Họ và tên, Số điện thoại, Số CCCD.
   - Số GPLX, Hạng bằng lái (B1, B2...), Ngày hết hạn GPLX.
   - Tùy chọn: Khách tự lái hoặc TVBH lái trải nghiệm.

---

### 9.2. Mẫu in Phiếu Yêu Cầu Lái Thử chuẩn thương hiệu (Cột bên phải)

![Bản in phiếu lái thử chuẩn](./images/crop_06_print_preview.png)

- Tự động sinh mã phiếu (Ví dụ: `LT/0926/001`) theo chuẩn nhận diện VinFast Minh Đạo Thuận An.
- Tích hợp sẵn điều khoản cam kết an toàn giao thông, phần ký xác nhận của Khách hàng & TVBH, kèm theo **Phiếu khảo sát cảm nhận sau lái thử**.
- Nhấn nút **`Lưu & In`** để in ra khổ giấy A4 trong 5 giây.

---

<a id="chuong-10"></a>
## 🧮 CHƯƠNG 10: CÔNG CỤ BÁO GIÁ LĂN BÁNH & DỰ TOÁN TRẢ GÓP NGÂN HÀNG

### 10.1. Chọn Model xe & Đổi màu sơn 3D trực quan

![Chọn xe và xoay màu 3D](./images/crop_07_model_3d_colors.png)

- Trượt chọn dòng xe VinFast.
- Bấm vào các nút màu tròn bên dưới để đổi màu xe 3D tức thì trước mặt khách.
- Hiển thị sẵn 3 thông số vàng để thuyết phục khách hàng:
  - ⚡ **Công suất tối đa (kW / HP)**
  - 🔋 **Dung lượng pin khả dụng (kWh)**
  - 🛣️ **Quãng đường di chuyển sau 1 lần sạc đầy chuẩn NEDC (km)**

---

### 10.2. Bảng dự toán chi phí lăn bánh & Lịch trả góp ngân hàng

![Bảng tính chi phí và trả góp](./images/crop_07_price_loan_table.png)

- Tự động tính giá xe kèm pin hoặc thuê pin.
- Áp dụng các ưu đãi khách hàng, hỗ trợ phí trước bạ, giảm giá tiền mặt.
- **Bảng tính ngân hàng:** Tự động chia tỷ lệ vay 70% - 80% trong 3 đến 8 năm, hiển thị số tiền thanh toán đối ứng ban đầu và số tiền gốc + lãi giảm dần phải trả từng tháng.

---

<a id="chuong-11"></a>
## 🧾 CHƯƠNG 11: TRA CỨU LỊCH SỬ XUẤT HÓA ĐƠN & DOANH SỐ

### 11.1. Bộ lọc thời gian & Thống kê doanh số

![Bộ lọc lịch sử](./images/crop_08_history_filter.png)

- Dễ dàng chọn lọc theo Tháng / Năm để kiểm tra lại các đơn hàng đã bàn giao.

---

### 11.2. Danh sách xe đã xuất hóa đơn điện tử

![Bảng danh sách xe đã bán](./images/crop_08_history_table.png)

- Cung cấp: Ngày xuất HĐ, Tên khách hàng, Số hóa đơn VAT điện tử, Số khung (VIN), Số máy, Giá bán thực tế.
- Có nút tải file hóa đơn điện tử và biên bản bàn giao xe khi khách hàng cần cấp lại bản sao giấy tờ.

---

<a id="chuong-12"></a>
## 🔔 CHƯƠNG 12: HỘP THƯ THÔNG BÁO & TÍNH NĂNG ĐỔI XE (SWAP INBOX)

### 12.1. Khung thông báo biến động xe rảnh (Notification Popover)

![Khung thông báo chuông](./images/crop_09_notification_dropdown.png)

- Bấm vào biểu tượng **Chuông 🔔** trên thanh Header:
  - 📢 **Thông báo xe rảnh mới về:** Cập nhật ngay khi có lô xe mới về showroom hoặc khi đồng nghiệp vừa hủy lệnh giữ xe. TVBH có thể bấm vào thông báo để giữ ngay xe cho khách mình!
  - ℹ️ **Thông báo giữ xe:** Biết đồng nghiệp nào đang giữ xe số VIN nào.

---

### 12.2. Tính năng Hoán Đổi Xe (Swap Car)
Khi khách của bạn cần lấy gấp một chiếc xe mà đồng nghiệp đang giữ:
1. Nhấn nút **`Hộp Thư Đổi Xe`** hoặc bấm **`Đổi xe`** trên giao diện chi tiết đơn hàng.
2. Chọn chiếc xe bạn muốn đổi và đưa ra phương án xe hoán đổi (Ví dụ: Đổi xe giao ngay với xe giao tuần sau).
3. Khi đồng nghiệp bấm chấp thuận, hệ thống tự động hoán đổi số khung (VIN) trên đơn hàng của hai bên một cách minh bạch và an toàn!

---

<a id="phu-luc"></a>
## 📌 PHỤ LỤC: QUY TẮC VÀNG TÁC NGHIỆP & GIẢI ĐÁP THẮC MẮC (FAQ)

### 1. Quy tắc làm việc TVBH cần ghi nhớ
> [!CAUTION]  
> - **Tuyệt đối không giữ xe ảo:** Chỉ thực hiện thao tác *Giữ xe* khi khách hàng đã có nhu cầu thực tế và đang chuẩn bị đặt cọc trong ngày. Hành vi giữ xe không có cọc quá thời gian quy định sẽ bị khóa tính năng giữ xe.
> - **Nguyên tắc cảnh báo FIFO (First In, First Out):** Khi ghép xe hoặc giữ xe, hệ thống sẽ ưu tiên đề xuất những số VIN nhập kho lâu hơn để TVBH xử lý trước, giúp showroom luân chuyển kho tối ưu và tránh xe tồn kho kéo dài.
> - **Kiểm tra kỹ Số Đơn Hàng DMS:** Số đơn hàng DMS là căn cứ xuất hóa đơn VAT và tính hoa hồng bán hàng. Mọi sai sót về số HĐ cần báo ngay Điều phối để điều chỉnh trước khi xuất xe.
> - **Bảo mật tài khoản:** Không chia sẻ tài khoản làm việc của mình cho người khác. Đăng xuất hoặc khóa màn hình máy tính khi rời khỏi bàn làm việc tại Showroom.

### 2. Bảng tổng hợp các thao tác nghiệp vụ chính
| Tác vụ | Nút bấm thao tác | Vị trí giao diện | Lưu ý quan trọng |
| :--- | :--- | :--- | :--- |
| Tạo đơn cọc mới | **Nút ORDER** | Header góc trên bên phải | Nhớ bật FLEX-MATCH nếu khách linh hoạt màu |
| Chỉnh sửa đơn | **Nút Sửa** | Dock dưới cùng đơn hàng | Đổi màu xe, phiên bản, cập nhật ngày cần xe |
| Hủy đơn / Nhả VIN | **Nút Hủy** | Dock dưới cùng đơn hàng | Chọn Hủy luôn đơn hoặc Nhả VIN về Chờ xe |
| Xuất hóa đơn VAT | **Nút Xuất Hóa Đơn** | Dock dưới cùng (Đã ghép xe) | Tải đủ Hợp đồng ký + Đề nghị xuất hóa đơn |
| Bổ sung hồ sơ | **Nút Bổ Sung** | Dock dưới cùng (Yêu cầu BS) | Chỉ tải đúng tệp bị lỗi, tệp cũ giữ nguyên |
| Giữ xe kho | **Nút Giữ xe** | Thẻ xe trong tab Kho xe | Thời hạn 24 tiếng tự động nhả |
| Gia hạn giữ xe | **Gia hạn giữ xe** | Thẻ xe đang giữ | Tải ủy nhiệm chi cọc gửi Admin duyệt |

---
*Tài liệu nghiệp vụ nội bộ — Showroom VinFast Thuận An. Lưu hành nội bộ.*
