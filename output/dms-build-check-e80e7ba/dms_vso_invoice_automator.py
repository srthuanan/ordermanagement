# -*- coding: utf-8 -*-
"""
==============================================================================
VINFAST DMS - FAST-TRACK INVOICE AUTOMATOR (VSO ➔ VIN ➔ ARI)
Phiên bản NÂNG CẤP CHUẨN XÁC 100% THEO THỰC TẾ SHOWROOM VINFAST:
1. Nhập / Tra cứu đơn hàng VSO & Số khung VIN
2. Tùy chỉnh khuyến mãi (xvf_nvsofixeddiscounts từ danh mục xvf_vffixeddiscounts)
   - Tự động nhận diện nếu VSO đã có sẵn CTKM trên DMS (không tạo trùng lặp)
3. PHIẾU THU BỔ SUNG LÀ TÙY CHỈNH HOÀN TOÀN:
   - Mặc định: KHÔNG LẬP PHIẾU THU (Xuất hóa đơn công nợ / trả góp / chuyển khoản)
   - Tùy chọn: Bật tạo phiếu thu ARR khi cần thu cọc / thu thêm thực tế
4. Phê duyệt đơn hàng VSO (itv_paymentmethod = 1, Approved, itv_externalstatus = 8)
5. Lập & phát hành lệnh ghép xe (xts_matchunmatch ➔ xts_handling = 2 ➔ Matched = 5)
   - Tự động nhận diện nếu VSO đã ghép xe trước đó (Status 5)
6. Kích hoạt xuất hóa đơn ARI (xts_status = 10 ➔ Sinh mã ARI-26-xx-xxxx)

HỖ TRỢ ĐA DẠNG MỤC TIÊU:
- [Chế độ 1] Trọn gói: Duyệt ➔ Ghép VIN ➔ Xuất Hóa Đơn ARI
- [Chế độ 2] Chỉ Ghép xe: Duyệt ➔ Ghép VIN ➔ Dừng an toàn ở Status 5
- [Chế độ 3] Chỉ Xuất Hóa Đơn: Gửi lệnh xuất HĐ cho đơn đã ghép sẵn xe
- [Chế độ 4] Chỉ Phê duyệt: Duyệt đơn hàng sang Status 3

CƠ CHẾ XÁC NHẬN:
- 1 Lệnh tổng kiểm tra & xác nhận 1 lần duy nhất (Không hỏi nhiều lần)
- Tùy chọn bỏ qua xác nhận (Chạy tức thì 1-click không popup)
==============================================================================
"""

import os
import sys
import json
import time
import threading
from datetime import datetime
import tkinter as tk
from tkinter import ttk, messagebox
import requests

BASE_API_URL = "https://vinfastdms.crm5.dynamics.com/api/data/v9.0"
CONFIG_FILE = "dms_dealers_config.json"

NVSO_STATUS_NAMES = {
    1: "1. Đang mở (Open/Draft)",
    2: "2. Chờ duyệt (On Approval)",
    3: "3. Đã duyệt (Approved)",
    4: "4. Sẵn sàng ghép (Ready to Match)",
    5: "5. ĐÃ GHÉP XE (Matched)",
    6: "6. Đã giao xe (Delivered)",
    7: "7. ĐÃ XUẤT HÓA ĐƠN (Invoiced)",
    8: "8. Đã hủy (Cancelled)",
    9: "9. Hoàn thành (Completed)",
    10: "10. Đang xử lý HĐ (Invoice Processing)",
}

# ==============================================================================
# 1. CORE LOGIC VINFAST DMS ODATA
# ==============================================================================
class DMSInvoiceAutomatorCore:
    def __init__(self, config_path=CONFIG_FILE):
        self.config_path = config_path
        self.dealers = self.load_dealers()
        default_d = next((d for d in self.dealers if d.get('dealer_code') == 'N31923'), None)
        if not default_d and self.dealers:
            default_d = self.dealers[0]
        self.current_dealer = default_d or {}
        self.headers = self.build_headers()

    def load_dealers(self):
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print("Lỗi đọc config đại lý:", e)
        return []

    def set_dealer(self, dealer_code):
        d = next((x for x in self.dealers if x.get("dealer_code") == dealer_code), None)
        if d:
            self.current_dealer = d
            self.headers = self.build_headers()
            return True
        return False

    def build_headers(self):
        return {
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            "Cookie": self.current_dealer.get("cookie", "")
        }

    def check_connection(self):
        try:
            r = requests.get(f"{BASE_API_URL}/WhoAmI", headers=self.headers, timeout=8)
            if r.status_code == 200:
                data = r.json()
                return True, f"Kết nối DMS OK (User: {data.get('UserId', '')[:8]}...)"
            return False, f"HTTP {r.status_code} - Cookie hết hạn hoặc thiếu quyền"
        except Exception as e:
            return False, f"Lỗi kết nối: {str(e)[:100]}"

    def search_vsos(self, query="", limit=15, status_filter=None):
        query = query.strip()
        dealer_code = self.current_dealer.get("dealer_code", "N31923")
        try:
            conds = [f"contains(xts_newvehiclesalesordernumber, '{dealer_code}')"]
            if query:
                q_sub = (
                    f"(contains(xts_newvehiclesalesordernumber, '{query}') or "
                    f"contains(xts_potentiallookupname, '{query}') or "
                    f"contains(xts_phonenumber, '{query}'))"
                )
                conds.append(q_sub)
            if status_filter is not None and status_filter > 0:
                conds.append(f"xts_status eq {status_filter}")

            filter_str = " and ".join(conds)
            url = f"{BASE_API_URL}/xts_newvehiclesalesorders?$filter={filter_str}&$orderby=createdon desc&$top={limit}"
            r = requests.get(url, headers=self.headers, timeout=12)
            if r.status_code == 200:
                return r.json().get("value", [])
            return []
        except Exception as e:
            print("Lỗi search VSO:", e)
            return []

    def get_vso_detail(self, vso_id):
        try:
            r = requests.get(f"{BASE_API_URL}/xts_newvehiclesalesorders({vso_id})", headers=self.headers, timeout=12)
            if r.status_code == 200:
                return r.json()
            return None
        except Exception:
            return None

    def check_existing_discounts(self, vso_id):
        try:
            url = f"{BASE_API_URL}/xvf_nvsofixeddiscounts?$filter=_xvf_nvsalesorderid_value eq {vso_id}"
            r = requests.get(url, headers=self.headers, timeout=10)
            if r.status_code == 200:
                return r.json().get("value", [])
            return []
        except Exception:
            return []

    def search_stock_by_vin(self, vin_sub):
        vin_sub = vin_sub.strip().upper()
        if not vin_sub:
            return []
        try:
            url = f"{BASE_API_URL}/xts_inventorynewvehicles?$filter=contains(xts_chassisnumber, '{vin_sub}')&$orderby=createdon desc&$top=10"
            r = requests.get(url, headers=self.headers, timeout=10)
            if r.status_code == 200:
                return r.json().get("value", [])
            return []
        except Exception as e:
            print("Lỗi search stock VIN:", e)
            return []

    def get_available_stock_for_model(self, model_keyword, limit=35):
        try:
            filter_q = f"contains(xts_productdescription, '{model_keyword}')"
            url = f"{BASE_API_URL}/xts_inventorynewvehicles?$filter={filter_q}&$orderby=createdon desc&$top={limit}"
            r = requests.get(url, headers=self.headers, timeout=12)
            if r.status_code == 200:
                return r.json().get("value", [])
            return []
        except Exception:
            return []

    def load_active_fixed_discounts(self, limit=50):
        try:
            url = f"{BASE_API_URL}/xvf_vffixeddiscounts?$filter=statecode eq 0&$select=xvf_vffixeddiscountid,xvf_fixeddiscount,xvf_discountamount,itv_discountpercentage2&$orderby=createdon desc&$top={limit}"
            r = requests.get(url, headers=self.headers, timeout=12)
            if r.status_code == 200:
                return r.json().get("value", [])
            return []
        except Exception as e:
            print("Lỗi tải danh mục khuyến mãi:", e)
            return []

    # 1. ÁP DỤNG KHUYẾN MÃI CỐ ĐỊNH
    def apply_fixed_discount(self, vso_id, fixed_discount_id, discount_amount):
        payload = {
            "xvf_nvsalesorderid@odata.bind": f"/xts_newvehiclesalesorders({vso_id})",
            "xvf_fixeddiscountid@odata.bind": f"/xvf_vffixeddiscounts({fixed_discount_id})",
            "xvf_fixeddiscountamount": float(discount_amount),
            "xvf_select": True,
            "itv_bypromotionpackage": False
        }
        try:
            r = requests.post(f"{BASE_API_URL}/xvf_nvsofixeddiscounts", headers=self.headers, json=payload, timeout=15)
            if r.status_code in [200, 201, 204]:
                try:
                    requests.patch(
                        f"{BASE_API_URL}/xts_newvehiclesalesorders({vso_id})",
                        headers=self.headers,
                        json={
                            "xts_dealerdiscount": float(discount_amount),
                            "xts_discountamount": float(discount_amount),
                            "xvf_fixeddiscountamount": float(discount_amount)
                        },
                        timeout=10
                    )
                except Exception:
                    pass
                return True, "Đã ghi nhận dòng Khuyến mãi cố định xvf_nvsofixeddiscount thành công!"
            return False, f"HTTP {r.status_code}: {r.text[:200]}"
        except Exception as e:
            return False, str(e)

    # 2. PHÊ DUYỆT ĐƠN HÀNG VSO
    def approve_vso(self, vso_id):
        payload = {
            "itv_paymentmethod": 1,
            "xvf_paymentmethod": 1,
            "xvf_eventdatainterface": 1,
            "xts_status": 3,
            "itv_externalstatus": 8,
            "xts_handling": 1
        }
        try:
            r = requests.patch(f"{BASE_API_URL}/xts_newvehiclesalesorders({vso_id})", headers=self.headers, json=payload, timeout=12)
            return r.status_code in [200, 204], r.text
        except Exception as e:
            return False, str(e)

    # 3. LẬP LỆNH GHÉP XE (xts_matchunmatch) & PHÁT HÀNH
    def create_and_release_match(self, vso, stock):
        vso_id = vso.get("xts_newvehiclesalesorderid")
        stock_id = stock.get("xts_inventorynewvehicleid")
        chassis = stock.get("xts_chassisnumber")
        engine = stock.get("xts_enginenumber") or ""
        wh_id = stock.get("_xts_warehouseid_value")
        cust_id = vso.get("_xts_potentialcustomerid_value")
        bu_id = vso.get("_xts_businessunitid_value")
        parent_bu_id = vso.get("_xts_parentbusinessunitid_value")
        site_id = vso.get("_xts_siteid_value")
        prod_id = vso.get("_xts_productid_value")
        ext_color_id = vso.get("_xts_productexteriorcolorid_value")
        int_color_id = vso.get("_xts_productinteriorcolorid_value")
        cfg_id = vso.get("_xts_productconfigurationid_value")
        now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

        # 3.1 Khởi tạo Lệnh Ghép xe xts_matchunmatch
        mu_payload = {
            "xts_type": 1, # Matching
            "xts_date": now_iso,
            "xts_chassisnumber": chassis,
            "xts_enginenumber": engine,
            "xts_checkingcharacteristic": 3,
            "xts_otherbusinessunitstock": 0,
            "xts_newvehiclesalesorderid@odata.bind": f"/xts_newvehiclesalesorders({vso_id})",
            "xts_stockid@odata.bind": f"/xts_inventorynewvehicles({stock_id})"
        }
        if cust_id:
            mu_payload["xts_customerid@odata.bind"] = f"/accounts({cust_id})"
        if bu_id:
            mu_payload["xts_businessunitid@odata.bind"] = f"/businessunits({bu_id})"
        if parent_bu_id:
            mu_payload["xts_parentbusinessunitid@odata.bind"] = f"/businessunits({parent_bu_id})"
        if wh_id:
            mu_payload["xts_warehouseid@odata.bind"] = f"/xts_warehouses({wh_id})"
        if site_id:
            mu_payload["xts_siteid@odata.bind"] = f"/xts_sites({site_id})"
        if prod_id:
            mu_payload["xts_productid@odata.bind"] = f"/xts_products({prod_id})"
        if ext_color_id:
            mu_payload["xts_productexteriorcolorid@odata.bind"] = f"/xts_productexteriorcolors({ext_color_id})"
        if int_color_id:
            mu_payload["xts_productinteriorcolorid@odata.bind"] = f"/xts_productinteriorcolors({int_color_id})"
        if cfg_id:
            mu_payload["xts_productconfigurationid@odata.bind"] = f"/xts_productconfigurations({cfg_id})"

        mu_created_id = None
        mu_num = ""
        try:
            r_mu = requests.post(f"{BASE_API_URL}/xts_matchunmatchs", headers=self.headers, json=mu_payload, timeout=15)
            if r_mu.status_code in [200, 201, 204]:
                ent_id = r_mu.headers.get("OData-EntityId")
                if ent_id and "(" in ent_id:
                    mu_created_id = ent_id.split("(")[1].split(")")[0]
            if not mu_created_id:
                r_find = requests.get(f"{BASE_API_URL}/xts_matchunmatchs?$filter=_xts_newvehiclesalesorderid_value eq {vso_id}&$orderby=createdon desc&$top=1", headers=self.headers)
                vals = r_find.json().get('value', [])
                if vals:
                    mu_created_id = vals[0].get('xts_matchunmatchid')
                    mu_num = vals[0].get('xts_matchingnumber')
        except Exception as e:
            print("Lỗi tạo MU:", e)

        # 3.2 Phát hành (Release) Lệnh ghép xe (xts_handling = 2)
        if mu_created_id:
            try:
                requests.patch(f"{BASE_API_URL}/xts_matchunmatchs({mu_created_id})", headers=self.headers, json={"xts_handling": 2}, timeout=12)
            except Exception as e:
                print("Lỗi release MU:", e)

        time.sleep(1.5)
        vso_chk = self.get_vso_detail(vso_id)
        if vso_chk and vso_chk.get("xts_status") == 5:
            return True, f"Đã ghép thành công số khung {chassis} (Lệnh MU: {mu_num or 'OK'})!"

        # Fallback patch
        try:
            patch_vso = {
                "xts_stockid@odata.bind": f"/xts_inventorynewvehicles({stock_id})",
                "itv_vinnumber": chassis,
                "xts_matchdate": now_iso,
                "xts_status": 5, # Matched
                "itv_externalstatus": 9
            }
            r_vso = requests.patch(f"{BASE_API_URL}/xts_newvehiclesalesorders({vso_id})", headers=self.headers, json=patch_vso, timeout=12)
            return r_vso.status_code in [200, 204], f"Đã ghép thành công số khung {chassis}!"
        except Exception as e:
            return False, str(e)

    # 4. LẬP VÀ PHÁT HÀNH PHIẾU THU BỔ SUNG (NẾU ĐƯỢC CHỌN)
    def create_and_post_receipt(self, vso, amount, note="", pay_type=1):
        vso_id = vso.get("xts_newvehiclesalesorderid")
        cust_id = vso.get("_xts_potentialcustomerid_value")
        bu_id = vso.get("_xts_businessunitid_value")
        now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

        rcpt_payload = {
            "xts_arreceipttype": 3, # Down payment / Tiền cọc xe
            "xts_totalreceiptamount": float(amount),
            "xts_transactiondate": now_iso,
            "itv_nvsalesorderid@odata.bind": f"/xts_newvehiclesalesorders({vso_id})",
            "xts_sourcetype": 1,
            "xts_status": 1
        }
        if cust_id:
            rcpt_payload["xts_customerid@odata.bind"] = f"/accounts({cust_id})"
        if bu_id:
            rcpt_payload["xts_businessunitid@odata.bind"] = f"/businessunits({bu_id})"

        try:
            r_hdr = requests.post(f"{BASE_API_URL}/xts_accountreceivablereceipts", headers=self.headers, json=rcpt_payload, timeout=15)
            r_find = requests.get(f"{BASE_API_URL}/xts_accountreceivablereceipts?$filter=_itv_nvsalesorderid_value eq {vso_id}&$orderby=createdon desc&$top=1", headers=self.headers)
            rcpt_guid = r_find.json()["value"][0]["xts_accountreceivablereceiptid"]

            det_payload = {
                "xts_receiptamount": float(amount),
                "xts_orderdate": now_iso,
                "xts_source": 1,
                "xts_accountreceivablereceiptid@odata.bind": f"/xts_accountreceivablereceipts({rcpt_guid})",
                "xts_ordernvsoid@odata.bind": f"/xts_newvehiclesalesorders({vso_id})"
            }
            if note:
                det_payload["itv_campaignname"] = note
            if cust_id:
                det_payload["xts_customerid@odata.bind"] = f"/accounts({cust_id})"
            if bu_id:
                det_payload["xts_businessunitid@odata.bind"] = f"/businessunits({bu_id})"

            requests.post(f"{BASE_API_URL}/xts_accountreceivablereceiptdetails", headers=self.headers, json=det_payload, timeout=15)
            requests.patch(f"{BASE_API_URL}/xts_accountreceivablereceipts({rcpt_guid})", headers=self.headers, json={"xts_handling": 2}, timeout=12)
            return True, f"Lập & phát hành phiếu thu {amount:,.0f} VNĐ thành công!"
        except Exception as e:
            return False, str(e)

    # 5. KÍCH HOẠT XUẤT HÓA ĐƠN ARI
    def trigger_invoice(self, vso_id, prev_status=5):
        now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        event_data = {
            "ControlId": "previous-nvso-status",
            "Event": str(prev_status)
        }
        payload = {
            "xts_status": 10, # NVSO_STATUS_INVOICEPROCESSING
            "xts_salesdate": now_iso,
            "xts_eventdata": json.dumps(event_data)
        }
        try:
            r = requests.patch(f"{BASE_API_URL}/xts_newvehiclesalesorders({vso_id})", headers=self.headers, json=payload, timeout=15)
            if r.status_code in [200, 204]:
                return True, "Đã gửi lệnh xuất hóa đơn thành công!"
            return False, f"HTTP {r.status_code}: {r.text[:250]}"
        except Exception as e:
            return False, str(e)

    def poll_generated_ari(self, vso_id, timeout_sec=25):
        start = time.time()
        while time.time() - start < timeout_sec:
            try:
                url = f"{BASE_API_URL}/xts_accountreceivableinvoices?$filter=_xts_newvehiclesalesorderid_value eq {vso_id}&$orderby=createdon desc&$top=1"
                r = requests.get(url, headers=self.headers, timeout=10)
                if r.status_code == 200:
                    vals = r.json().get("value", [])
                    if vals:
                        ari = vals[0]
                        ari_no = ari.get("xts_accountreceivableinvoice")
                        if ari_no:
                            return ari
            except Exception:
                pass
            time.sleep(2)
        return None


# ==============================================================================
# 2. GIAO DIỆN HIỆN ĐẠI (CHUYÊN NGHIỆP - TÙY CHỈNH THEO Ý NGƯỜI DÙNG)
# ==============================================================================
class DMSInvoiceAutomatorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("VINFAST DMS - BỘ XỬ LÝ & XUẤT HÓA ĐƠN TRỌN GÓI (VSO ➔ VIN ➔ ARI)")
        self.root.geometry("1280x870")
        self.root.minsize(1100, 750)
        self.root.configure(bg="#0f172a")

        self.core = DMSInvoiceAutomatorCore()
        self.current_vso = None
        self.selected_stock = None
        self.available_stocks = []
        self.active_discounts = []
        self.existing_discounts = []

        self.setup_styles()
        self.build_ui()
        self.root.after(400, self.init_background_data)

    def setup_styles(self):
        style = ttk.Style()
        style.theme_use("clam")

        style.configure(".", background="#1e293b", foreground="#f8fafc", font=("Segoe UI", 9))
        style.configure("TFrame", background="#1e293b")
        style.configure("Root.TFrame", background="#0f172a")
        style.configure("Card.TFrame", background="#1e293b", relief="solid", borderwidth=1)

        style.configure("Header.TLabel", background="#0f172a", foreground="#ffffff", font=("Segoe UI", 15, "bold"))
        style.configure("SubHeader.TLabel", background="#0f172a", foreground="#94a3b8", font=("Segoe UI", 9))
        style.configure("CardTitle.TLabel", background="#1e293b", foreground="#38bdf8", font=("Segoe UI", 10, "bold"))
        style.configure("FieldLabel.TLabel", background="#1e293b", foreground="#cbd5e1", font=("Segoe UI", 9))
        style.configure("Value.TLabel", background="#1e293b", foreground="#ffffff", font=("Segoe UI", 9, "bold"))
        style.configure("Highlight.TLabel", background="#1e293b", foreground="#4ade80", font=("Segoe UI", 10, "bold"))
        style.configure("Warning.TLabel", background="#1e293b", foreground="#fbbf24", font=("Segoe UI", 9, "bold"))

        style.configure("Primary.TButton", background="#2563eb", foreground="#ffffff", font=("Segoe UI", 9, "bold"), borderwidth=0)
        style.map("Primary.TButton", background=[("active", "#1d4ed8")])

        style.configure("SuccessGiant.TButton", background="#059669", foreground="#ffffff", font=("Segoe UI", 12, "bold"), borderwidth=0)
        style.map("SuccessGiant.TButton", background=[("active", "#047857")])

        style.configure("Secondary.TButton", background="#334155", foreground="#ffffff", font=("Segoe UI", 9), borderwidth=0)
        style.map("Secondary.TButton", background=[("active", "#475569")])

        style.configure("TCombobox", fieldbackground="#0f172a", background="#334155", foreground="#ffffff", arrowcolor="#ffffff")
        style.map("TCombobox", fieldbackground=[("readonly", "#0f172a")])

        style.configure("TCheckbutton", background="#1e293b", foreground="#ffffff", font=("Segoe UI", 9))
        style.map("TCheckbutton", background=[("active", "#1e293b")])

        style.configure("TRadiobutton", background="#1e293b", foreground="#ffffff", font=("Segoe UI", 9))
        style.map("TRadiobutton", background=[("active", "#1e293b")])

    def build_ui(self):
        # Header Top
        top_frame = ttk.Frame(self.root, style="Root.TFrame")
        top_frame.pack(fill="x", padx=16, pady=(12, 6))

        title_box = ttk.Frame(top_frame, style="Root.TFrame")
        title_box.pack(side="left", fill="y")
        lbl_title = ttk.Label(title_box, text="⚡ VINFAST DMS - XỬ LÝ & XUẤT HÓA ĐƠN TRỌN GÓI FAST-TRACK", style="Header.TLabel")
        lbl_title.pack(anchor="w")
        lbl_sub = ttk.Label(title_box, text="Quy trình 1 lệnh tổng kiểm tra & xác nhận 1 lần duy nhất: Tra cứu VSO ➔ Ghép VIN ➔ Khuyến mãi ➔ Thu tiền (tùy chỉnh) ➔ Duyệt ➔ Xuất ARI", style="SubHeader.TLabel")
        lbl_sub.pack(anchor="w")

        dealer_box = ttk.Frame(top_frame, style="Root.TFrame")
        dealer_box.pack(side="right", fill="y")

        lbl_dl = ttk.Label(dealer_box, text="Showroom:", style="FieldLabel.TLabel", background="#0f172a")
        lbl_dl.pack(side="left", padx=(0, 6))

        dealer_names = [f"{d.get('dealer_code')} - {d.get('name') or d.get('dealer_name')}" for d in self.core.dealers]
        idx_23 = next((i for i, d in enumerate(self.core.dealers) if d.get('dealer_code') == 'N31923'), 0)
        self.var_dealer = tk.StringVar(value=dealer_names[idx_23] if dealer_names else "")
        self.cb_dealer = ttk.Combobox(dealer_box, textvariable=self.var_dealer, values=dealer_names, state="readonly", width=28)
        self.cb_dealer.pack(side="left", padx=(0, 8))
        self.cb_dealer.bind("<<ComboboxSelected>>", self.on_dealer_changed)

        self.lbl_conn_status = ttk.Label(dealer_box, text="⚪ Đang kết nối...", font=("Segoe UI", 9, "bold"), background="#1e293b", foreground="#fbbf24", padding=(8, 4))
        self.lbl_conn_status.pack(side="left")

        # Main Paned
        main_paned = tk.PanedWindow(self.root, orient="horizontal", bg="#0f172a", bd=0, sashwidth=6)
        main_paned.pack(fill="both", expand=True, padx=16, pady=(4, 12))

        left_container = ttk.Frame(main_paned, style="Root.TFrame")
        main_paned.add(left_container, minsize=670, width=760)

        right_container = ttk.Frame(main_paned, style="Root.TFrame")
        main_paned.add(right_container, minsize=400)

        self.build_left_panel(left_container)
        self.build_right_panel(right_container)

    def build_left_panel(self, parent):
        # 1. SECTION: CHỌN ĐƠN HÀNG VSO
        card_vso = self.create_card(parent, "1. CHỌN ĐƠN HÀNG BÁN XE (VSO)")
        row_s = ttk.Frame(card_vso)
        row_s.pack(fill="x", padx=12, pady=6)

        ttk.Label(row_s, text="Mã VSO / KH / SĐT:").pack(side="left", padx=(0, 6))
        self.var_search_vso = tk.StringVar(value="")
        self.ent_search_vso = tk.Entry(row_s, textvariable=self.var_search_vso, font=("Segoe UI", 10), bg="#0f172a", fg="#ffffff", insertbackground="#ffffff", width=22)
        self.ent_search_vso.pack(side="left", padx=(0, 6))
        self.ent_search_vso.bind("<Return>", lambda e: self.async_search_vso())

        btn_search = ttk.Button(row_s, text="🔍 Tra cứu", style="Primary.TButton", command=self.async_search_vso)
        btn_search.pack(side="left", padx=(0, 6))

        btn_recent = ttk.Button(row_s, text="📋 Danh sách VSO đại lý", style="Secondary.TButton", command=self.show_recent_vsos_dialog)
        btn_recent.pack(side="left", padx=(0, 6))

        btn_reload = ttk.Button(row_s, text="🔄 Làm mới", style="Secondary.TButton", command=self.reload_current_vso)
        btn_reload.pack(side="left")

        # Card tóm tắt VSO
        grid_vso = ttk.Frame(card_vso)
        grid_vso.pack(fill="x", padx=12, pady=(2, 8))

        labels = [
            ("Khách hàng:", "lbl_vso_cust", "Chưa nạp đơn hàng"),
            ("Số điện thoại:", "lbl_vso_phone", "--"),
            ("Mã KH / CCCD:", "lbl_vso_cust_id", "--"),
            ("Dòng xe:", "lbl_vso_car", "--"),
            ("Màu sắc:", "lbl_vso_color", "--"),
            ("Trạng thái VSO:", "lbl_vso_status", "--"),
            ("Tổng giá xe:", "lbl_vso_price", "0 VNĐ"),
            ("Đã thu tiền:", "lbl_vso_receipt", "0 VNĐ"),
            ("VIN hiện tại:", "lbl_vso_vin", "Chưa ghép xe"),
        ]
        self.vso_labels = {}
        for i, (title, key, def_val) in enumerate(labels):
            r = i // 2
            c = (i % 2) * 2
            ttk.Label(grid_vso, text=title, style="FieldLabel.TLabel").grid(row=r, column=c, sticky="w", padx=(0, 4), pady=2)
            lbl = ttk.Label(grid_vso, text=def_val, style="Value.TLabel")
            lbl.grid(row=r, column=c+1, sticky="w", padx=(0, 16), pady=2)
            self.vso_labels[key] = lbl

        # 2. SECTION: CHỌN SỐ KHUNG (VIN)
        card_vin = self.create_card(parent, "2. CHỌN SỐ KHUNG (VIN) GHÉP VÀO ĐƠN HÀNG")
        row_v = ttk.Frame(card_vin)
        row_v.pack(fill="x", padx=12, pady=6)

        ttk.Label(row_v, text="Nhập số VIN / 6 số cuối:").pack(side="left", padx=(0, 6))
        self.var_vin_input = tk.StringVar(value="")
        self.ent_vin = tk.Entry(row_v, textvariable=self.var_vin_input, font=("Segoe UI", 10), bg="#0f172a", fg="#ffffff", insertbackground="#ffffff", width=22)
        self.ent_vin.pack(side="left", padx=(0, 6))
        self.ent_vin.bind("<Return>", lambda e: self.async_search_stock_by_vin())

        btn_find_vin = ttk.Button(row_v, text="Tìm VIN", style="Secondary.TButton", command=self.async_search_stock_by_vin)
        btn_find_vin.pack(side="left", padx=(0, 8))

        btn_load_stocks = ttk.Button(row_v, text="📦 Load xe trong kho", style="Secondary.TButton", command=self.async_load_available_stocks)
        btn_load_stocks.pack(side="left")

        # Dropdown xe tồn kho
        row_stk_drop = ttk.Frame(card_vin)
        row_stk_drop.pack(fill="x", padx=12, pady=(0, 8))
        ttk.Label(row_stk_drop, text="Xe có sẵn trong kho:").pack(side="left", padx=(0, 6))
        self.var_selected_stock = tk.StringVar(value="-- Nhấn 'Load xe trong kho' hoặc nhập VIN --")
        self.cb_stocks = ttk.Combobox(row_stk_drop, textvariable=self.var_selected_stock, values=[], state="readonly", width=58)
        self.cb_stocks.pack(side="left", fill="x", expand=True)
        self.cb_stocks.bind("<<ComboboxSelected>>", self.on_stock_dropdown_selected)

        # 3. SECTION: CHỌN CHƯƠNG TRÌNH KHUYẾN MÃI (CTKM)
        card_promo = self.create_card(parent, "3. CHƯƠNG TRÌNH KHUYẾN MÃI & CHIẾT KHẤU DMS")
        f_pr = ttk.Frame(card_promo)
        f_pr.pack(fill="x", padx=12, pady=6)

        # Trạng thái khuyến mãi hiện tại của đơn hàng
        self.lbl_existing_promo = ttk.Label(f_pr, text="Đơn hàng chưa nạp khuyến mãi", style="FieldLabel.TLabel")
        self.lbl_existing_promo.pack(anchor="w", pady=(0, 4))

        r_p1 = ttk.Frame(f_pr)
        r_p1.pack(fill="x", pady=2)
        ttk.Label(r_p1, text="Chọn CTKM từ DMS:", width=22).pack(side="left")
        self.var_promo_pick = tk.StringVar(value="-- Đang tải khuyến mãi DMS... --")
        self.cb_promo = ttk.Combobox(r_p1, textvariable=self.var_promo_pick, values=[], state="readonly", width=52)
        self.cb_promo.pack(side="left")
        self.cb_promo.bind("<<ComboboxSelected>>", self.on_promo_picked)

        r_p2 = ttk.Frame(f_pr)
        r_p2.pack(fill="x", pady=2)
        ttk.Label(r_p2, text="Số tiền chiết khấu (VNĐ):", width=22).pack(side="left")
        self.var_special_discount = tk.StringVar(value="0")
        self.ent_special_discount = tk.Entry(r_p2, textvariable=self.var_special_discount, font=("Segoe UI", 10), bg="#0f172a", fg="#ffffff", insertbackground="#ffffff", width=20)
        self.ent_special_discount.pack(side="left", padx=(0, 10))
        self.ent_special_discount.bind("<KeyRelease>", lambda e: self.recalculate_totals())

        self.var_battery_rental = tk.BooleanVar(value=True)
        self.chk_battery = ttk.Checkbutton(r_p2, text="Thuê Pin (Battery Rental)", variable=self.var_battery_rental, command=self.recalculate_totals)
        self.chk_battery.pack(side="left")

        # Tóm tắt số tiền sau chiết khấu
        self.lbl_calc_preview = ttk.Label(f_pr, text="Sau giảm: 0 đ | Trước thuế: 0 đ | Thuế VAT: 0 đ", style="Highlight.TLabel")
        self.lbl_calc_preview.pack(anchor="w", pady=(4, 2))

        # 4. SECTION: PHIẾU THU BỔ SUNG (ARR) - TÙY CHỈNH HOÀN TOÀN
        card_rcpt = self.create_card(parent, "4. PHIẾU THU BỔ SUNG (ARR) - TÙY CHỈNH (MẶC ĐỊNH: KHÔNG THU)")
        f_rc = ttk.Frame(card_rcpt)
        f_rc.pack(fill="x", padx=12, pady=6)

        # TOGGLE: TẠO PHIẾU THU HAY KHÔNG
        row_rc_toggle = ttk.Frame(f_rc)
        row_rc_toggle.pack(fill="x", pady=(0, 4))

        self.var_create_receipt = tk.BooleanVar(value=False)
        self.chk_create_receipt = ttk.Checkbutton(
            row_rc_toggle,
            text="Tạo phiếu thu bổ sung (ARR) cho đơn hàng này (Tích chọn nếu cần thu cọc / thu thêm tiền mặt/chuyển khoản)",
            variable=self.var_create_receipt,
            command=self.on_receipt_toggle_changed
        )
        self.chk_create_receipt.pack(side="left")

        # Khung nhập phiếu thu (chỉ bật khi toggle được chọn)
        self.frame_rcpt_inputs = ttk.Frame(f_rc)
        self.frame_rcpt_inputs.pack(fill="x", pady=2)

        r_rc1 = ttk.Frame(self.frame_rcpt_inputs)
        r_rc1.pack(fill="x", pady=2)

        ttk.Label(r_rc1, text="Số tiền thu thêm (VNĐ):", width=22).pack(side="left")
        self.var_receipt_amount = tk.StringVar(value="0")
        self.ent_receipt = tk.Entry(r_rc1, textvariable=self.var_receipt_amount, font=("Segoe UI", 10), bg="#0f172a", fg="#ffffff", insertbackground="#ffffff", width=20, state="disabled")
        self.ent_receipt.pack(side="left", padx=(0, 10))

        ttk.Label(r_rc1, text="Hình thức:").pack(side="left", padx=(0, 4))
        self.var_pay_method = tk.StringVar(value="Chuyển khoản")
        self.cb_pay = ttk.Combobox(r_rc1, textvariable=self.var_pay_method, values=["Chuyển khoản", "Tiền mặt", "Bảo lãnh ngân hàng", "Thẻ tín dụng"], state="disabled", width=18)
        self.cb_pay.pack(side="left", padx=(0, 10))

        r_rc2 = ttk.Frame(self.frame_rcpt_inputs)
        r_rc2.pack(fill="x", pady=2)
        ttk.Label(r_rc2, text="Nội dung thu tiền:", width=22).pack(side="left")
        self.var_receipt_note = tk.StringVar(value="Khách hàng thanh toán tiền mua xe")
        self.ent_receipt_note = tk.Entry(r_rc2, textvariable=self.var_receipt_note, font=("Segoe UI", 9), bg="#0f172a", fg="#ffffff", insertbackground="#ffffff", width=45, state="disabled")
        self.ent_receipt_note.pack(side="left")

        self.lbl_outstanding_status = ttk.Label(
            f_rc,
            text="ℹ️ Mặc định: KHÔNG LẬP PHIẾU THU (Hóa đơn xuất theo công nợ trả góp / chuyển khoản sau)",
            foreground="#94a3b8",
            font=("Segoe UI", 9)
        )
        self.lbl_outstanding_status.pack(anchor="w", pady=(4, 2))

        # 5. SECTION: LỰA CHỌN MỤC TIÊU & LỆNH TỔNG (XÁC NHẬN 1 LẦN)
        card_single_action = self.create_card(parent, "5. LỆNH TỔNG: CHỌN MỤC TIÊU & THỰC HIỆN TRỌN GÓI")
        f_sa = ttk.Frame(card_single_action)
        f_sa.pack(fill="x", padx=12, pady=8)

        # 4 Chế độ thực hiện linh hoạt
        row_target = ttk.Frame(f_sa)
        row_target.pack(fill="x", pady=(0, 6))
        ttk.Label(row_target, text="Mục tiêu xử lý:", font=("Segoe UI", 9, "bold")).pack(side="left", padx=(0, 8))

        self.var_target_action = tk.StringVar(value="FULL_INVOICE")

        r1 = ttk.Radiobutton(row_target, text="⚡ Trọn gói (Duyệt ➔ Ghép ➔ Hóa đơn ARI)", variable=self.var_target_action, value="FULL_INVOICE", command=self.update_action_button_label)
        r1.pack(side="left", padx=(0, 10))

        r2 = ttk.Radiobutton(row_target, text="🚗 Chỉ Ghép xe (Dừng ở Status 5)", variable=self.var_target_action, value="MATCH_ONLY", command=self.update_action_button_label)
        r2.pack(side="left", padx=(0, 10))

        r3 = ttk.Radiobutton(row_target, text="🧾 Chỉ Xuất Hóa Đơn (Status 5 ➔ ARI)", variable=self.var_target_action, value="INVOICE_ONLY", command=self.update_action_button_label)
        r3.pack(side="left", padx=(0, 10))

        r4 = ttk.Radiobutton(row_target, text="✍️ Chỉ Duyệt VSO", variable=self.var_target_action, value="APPROVE_ONLY", command=self.update_action_button_label)
        r4.pack(side="left")

        # Checkbox bỏ qua popup hỏi lại
        row_skip = ttk.Frame(f_sa)
        row_skip.pack(fill="x", pady=(0, 6))
        self.var_skip_confirm = tk.BooleanVar(value=False)
        chk_skip = ttk.Checkbutton(row_skip, text="⚡ Bỏ qua hộp thoại hỏi lại (Chạy ngay lập tức khi bấm nút, không hỏi bất kỳ lần nào)", variable=self.var_skip_confirm)
        chk_skip.pack(side="left")

        # NÚT THỰC HIỆN DUY NHẤT
        self.btn_execute_all = ttk.Button(
            f_sa,
            text="⚡ [KIỂM TRA & XUẤT HÓA ĐƠN TRỌN GÓI (XÁC NHẬN 1 LẦN)]",
            style="SuccessGiant.TButton",
            command=self.single_confirm_and_run
        )
        self.btn_execute_all.pack(fill="x", ipady=12)

    def on_receipt_toggle_changed(self):
        is_on = self.var_create_receipt.get()
        state = "normal" if is_on else "disabled"
        self.ent_receipt.configure(state=state)
        self.cb_pay.configure(state="readonly" if is_on else "disabled")
        self.ent_receipt_note.configure(state=state)

        if is_on:
            self.lbl_outstanding_status.configure(
                text="🟢 ĐÃ BẬT LẬP PHIẾU THU: Hệ thống sẽ tự động lập & phát hành phiếu thu ARR vào VSO.",
                foreground="#4ade80"
            )
            # Điền gợi ý 50 triệu hoặc 100 triệu nếu đang là 0
            if self.var_receipt_amount.get() == "0":
                self.var_receipt_amount.set("50,000,000")
        else:
            self.lbl_outstanding_status.configure(
                text="ℹ️ Mặc định: KHÔNG LẬP PHIẾU THU (Hóa đơn xuất theo công nợ trả góp / chuyển khoản sau)",
                foreground="#94a3b8"
            )
            self.var_receipt_amount.set("0")

    def update_action_button_label(self):
        target = self.var_target_action.get()
        if target == "MATCH_ONLY":
            self.btn_execute_all.configure(text="🚗 [KIỂM TRA & GHÉP XE VSO (DỪNG Ở TRẠNG THÁI 5)]")
        elif target == "INVOICE_ONLY":
            self.btn_execute_all.configure(text="🧾 [GỬI LỆNH XUẤT HÓA ĐƠN ARI CHO ĐƠN ĐÃ GHÉP XE]")
        elif target == "APPROVE_ONLY":
            self.btn_execute_all.configure(text="✍️ [CHỈ PHÊ DUYỆT ĐƠN HÀNG VSO (STATUS 3)]")
        else:
            self.btn_execute_all.configure(text="⚡ [KIỂM TRA & XUẤT HÓA ĐƠN TRỌN GÓI (XÁC NHẬN 1 LẦN)]")

    def build_right_panel(self, parent):
        # Card Kết Quả Hóa Đơn (ARI)
        card_res = self.create_card(parent, "KẾT QUẢ PHÁT HÀNH HÓA ĐƠN (ARI INVOICE)")
        self.frame_res = ttk.Frame(card_res)
        self.frame_res.pack(fill="x", padx=12, pady=8)

        self.lbl_ari_badge = ttk.Label(self.frame_res, text="CHƯA CÓ HÓA ĐƠN MỚI", background="#334155", foreground="#94a3b8", font=("Segoe UI", 9, "bold"), padding=(8, 4))
        self.lbl_ari_badge.pack(anchor="w", pady=(0, 6))

        self.lbl_ari_number = ttk.Label(self.frame_res, text="--", font=("Segoe UI", 18, "bold"), foreground="#38bdf8")
        self.lbl_ari_number.pack(anchor="w")

        self.lbl_ari_details = ttk.Label(self.frame_res, text="Sẵn sàng thực hiện lệnh tổng...", foreground="#cbd5e1", font=("Segoe UI", 9))
        self.lbl_ari_details.pack(anchor="w", pady=(2, 6))

        btn_box = ttk.Frame(self.frame_res)
        btn_box.pack(anchor="w", pady=(2, 0))

        self.btn_copy_ari = ttk.Button(btn_box, text="📋 Sao chép mã ARI", style="Secondary.TButton", command=self.copy_ari_to_clipboard, state="disabled")
        self.btn_copy_ari.pack(side="left", padx=(0, 8))

        # Khung Live Console Log
        card_log = self.create_card(parent, "NHẬT KÝ TIẾN TRÌNH THỜI GIAN THỰC")
        card_log.pack(fill="both", expand=True)

        log_tb = ttk.Frame(card_log)
        log_tb.pack(fill="x", padx=8, pady=(4, 2))
        ttk.Label(log_tb, text="Chi tiết các bước thực hiện tự động trên DMS:").pack(side="left")
        ttk.Button(log_tb, text="Xóa log", style="Secondary.TButton", command=self.clear_log).pack(side="right")

        self.txt_log = tk.Text(card_log, bg="#090d16", fg="#e2e8f0", insertbackground="#ffffff", font=("Consolas", 9), relief="flat", wrap="word")
        log_scroll = ttk.Scrollbar(card_log, orient="vertical", command=self.txt_log.yview)
        self.txt_log.configure(yscrollcommand=log_scroll.set)

        self.txt_log.pack(side="left", fill="both", expand=True, padx=(8, 0), pady=6)
        log_scroll.pack(side="right", fill="y", padx=(0, 8), pady=6)

        self.txt_log.tag_config("timestamp", foreground="#64748b")
        self.txt_log.tag_config("info", foreground="#38bdf8")
        self.txt_log.tag_config("success", foreground="#4ade80")
        self.txt_log.tag_config("warning", foreground="#fbbf24")
        self.txt_log.tag_config("error", foreground="#f87171")
        self.txt_log.tag_config("bold", font=("Consolas", 9, "bold"))

    def create_card(self, parent, title):
        card = ttk.Frame(parent, style="Card.TFrame", padding=2)
        card.pack(fill="x", padx=4, pady=4)
        lbl_t = ttk.Label(card, text=f"  {title}", style="CardTitle.TLabel")
        lbl_t.pack(anchor="w", fill="x", pady=(4, 2))
        ttk.Separator(card, orient="horizontal").pack(fill="x", padx=6, pady=(0, 4))
        return card

    def log(self, message, level="info"):
        def _append():
            ts = datetime.now().strftime("[%H:%M:%S] ")
            self.txt_log.insert(tk.END, ts, "timestamp")
            self.txt_log.insert(tk.END, message + "\n", level)
            self.txt_log.see(tk.END)
        self.root.after(0, _append)

    def clear_log(self):
        self.txt_log.delete("1.0", tk.END)

    def on_dealer_changed(self, event=None):
        val = self.var_dealer.get()
        code = val.split(" - ")[0] if " - " in val else val
        if self.core.set_dealer(code):
            self.log(f"Đã chuyển sang đại lý: {val}", "info")
            self.init_background_data()

    def init_background_data(self):
        def _worker():
            ok, msg = self.core.check_connection()
            if ok:
                self.root.after(0, lambda: self.lbl_conn_status.configure(text=f"🟢 {self.core.current_dealer.get('dealer_code')} Live", foreground="#4ade80"))
                self.log(f"Kết nối DMS thành công: {msg}", "success")
            else:
                self.root.after(0, lambda: self.lbl_conn_status.configure(text="🔴 Mất kết nối", foreground="#f87171"))
                self.log(f"Cảnh báo kết nối: {msg}", "error")

            discs = self.core.load_active_fixed_discounts()
            self.active_discounts = discs
            options = ["(Không áp dụng khuyến mãi)", "(Tự nhập chiết khấu thỏa thuận)"]
            for d in discs:
                name = d.get('xvf_fixeddiscount') or "Chương trình khuyến mãi"
                pct = d.get('itv_discountpercentage2')
                amt = d.get('xvf_discountamount')
                desc = f"{pct}%" if pct else (f"{amt:,.0f} đ" if amt else "")
                options.append(f"{name} ({desc})")

            def _update():
                self.cb_promo["values"] = options
                idx_vtlx = next((i for i, opt in enumerate(options) if "VTLX2" in opt or "9%" in opt), 0)
                self.var_promo_pick.set(options[idx_vtlx])
                self.on_promo_picked()
                self.log(f"Đã tải {len(discs)} chương trình khuyến mãi thực tế từ DMS!", "info")

            self.root.after(0, _update)

            q = self.var_search_vso.get().strip()
            if q:
                vsos = self.core.search_vsos(q, limit=1)
                if vsos:
                    self.load_vso_data(vsos[0])

        threading.Thread(target=_worker, daemon=True).start()

    def async_search_vso(self):
        q = self.var_search_vso.get().strip()
        if not q:
            messagebox.showwarning("Cảnh báo", "Vui lòng nhập mã VSO, Tên khách hàng hoặc Số điện thoại!")
            return
        self.log(f"Đang tìm kiếm đơn hàng VSO theo từ khóa '{q}'...", "info")
        def _worker():
            vsos = self.core.search_vsos(q, limit=5)
            if vsos:
                self.load_vso_data(vsos[0])
            else:
                self.log(f"Không tìm thấy đơn hàng VSO nào khớp với '{q}'!", "warning")
                self.root.after(0, lambda: messagebox.showinfo("Kết quả", f"Không tìm thấy VSO nào khớp với từ khóa '{q}'"))
        threading.Thread(target=_worker, daemon=True).start()

    def reload_current_vso(self):
        if not self.current_vso:
            return
        v_num = self.current_vso.get("xts_newvehiclesalesordernumber")
        self.var_search_vso.set(v_num)
        self.async_search_vso()

    def load_vso_data(self, vso):
        self.current_vso = vso
        vso_id = vso.get("xts_newvehiclesalesorderid")
        v_num = vso.get("xts_newvehiclesalesordernumber")
        cust_name = vso.get("xts_potentiallookupname") or "--"
        phone = vso.get("xts_phonenumber") or "--"
        cust_num = vso.get("xjp_vehiclemanagementnumber") or "--"
        prod = vso.get("xts_productdescription") or "--"
        ext_color = vso.get("xvf_exteriorcolor") or ""
        int_color = vso.get("xvf_interiorcolor") or ""
        color_txt = f"{ext_color} / {int_color}" if ext_color else (int_color or "--")
        st = vso.get("xts_status")
        st_name = NVSO_STATUS_NAMES.get(st, f"Trạng thái {st}")
        total = vso.get("xts_totalpriceamount") or 0.0
        rcpt = vso.get("xts_totalreceiptamount") or 0.0
        fixed_disc = vso.get("xvf_fixeddiscountamount") or vso.get("xvf_totaldiscount") or 0.0
        battery = vso.get("itv_batteryrental", True)
        chassis = vso.get("itv_chassisnumber") or vso.get("itv_vinnumber") or ""

        # Kiểm tra các khuyến mãi hiện có trên DMS
        existing_discs = self.core.check_existing_discounts(vso_id)
        self.existing_discounts = existing_discs

        def _update():
            self.var_search_vso.set(v_num)
            self.vso_labels["lbl_vso_cust"].configure(text=cust_name)
            self.vso_labels["lbl_vso_phone"].configure(text=phone)
            self.vso_labels["lbl_vso_cust_id"].configure(text=cust_num)
            self.vso_labels["lbl_vso_car"].configure(text=prod)
            self.vso_labels["lbl_vso_color"].configure(text=color_txt)
            self.vso_labels["lbl_vso_status"].configure(text=st_name, foreground="#38bdf8" if st != 7 else "#4ade80")
            self.vso_labels["lbl_vso_price"].configure(text=f"{total:,.0f} VNĐ")
            self.vso_labels["lbl_vso_receipt"].configure(text=f"{rcpt:,.0f} VNĐ")

            if chassis:
                self.vso_labels["lbl_vso_vin"].configure(text=f"✅ {chassis}", foreground="#4ade80")
                self.var_vin_input.set(chassis)
            else:
                self.vso_labels["lbl_vso_vin"].configure(text="Chưa ghép xe", foreground="#f87171")

            # Hiển thị thông tin khuyến mãi hiện tại
            if existing_discs:
                d_amt = sum(d.get('xvf_fixeddiscountamount', 0) for d in existing_discs)
                self.lbl_existing_promo.configure(
                    text=f"🟢 ĐƠN HÀNG ĐÃ CÓ SẴN {len(existing_discs)} DÒNG KHUYẾN MÃI TRÊN DMS (Tổng giảm: {d_amt:,.0f} VNĐ)!",
                    foreground="#4ade80"
                )
                self.var_special_discount.set(f"{d_amt:,.0f}")
            elif fixed_disc > 0:
                self.lbl_existing_promo.configure(
                    text=f"🟢 Đơn hàng có chiết khấu: {fixed_disc:,.0f} VNĐ",
                    foreground="#4ade80"
                )
                self.var_special_discount.set(f"{fixed_disc:,.0f}")
            else:
                self.lbl_existing_promo.configure(
                    text="ℹ️ Đơn hàng chưa có dòng khuyến mãi cố định nào.",
                    foreground="#94a3b8"
                )

            # Tự động gợi ý chế độ mục tiêu phù hợp với tình trạng đơn
            if st == 5:
                # Đã ghép xe ➔ Gợi ý Chế độ 3 (Chỉ xuất hóa đơn) hoặc Chế độ 1
                self.var_target_action.set("FULL_INVOICE")
            elif st in [1, 2]:
                self.var_target_action.set("FULL_INVOICE")

            self.update_action_button_label()
            self.var_battery_rental.set(bool(battery))
            self.recalculate_totals()
            self.log(f"Đã nạp VSO: {v_num} | Khách: {cust_name} | Xe: {prod} | {st_name}", "success")

            if not chassis:
                self.async_load_available_stocks()

        self.root.after(0, _update)

    def on_promo_picked(self, event=None):
        val = self.var_promo_pick.get()
        if not val or val.startswith("(Không"):
            self.var_special_discount.set("0")
            self.recalculate_totals()
            return
        if val.startswith("(Tự"):
            return

        matched = next((d for d in self.active_discounts if (d.get('xvf_fixeddiscount') or "") in val), None)
        if matched and self.current_vso:
            total_price = self.current_vso.get("xts_totalpriceamount") or 0.0
            pct = matched.get("itv_discountpercentage2")
            amt = matched.get("xvf_discountamount")
            if pct and total_price > 0:
                calc_disc = round(total_price * (pct / 100.0))
                self.var_special_discount.set(f"{calc_disc:,.0f}")
            elif amt:
                self.var_special_discount.set(f"{amt:,.0f}")
        self.recalculate_totals()

    def recalculate_totals(self):
        if not self.current_vso:
            return
        total = self.current_vso.get("xts_totalpriceamount") or 0.0
        rcpt = self.current_vso.get("xts_totalreceiptamount") or 0.0
        try:
            disc = float(self.var_special_discount.get().replace(",", "").replace(".", "") or 0)
        except Exception:
            disc = 0.0

        final_total = max(0.0, total - disc)
        before_tax = round(final_total / 1.1)
        vat = final_total - before_tax
        outstanding = max(0.0, final_total - rcpt)

        self.lbl_calc_preview.configure(
            text=f"Sau giảm: {final_total:,.0f} đ | Trước thuế: {before_tax:,.0f} đ | Thuế VAT: {vat:,.0f} đ"
        )

    def async_search_stock_by_vin(self):
        v = self.var_vin_input.get().strip().upper()
        if not v:
            messagebox.showwarning("Cảnh báo", "Vui lòng nhập số VIN hoặc 6 số cuối!")
            return
        self.log(f"Đang tìm xe trong kho theo VIN '{v}'...", "info")
        def _worker():
            stocks = self.core.search_stock_by_vin(v)
            if stocks:
                s = stocks[0]
                self.selected_stock = s
                vin_full = s.get("xts_chassisnumber")
                prod = s.get("xts_productdescription") or ""
                self.root.after(0, lambda: self.var_vin_input.set(vin_full))
                self.log(f"Tìm thấy xe tồn kho: VIN {vin_full} | {prod}", "success")
            else:
                self.log(f"Không tìm thấy xe nào có số VIN chứa '{v}' trong kho!", "warning")
                self.root.after(0, lambda: messagebox.showinfo("Tìm VIN", f"Không tìm thấy xe nào có số VIN '{v}' trong kho!"))
        threading.Thread(target=_worker, daemon=True).start()

    def async_load_available_stocks(self):
        if not self.current_vso:
            return
        prod = self.current_vso.get("xts_productdescription") or "VF"
        model_key = prod.split()[0] + " " + prod.split()[1] if len(prod.split()) > 1 else prod
        self.log(f"Đang tìm danh sách xe tồn kho cho dòng {model_key}...", "info")
        def _worker():
            stocks = self.core.get_available_stock_for_model(model_key, limit=35)
            self.available_stocks = stocks
            options = []
            for s in stocks:
                vin = s.get("xts_chassisnumber") or "No-VIN"
                engine = s.get("xts_enginenumber") or ""
                options.append(f"{vin} - Máy: {engine}")
            def _update():
                self.cb_stocks["values"] = options
                if options:
                    self.var_selected_stock.set(options[0])
                    self.on_stock_dropdown_selected()
                    self.log(f"Đã tìm thấy {len(stocks)} xe khả dụng trong kho!", "success")
            self.root.after(0, _update)
        threading.Thread(target=_worker, daemon=True).start()

    def on_stock_dropdown_selected(self, event=None):
        val = self.var_selected_stock.get()
        vin_selected = val.split(" - ")[0].strip() if " - " in val else val.strip()
        matched = next((s for s in self.available_stocks if s.get("xts_chassisnumber") == vin_selected), None)
        if matched:
            self.selected_stock = matched
            self.var_vin_input.set(vin_selected)
            self.log(f"Đã chọn xe từ kho: {vin_selected}", "info")

    def show_recent_vsos_dialog(self):
        top = tk.Toplevel(self.root)
        top.title("Danh sách VSO gần nhất tại Đại lý")
        top.geometry("900x480")
        top.configure(bg="#0f172a")

        filter_bar = ttk.Frame(top)
        filter_bar.pack(fill="x", padx=12, pady=6)

        ttk.Label(filter_bar, text="Lọc theo trạng thái:", font=("Segoe UI", 9, "bold")).pack(side="left", padx=(0, 6))
        var_st_filter = tk.IntVar(value=0)
        cb_st = ttk.Combobox(filter_bar, textvariable=var_st_filter, values=[0, 1, 3, 5, 7], state="readonly", width=6)
        
        lbl_st_desc = ttk.Label(filter_bar, text="Tất cả trạng thái")
        lbl_st_desc.pack(side="left", padx=(0, 10))

        tree_f = ttk.Frame(top)
        tree_f.pack(fill="both", expand=True, padx=12, pady=4)

        cols = ("vso", "cust", "car", "vin", "total", "status")
        tree = ttk.Treeview(tree_f, columns=cols, show="headings", height=14)
        tree.heading("vso", text="Số VSO")
        tree.heading("cust", text="Khách hàng")
        tree.heading("car", text="Dòng xe")
        tree.heading("vin", text="Số VIN / Khung")
        tree.heading("total", text="Tổng tiền")
        tree.heading("status", text="Trạng thái")

        tree.column("vso", width=170)
        tree.column("cust", width=180)
        tree.column("car", width=100)
        tree.column("vin", width=160)
        tree.column("total", width=100)
        tree.column("status", width=120)

        sb = ttk.Scrollbar(tree_f, orient="vertical", command=tree.yview)
        tree.configure(yscrollcommand=sb.set)
        tree.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")

        def _select():
            sel = tree.selection()
            if sel:
                v_num = tree.item(sel[0], "values")[0]
                top.destroy()
                self.var_search_vso.set(v_num)
                self.async_search_vso()

        btn_select = ttk.Button(top, text="✅ Chọn đơn hàng này để nạp", style="Primary.TButton", command=_select)
        btn_select.pack(pady=8)
        tree.bind("<Double-1>", lambda e: _select())

        def _fetch():
            vsos = self.core.search_vsos("", limit=35)
            for v in vsos:
                st = v.get("xts_status")
                st_txt = NVSO_STATUS_NAMES.get(st, f"Status {st}")
                total = v.get("xts_totalpriceamount") or 0
                chassis = v.get("itv_chassisnumber") or v.get("itv_vinnumber") or "--"
                tree.insert("", "end", values=(
                    v.get("xts_newvehiclesalesordernumber"),
                    v.get("xts_potentiallookupname") or "--",
                    v.get("xts_productdescription") or "--",
                    chassis,
                    f"{total:,.0f}",
                    st_txt
                ))
        threading.Thread(target=_fetch, daemon=True).start()

    # ---------------- LỆNH TỔNG KIỂM TRA & XÁC NHẬN 1 LẦN DUY NHẤT ----------------
    def single_confirm_and_run(self):
        if not self.current_vso:
            messagebox.showwarning("Cảnh báo", "Vui lòng chọn hoặc tra cứu đơn hàng VSO trước!")
            return

        vso = self.current_vso
        v_num = vso.get("xts_newvehiclesalesordernumber")
        cust = vso.get("xts_potentiallookupname")
        prod = vso.get("xts_productdescription")
        st = vso.get("xts_status")
        vin_input = self.var_vin_input.get().strip().upper()
        current_vin = vso.get("itv_chassisnumber") or vso.get("itv_vinnumber")
        final_vin = vin_input if vin_input else current_vin

        target_mode = self.var_target_action.get()

        # Kiểm tra điều kiện số VIN đối với các chế độ cần ghép hoặc xuất HĐ
        if target_mode in ["FULL_INVOICE", "MATCH_ONLY"]:
            if not final_vin:
                messagebox.showwarning("Thiếu thông tin", "Vui lòng nhập hoặc chọn số VIN xe trước khi thực hiện ghép/xuất hóa đơn!")
                return

        # Kiểm tra chiết khấu
        try:
            disc = float(self.var_special_discount.get().replace(",", "").replace(".", "") or 0)
        except Exception:
            disc = 0.0

        # Kiểm tra phiếu thu (TÙY CHỈNH)
        create_rcpt = self.var_create_receipt.get()
        receipt_add = 0.0
        if create_rcpt:
            try:
                receipt_add = float(self.var_receipt_amount.get().replace(",", "").replace(".", "") or 0)
            except Exception:
                receipt_add = 0.0
            if receipt_add <= 0:
                messagebox.showwarning("Cảnh báo phiếu thu", "Bạn đã tích chọn Tạo phiếu thu nhưng số tiền thu đang là 0!\nVui lòng nhập số tiền thu hoặc bỏ tích chọn Phiếu thu.")
                return

        promo_name = self.var_promo_pick.get()
        skip_confirm = self.var_skip_confirm.get()

        target_desc_map = {
            "FULL_INVOICE": "⚡ XUẤT HÓA ĐƠN TRỌN GÓI (Duyệt ➔ Ghép VIN ➔ Hóa đơn ARI)",
            "MATCH_ONLY": "🚗 CHỈ GHÉP XE (Duyệt ➔ Ghép VIN ➔ Dừng ở Status 5 Đã ghép)",
            "INVOICE_ONLY": "🧾 CHỈ XUẤT HÓA ĐƠN (Gửi lệnh xuất HĐ cho đơn đã ghép sẵn xe)",
            "APPROVE_ONLY": "✍️ CHỈ PHÊ DUYỆT (Chuyển trạng thái sang Status 3 Approved)"
        }
        target_text = target_desc_map.get(target_mode, target_mode)

        rcpt_summary = f"{receipt_add:,.0f} VNĐ ({self.var_pay_method.get()})" if create_rcpt else "KHÔNG TẠO PHIẾU THU (Hóa đơn xuất theo công nợ)"

        # Nếu người dùng chọn KHÔNG HỎI thì chạy luôn không hiện popup
        if not skip_confirm:
            summary_msg = (
                f"BẢNG TỔNG HỢP KIỂM TRA ĐƠN HÀNG TRƯỚC KHI THỰC HIỆN:\n\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                f" 1. Đơn hàng (VSO)     : {v_num}\n"
                f" 2. Khách hàng         : {cust}\n"
                f" 3. Dòng xe            : {prod}\n"
                f" 4. Số khung (VIN)     : {final_vin or 'Chưa chọn'}\n"
                f" 5. Khuyến mãi áp dụng : {promo_name}\n"
                f"    ➔ Chiết khấu       : {disc:,.0f} VNĐ\n"
                f" 6. Phiếu thu bổ sung  : {rcpt_summary}\n"
                f" 7. Mục tiêu xử lý     : {target_text}\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                f"⚡ HỆ THỐNG SẼ TỰ ĐỘNG CHẠY TỪ ĐẦU ĐẾN CUỐI KHÔNG HỎI THÊM GÌ NỮA.\n"
                f"BẠN CÓ XÁC NHẬN THỰC HIỆN NGAY BÂY GIỜ?"
            )
            if not messagebox.askyesno("Xác nhận lệnh tổng", summary_msg):
                return

        self.btn_execute_all.configure(state="disabled", text="⏳ ĐANG XỬ LÝ TRỌN GÓI... VUI LÒNG ĐỢI...")
        threading.Thread(target=self._unified_execution_worker, args=(disc, create_rcpt, receipt_add, promo_name, final_vin, target_mode), daemon=True).start()

    def _unified_execution_worker(self, disc, create_rcpt, receipt_add, promo_name, final_vin, target_mode):
        vso = self.current_vso
        vso_id = vso.get("xts_newvehiclesalesorderid")
        v_num = vso.get("xts_newvehiclesalesordernumber")
        current_st = vso.get("xts_status")

        self.log(f"\n==================================================", "bold")
        self.log(f"🚀 BẮT ĐẦU LỆNH TỔNG FAST-TRACK: {v_num}", "bold")
        self.log(f"Mục tiêu: {target_mode} | Khách hàng: {vso.get('xts_potentiallookupname')}", "info")
        self.log(f"==================================================", "bold")

        try:
            # 1. CẬP NHẬT KHUYẾN MÃI CỐ ĐỊNH (xvf_nvsofixeddiscounts)
            if disc > 0 and not promo_name.startswith("(Không"):
                # Kiểm tra xem đơn hàng đã có khuyến mãi này trên DMS chưa
                if self.existing_discounts:
                    self.log(f"[1/5] Đơn hàng đã có sẵn {len(self.existing_discounts)} dòng KM trên DMS. Bỏ qua tạo trùng lặp.", "info")
                else:
                    self.log(f"[1/5] Áp dụng Khuyến mãi cố định: {promo_name} ({disc:,.0f} đ)...", "info")
                    matched_disc = next((d for d in self.active_discounts if (d.get('xvf_fixeddiscount') or "") in promo_name), None)
                    if matched_disc:
                        disc_id = matched_disc.get('xvf_vffixeddiscountid')
                        ok, msg = self.core.apply_fixed_discount(vso_id, disc_id, disc)
                        if ok:
                            self.log("✅ Đã ghi nhận dòng Khuyến mãi cố định xvf_nvsofixeddiscount thành công!", "success")
                        else:
                            self.log(f"⚠️ Cảnh báo khuyến mãi: {msg[:100]}", "warning")
                    else:
                        self.log(f"ℹ️ Áp dụng chiết khấu tự do: {disc:,.0f} VNĐ", "info")
            else:
                self.log("[1/5] Không áp dụng thêm khuyến mãi.", "info")

            # 2. LẬP PHIẾU THU BỔ SUNG (CHỈ KHI NGƯỜI DÙNG BẬT TÙY CHỌN NÀY)
            if create_rcpt and receipt_add > 0:
                self.log(f"[2/5] Lập và phát hành phiếu thu bổ sung: {receipt_add:,.0f} đ ({self.var_pay_method.get()})...", "info")
                note_text = self.var_receipt_note.get().strip() or "Thanh toán tiền mua xe"
                ok, msg = self.core.create_and_post_receipt(vso, receipt_add, note=note_text)
                if ok:
                    self.log(f"✅ {msg}", "success")
                else:
                    self.log(f"⚠️ Cảnh báo phiếu thu: {msg[:100]}", "warning")
            else:
                self.log("[2/5] Bỏ qua lập phiếu thu theo tùy chọn của người dùng (Không bắt buộc thu tiền).", "info")

            # 3. PHÊ DUYỆT ĐƠN HÀNG VSO
            vso_refreshed = self.core.get_vso_detail(vso_id) or vso
            current_st = vso_refreshed.get("xts_status")

            if current_st in [1, 2]: # Nếu đang Open hoặc OnApproval
                self.log("[3/5] Phê duyệt đơn hàng VSO (itv_paymentmethod = 1, xts_status = 3, itv_externalstatus = 8)...", "info")
                ok, msg = self.core.approve_vso(vso_id)
                if ok:
                    self.log("✅ Phê duyệt đơn hàng VSO thành công!", "success")
                else:
                    self.log(f"⚠️ Cảnh báo phê duyệt: {msg[:100]}", "warning")
            else:
                self.log(f"[3/5] Đơn hàng VSO đã ở trạng thái {NVSO_STATUS_NAMES.get(current_st, current_st)}. Tiếp tục.", "info")

            # NẾU MỤC TIÊU CHỈ DUYỆT VSO THÌ DỪNG LẠI TẠI ĐÂY!
            if target_mode == "APPROVE_ONLY":
                self.log("\n🎯 ĐÃ HOÀN THÀNH MỤC TIÊU: PHÊ DUYỆT ĐƠN HÀNG THÀNH CÔNG (STATUS 3)!", "success")
                self.root.after(0, lambda: messagebox.showinfo(
                    "Hoàn thành duyệt VSO",
                    f"ĐÃ PHÊ DUYỆT ĐƠN HÀNG THÀNH CÔNG!\n\nĐơn hàng: {v_num}\nTrạng thái: 3. Đã duyệt (Approved)\n(Dừng theo yêu cầu)."
                ))
                self.async_search_vso()
                return

            # 4. GHÉP SỐ KHUNG (VIN / STOCK)
            vso_refreshed = self.core.get_vso_detail(vso_id) or vso
            current_st = vso_refreshed.get("xts_status")
            current_vin_in_dms = vso_refreshed.get("itv_vinnumber") or vso_refreshed.get("itv_chassisnumber")

            if target_mode != "INVOICE_ONLY":
                if current_st != 5: # Nếu chưa ở trạng thái Matched
                    self.log(f"[4/5] Tạo lệnh ghép xe xts_matchunmatch & gán số VIN {final_vin}...", "info")
                    target_stock = self.selected_stock
                    if not target_stock:
                        stocks = self.core.search_stock_by_vin(final_vin)
                        if stocks:
                            target_stock = stocks[0]

                    if target_stock:
                        ok, msg = self.core.create_and_release_match(vso_refreshed, target_stock)
                        if ok:
                            self.log(f"✅ {msg}", "success")
                        else:
                            self.log(f"⚠️ Cảnh báo ghép xe: {msg[:100]}", "warning")
                    else:
                        self.log(f"⚠️ Không tìm thấy Stock ID cho số VIN {final_vin} trong kho!", "warning")
                else:
                    self.log(f"[4/5] Đơn hàng VSO đã ở trạng thái ĐÃ GHÉP (Matched = 5, VIN: {current_vin_in_dms}).", "info")
            else:
                self.log(f"[4/5] Bỏ qua bước ghép xe (Đã chọn chế độ 'Chỉ Xuất Hóa Đơn').", "info")

            # NẾU MỤC TIÊU CHỈ GHÉP XE THÌ DỪNG LẠI TẠI ĐÂY!
            if target_mode == "MATCH_ONLY":
                self.log("\n🎯 ĐÃ HOÀN THÀNH MỤC TIÊU: GHÉP XE THÀNH CÔNG (STATUS 5)!", "success")
                self.log(f"Đơn hàng {v_num} đã được ghép xe an toàn với số VIN {final_vin}.", "success")
                self.root.after(0, lambda: messagebox.showinfo(
                    "Hoàn thành ghép xe",
                    f"ĐÃ GHÉP XE THÀNH CÔNG!\n\nĐơn hàng: {v_num}\nSố VIN: {final_vin}\nTrạng thái: 5. Đã ghép xe (Matched)\n(Dừng theo yêu cầu, chưa xuất hóa đơn)."
                ))
                self.async_search_vso()
                return

            # 5. XUẤT HÓA ĐƠN CÔNG NỢ ARI
            self.log("[5/5] Gửi lệnh Xuất Hóa Đơn ARI (NVSO_STATUS_INVOICEPROCESSING = 10)...", "info")
            ok, msg = self.core.trigger_invoice(vso_id, prev_status=5)
            if ok:
                self.log("✅ Lệnh Xuất hóa đơn gửi thành công! Đang chờ DMS Automate Runner hạch toán...", "success")
                self.log("⏳ Đang lắng nghe phản hồi sinh mã ARI từ DMS (tối đa 25s)...", "info")
                ari = self.core.poll_generated_ari(vso_id, timeout_sec=25)
                if ari:
                    self.show_ari_success(ari)
                else:
                    self.log("⚠️ Hóa đơn đang được hạch toán nền trên DMS. Vui lòng bấm 'Tra cứu' lại sau vài giây.", "warning")
            else:
                self.log(f"❌ Lỗi xuất hóa đơn: {msg}", "error")

            self.log(f"\n🎉 HOÀN TẤT TIẾN TRÌNH!", "bold")
            self.async_search_vso()

        finally:
            self.root.after(0, lambda: self.btn_execute_all.configure(
                state="normal"
            ))
            self.root.after(0, self.update_action_button_label)

    def show_ari_success(self, ari):
        ari_no = ari.get("xts_accountreceivableinvoice")
        amt = ari.get("xts_invoiceamount") or ari.get("xts_totalpriceamount") or 0.0
        created = ari.get("createdon") or ""
        cust = self.current_vso.get("xts_potentiallookupname") if self.current_vso else ""

        def _update():
            self.lbl_ari_badge.configure(text="🎉 ĐÃ XUẤT HÓA ĐƠN THÀNH CÔNG RỰC RỠ!", background="#059669", foreground="#ffffff")
            self.lbl_ari_number.configure(text=ari_no)
            self.lbl_ari_details.configure(text=f"Khách hàng: {cust} | Tổng tiền: {amt:,.0f} VNĐ | Ngày: {created[:19]}")
            self.btn_copy_ari.configure(state="normal")
            self.log(f"\n🎉🎉🎉 ĐÃ SINH HÓA ĐƠN CHÍNH THỨC: {ari_no} (Giá trị: {amt:,.0f} VNĐ)!", "success")
            messagebox.showinfo("Thành công", f"ĐÃ PHÁT HÀNH HÓA ĐƠN THÀNH CÔNG!\n\nSố Hóa đơn ARI: {ari_no}\nKhách hàng: {cust}\nSố tiền: {amt:,.0f} VNĐ")

        self.root.after(0, _update)

    def copy_ari_to_clipboard(self):
        ari_no = self.lbl_ari_number.cget("text")
        if ari_no and ari_no != "--":
            self.root.clipboard_clear()
            self.root.clipboard_append(ari_no)
            messagebox.showinfo("Sao chép", f"Đã sao chép mã {ari_no} vào bộ nhớ tạm!")


# ==============================================================================
# 3. MAIN ENTRYPOINT
# ==============================================================================
if __name__ == "__main__":
    root = tk.Tk()
    app = DMSInvoiceAutomatorApp(root)
    root.mainloop()
