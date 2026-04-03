import requests
import json

# URL GAS Web App của bạn
GAS_URL = "https://script.google.com/macros/s/AKfycbwC_Xw8YcudogtxpPJztqjFdttcL4tgDaHIdgFWqGcnZ0M44oH6KVb-2r52OKPtLex0Fg/exec"

# Danh sách các Case cần test
test_cases = [
    {
        "name": "TEST XÓA: Hủy vĩnh viễn (is_waiting = False)",
        "payload": {
            "record": {
                "so_don_hang": "N31920-VSO-25-09-8899", # TÊN ĐƠN LẤY TỪ ẢNH CỦA BẠN
                "ten_khach_hang": "KHACH HANG TEST XOA",
                "ten_ban_hang": "Admin",
                "vin": "RLLVTESTXOA",
                "ghi_chu_huy": "Hủy vĩnh viễn không chờ xe"
            },
            "actionId": "order_self_cancelled",
            "is_waiting": False # FLAG QUYẾT ĐỊNH XÓA
        }
    }
]

def run_tests():
    print(f"--- Kiểm tra tính năng Tự động Xóa khi Hủy (@299) ---")
    for case in test_cases:
        print(f"\n[Test Case]: {case['name']}")
        params = {"action": "sendSupabaseEmail"}
        try:
            response = requests.post(GAS_URL, params=params, data=json.dumps(case['payload']))
            print(f"Status Code: {response.status_code}")
            res_json = response.json()
            if res_json.get("success") == True or res_json.get("status") == "SUCCESS":
                print(">>> KẾT QUẢ: THÀNH CÔNG (Đã kích hoạt email và lệnh xóa)")
            else:
                print(f">>> KẾT QUẢ: THẤT BẠI - {res_json.get('message')}")
        except Exception as e:
            print(f">>> LỖI: {str(e)}")

if __name__ == "__main__":
    run_tests()
