# 📱 VINFAST THUẬN AN - TVBH MOBILE APP (REACT NATIVE & EXPO)

Ứng dụng di động độc lập (Native App) dành riêng cho **Tư Vấn Bán Hàng (TVBH)** tại Showroom VinFast Thuận An (Bình Dương).

---

## 🚀 3 Tính Năng Cốt Lõi

1. **🚗 Tra Cứu Kho Xe & Giữ Xe Thời Gian Thực (Live Stock)**:
   - Nạp dữ liệu tức thì từ bảng `khoxe` trên Supabase.
   - Tìm kiếm siêu tốc theo số VIN, Dòng xe (VF 3, VF 5, VF 6, VF 7, VF 8, VF 9, Minio...), màu ngoại thất/nội thất, kho bãi (Thuận An, Vũng Tàu, K83...).
   - Chạm 1 ngón tay để sao chép số VIN vào clipboard.
   - **Giữ xe 2 giờ**: Tự động áp dụng **quy tắc FIFO** (ưu tiên giữ xe nhập kho trước) và gọi RPC `rpc_hold_car`.
   - **Nhả xe**: TVBH tự nhả xe đang giữ khi khách đổi ý.

2. **📝 Yêu Cầu Xuất Hóa Đơn Trực Quan (Mobile Invoice Request)**:
   - Form tối ưu hóa 100% cho màn hình dọc điện thoại.
   - Tự động điền thông tin xe khi chọn từ Kho xe.
   - Nhập thông tin khách hàng, số điện thoại, CCCD/MST, địa chỉ xuất HĐ.
   - Tích chọn chính sách bán hàng (VinClub, Giảm tiền mặt, Trả góp 0%, Voucher Vinhomes...).
   - 📸 **Tích hợp Camera điện thoại**: Chụp ảnh trực tiếp Hợp đồng mua bán, CCCD/Hộ chiếu, Ủy nhiệm chi (UNC) -> Tự động nén và upload lên Supabase Storage bucket `documents`.
   - Ghi dữ liệu vào bảng `yeucauxhd` trên Supabase để Kế toán & Admin nhận thông báo xử lý tức thì.

3. **📋 Theo Dõi Tiến Độ Đơn Hàng & Hóa Đơn M-Invoice (My Orders)**:
   - Theo dõi trạng thái từng đơn hàng: *Chờ duyệt XHĐ*, *Đã ghép*, *Đã xuất hóa đơn*.
   - Tra cứu số hóa đơn điện tử M-Invoice.
   - Bấm 1 chạm để mở và xem file hóa đơn điện tử PDF gốc.

---

## 🛠️ Hướng Dẫn Chạy & Thử Nghiệm

### 1. Thử nghiệm tức thì bằng điện thoại (Expo Go)
Không cần cài đặt phức tạp, TVBH chỉ cần tải ứng dụng **Expo Go** trên App Store (iOS) hoặc Google Play (Android):

```bash
cd tvbh-mobile
npm install
npm start
```
- Mở Camera điện thoại quét mã QR hiển thị trên màn hình -> Ứng dụng chạy trực tiếp trên iPhone hoặc Android ngay lập tức!

---

### 2. Xuất file APK cài đặt trực tiếp lên điện thoại Android

Sử dụng Expo Application Services (EAS Build) đã được cấu hình sẵn trong `eas.json`:

```bash
cd tvbh-mobile
# Cài đặt công cụ EAS nếu chưa có:
npm install -g eas-cli

# Đăng nhập tài khoản Expo (hoặc tạo tài khoản miễn phí):
eas login

# Chạy lệnh xuất file APK Android:
npm run build:apk
# (hoặc: eas build -p android --profile preview)
```
- Sau khi EAS build xong (khoảng 3-5 phút trên Cloud), hệ thống sẽ trả về đường link tải file `.apk`.
- TVBH tải file `.apk` về điện thoại Android và bấm cài đặt là dùng vĩnh viễn.

---

### 3. Xuất bản cho iPhone (iOS TestFlight)

```bash
cd tvbh-mobile
npm run build:ios
# (hoặc: eas build -p ios --profile preview)
```

---

## 🔒 An Toàn & Bảo Mật

- **Supabase Authentication**: Đăng nhập bằng tài khoản nội bộ TVBH đã được cấp trên hệ thống VinFast Thuận An.
- **Dữ liệu tập trung**: Dữ liệu đồng bộ 100% thời gian thực với hệ thống Web Admin và Kế toán máy tính văn phòng.
