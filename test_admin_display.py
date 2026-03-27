import json

def simulate_admin_view():
    print("\n" + "="*60)
    print("🚀 MÔ PHỎNG QUÁ TRÌNH GỬI YÊU CẦU & HIỂN THỊ ADMIN 🚀")
    print("="*60 + "\n")

    # 1. Dữ liệu TVBH nhập vào
    tvbh_policies = ["Tặng 1 năm BHVC", "Lệ phí trước bạ"]
    
    # 2. Hệ thống AI quét và cảnh báo lỗi (Nhưng TVBH vẫn ép gửi)
    ai_mismatches = [
        "[HopDong_VinFast.pdf] Thiếu chữ ký của Đại diện Bên Mua.",
        "[DN_XHD_VF8.pdf] Sai Số VIN: Hệ thống (RLA12...), Giấy tờ (RLA13...)"
    ]

    print("👩‍💼 TVBH Nhập HĐ: " + ", ".join(tvbh_policies))
    print("🤖 AI Cảnh báo: " + str(len(ai_mismatches)) + " lỗi cực căng!\n")

    # 3. Hệ thống Frontend tự động nối chuỗi như vừa lập trình:
    ai_warning_note = ""
    if len(ai_mismatches) > 0:
        ai_warning_note = "⚠️ [GHI CHÚ AI]: " + " | ".join(ai_mismatches)
    
    # Ép chuỗi cảnh báo vào làm phần tử cuối cùng của mảng Chính sách
    policy_to_submit = tvbh_policies.copy()
    if ai_warning_note:
        policy_to_submit.append(ai_warning_note)

    # 4. Lưu xuống Database (Cột chinh_sach sẽ gom mọi mảng lại thành chuỗi Text)
    # Backend Supabase lưu dạng: policy1, policy2, policy...
    db_chinh_sach_column = ", ".join(policy_to_submit)

    print("💾 DỮ LIỆU ĐƯỢC LƯU XUỐNG CƠ SỞ DỮ LIỆU (Bảng yeucauxhd):")
    print(json.dumps({
        "so_don_hang": "VF-123456",
        "ten_khach_hang": "PHAN THẾ ANH",
        "chinh_sach": db_chinh_sach_column
    }, ensure_ascii=False, indent=4))
    print("\n")

    # 5. Giao diện Admin mở Hồ sơ ra xem
    print("👔 MÀN HÌNH KIỂM DUYỆT CỦA ADMIN / KẾ TOÁN (InvoiceInboxView):")
    print("-" * 50)
    print(f"👤 Khách hàng : PHAN THẾ ANH")
    print(f"📦 Đơn hàng   : VF-123456")
    print("📜 Danh sách Chính sách & Ghi chú đính kèm:")
    
    # Tái tạo lại thẻ tag trên UI (Admin sẽ thấy gì?)
    policies_rendered = db_chinh_sach_column.split(", ")
    for idx, p in enumerate(policies_rendered):
        if "GHI CHÚ AI" in p:
            print(f"  ❌ MỤC {idx+1}: \033[91m{p}\033[0m") # Chữ đỏ in đậm
        else:
            print(f"  ✅ MỤC {idx+1}: \033[92m{p}\033[0m") # Chữ xanh lá
    print("-" * 50)
    print("\n💡 => Kế toán lập tức phát hiện TVBH làm sai Hồ sơ mà vẫn cố gửi!\n")

if __name__ == "__main__":
    simulate_admin_view()
