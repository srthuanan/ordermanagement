# Agent Rules

- **Deployment Protocol**: NEVER run `npm run deploy` or deploy the application to production unless explicitly requested by the user. Do not assume a deployment is needed after making code changes.

- **Cyber MSSQL Query Protocol**: Khi viết script hoặc thực hiện truy vấn cơ sở dữ liệu CyberSoft (`SQLVanDao.Cybersoft.com.vn`), luôn bắt buộc tuân thủ:
  1. Khai báo `appname='CyberAppGolden'` và `autocommit=True` trong connection parameters.
  2. Luôn sử dụng `WITH (NOLOCK)` trên tất cả các bảng hoặc thiết lập `SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;` để đảm bảo truy vấn phi khóa (không gây lag/treo ứng dụng Cyber của nhân viên).
  3. Luôn dùng tham số hóa câu lệnh (`%s` hoặc `?`) thay vì nối chuỗi trực tiếp.
  4. Luôn đảm bảo đóng kết nối ngay sau khi query xong bằng khối `try ... finally: conn.close()` hoặc Context Manager (`with`).
