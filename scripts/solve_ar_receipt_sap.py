# -*- coding: utf-8 -*-
import json
import os
import sys
import requests

def main():
    rec_id = "a05bd28c-a76a-f111-ab0c-6045bd5969af"
    rec_code = "N31923-TK-26-06-0253"
    print(f"=== TIẾN HÀNH XỬ LÝ PHIẾU THU: {rec_code} (ID: {rec_id}) ===")

    config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dms_dealers_config.json")
    with open(config_path, "r", encoding="utf-8") as f:
        dealers = json.load(f)

    dealer = next((d for d in dealers if d.get("dealer_code") == "N31923"), None)
    if not dealer or not dealer.get("cookie"):
        print("[!] Không tìm thấy cấu hình đại lý N31923")
        return

    headers = {
        "Cookie": dealer["cookie"],
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Prefer": 'odata.include-annotations="*"'
    }
    BASE_API_URL = "https://vinfastdms.crm5.dynamics.com/api/data/v9.2"

    # 1. WhoAmI
    r_who = requests.get(f"{BASE_API_URL}/WhoAmI", headers=headers, timeout=10)
    if r_who.status_code == 200:
        who = r_who.json()
        user_id = who.get("UserId")
        print(f"👤 Tài khoản hiện tại: UserId={user_id}, BusinessUnitId={who.get('BusinessUnitId')}")
    else:
        print(f"Lỗi WhoAmI: {r_who.status_code}")
        return

    # 2. Tìm kiếm General Journal liên kết với phiếu thu này
    print("\n🔍 Đang tìm bút toán General Journal liên kết...")
    for j_ent in ["xts_generaljournals", "xts_generalledgers", "itv_gljournals"]:
        try:
            r_j = requests.get(f"{BASE_API_URL}/{j_ent}?$filter=contains(xts_referencenumber,'{rec_code}') or contains(xts_description,'{rec_code}')&$top=5", headers=headers, timeout=10)
            if r_j.status_code == 200:
                vals = r_j.json().get("value", [])
                print(f"  • {j_ent}: {len(vals)} kết quả")
                for v in vals:
                    print(f"    -> ID: {v.get(j_ent[:-1] + 'id')}, Status: {v.get('xts_status')}, Handling: {v.get('xts_handling')}")
            else:
                print(f"  • {j_ent}: HTTP {r_j.status_code}")
        except Exception as e:
            print(f"  • {j_ent} lỗi: {e}")

    # 3. Thử cập nhật xts_handling hoặc gọi action gửi SAP
    print("\n🚀 [BƯỚC 1] Thử kích hoạt xử lý qua API DMS (xts_handling)...")
    # Thử handling = 2 (Release), handling = 3 (Submit to SAP / Post)
    for h_val in [2, 3]:
        print(f"  Thử cập nhật xts_handling = {h_val}...")
        r_patch = requests.patch(
            f"{BASE_API_URL}/xts_accountreceivablereceipts({rec_id})",
            headers=headers,
            json={"xts_handling": h_val},
            timeout=15
        )
        print(f"  -> Kết quả: HTTP {r_patch.status_code}")
        if r_patch.status_code in [200, 204]:
            print(f"  ✅ Thành công cập nhật xts_handling = {h_val}!")
            break
        else:
            try:
                err_data = r_patch.json()
                print(f"  ❌ Lỗi API: {err_data.get('error', {}).get('message', r_patch.text)}")
            except Exception:
                print(f"  ❌ Lỗi: {r_patch.text[:300]}")

    # 4. Kiểm tra lại dữ liệu phiếu thu sau khi xử lý
    print("\n📋 [BƯỚC 2] Kiểm tra lại trạng thái phiếu thu sau khi kích hoạt:")
    r_check = requests.get(f"{BASE_API_URL}/xts_accountreceivablereceipts({rec_id})", headers=headers, timeout=15)
    if r_check.status_code == 200:
        updated = r_check.json()
        print(f"  • xts_status: {updated.get('xts_status')} ({updated.get('xts_status@OData.Community.Display.V1.FormattedValue')})")
        print(f"  • xts_handling: {updated.get('xts_handling')} ({updated.get('xts_handling@OData.Community.Display.V1.FormattedValue')})")
        print(f"  • xvf_sapfidocumentno: {updated.get('xvf_sapfidocumentno')}")
        print(f"  • itv_transferpreordertosaplog: {updated.get('itv_transferpreordertosaplog')}")
    else:
        print(f"  Lỗi đọc lại: HTTP {r_check.status_code}")

if __name__ == "__main__":
    main()
