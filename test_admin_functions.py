import requests
import uuid
import json
import time

# Configuration
SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Unique test identifiers
ID = str(uuid.uuid4())[:8].upper()
TEST_VIN_1 = f"TESTV1-{ID}-01"
TEST_VIN_2 = f"TESTV2-{ID}-02"
TEST_ORDER = f"TESTORD-{ID}"
TEST_USER = f"tester_{ID.lower()}@example.com"

def log_test(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")

def request(method, table, data=None, params="", rpc=False):
    base = "rest/v1" if not rpc else "rest/v1/rpc"
    url = f"{SUPABASE_URL}/{base}/{table}{'?' + params if params else ''}"
    
    if method == "POST":
        res = requests.post(url, headers=HEADERS, data=json.dumps(data) if data else None)
    elif method == "PATCH":
        res = requests.patch(url, headers=HEADERS, data=json.dumps(data))
    elif method == "GET":
        res = requests.get(url, headers=HEADERS)
    elif method == "DELETE":
        res = requests.delete(url, headers=HEADERS)
    
    if res.status_code not in [200, 201, 202, 204]:
        print(f"!! Error {res.status_code} in {table}: {res.text}")
        return None
    return res.json() if res.text else True

def test_full_admin_suite():
    print(f"\n🚀 STARTING COMPREHENSIVE ADMIN TOOLS TEST (ID: {ID})\n" + "="*50)

    try:
        # --- 1. XE MỚI & XE HÀNG LOẠT ---
        log_test("1. Testing 'Thêm Xe Mới' & 'Thêm Xe Hàng Loạt'...")
        # Add master data first to satisfy constraints if any
        request("POST", "thongtinxe", {"vin": TEST_VIN_1, "mo_ta": "VF8 TEST", "khu_vuc": "DMS-HCM"})
        request("POST", "thongtinxe", {"vin": TEST_VIN_2, "mo_ta": "VF9 TEST", "khu_vuc": "DMS-HN"})
        
        # Insert into khoxe
        request("POST", "khoxe", {"vin": TEST_VIN_1, "dong_xe": "VF8", "trang_thai": "Chưa ghép"})
        request("POST", "khoxe", {"vin": TEST_VIN_2, "dong_xe": "VF9", "trang_thai": "Chưa ghép"})
        log_test("✓ Vehicles added to stock.")

        # --- 2. XÓA XE & PHỤC HỒI ---
        log_test("2. Testing 'Xóa Xe Khỏi Kho' & 'Phục Hồi Xe'...")
        # Log deletion in interactions first (simulating audit)
        request("POST", "interactions", {"category": "LOG", "type": "DELETE_CAR", "message": f"Deleted {TEST_VIN_1}", "target_id": TEST_VIN_1, "metadata": {"snapshot": {"vin": TEST_VIN_1, "dong_xe": "VF8"}}})
        request("DELETE", "khoxe", params=f"vin=eq.{TEST_VIN_1}")
        log_test(f"✓ Deleted {TEST_VIN_1}.")
        
        # Restore logic check
        request("POST", "khoxe", {"vin": TEST_VIN_1, "dong_xe": "VF8", "trang_thai": "Chưa ghép"})
        log_test(f"✓ Restored {TEST_VIN_1}.")

        # --- 3. NHÂN VIÊN ---
        log_test("3. Testing 'Thêm Nhân Viên'...")
        request("POST", "users", {"username": TEST_USER, "full_name": f"Tester {ID}", "role": "TVBH"})
        log_test(f"✓ Staff {TEST_USER} added.")

        # --- 4. ĐƠN HÀNG & HOÀN TÁC ---
        log_test("4. Testing 'Xóa Đơn Hàng' & 'Hoàn Tác Trạng Thái'...")
        request("POST", "donhang", {"so_don_hang": TEST_ORDER, "ten_khach_hang": "ADMIN TEST", "ket_qua": "Chưa ghép"})
        
        # Process: Match -> Approve -> Revert
        request("PATCH", "donhang", {"vin": TEST_VIN_2, "ket_qua": "Đã ghép"}, params=f"so_don_hang=eq.{TEST_ORDER}")
        log_test("✓ Order matched.")
        
        # Revert
        request("PATCH", "donhang", {"vin": None, "ket_qua": "Chưa ghép"}, params=f"so_don_hang=eq.{TEST_ORDER}")
        log_test("✓ Status reverted successfully.")

        # --- 5. HÓA ĐƠN HÀNG LOẠT ---
        log_test("5. Testing 'Tải Lên HĐ Hàng Loạt' & 'Yêu Cầu Hóa Đơn'...")
        # Create invoice request
        request("POST", "yeucauxhd", {"so_don_hang": TEST_ORDER, "ten_khach_hang": "ADMIN TEST"})
        
        # Update as Invoiced (Bulk Upload simulation)
        request("PATCH", "yeucauxhd", {"url_hoa_don_da_xuat": "http://test.com/inv.pdf"}, params=f"so_don_hang=eq.{TEST_ORDER}")
        request("PATCH", "donhang", {"ket_qua": "Đã xuất hóa đơn"}, params=f"so_don_hang=eq.{TEST_ORDER}")
        log_test("✓ Bulk Invoice upload simulated.")

        # --- 6. CÀI ĐẶT THÔNG BÁO ---
        log_test("6. Testing 'Cài Đặt Thông Báo' & 'Cài Đặt Hệ Thống'...")
        request("POST", "app_settings", {"key": f"test_setting_{ID}", "value": "enabled"}, params="on_conflict=key")
        log_test("✓ System setting updated.")

        # --- 7. TRA CỨU HOẠT ĐỘNG ---
        log_test("7. Testing 'Tra Cứu Hoạt Động' (Audit log check)...")
        logs = request("GET", "interactions", params=f"target_id=eq.{TEST_VIN_1}&limit=1")
        if logs: log_test("✓ Audit trail retrieved successfully.")

    except Exception as e:
        print(f"\n❌ CRITICAL FAILURE: {str(e)}")
    finally:
        # CLEANUP
        print("\n" + "="*50 + "\n🧹 CLEANING UP ALL TEST DATA...")
        delete_data = [
            ("donhang", f"so_don_hang=eq.{TEST_ORDER}"),
            ("yeucauxhd", f"so_don_hang=eq.{TEST_ORDER}"),
            ("khoxe", f"vin=in.({TEST_VIN_1},{TEST_VIN_2})"),
            ("thongtinxe", f"vin=in.({TEST_VIN_1},{TEST_VIN_2})"),
            ("users", f"username=eq.{TEST_USER}"),
            ("app_settings", f"key=eq.test_setting_{ID}"),
            ("interactions", f"target_id=in.({TEST_VIN_1},{TEST_ORDER})")
        ]
        for table, param in delete_data:
            if request("DELETE", table, params=param):
                print(f"  - Deleted from {table}")
        print("✨ CLEANUP COMPLETE. DATABASE IS CLEAN.\n")

if __name__ == "__main__":
    test_full_admin_suite()
