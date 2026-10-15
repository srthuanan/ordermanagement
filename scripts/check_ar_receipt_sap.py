# -*- coding: utf-8 -*-
import json
import os
import sys
import requests

def main():
    receipt_code = "N31923-TK-26-06-0253"
    print(f"=== KIỂM TRA PHIẾU THU: {receipt_code} ===")

    # 1. Load config
    config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dms_dealers_config.json")
    if not os.path.exists(config_path):
        print(f"Lỗi: Không tìm thấy file {config_path}")
        return

    with open(config_path, "r", encoding="utf-8") as f:
        dealers = json.load(f)

    # Ưu tiên dealer N31923
    dealer_n31923 = next((d for d in dealers if d.get("dealer_code") == "N31923"), None)
    dealers_to_try = [dealer_n31923] if dealer_n31923 else []
    for d in dealers:
        if d not in dealers_to_try:
            dealers_to_try.append(d)

    BASE_API_URL = "https://vinfastdms.crm5.dynamics.com/api/data/v9.2"

    rec = None
    active_headers = None
    active_dealer = None

    for d in dealers_to_try:
        if not d or not d.get("cookie"):
            continue
        headers = {
            "Cookie": d["cookie"],
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            "Prefer": 'odata.include-annotations="*"'
        }
        # Thử tìm receipt
        test_url = f"{BASE_API_URL}/xts_accountreceivablereceipts?$filter=xts_accountreceivablereceiptnumber eq '{receipt_code}'"
        try:
            r = requests.get(test_url, headers=headers, timeout=15)
            if r.status_code == 200:
                vals = r.json().get("value", [])
                if vals:
                    rec = vals[0]
                    active_headers = headers
                    active_dealer = d.get("dealer_code")
                    print(f"[OK] Tìm thấy phiếu thu bằng cookie đại lý: {active_dealer}")
                    break
                else:
                    # Thử query contains
                    test_url2 = f"{BASE_API_URL}/xts_accountreceivablereceipts?$filter=contains(xts_accountreceivablereceiptnumber,'0253')&$top=5"
                    r2 = requests.get(test_url2, headers=headers, timeout=15)
                    if r2.status_code == 200 and r2.json().get("value"):
                        for item in r2.json().get("value", []):
                            if receipt_code in item.get("xts_accountreceivablereceiptnumber", ""):
                                rec = item
                                active_headers = headers
                                active_dealer = d.get("dealer_code")
                                break
                        if rec:
                            print(f"[OK] Tìm thấy phiếu thu qua tìm kiếm phụ: {active_dealer}")
                            break
            elif r.status_code == 401:
                # Cookie hết hạn, thử đại lý khác
                continue
        except Exception as e:
            print(f"[Warn] Lỗi kết nối với đại lý {d.get('dealer_code')}: {e}")

    if not rec:
        print("[!] Không lấy được dữ liệu qua API (có thể cookie DMS của các đại lý đã hết hạn hoặc không tìm thấy phiếu thu).")
        # Thử tìm theo ID từ ảnh URL: a05bd28...
        print("Đang kiểm tra thêm các entity liên quan...")
        return

    rec_id = rec.get("xts_accountreceivablereceiptid")
    print(f"\n--- THÔNG TIN CHI TIẾT PHIẾU THU (ID: {rec_id}) ---")
    print(f"Số phiếu thu: {rec.get('xts_accountreceivablereceiptnumber')}")
    print(f"Trạng thái (xts_status): {rec.get('xts_status')} | Format: {rec.get('xts_status@OData.Community.Display.V1.FormattedValue')}")
    print(f"StateCode: {rec.get('statecode')} | StatusCode: {rec.get('statuscode')}")
    print(f"Hành động (xts_handling): {rec.get('xts_handling')} | Format: {rec.get('xts_handling@OData.Community.Display.V1.FormattedValue')}")
    print(f"Loại phiếu (xts_type): {rec.get('xts_type')} | Format: {rec.get('xts_type@OData.Community.Display.V1.FormattedValue')}")
    print(f"Khách hàng: {rec.get('_xts_customerid_value@OData.Community.Display.V1.FormattedValue')} ({rec.get('_xts_customerid_value')})")
    print(f"Đơn hàng xe: {rec.get('_itv_nvsalesorderid_value@OData.Community.Display.V1.FormattedValue')} ({rec.get('_itv_nvsalesorderid_value')})")
    print(f"Số tiền: {rec.get('xts_totalreceiptamount')} | Khả dụng: {rec.get('xts_availablebalance')}")

    print("\n--- CÁC TRƯỜNG LIÊN QUAN TỚI SAP / INTERFACE ---")
    sap_found = False
    for k, v in rec.items():
        kl = k.lower()
        if any(term in kl for term in ["sap", "interface", "fi_doc", "error", "message", "journal", "sent", "c-app", "capp", "status"]):
            formatted = rec.get(f"{k}@OData.Community.Display.V1.FormattedValue")
            fmt_str = f" ({formatted})" if formatted else ""
            print(f"  • {k}: {v}{fmt_str}")
            sap_found = True

    if not sap_found:
        print("  (Không có trường SAP đặc thù nào có dữ liệu)")

    # 2. Chi tiết phân bổ phiếu thu
    print("\n--- CHI TIẾT PHÂN BỔ (RECEIPT DETAILS) ---")
    det_url = f"{BASE_API_URL}/xts_accountreceivablereceiptdetails?$filter=_xts_accountreceivablereceiptid_value eq {rec_id}"
    try:
        r_det = requests.get(det_url, headers=active_headers, timeout=15)
        if r_det.status_code == 200:
            details = r_det.json().get("value", [])
            print(f"Tìm thấy {len(details)} dòng chi tiết phân bổ:")
            for idx, d in enumerate(details, 1):
                print(f"  [{idx}] ID: {d.get('xts_accountreceivablereceiptdetailid')}")
                for dk, dv in d.items():
                    dkl = dk.lower()
                    if any(term in dkl for term in ["amount", "balance", "invoice", "order", "status", "sap", "receipt"]):
                        dfmt = d.get(f"{dk}@OData.Community.Display.V1.FormattedValue")
                        dfmt_str = f" ({dfmt})" if dfmt else ""
                        print(f"      - {dk}: {dv}{dfmt_str}")
        else:
            print(f"Không lấy được chi tiết phân bổ: HTTP {r_det.status_code}")
    except Exception as ex:
        print(f"Lỗi lấy chi tiết phân bổ: {ex}")

    # 3. Kiểm tra System Jobs / Async Operations liên quan (xem có lỗi workflow/plugin gửi SAP không)
    print("\n--- SYSTEM JOBS / WORKFLOW ERRORS (ASYNC OPERATIONS) ---")
    async_url = f"{BASE_API_URL}/asyncoperations?$filter=regardingobjectid_value eq {rec_id}&$select=name,statuscode,statecode,message,friendlymessage,startedon,completedon&$orderby=completedon desc&$top=5"
    try:
        r_async = requests.get(async_url, headers=active_headers, timeout=15)
        if r_async.status_code == 200:
            jobs = r_async.json().get("value", [])
            if jobs:
                print(f"Tìm thấy {len(jobs)} System Jobs liên quan:")
                for j in jobs:
                    print(f"  • Job: {j.get('name')}")
                    print(f"    State: {j.get('statecode')} | Status: {j.get('statuscode')}")
                    print(f"    Bắt đầu: {j.get('startedon')} | Hoàn tất: {j.get('completedon')}")
                    if j.get('message') or j.get('friendlymessage'):
                        print(f"    Lỗi/Thông báo: {j.get('friendlymessage') or j.get('message')}")
            else:
                print("Không có System Job nào chạy riêng trên bản ghi này.")
        else:
            print(f"Không truy vấn được Async Operations: HTTP {r_async.status_code}")
    except Exception as ex:
        print(f"Lỗi lấy Async Operations: {ex}")

    # 4. Kiểm tra Sales Order đi kèm
    vso_id = rec.get("_itv_nvsalesorderid_value")
    if vso_id:
        print(f"\n--- ĐƠN HÀNG XE ĐI KÈM (VSO ID: {vso_id}) ---")
        vso_url = f"{BASE_API_URL}/xts_newvehiclesalesorders({vso_id})?$select=xts_newvehiclesalesordernumber,xts_status,xvf_sapinvoicenumber,xvf_sapinvoicedate,xts_salesdate,xts_netamount"
        try:
            r_vso = requests.get(vso_url, headers=active_headers, timeout=15)
            if r_vso.status_code == 200:
                vso = r_vso.json()
                print(f"Số VSO: {vso.get('xts_newvehiclesalesordernumber')}")
                print(f"Trạng thái VSO: {vso.get('xts_status')} | Format: {vso.get('xts_status@OData.Community.Display.V1.FormattedValue')}")
                print(f"SAP Invoice No: {vso.get('xvf_sapinvoicenumber')}")
                print(f"SAP Invoice Date: {vso.get('xvf_sapinvoicedate')}")
            else:
                print(f"HTTP {r_vso.status_code} khi đọc VSO")
        except Exception as ex:
            print(f"Lỗi đọc VSO: {ex}")

    print("\n=== HOÀN TẤT KIỂM TRA ===")

if __name__ == "__main__":
    main()
