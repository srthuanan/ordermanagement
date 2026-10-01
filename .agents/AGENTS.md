# Agent Rules

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
