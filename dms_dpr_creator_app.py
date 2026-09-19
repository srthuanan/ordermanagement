import os
import re
import json
import time
import threading
import unicodedata
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from http.server import HTTPServer, BaseHTTPRequestHandler
import requests
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

CONFIG_FILE = "dms_dealers_config.json"
BASE_API_URL = "https://vinfastdms.crm5.dynamics.com/api/data/v9.0"
SYNC_PORT = 28888

TARGET_CONFIG_PATHS = [
    r"c:\Users\USER\Documents\BIỂN SỐ\dms_dealers_config.json",
    r"c:\Users\USER\Documents\ordermanagement\dms_dealers_config.json"
]

DMS_CACHE = {
    "bu": {},
    "site": {},
    "user": {}
}

def load_dealers():
    for p in [os.path.abspath(CONFIG_FILE)] + TARGET_CONFIG_PATHS:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if data:
                        return data
            except Exception:
                pass
    return []

def save_dealers(dealers_data):
    success = False
    all_paths = set(TARGET_CONFIG_PATHS)
    all_paths.add(os.path.abspath(CONFIG_FILE))
    for p in all_paths:
        try:
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, "w", encoding="utf-8") as f:
                json.dump(dealers_data, f, indent=2, ensure_ascii=False)
            success = True
        except Exception:
            pass
    return success

class SyncServerHandler(BaseHTTPRequestHandler):
    app_instance = None

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/dealers':
            dealers_raw = load_dealers()
            dealers = [{"dealer_code": d.get("dealer_code"), "name": d.get("name")} for d in dealers_raw]
            data = json.dumps(dealers).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == '/sync':
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length)
                data = json.loads(body.decode('utf-8'))
                dealer_code = data.get('dealer_code', 'N31913')
                raw_cookie = data.get('cookie', '').strip()
                cookie = extract_clean_cookie(raw_cookie)

                if not cookie:
                    self.send_json_resp({'status': 'error', 'message': 'Cookie trống!'})
                    return

                dealers = load_dealers()
                found = False
                for d in dealers:
                    if d.get('dealer_code') == dealer_code:
                        d['cookie'] = cookie
                        found = True
                        break
                if not found:
                    dealers.append({'dealer_code': dealer_code, 'name': f'VinFast Showroom {dealer_code}', 'cookie': cookie})

                save_dealers(dealers)

                if SyncServerHandler.app_instance:
                    app = SyncServerHandler.app_instance
                    app.dealers = dealers
                    app.after(0, lambda c=dealer_code: app.on_cookie_synced(c))

                self.send_json_resp({'status': 'ok', 'message': 'Đồng bộ thành công!'})
            except Exception as e:
                self.send_json_resp({'status': 'error', 'message': str(e)})
        else:
            self.send_response(404)
            self.end_headers()

    def send_json_resp(self, data):
        payload = json.dumps(data).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format, *args):
        pass


def extract_clean_cookie(raw_input):
    if not raw_input:
        return ""
    text = raw_input.strip()
    m_b = re.search(r"(?:-b|--cookie)\s+['\"]([^'\"]+)['\"]", text)
    if m_b:
        return m_b.group(1).strip()
    m_h = re.search(r"-[Hh]\s+['\"]cookie:\s*([^'\"]+)['\"]", text, re.I)
    if m_h:
        return m_h.group(1).strip()
    m_c = re.search(r"cookie:\s*([^\r\n]+)", text, re.I)
    if m_c:
        return m_c.group(1).strip().strip("'\"")
    return text.strip().strip("'\"")

def get_dms_headers(cookie):
    clean_cookie = cookie.strip() if cookie else ""
    return {
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Prefer": "odata.include-annotations=\"*\"",
        "Cookie": clean_cookie
    }

def get_bu_id(dealer_code, headers):
    if dealer_code in DMS_CACHE["bu"]:
        return DMS_CACHE["bu"][dealer_code]
    r_bu = requests.get(f"{BASE_API_URL}/businessunits", headers=headers, params={"$filter": f"name eq '{dealer_code}'", "$select": "businessunitid,name"}, timeout=10)
    if r_bu.status_code == 200 and r_bu.json().get('value'):
        b_id = r_bu.json()['value'][0]['businessunitid']
        DMS_CACHE["bu"][dealer_code] = b_id
        return b_id
    return None

DEFAULT_APPROVER_ID = "09d163f5-116d-ef11-a671-6045bd57a018"  # # Võ Hoàng Minh (minhvh8.2@vinfastdms.onmicrosoft.com)

def get_current_user_id(headers):
    ck = headers.get("Cookie", "")
    if ck in DMS_CACHE.get("user", {}):
        return DMS_CACHE["user"][ck]
    try:
        r = requests.get(f"{BASE_API_URL}/WhoAmI", headers=headers, timeout=5)
        if r.status_code == 200 and r.json().get("UserId"):
            uid = r.json()["UserId"]
            if "user" not in DMS_CACHE:
                DMS_CACHE["user"] = {}
            DMS_CACHE["user"][ck] = uid
            return uid
    except Exception:
        pass
    return DEFAULT_APPROVER_ID

def create_dpr_transfer_on_dms(p):
    """
    Tạo đơn Yêu cầu Chuyển Cọc (DPR Chuyển BU - Type 5) lên VinFast DMS.
    Tự động nhận diện BU Nguồn từ prefix mã VSO và tự động chọn/tìm kiếm Cookie phù hợp.
    """
    initial_cookie = p['cookie']
    from_bu_code = p['from_bu']
    to_bu_code = p['to_bu']
    vso_number = p['vso_number'].strip()
    custom_amount = p.get('amount')
    status_mode = p.get('status_mode', 'send_approval')
    comment_text = p.get('comment', 'chuyển BU')

    all_dealers = load_dealers()

    # 1. Tự động trích xuất BU Nguồn từ tiền tố mã VSO (ví dụ N31903 từ N31903-VSO-24-07-0012)
    vso_prefix = vso_number.split("-")[0].strip()
    candidate_bus = []
    if vso_prefix and vso_prefix.startswith("N") and len(vso_prefix) == 6:
        candidate_bus.append(vso_prefix)
    if from_bu_code not in candidate_bus:
        candidate_bus.append(from_bu_code)

    for d in all_dealers:
        d_code = d.get('dealer_code')
        if d_code and d_code not in candidate_bus and d.get('cookie'):
            candidate_bus.append(d_code)

    # 2. Tìm VSO trên DMS bằng Cookie phù hợp
    vso_item = None
    active_bu_code = from_bu_code
    active_headers = get_dms_headers(initial_cookie)

    for bu in candidate_bus:
        d_info = next((d for d in all_dealers if d.get('dealer_code') == bu), None)
        ck = d_info.get('cookie') if d_info else (initial_cookie if bu == from_bu_code else "")
        if not ck:
            continue

        hdrs = get_dms_headers(ck)
        url_vso = f"{BASE_API_URL}/xts_newvehiclesalesorders"
        params_vso = {
            "$filter": f"xts_newvehiclesalesordernumber eq '{vso_number}'"
        }
        try:
            r_vso = requests.get(url_vso, headers=hdrs, params=params_vso, timeout=10)
            if r_vso.status_code == 200 and r_vso.json().get('value'):
                vso_item = r_vso.json()['value'][0]
                active_bu_code = bu
                active_headers = hdrs
                break
        except Exception:
            pass

    if not vso_item:
        if vso_prefix and vso_prefix.startswith("N"):
            return False, None, f"Không tìm thấy VSO {vso_number} trên DMS! (VSO thuộc {vso_prefix} - hãy đảm bảo đã đồng bộ Cookie cho đại lý {vso_prefix})", None, "Chưa xác định", 0
        return False, None, f"Không tìm thấy Đơn bán hàng VSO {vso_number} trên hệ thống DMS", None, "Chưa xác định", 0

    # 3. Tra cứu BU ID Gốc của Showroom Nguồn
    from_bu_id = get_bu_id(active_bu_code, active_headers)
    if not from_bu_id:
        return False, None, f"Không tìm thấy Business Unit của showroom nguồn {active_bu_code}", None, "Chưa xác định", 0

    headers = active_headers
    vso_id = vso_item['xts_newvehiclesalesorderid']
    customer_id = vso_item.get('_xts_customerid_value')
    customer_name = vso_item.get('_xts_customerid_value@OData.Community.Display.V1.FormattedValue') or "Khách hàng DMS"

    # Lấy số tiền thực tế từ đơn VSO (Chỉ lấy Tổng số tiền thực nhận / Đặt cọc, KHÔNG lấy giá xe / tiền đối ứng)
    if custom_amount and float(custom_amount) > 0:
        pay_amount = float(custom_amount)
    elif vso_item.get('itv_totalpaymentamount') and float(vso_item['itv_totalpaymentamount']) > 0:
        pay_amount = float(vso_item['itv_totalpaymentamount'])
    elif vso_item.get('itv_paymentamount') and float(vso_item['itv_paymentamount']) > 0:
        pay_amount = float(vso_item['itv_paymentamount'])
    elif vso_item.get('xts_totalreceiptamount') and float(vso_item['xts_totalreceiptamount']) > 0:
        pay_amount = float(vso_item['xts_totalreceiptamount'])
    elif vso_item.get('xts_totalpayment') and float(vso_item['xts_totalpayment']) > 0:
        pay_amount = float(vso_item['xts_totalpayment'])
    else:
        pay_amount = 0.0

    # PRE-CHECK 1: Kiểm tra đơn VSO đã Hủy/Đóng (statecode == 1: Inactive)
    vso_statecode = vso_item.get('statecode')
    if vso_statecode == 1:
        return False, None, f"Đơn VSO {vso_number} đã bị Đóng/Hủy trên DMS (Inactive) - Bỏ qua", None, customer_name, pay_amount

    # PRE-CHECK 2: Kiểm tra VSO đã có DPR đang tồn tại (statecode == 0) trên DMS chưa
    try:
        url_check_dpr = f"{BASE_API_URL}/itv_downpaymentrequests"
        params_check_dpr = {
            "$filter": f"_itv_nvsalesorders_value eq {vso_id} and statecode eq 0",
            "$select": "itv_downpaymentrequestid,itv_name,itv_downpaymentrequestno"
        }
        r_check = requests.get(url_check_dpr, headers=headers, params=params_check_dpr, timeout=10)
        if r_check.status_code == 200 and r_check.json().get('value'):
            existing_dprs = r_check.json()['value']
            if existing_dprs:
                ex_num = existing_dprs[0].get("itv_name") or existing_dprs[0].get("itv_downpaymentrequestno") or "DPR"
                return False, None, f"Đã có DPR ({ex_num}) tồn tại cho VSO này - Chặn tạo trùng", None, customer_name, pay_amount
    except Exception:
        pass

    today_iso = datetime.utcnow().strftime("%Y-%m-%dT00:00:00Z")

    user_id = get_current_user_id(headers)

    # Build Payload tạo đơn Yêu cầu phê duyệt Chuyển BU (Type 5)
    payload = {
        "itv_type": 5,                                     # Chuyển BU
        "itv_vehicletype": 2,                              # Ô tô
        "itv_frombu": active_bu_code,
        "itv_tobu": to_bu_code,
        "itv_paymentamount": pay_amount,
        "itv_totalpaymentamount": pay_amount,
        "itv_transactiondate": today_iso,
        "itv_comment": comment_text,
        "itv_source": 1,                                   # DMS
        "itv_handling": 1,                                 # Không thao tác
        "statuscode": 1,                                   # Active / Draft
        "statecode": 0,
        "itv_bu@odata.bind": f"/businessunits({from_bu_id})",
        "itv_NVSalesOrders@odata.bind": f"/xts_newvehiclesalesorders({vso_id})"
    }

    if user_id:
        payload["itv_Approver@odata.bind"] = f"/systemusers({user_id})"

    if customer_id:
        payload["itv_Customer@odata.bind"] = f"/accounts({customer_id})"
        payload["itv_Customersend@odata.bind"] = f"/accounts({customer_id})"

    url_create = f"{BASE_API_URL}/itv_downpaymentrequests"
    r_create = requests.post(url_create, headers=headers, json=payload, timeout=20)

    if r_create.status_code not in (200, 201, 204):
        err_msg = r_create.text[:150]
        try:
            err_json = r_create.json()
            if isinstance(err_json, dict) and "error" in err_json and "message" in err_json["error"]:
                err_msg = err_json["error"]["message"]
        except Exception:
            pass
        return False, None, f"DMS từ chối: {err_msg}", None, customer_name, pay_amount

    entity_url = r_create.headers.get("OData-EntityId")
    if entity_url:
        dpr_id = entity_url.split("(")[1].split(")")[0]
    else:
        r_latest = requests.get(f"{BASE_API_URL}/itv_downpaymentrequests", headers=headers, params={"$filter": f"_itv_bu_value eq {from_bu_id}", "$orderby": "createdon desc", "$top": "1"}, timeout=10)
        dpr_id = r_latest.json()['value'][0]['itv_downpaymentrequestid']

    # Fetch mã DPR vừa tạo
    r_get_dpr = requests.get(f"{BASE_API_URL}/itv_downpaymentrequests({dpr_id})", headers=headers, timeout=10)
    dpr_data = r_get_dpr.json() if r_get_dpr.status_code == 200 else {}
    dpr_number = dpr_data.get("itv_name") or dpr_data.get("itv_downpaymentrequestno") or f"DPR-{dpr_id[:8]}"

    # Xử lý cập nhật trạng thái theo chọn lựa
    if status_mode == "send_approval":
        try:
            update_payload = {
                "itv_status": 3,                           # Đang chờ phê duyệt (Gửi phê duyệt)
                "itv_handling": 1
            }
            if user_id:
                update_payload["itv_Approver@odata.bind"] = f"/systemusers({user_id})"
            requests.patch(f"{BASE_API_URL}/itv_downpaymentrequests({dpr_id})", headers=headers, json=update_payload, timeout=10)
        except Exception:
            pass
        status_str = "ĐÃ GỬI PHÊ DUYỆT"
    elif status_mode == "approve_now":
        try:
            update_payload = {
                "itv_status": 4,                           # Phê duyệt ngay
                "itv_handling": 1,
                "itv_approveddate": datetime.utcnow().strftime("%Y-%m-%d")
            }
            if user_id:
                update_payload["itv_Approver@odata.bind"] = f"/systemusers({user_id})"
            requests.patch(f"{BASE_API_URL}/itv_downpaymentrequests({dpr_id})", headers=headers, json=update_payload, timeout=10)
        except Exception:
            pass
        status_str = "ĐÃ PHÊ DUYỆT"
    else:
        status_str = "ĐÃ LƯU NHÁP"

    return True, dpr_number, f"Thành công! Số tiền VSO thực tế: {pay_amount:,.0f} VNĐ ({status_str})", dpr_id, customer_name, pay_amount

class DPRCreatorApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("⚡ Công Cụ Tạo DPR Chuyển Cọc Hàng Loạt - VinFast DMS")
        self.geometry("1100x720")
        self.minsize(950, 600)
        self.configure(bg="#0f172a")

        self.dealers = load_dealers()
        self.is_running = False
        self.stop_requested = False
        self.batch_results = []

        self.setup_ui()
        self.start_sync_server()

    def start_sync_server(self):
        SyncServerHandler.app_instance = self
        def run():
            try:
                server = HTTPServer(('127.0.0.1', SYNC_PORT), SyncServerHandler)
                server.serve_forever()
            except Exception as e:
                pass
        t = threading.Thread(target=run, daemon=True)
        t.start()

    def on_cookie_synced(self, dealer_code):
        self.dealers = load_dealers()
        dealer_vals = [f"{d.get('dealer_code')} - {d.get('name')}" for d in self.dealers]
        if hasattr(self, 'cb_from_bu'):
            self.cb_from_bu['values'] = dealer_vals
            # Select matching dealer if active
            for idx, d in enumerate(self.dealers):
                if d.get('dealer_code') == dealer_code:
                    self.cb_from_bu.current(idx)
                    break
        if hasattr(self, 'lbl_progress'):
            self.lbl_progress.config(text=f"🟢 Đã đồng bộ Cookie từ Chrome thành công cho đại lý [{dealer_code}]!", fg="#22c55e")
        messagebox.showinfo("Đồng Bộ Thành Công", f"⚡ Đã nhận và lưu Cookie cho đại lý [{dealer_code}] trực tiếp từ Chrome!\nBây giờ bạn có thể thực hiện tạo DPR ngay.")


    def setup_ui(self):
        # Header Frame
        hdr_f = tk.Frame(self, bg="#1e293b", padx=20, pady=14)
        hdr_f.pack(fill=tk.X)

        tk.Label(hdr_f, text="⚡ CÔNG CỤ TẠO DPR CHUYỂN CỌC HÀNG LOẠT (DMS API)", font=("Segoe UI", 14, "bold"), bg="#1e293b", fg="#38bdf8").pack(anchor="w")
        tk.Label(hdr_f, text="Dán danh sách mã đơn bán hàng VSO (Ví dụ: N31913-VSO-26-07-0120) để tự động tạo đơn Yêu cầu Chuyển BU (DPR) hàng loạt.", font=("Segoe UI", 10), bg="#1e293b", fg="#94a3b8").pack(anchor="w", pady=(2, 0))

        # Main Layout (Split Left - Form Inputs / Right - Log & Tree)
        main_f = tk.Frame(self, bg="#0f172a", padx=16, pady=12)
        main_f.pack(fill=tk.BOTH, expand=True)

        left_panel = tk.Frame(main_f, bg="#1e293b", padx=16, pady=14, width=380)
        left_panel.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))
        left_panel.pack_propagate(False)

        right_panel = tk.Frame(main_f, bg="#0f172a")
        right_panel.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

        # --- LEFT PANEL INPUTS ---
        tk.Label(left_panel, text="1. CẤU HÌNH ĐIỀU CHUYỂN", font=("Segoe UI", 11, "bold"), bg="#1e293b", fg="#f59e0b").pack(anchor="w", pady=(0, 10))

        # Nguồn Từ BU
        f_bu_row = tk.Frame(left_panel, bg="#1e293b")
        f_bu_row.pack(fill=tk.X, pady=(0, 2))
        tk.Label(f_bu_row, text="Showroom Nguồn (Từ BU):", font=("Segoe UI", 9, "bold"), bg="#1e293b", fg="#38bdf8").pack(side=tk.LEFT)
        btn_ck_mgr = tk.Button(f_bu_row, text="🔑 QL Cookie", bg="#334155", fg="#38bdf8", font=("Segoe UI", 8, "bold"), relief="flat", padx=6, pady=1, cursor="hand2", command=self.open_cookie_dialog)
        btn_ck_mgr.pack(side=tk.RIGHT)

        self.cb_from_bu = ttk.Combobox(left_panel, state="readonly", font=("Segoe UI", 10))
        dealer_vals = [f"{d.get('dealer_code')} - {d.get('name')}" for d in self.dealers]
        self.cb_from_bu['values'] = dealer_vals
        if dealer_vals:
            self.cb_from_bu.current(0)
        self.cb_from_bu.pack(fill=tk.X, pady=(2, 8))

        # Đích Tới BU
        tk.Label(left_panel, text="Showroom Đích (Tới BU):", font=("Segoe UI", 9, "bold"), bg="#1e293b", fg="#38bdf8").pack(anchor="w")
        self.cb_to_bu = ttk.Combobox(left_panel, font=("Segoe UI", 10))
        self.cb_to_bu['values'] = ["N31923", "N31913", "N31920", "N31911", "N31903", "N10110"]
        self.cb_to_bu.set("N31923")
        self.cb_to_bu.pack(fill=tk.X, pady=(2, 8))

        # Số tiền điều chuyển (Mặc định 0 = Tự lấy từ VSO DMS)
        tk.Label(left_panel, text="Số tiền chuyển cọc (VNĐ):", font=("Segoe UI", 9, "bold"), bg="#1e293b", fg="#cbd5e1").pack(anchor="w")
        self.ent_amount = tk.Entry(left_panel, font=("Segoe UI", 10), bg="#0f172a", fg="#ffffff", insertbackground="#38bdf8", relief="flat")
        self.ent_amount.insert(0, "0")
        self.ent_amount.pack(fill=tk.X, pady=(2, 8))
        tk.Label(left_panel, text="💡 Nhập 0 = Tự động lấy số tiền cọc VSO thực tế từ DMS", font=("Segoe UI", 8), bg="#1e293b", fg="#38bdf8").pack(anchor="w", pady=(0, 8))

        # Chế độ Phê duyệt / Gửi phê duyệt / Lưu nháp
        tk.Label(left_panel, text="Trạng thái đơn sau khi tạo:", font=("Segoe UI", 9, "bold"), bg="#1e293b", fg="#cbd5e1").pack(anchor="w")
        self.var_status_mode = tk.StringVar(value="send_approval")
        tk.Radiobutton(left_panel, text="📨 Gửi phê duyệt (Pending)", variable=self.var_status_mode, value="send_approval", bg="#1e293b", fg="#38bdf8", selectcolor="#0f172a", activebackground="#1e293b", font=("Segoe UI", 9)).pack(anchor="w")
        tk.Radiobutton(left_panel, text="✅ Phê duyệt ngay (Approved)", variable=self.var_status_mode, value="approve_now", bg="#1e293b", fg="#4ade80", selectcolor="#0f172a", activebackground="#1e293b", font=("Segoe UI", 9)).pack(anchor="w")
        tk.Radiobutton(left_panel, text="📝 Lưu nháp (Draft)", variable=self.var_status_mode, value="draft", bg="#1e293b", fg="#facc15", selectcolor="#0f172a", activebackground="#1e293b", font=("Segoe UI", 9)).pack(anchor="w", pady=(0, 10))

        # Dán danh sách VSO
        tk.Label(left_panel, text="2. NHẬP DANH SÁCH MÃ VSO", font=("Segoe UI", 11, "bold"), bg="#1e293b", fg="#f59e0b").pack(anchor="w", pady=(4, 4))
        tk.Label(left_panel, text="Mỗi mã VSO một dòng (hoặc dấu phẩy):", font=("Segoe UI", 8), bg="#1e293b", fg="#94a3b8").pack(anchor="w", pady=(0, 2))

        self.txt_vsos = tk.Text(left_panel, bg="#0f172a", fg="#ffffff", font=("Consolas", 10), relief="flat", padx=8, pady=6, insertbackground="#38bdf8", height=9)
        self.txt_vsos.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        self.txt_vsos.insert(tk.END, "N31913-VSO-26-07-0120\n")

        # Buttons
        self.btn_run = tk.Button(left_panel, text="🚀 TẠO HÀNG LOẠT DPR CHUYỂN CỌC", bg="#0284c7", fg="white", font=("Segoe UI", 10, "bold"), relief="flat", padx=12, pady=8, cursor="hand2", command=self.start_batch_creation)
        self.btn_run.pack(fill=tk.X, pady=(0, 4))

        self.btn_stop = tk.Button(left_panel, text="🛑 Dừng Tiến Trình", bg="#475569", fg="white", font=("Segoe UI", 9, "bold"), relief="flat", padx=12, pady=4, state="disabled", command=self.stop_process)
        self.btn_stop.pack(fill=tk.X)

        # --- RIGHT PANEL TREEVIEW & LOG ---
        # Progress Bar & Action Buttons Header
        prog_f = tk.Frame(right_panel, bg="#0f172a")
        prog_f.pack(fill=tk.X, pady=(0, 8))

        prog_top = tk.Frame(prog_f, bg="#0f172a")
        prog_top.pack(fill=tk.X)

        self.lbl_progress = tk.Label(prog_top, text="Sẵn sàng xử lý.", font=("Segoe UI", 9, "bold"), bg="#0f172a", fg="#38bdf8")
        self.lbl_progress.pack(side=tk.LEFT)

        btn_act_f = tk.Frame(prog_top, bg="#0f172a")
        btn_act_f.pack(side=tk.RIGHT)

        btn_copy_res = tk.Button(btn_act_f, text="📋 Copy (VSO -> DPR)", font=("Segoe UI", 8, "bold"),
                                 bg="#0f766e", fg="#ffffff", activebackground="#115e59",
                                 relief="flat", padx=8, pady=2, cursor="hand2", command=self.copy_results_to_clipboard)
        btn_copy_res.pack(side=tk.LEFT, padx=3)

        btn_export = tk.Button(btn_act_f, text="📊 Xuất Excel", font=("Segoe UI", 8, "bold"),
                               bg="#10b981", fg="#ffffff", activebackground="#059669",
                               relief="flat", padx=8, pady=2, cursor="hand2", command=self.export_excel_report)
        btn_export.pack(side=tk.LEFT, padx=3)

        self.prog_bar = ttk.Progressbar(prog_f, orient="horizontal", mode="determinate")
        self.prog_bar.pack(fill=tk.X, pady=(4, 0))

        # Treeview Table
        tree_f = tk.Frame(right_panel, bg="#0f172a")
        tree_f.pack(fill=tk.BOTH, expand=True, pady=(0, 8))

        columns = ("stt", "vso_num", "customer", "amount", "status", "dpr_result")
        self.tree = ttk.Treeview(tree_f, columns=columns, show="headings", height=12)

        self.tree.heading("stt", text="#")
        self.tree.heading("vso_num", text="Mã Đơn VSO")
        self.tree.heading("customer", text="Khách Hàng")
        self.tree.heading("amount", text="Số Tiền Cọc")
        self.tree.heading("status", text="Trạng Thái")
        self.tree.heading("dpr_result", text="Mã DPR Tạo Ra")

        self.tree.column("stt", width=40, anchor="center")
        self.tree.column("vso_num", width=180, anchor="center")
        self.tree.column("customer", width=150, anchor="w")
        self.tree.column("amount", width=120, anchor="e")
        self.tree.column("status", width=130, anchor="center")
        self.tree.column("dpr_result", width=180, anchor="center")

        sb_tree = ttk.Scrollbar(tree_f, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=sb_tree.set)
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        sb_tree.pack(side=tk.RIGHT, fill=tk.Y)

        # Log Box
        tk.Label(right_panel, text="📜 Nhật Ký Thực Thi (Real-time Execution Log):", font=("Segoe UI", 9, "bold"), bg="#0f172a", fg="#38bdf8").pack(anchor="w", pady=(0, 2))
        self.txt_log = tk.Text(right_panel, bg="#090d16", fg="#f8fafc", font=("Consolas", 9), relief="flat", padx=8, pady=6, wrap=tk.WORD, height=8)
        self.txt_log.pack(fill=tk.BOTH, expand=True)

    def log(self, msg):
        ts = datetime.now().strftime("%H:%M:%S")
        self.txt_log.insert(tk.END, f"[{ts}] {msg}\n")
        self.txt_log.see(tk.END)

    def stop_process(self):
        self.stop_requested = True
        self.log("🛑 Đã gửi yêu cầu DỪNG tiến trình!")

    def start_batch_creation(self):
        if self.is_running:
            messagebox.showwarning("Đang xử lý", "Hệ thống đang chạy tiến trình khác!")
            return

        raw_text = self.txt_vsos.get("1.0", tk.END).strip()
        if not raw_text:
            messagebox.showwarning("Chưa nhập VSO", "Vui lòng dán ít nhất 1 mã đơn bán hàng VSO vào ô bên trái!")
            return

        vso_list = [v.strip() for v in re.split(r"[\n,\s;]+", raw_text) if v.strip()]
        if not vso_list:
            messagebox.showwarning("Không hợp lệ", "Danh sách mã VSO không hợp lệ!")
            return

        from_dealer_str = self.cb_from_bu.get()
        from_bu_code = from_dealer_str.split(" - ")[0].strip() if from_dealer_str else "N31913"
        to_bu_code = self.cb_to_bu.get().strip()

        dealer_obj = next((d for d in self.dealers if d.get("dealer_code") == from_bu_code), None)
        if not dealer_obj or not dealer_obj.get("cookie"):
            messagebox.showerror("Lỗi Cookie", f"Không tìm thấy Cookie kết nối cho đại lý {from_bu_code}!")
            return

        try:
            default_amt = float(self.ent_amount.get().strip() or 0)
        except Exception:
            default_amt = 10000000.0

        if not messagebox.askyesno("Xác nhận TẠO HÀNG LOẠT DPR", f"Bạn có chắc chắn muốn tạo {len(vso_list)} đơn DPR Chuyển BU không?\n\n• Nguồn (Từ BU): {from_bu_code}\n• Đích (Tới BU): {to_bu_code}\n• Số lượng: {len(vso_list)} đơn VSO"):
            return

        self.is_running = True
        self.stop_requested = False
        self.btn_run.config(state="disabled", text="⚙️ ĐANG XỬ LÝ SONG SONG...")
        self.btn_stop.config(state="normal")

        # Reset Treeview
        for item in self.tree.get_children():
            self.tree.delete(item)

        for idx, vso_code in enumerate(vso_list, 1):
            self.tree.insert("", tk.END, iid=str(idx), values=(idx, vso_code, "⏳ Đang tra cứu...", f"{default_amt:,.0f}" if default_amt > 0 else "Auto", "⏳ Chờ...", "---"))

        threading.Thread(target=self._worker_batch_dpr, args=(vso_list, from_bu_code, to_bu_code, dealer_obj.get("cookie"), default_amt), daemon=True).start()

    def _worker_batch_dpr(self, vso_list, from_bu, to_bu, cookie, default_amt):
        total = len(vso_list)
        success_cnt = 0
        failed_cnt = 0
        completed_cnt = 0
        lock = threading.Lock()
        status_mode = self.var_status_mode.get()

        self.prog_bar['maximum'] = total
        self.prog_bar['value'] = 0
        self.log(f"🚀 BẮT ĐẦU TIẾN TRÌNH TẠO HÀNG LOẠT {total} DPR CHUYỂN CỌC (Từ {from_bu} ➔ {to_bu})...")

        def _process_one_vso(item_info):
            nonlocal completed_cnt, success_cnt, failed_cnt
            idx, vso_code = item_info

            if getattr(self, "stop_requested", False):
                return

            params = {
                "from_bu": from_bu,
                "to_bu": to_bu,
                "cookie": cookie,
                "vso_number": vso_code,
                "amount": default_amt,
                "status_mode": status_mode,
                "comment": "chuyển BU"
            }

            with lock:
                self.tree.set(str(idx), "status", "⏳ Đang tạo...")
                self.log(f"⏳ [{idx}/{total}] Đang xử lý đơn VSO: {vso_code}...")

            success = False
            dpr_number = None
            msg = ""
            cust_name = "Khách hàng DMS"
            real_amt = 0
            for attempt in range(1, 3):
                try:
                    res = create_dpr_transfer_on_dms(params)
                    success, dpr_number, msg = res[0], res[1], res[2]
                    cust_name = res[4] if len(res) > 4 else "Khách hàng DMS"
                    real_amt = res[5] if len(res) > 5 else 0
                    if success:
                        break
                    if any(k in msg for k in ["Chặn tạo trùng", "tồn tại", "Inactive", "Đóng/Hủy", "DMS từ chối", "Không tìm thấy"]):
                        break
                    elif attempt < 2:
                        time.sleep(0.5)
                except Exception as ex:
                    msg = str(ex)
                    if attempt < 2:
                        time.sleep(0.5)

            with lock:
                completed_cnt += 1
                self.prog_bar['value'] = completed_cnt
                self.lbl_progress.config(text=f"Tiến độ ({completed_cnt}/{total}): Đã xử lý VSO #{idx}...")

                if success:
                    success_cnt += 1
                    status_badge = "📨 Đã gửi duyệt" if status_mode == "send_approval" else ("✅ Đã phê duyệt" if status_mode == "approve_now" else "📝 Đã lưu nháp")
                    self.tree.set(str(idx), "customer", cust_name)
                    self.tree.set(str(idx), "amount", f"{real_amt:,.0f} VNĐ" if real_amt > 0 else "0 VNĐ")
                    self.tree.set(str(idx), "status", status_badge)
                    self.tree.set(str(idx), "dpr_result", dpr_number)
                    self.log(f"✅ [{idx}/{total}] TẠO THÀNH CÔNG DPR: {dpr_number} | KH: {cust_name} | Tiền VSO: {real_amt:,.0f} VNĐ ({msg})")
                else:
                    failed_cnt += 1
                    self.tree.set(str(idx), "customer", cust_name)
                    self.tree.set(str(idx), "amount", f"{real_amt:,.0f} VNĐ" if real_amt > 0 else "0 VNĐ")

                    if "Chặn tạo trùng" in msg or "tồn tại" in msg or "đã có 1 yêu cầu" in msg:
                        fail_badge = "⚠️ Đã có DPR"
                        fail_dpr = "🚫 Đã tồn tại"
                    elif "phiếu thu Mở" in msg or "phiếu thu" in msg:
                        fail_badge = "⚠️ Phiếu thu Mở"
                        fail_dpr = "🚫 VSO có phiếu thu"
                    elif "không ở trạng thái Mở" in msg or "trạng thái Mở" in msg or "Inactive" in msg or "Đóng/Hủy" in msg:
                        fail_badge = "🚫 VSO không Mở"
                        fail_dpr = "🚫 Sai trạng thái"
                    elif "Không tìm thấy" in msg:
                        fail_badge = "❌ Không thấy VSO"
                        fail_dpr = "❌ Không tìm thấy"
                    else:
                        fail_badge = "❌ Lỗi tạo"
                        fail_dpr = "❌ DMS từ chối"

                    self.tree.set(str(idx), "status", fail_badge)
                    self.tree.set(str(idx), "dpr_result", fail_dpr)
                    self.log(f"⚠️ [{idx}/{total}] CHẶN / BỎ QUA VSO {vso_code}: {msg}")

        # Execute using 5 parallel threads
        with ThreadPoolExecutor(max_workers=5) as executor:
            items = list(enumerate(vso_list, 1))
            futures = [executor.submit(_process_one_vso, item) for item in items]
            for future in as_completed(futures):
                if getattr(self, "stop_requested", False):
                    break

        self.is_running = False
        self.stop_requested = False
        self.btn_run.config(state="normal", text="🚀 TẠO HÀNG LOẠT DPR CHUYỂN CỌC")
        self.btn_stop.config(state="disabled")
        self.lbl_progress.config(text=f"Hoàn tất! Thành công: {success_cnt} | Thất bại: {failed_cnt}")
        self.log(f"🎉 TỔNG KẾT TIẾN TRÌNH: Thành công: {success_cnt} | Thất bại: {failed_cnt}")

        # Tự động xuất bảng tổng kết VSO ➔ DPR vào log và copy clipboard
        summary_lines = ["\n==================== 📋 BẢNG ĐỐI CHIẾU MÃ VSO ➔ MÃ DPR TẠO RA ===================="]
        clip_lines = ["Mã VSO\tMã DPR Tạo Ra\tKhách Hàng\tSố Tiền Cọc\tTrạng Thái"]
        for child in self.tree.get_children():
            vals = self.tree.item(child)["values"]
            if len(vals) >= 6:
                stt, vso, cust, amt, status, dpr = vals[:6]
                summary_lines.append(f"  [{stt}] VSO: {vso:<22} ➔ DPR: {dpr:<22} | KH: {cust} | Số tiền: {amt} ({status})")
                clip_lines.append(f"{vso}\t{dpr}\t{cust}\t{amt}\t{status}")
        summary_lines.append("==================================================================================")

        for l in summary_lines:
            self.log(l)

        try:
            self.clipboard_clear()
            self.clipboard_append("\n".join(clip_lines))
            self.log("📋 ĐÃ TỰ ĐỘNG COPY TOÀN BỘ DANH SÁCH (VSO ➔ DPR) VÀO CLIPBOARD! Bạn có thể dán (Ctrl+V) vào Excel/Zalo.")
        except Exception:
            pass

    def copy_results_to_clipboard(self):
        lines = ["MÃ VSO\tMÃ DPR TẠO RA\tKHÁCH HÀNG\tSỐ TIỀN CỌC\tTRẠNG THÁI"]
        for child in self.tree.get_children():
            vals = self.tree.item(child)["values"]
            if len(vals) >= 6:
                stt, vso, cust, amt, status, dpr = vals[:6]
                lines.append(f"{vso}\t{dpr}\t{cust}\t{amt}\t{status}")
        text = "\n".join(lines)
        try:
            self.clipboard_clear()
            self.clipboard_append(text)
            messagebox.showinfo("Đã Copy", "📋 Đã copy toàn bộ danh sách đối chiếu (VSO ➔ DPR) vào bộ nhớ tạm!\nBạn có thể dán (Ctrl + V) vào Excel hoặc Zalo.")
        except Exception as e:
            messagebox.showerror("Lỗi", f"Không thể copy: {e}")

    def export_excel_report(self):
        try:
            filename = filedialog.asksaveasfilename(
                title="Lưu Báo Cáo KQ Tạo DPR",
                defaultextension=".xlsx",
                filetypes=[("Excel Files", "*.xlsx")],
                initialfile=f"Bao_Cao_Tao_DPR_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            )
            if not filename:
                return

            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "DS_DPR_Da_Tao"

            headers = ["STT", "Mã Đơn VSO", "Khách Hàng", "Số Tiền Cọc (VNĐ)", "Trạng Thái", "Mã DPR Tạo Ra"]
            ws.append(headers)

            for child in self.tree.get_children():
                vals = self.tree.item(child)["values"]
                if len(vals) >= 6:
                    ws.append(list(vals[:6]))

            wb.save(filename)
            messagebox.showinfo("Xuất Báo Cáo", f"📊 Đã xuất file Excel thành công tại:\n{filename}")
        except Exception as e:
            messagebox.showerror("Lỗi Xuất File", f"Không thể xuất file Excel: {e}")

    def open_cookie_dialog(self):
        dialog = tk.Toplevel(self)
        dialog.title("🔑 Cập Nhật & Quản Lý Cookie Đại Lý DMS")
        dialog.geometry("750x580")
        dialog.minsize(650, 480)
        dialog.configure(bg="#0f172a")

        top_f = tk.Frame(dialog, bg="#1e293b", padx=16, pady=12)
        top_f.pack(fill=tk.X)

        tk.Label(top_f, text="🔑 CẤU HÌNH COOKIE KẾT NỐI VINFAST DMS", font=("Segoe UI", 11, "bold"), bg="#1e293b", fg="#38bdf8").pack(anchor="w")
        tk.Label(top_f, text="Dán Cookie hoặc cURL thu thập từ trình duyệt Chrome vào các đại lý bên dưới và bấm 'Lưu Tất Cả Cookie'.", font=("Segoe UI", 9), bg="#1e293b", fg="#94a3b8").pack(anchor="w", pady=(2, 0))

        content_f = tk.Frame(dialog, bg="#0f172a", padx=16, pady=12)
        content_f.pack(fill=tk.BOTH, expand=True)

        txt_entries = {}

        for d in self.dealers:
            code = d.get("dealer_code")
            name = d.get("name")
            curr_ck = d.get("cookie", "")

            r_frame = tk.Frame(content_f, bg="#1e293b", padx=12, pady=8)
            r_frame.pack(fill=tk.X, pady=(0, 10))

            tk.Label(r_frame, text=f"• Đại lý {code} ({name}):", font=("Segoe UI", 9, "bold"), bg="#1e293b", fg="#f59e0b").pack(anchor="w")
            txt = tk.Text(r_frame, bg="#0f172a", fg="#ffffff", font=("Consolas", 9), relief="flat", padx=6, pady=4, height=3, wrap=tk.WORD, insertbackground="#38bdf8")
            txt.pack(fill=tk.X, pady=(4, 0))
            if curr_ck:
                txt.insert(tk.END, curr_ck)
            txt_entries[code] = txt

        def save_and_close():
            for d in self.dealers:
                code = d.get("dealer_code")
                if code in txt_entries:
                    raw = txt_entries[code].get("1.0", tk.END).strip()
                    d["cookie"] = extract_clean_cookie(raw)

            if save_dealers(self.dealers):
                dealer_vals = [f"{d.get('dealer_code')} - {d.get('name')}" for d in self.dealers]
                self.cb_from_bu['values'] = dealer_vals
                messagebox.showinfo("Thành công", "Đã lưu Cookie mới vào dms_dealers_config.json!", parent=dialog)
                dialog.destroy()
            else:
                messagebox.showerror("Lỗi", "Không thể ghi file dms_dealers_config.json!", parent=dialog)

        btn_save = tk.Button(content_f, text="💾 LƯU TẤT CẢ COOKIE", bg="#10b981", fg="white", font=("Segoe UI", 10, "bold"), relief="flat", padx=16, pady=8, cursor="hand2", command=save_and_close)
        btn_save.pack(anchor="e", pady=(10, 0))

if __name__ == "__main__":
    app = DPRCreatorApp()
    app.mainloop()
