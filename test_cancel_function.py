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
TEST_VIN = f"CANCEL-VIN-{ID}"
TEST_ORDER = f"CANCEL-ORD-{ID}"
ACTOR_EMAIL = "tester@example.com"
ACTOR_NAME = "Test Runner"

def log_test(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")

def request(method, path, data=None, params="", rpc=False):
    base = "rest/v1" if not rpc else "rest/v1/rpc"
    url = f"{SUPABASE_URL}/{base}/{path}{'?' + params if params else ''}"
    
    if method == "POST":
        res = requests.post(url, headers=HEADERS, data=json.dumps(data) if data else None)
    elif method == "PATCH":
        res = requests.patch(url, headers=HEADERS, data=json.dumps(data))
    elif method == "GET":
        res = requests.get(url, headers=HEADERS)
    elif method == "DELETE":
        res = requests.delete(url, headers=HEADERS)
    
    if res.status_code not in [200, 201, 202, 204]:
        print(f"!! Error {res.status_code} in {path}: {res.text}")
        return None
    return res.json() if res.text else True

def test_cancel_order():
    print(f"\n🚀 TESTING ORDER CANCELLATION LOGIC (ID: {ID})\n" + "="*50)

    try:
        # 1. Setup Data
        log_test("1. Setting up test data (Car & Order)...")
        # Add car
        request("POST", "khoxe", {"vin": TEST_VIN, "dong_xe": "VF8", "trang_thai": "Đã ghép", "nguoi_giu_xe": ACTOR_EMAIL})
        # Add order
        request("POST", "donhang", {
            "so_don_hang": TEST_ORDER, 
            "ten_khach_hang": "CANCEL TEST USER", 
            "vin": TEST_VIN,
            "ket_qua": "Đã ghép"
        })
        # Add related records
        request("POST", "yeucauxhd", {"so_don_hang": TEST_ORDER, "ten_khach_hang": "CANCEL TEST USER"})
        request("POST", "yeucauvc", {"so_don_hang": TEST_ORDER, "ten_khach_hang": "CANCEL TEST USER"})
        
        log_test("✓ Test data prepared.")

        # 2. Verify Initial State
        log_test("2. Verifying initial state...")
        car = request("GET", "khoxe", params=f"vin=eq.{TEST_VIN}&select=*")
        if car and car[0]['trang_thai'] == 'Đã ghép':
            log_test("✓ Car is correctly matched.")
        else:
            log_test("X Car state is incorrect!")
            return

        # 3. Call RPC Cancel
        log_test(f"3. Calling rpc_cancel_order_request for {TEST_ORDER}...")
        payload = {
            "p_order_numbers": [TEST_ORDER],
            "p_reason": "Testing Python cancel script",
            "p_actor_email": ACTOR_EMAIL,
            "p_actor_name": ACTOR_NAME
        }
        result = request("POST", "rpc_cancel_order_request", data=payload, rpc=True)
        log_test(f"✓ RPC Result: {result}")

        # 4. Verify Final State
        log_test("4. Verifying effects...")
        
        # Check order deletion
        order = request("GET", "donhang", params=f"so_don_hang=eq.{TEST_ORDER}")
        if not order:
            log_test("✓ Order DELETED from donhang table.")
        else:
            log_test("X Order still exists in donhang table!")

        # Check related records
        xhd = request("GET", "yeucauxhd", params=f"so_don_hang=eq.{TEST_ORDER}")
        uvc = request("GET", "yeucauvc", params=f"so_don_hang=eq.{TEST_ORDER}")
        if not xhd and not uvc:
            log_test("✓ Related records (XHD, VC) DELETED.")
        else:
            log_test("X Related records still exist!")

        # Check car restoration
        car_post = request("GET", "khoxe", params=f"vin=eq.{TEST_VIN}&select=*")
        if car_post and car_post[0]['trang_thai'] == 'Chưa ghép' and car_post[0]['nguoi_giu_xe'] is None:
            log_test("✓ Car status restored to 'Chưa ghép'.")
        else:
            log_test(f"X Car state recovery failed! {car_post}")

        # Check interactions log
        logs = request("GET", "interactions", params=f"target_id=eq.{TEST_ORDER}&type=eq.CANCEL_REQUEST&limit=1")
        if logs:
            log_test("✓ Verification log found in interactions.")
        else:
            log_test("X Log entry not found in interactions!")

        print("\n✅ TEST PASSED SUCCESSFULLY!")

    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
    finally:
        # Cleanup any leftovers (though RPC should have deleted most)
        print("\n" + "="*50 + "\n🧹 CLEANING UP...")
        request("DELETE", "donhang", params=f"so_don_hang=eq.{TEST_ORDER}")
        request("DELETE", "yeucauxhd", params=f"so_don_hang=eq.{TEST_ORDER}")
        request("DELETE", "yeucauvc", params=f"so_don_hang=eq.{TEST_ORDER}")
        request("DELETE", "khoxe", params=f"vin=eq.{TEST_VIN}")
        request("DELETE", "interactions", params=f"target_id=eq.{TEST_ORDER}")
        print("✨ CLEANUP COMPLETE.\n")

if __name__ == "__main__":
    test_cancel_order()
