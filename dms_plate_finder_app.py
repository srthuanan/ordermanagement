import os
import json
import re
import time
import threading
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from http.server import HTTPServer, BaseHTTPRequestHandler
import requests

CONFIG_FILE = "dms_dealers_config.json"
BASE_API_URL = "https://vinfastdms.crm5.dynamics.com/api/data/v9.0"
SYNC_PORT = 28888

DEFAULT_CONFIG = [
    {
        "dealer_code": "N31913",
        "name": "VinFast Showroom N31913",
        "cookie": ""
    },
    {
        "dealer_code": "N31920",
        "name": "VinFast Showroom N31920",
        "cookie": ""
    },
    {
        "dealer_code": "N31923",
        "name": "VinFast Showroom N31923",
        "cookie": ""
    }
]

def extract_clean_cookie(raw_input):
    """Trích xuất chuỗi Cookie chuẩn kể cả khi người dùng dán toàn bộ lệnh cURL"""
    if not raw_input:
        return ""
    text = raw_input.strip()
    
    # 1. Nếu dán cả lệnh cURL có flag -b hoặc --cookie
    m_b = re.search(r"(?:-b|--cookie)\s+['\"]([^'\"]+)['\"]", text)
    if m_b:
        return m_b.group(1).strip()
        
    # 2. Nếu dán lệnh cURL có header -H 'cookie: ...'
    m_h = re.search(r"-[Hh]\s+['\"]cookie:\s*([^'\"]+)['\"]", text, re.I)
    if m_h:
        return m_h.group(1).strip()
        
    # 3. Nếu dán header: Cookie: ...
    m_c = re.search(r"cookie:\s*([^\r\n]+)", text, re.I)
    if m_c:
        return m_c.group(1).strip().strip("'\"")
        
    return text.strip().strip("'\"")

def get_dms_headers(cookie):
    return {
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "clienthost": "Browser",
        "Content-Type": "application/json",
        "Prefer": 'odata.include-annotations="*"',
        "Referer": "https://vinfastdms.crm5.dynamics.com/main.aspx?appid=b760a67b-4bf3-e911-a811-000d3aa399d6",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
        "x-ms-app-id": "b760a67b-4bf3-e911-a811-000d3aa399d6",
        "x-ms-user-agent": "PowerApps-UCI/1.4.12378-2608.4 (Browser; AppName=xvf_vinfastyanaapps)",
        "Cookie": cookie
    }

def test_dealer_connection(cookie):
    """Kiểm tra xem cookie có hoạt động tốt hay không"""
    cookie = extract_clean_cookie(cookie)
    if not cookie:
        return False, "Chưa nhập Cookie"
    try:
        headers = get_dms_headers(cookie)
        url = f"{BASE_API_URL}/itv_vehicleregistrations"
        params = {"$top": "1", "$select": "itv_vehicleregistrationid"}
        r = requests.get(url, headers=headers, params=params, timeout=8)
        if r.status_code == 200:
            return True, "Kết nối thành công (200 OK)"
        elif r.status_code == 401:
            return False, "401 Unauthorized (Cookie đã hết hạn)"
        else:
            return False, f"Lỗi HTTP {r.status_code}"
    except Exception as e:
        return False, str(e)

TARGET_CONFIG_PATHS = [
    r"c:\Users\USER\Documents\BIỂN SỐ\dms_dealers_config.json",
    r"c:\Users\USER\Documents\ordermanagement\dms_dealers_config.json"
]

def load_config():
    for p in [os.path.abspath(CONFIG_FILE)] + TARGET_CONFIG_PATHS:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if data:
                        return data
            except Exception:
                pass
    return DEFAULT_CONFIG

def save_config(cfg):
    success = False
    all_paths = set(TARGET_CONFIG_PATHS)
    all_paths.add(os.path.abspath(CONFIG_FILE))
    for p in all_paths:
        try:
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, "w", encoding="utf-8") as f:
                json.dump(cfg, f, ensure_ascii=False, indent=2)
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
            dealers_raw = load_config()
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

                dealers = load_config()
                found = False
                for d in dealers:
                    if d.get('dealer_code') == dealer_code:
                        d['cookie'] = cookie
                        found = True
                        break
                if not found:
                    dealers.append({'dealer_code': dealer_code, 'name': f'VinFast Showroom {dealer_code}', 'cookie': cookie})

                save_config(dealers)

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

class DmsPlateFinderApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("VinFast DMS - Tra Cứu Biển Số Đa Đại Lý")
        self.geometry("1180x750")
        self.minsize(1040, 580)
        self.configure(bg="#0f172a")

        self.dealers = load_config()
        self.results_data = []
        self.config_modal_instance = None

        self.setup_styles()
        self.create_widgets()
        self.start_sync_server()

    def start_sync_server(self):
        SyncServerHandler.app_instance = self
        def run():
            try:
                server = HTTPServer(('127.0.0.1', SYNC_PORT), SyncServerHandler)
                server.serve_forever()
            except Exception as e:
                print(f"Không thể khởi động cổng đồng bộ: {e}")
        t = threading.Thread(target=run, daemon=True)
        t.start()

    def on_cookie_synced(self, dealer_code):
        self.status_lbl.config(text=f"🟢 ĐÃ ĐỒNG BỘ COOKIE THÀNH CÔNG TỪ CHROME CHO ĐẠI LÝ [{dealer_code}]!", fg="#22c55e")
        if self.config_modal_instance and self.config_modal_instance.winfo_exists():
            self.config_modal_instance.refresh_dealer_data()
        messagebox.showinfo("Đồng Bộ Thành Công", f"Đã nhận và lưu Cookie cho đại lý [{dealer_code}] trực tiếp từ tab Chrome đang mở!\nBây giờ bạn có thể tra cứu ngay.")

    def setup_styles(self):
        style = ttk.Style()
        style.theme_use("clam")

        style.configure("Treeview",
                        background="#1e293b",
                        foreground="#f8fafc",
                        fieldbackground="#1e293b",
                        rowheight=32,
                        font=("Segoe UI", 10))
        style.map("Treeview",
                  background=[("selected", "#0284c7")],
                  foreground=[("selected", "#ffffff")])

        style.configure("Treeview.Heading",
                        background="#090d16",
                        foreground="#38bdf8",
                        font=("Segoe UI", 10, "bold"))

    def create_widgets(self):
        # Header
        header = tk.Frame(self, bg="#1e293b", padx=16, pady=10)
        header.pack(fill=tk.X)

        title_lbl = tk.Label(header, text="🚗 TRA CỨU BIỂN SỐ DMS", 
                             font=("Segoe UI", 13, "bold"), fg="#38bdf8", bg="#1e293b")
        title_lbl.pack(side=tk.LEFT)

        btns_frame = tk.Frame(header, bg="#1e293b")
        btns_frame.pack(side=tk.RIGHT)

        btn_cfg = tk.Button(btns_frame, text="⚙️ Cài đặt Cookie", font=("Segoe UI", 9, "bold"),
                            bg="#334155", fg="#f8fafc", activebackground="#475569", 
                            relief="flat", padx=10, pady=5, cursor="hand2", command=self.open_config_modal)
        btn_cfg.pack(side=tk.LEFT, padx=3)

        btn_ext = tk.Button(btns_frame, text="🧩 Đồng bộ Chrome", font=("Segoe UI", 9, "bold"),
                            bg="#0f766e", fg="#ffffff", activebackground="#115e59",
                            relief="flat", padx=10, pady=5, cursor="hand2", command=self.open_extension_help)
        btn_ext.pack(side=tk.LEFT, padx=3)

        btn_bulk = tk.Button(btns_frame, text="📥 Tải Toàn Bộ", font=("Segoe UI", 9, "bold"),
                             bg="#0284c7", fg="#ffffff", activebackground="#0369a1",
                             relief="flat", padx=10, pady=5, cursor="hand2", command=self.open_bulk_exporter)
        btn_bulk.pack(side=tk.LEFT, padx=3)

        btn_submit = tk.Button(btns_frame, text="⚡ Duyệt Phiếu Mở", font=("Segoe UI", 9, "bold"),
                               bg="#ea580c", fg="#ffffff", activebackground="#c2410c",
                               relief="flat", padx=10, pady=5, cursor="hand2", command=self.open_submit_modal)
        btn_submit.pack(side=tk.LEFT, padx=3)

        btn_pr = tk.Button(btns_frame, text="📦 Nhập Kho (PR)", font=("Segoe UI", 9, "bold"),
                           bg="#7c3aed", fg="#ffffff", activebackground="#6d28d9",
                           relief="flat", padx=10, pady=5, cursor="hand2", command=self.open_pr_modal)
        btn_pr.pack(side=tk.LEFT, padx=3)

        btn_factory = tk.Button(btns_frame, text="🚚 Rút Xe Nhà Máy", font=("Segoe UI", 9, "bold"),
                                bg="#0284c7", fg="#ffffff", activebackground="#0369a1",
                                relief="flat", padx=10, pady=5, cursor="hand2", command=self.open_factory_tracker)
        btn_factory.pack(side=tk.LEFT, padx=3)

        # Body
        body = tk.Frame(self, bg="#0f172a", padx=20, pady=15)
        body.pack(fill=tk.BOTH, expand=True)

        # Search Bar Frame
        search_frame = tk.Frame(body, bg="#1e293b", padx=15, pady=15, relief="flat", highlightbackground="#334155", highlightthickness=1)
        search_frame.pack(fill=tk.X, pady=(0, 12))

        lbl_vin = tk.Label(search_frame, text="Nhập số khung (VIN):", font=("Segoe UI", 10, "bold"), fg="#cbd5e1", bg="#1e293b")
        lbl_vin.grid(row=0, column=0, sticky="w", padx=(0, 10))

        self.vin_entry = tk.Entry(search_frame, font=("Consolas", 12, "bold"), bg="#0f172a", fg="#f8fafc", 
                                  insertbackground="#38bdf8", relief="flat", highlightbackground="#475569", highlightthickness=1)
        self.vin_entry.grid(row=0, column=1, sticky="ew", padx=(0, 10), ipady=5)
        self.vin_entry.bind("<Return>", lambda event: self.start_search())
        search_frame.columnconfigure(1, weight=1)

        self.btn_search = tk.Button(search_frame, text="🔍 TRA CỨU NGAY", font=("Segoe UI", 10, "bold"), 
                                    bg="#0284c7", fg="#ffffff", activebackground="#0369a1", 
                                    relief="flat", padx=18, pady=5, cursor="hand2", command=self.start_search)
        self.btn_search.grid(row=0, column=2, padx=(0, 6))

        self.btn_batch = tk.Button(search_frame, text="📂 Tra nhiều VIN", font=("Segoe UI", 10), 
                                   bg="#334155", fg="#cbd5e1", activebackground="#475569", 
                                   relief="flat", padx=12, pady=5, cursor="hand2", command=self.open_batch_modal)
        self.btn_batch.grid(row=0, column=3)

        # Status Label
        self.status_lbl = tk.Label(body, text="Sẵn sàng tra cứu. Vui lòng nhập số khung VIN.", 
                                   font=("Segoe UI", 10), fg="#94a3b8", bg="#0f172a", anchor="w")
        self.status_lbl.pack(fill=tk.X, pady=(0, 8))

        # Result TreeView
        table_frame = tk.Frame(body, bg="#1e293b", highlightbackground="#334155", highlightthickness=1)
        table_frame.pack(fill=tk.BOTH, expand=True)

        columns = ("vin", "plate", "dealer", "policy", "status", "createdon", "reg_code")
        self.tree = ttk.Treeview(table_frame, columns=columns, show="headings", selectmode="browse")

        self.tree.heading("vin", text="Số khung (VIN)")
        self.tree.heading("plate", text="Biển số xe")
        self.tree.heading("dealer", text="Đại lý tìm thấy")
        self.tree.heading("policy", text="Chính sách sạc")
        self.tree.heading("status", text="Trạng thái")
        self.tree.heading("createdon", text="Ngày đăng ký")
        self.tree.heading("reg_code", text="Mã phiếu")

        self.tree.column("vin", width=170, anchor="center")
        self.tree.column("plate", width=130, anchor="center")
        self.tree.column("dealer", width=120, anchor="center")
        self.tree.column("policy", width=130, anchor="center")
        self.tree.column("status", width=100, anchor="center")
        self.tree.column("createdon", width=140, anchor="center")
        self.tree.column("reg_code", width=190, anchor="center")

        scroll_y = ttk.Scrollbar(table_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroll_y.set)
        scroll_y.pack(side=tk.RIGHT, fill=tk.Y)

        scroll_x = ttk.Scrollbar(table_frame, orient=tk.HORIZONTAL, command=self.tree.xview)
        self.tree.configure(xscrollcommand=scroll_x.set)
        scroll_x.pack(side=tk.BOTTOM, fill=tk.X)

        self.tree.pack(fill=tk.BOTH, expand=True)

        # Footer Actions
        footer = tk.Frame(body, bg="#0f172a", pady=12)
        footer.pack(fill=tk.X)

        self.lbl_count = tk.Label(footer, text="Tổng số kết quả: 0", font=("Segoe UI", 10, "bold"), fg="#38bdf8", bg="#0f172a")
        self.lbl_count.pack(side=tk.LEFT)

        btn_export = tk.Button(footer, text="📥 Xuất File Excel (CSV)", font=("Segoe UI", 9, "bold"), 
                               bg="#059669", fg="#ffffff", activebackground="#047857",
                               relief="flat", padx=14, pady=5, cursor="hand2", command=self.export_csv)
        btn_export.pack(side=tk.RIGHT, padx=(6, 0))

        btn_clear = tk.Button(footer, text="🗑️ Xóa danh sách", font=("Segoe UI", 9), 
                              bg="#334155", fg="#cbd5e1", activebackground="#475569",
                              relief="flat", padx=12, pady=5, cursor="hand2", command=self.clear_table)
        btn_clear.pack(side=tk.RIGHT)

    def start_search(self):
        vin = self.vin_entry.get().strip().upper()
        if not vin:
            messagebox.showwarning("Thông báo", "Vui lòng nhập số khung xe (VIN)!")
            return

        self.btn_search.config(state=tk.DISABLED, bg="#64748b")
        self.status_lbl.config(text=f"⏳ Đang tìm kiếm biển số xe [{vin}] qua các đại lý DMS...", fg="#38bdf8")

        thread = threading.Thread(target=self.run_search_thread, args=([vin],))
        thread.daemon = True
        thread.start()

    def run_search_thread(self, vins):
        found_count = 0
        error_msgs = []

        for vin in vins:
            res, err = self.query_vin_multidealer(vin)
            if res:
                found_count += 1
                self.results_data.append(res)
                self.tree.insert("", tk.END, values=(
                    res["vin"],
                    res["plate"],
                    res["dealer"],
                    res["policy"],
                    res["status"],
                    res["created_on"],
                    res["reg_code"]
                ))
            elif err:
                error_msgs.append(f"{vin}: {err}")
            else:
                self.tree.insert("", tk.END, values=(
                    vin,
                    "--- Không tìm thấy ---",
                    "Toàn bộ đại lý",
                    "-",
                    "-",
                    "-",
                    "-"
                ))

        self.after(0, lambda: self.update_after_search(found_count, len(vins), error_msgs))

    def update_after_search(self, found_count, total_count, error_msgs):
        self.btn_search.config(state=tk.NORMAL, bg="#0284c7")
        self.lbl_count.config(text=f"Tổng số kết quả: {len(self.results_data)}")
        if found_count > 0:
            self.status_lbl.config(text=f"✅ Tìm thấy {found_count}/{total_count} xe có biển số!", fg="#22c55e")
        elif error_msgs:
            self.status_lbl.config(text=f"❌ {error_msgs[0]}", fg="#ef4444")
        else:
            self.status_lbl.config(text="❌ Không tìm thấy bản ghi biển số nào trên các đại lý đã cấu hình.", fg="#ef4444")

    def query_vin_multidealer(self, vin):
        last_error = None
        for d in self.dealers:
            cookie = d.get("cookie", "").strip()
            if not cookie:
                continue

            headers = get_dms_headers(cookie)

            try:
                # 1. Tìm ID xe công cộng (xts_vehiclepublic)
                p_vp = {
                    "$filter": f"xts_chassisnumber eq '{vin}' or xts_vehicleidentificationnumber eq '{vin}'",
                    "$select": "xts_vehiclepublicid"
                }
                r_vp = requests.get(f"{BASE_API_URL}/xts_vehiclepublics", headers=headers, params=p_vp, timeout=10)
                
                if r_vp.status_code == 401:
                    last_error = f"Cookie đại lý [{d.get('dealer_code')}] đã hết hạn (401)! Hãy đồng bộ lại."
                    continue
                    
                if r_vp.status_code == 200:
                    d_vp = r_vp.json().get("value", [])
                    if d_vp:
                        vp_id = d_vp[0]["xts_vehiclepublicid"]
                        
                        # 2. Tìm biển số trong itv_vehicleregistration
                        fxml = f"""<fetch><entity name="itv_vehicleregistration">
                            <all-attributes/>
                            <filter>
                                <condition attribute="itv_vin" operator="eq" value="{vp_id}"/>
                            </filter>
                        </entity></fetch>"""
                        r_reg = requests.get(f"{BASE_API_URL}/itv_vehicleregistrations", headers=headers, params={"fetchXml": fxml}, timeout=10)
                        if r_reg.status_code == 200:
                            d_reg = r_reg.json().get("value", [])
                            for row in d_reg:
                                plate = row.get("itv_plateno")
                                if plate:
                                    status_map = {1: "Mới", 2: "Đã gửi", 3: "Đã hủy"}
                                    policy_map = {1: "Không xác định", 2: "Biển trắng", 3: "Biển vàng"}
                                    return {
                                        "dealer": d.get("dealer_code", "DMS"),
                                        "vin": vin,
                                        "plate": plate,
                                        "status": status_map.get(row.get("itv_status"), "Đã gửi"),
                                        "policy": policy_map.get(row.get("itv_chargingpolicy"), "Các loại biển khác"),
                                        "created_on": row.get("createdon", "")[:19].replace("T", " "),
                                        "reg_code": row.get("itv_name") or "Phiếu đăng ký"
                                    }, None
            except Exception as e:
                last_error = str(e)
                continue

        return None, last_error

    def clear_table(self):
        for item in self.tree.get_children():
            self.tree.delete(item)
        self.results_data.clear()
        self.lbl_count.config(text="Tổng số kết quả: 0")
        self.status_lbl.config(text="Đã làm mới bảng tra cứu.", fg="#94a3b8")

    def export_csv(self):
        if not self.results_data:
            messagebox.showinfo("Thông báo", "Chưa có dữ liệu để xuất!")
            return

        file_path = filedialog.asksaveasfilename(defaultextension=".csv", 
                                                 filetypes=[("CSV file", "*.csv"), ("Tất cả", "*.*")],
                                                 title="Lưu kết quả tra cứu")
        if file_path:
            try:
                import csv
                with open(file_path, "w", newline="", encoding="utf-8-sig") as f:
                    writer = csv.writer(f)
                    writer.writerow(["Số khung (VIN)", "Biển số", "Đại lý", "Chính sách sạc", "Trạng thái", "Ngày tạo", "Mã phiếu"])
                    for r in self.results_data:
                        writer.writerow([r["vin"], r["plate"], r["dealer"], r["policy"], r["status"], r["created_on"], r["reg_code"]])
                messagebox.showinfo("Thành công", f"Đã xuất file thành công tại:\n{file_path}")
            except Exception as e:
                messagebox.showerror("Lỗi", f"Không thể xuất file: {e}")

    def open_submit_modal(self):
        SubmitApprovalModal(self)

    def open_pr_modal(self):
        PurchaseReceiptModal(self)

    def open_factory_tracker(self):
        import subprocess
        subprocess.Popen(["python", "dms_factory_stock_tracker.py"])

    def open_bulk_exporter(self):
        import subprocess
        subprocess.Popen(["python", "dms_bulk_exporter.py"])

    def open_config_modal(self):
        self.config_modal_instance = ConfigModal(self)

    def open_batch_modal(self):
        BatchSearchModal(self)

    def open_extension_help(self):
        ExtensionHelpModal(self)

class SubmitApprovalModal(tk.Toplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.parent = parent
        self.title("Duyệt & Submit Phiếu Đăng Ký Xe Trạng Thái 'Mở'")
        self.geometry("1060x700")
        self.minsize(920, 560)
        self.configure(bg="#0f172a")
        self.transient(parent)
        self.grab_set()

        self.records_data = []
        self.is_scanning = False
        self.is_submitting = False

        self.create_widgets()

    def create_widgets(self):
        # Header
        header = tk.Frame(self, bg="#1e293b", padx=20, pady=12)
        header.pack(fill=tk.X)

        lbl = tk.Label(header, text="⚡ QUẢN LÝ DUYỆT & SUBMIT PHIẾU ĐĂNG KÝ XE (TRẠNG THÁI MỞ)",
                       font=("Segoe UI", 12, "bold"), fg="#f97316", bg="#1e293b")
        lbl.pack(anchor="w")

        sub = tk.Label(header, text="Điều kiện tự động Submit: Đã có biển số + Đã chọn loại biển (chính sách sạc) + Đã có file đính kèm.",
                       font=("Segoe UI", 9), fg="#94a3b8", bg="#1e293b")
        sub.pack(anchor="w", pady=(2, 0))

        # Controls Frame
        ctrl_frame = tk.Frame(self, bg="#1e293b", padx=15, pady=12, highlightbackground="#334155", highlightthickness=1)
        ctrl_frame.pack(fill=tk.X, padx=15, pady=12)

        # Dealer selector
        tk.Label(ctrl_frame, text="Đại lý:", font=("Segoe UI", 10, "bold"), fg="#cbd5e1", bg="#1e293b").grid(row=0, column=0, sticky="w", padx=(0, 6))
        
        dealer_codes = [d.get("dealer_code") for d in self.parent.dealers if d.get("cookie", "").strip()]
        if not dealer_codes:
            dealer_codes = [d.get("dealer_code") for d in self.parent.dealers]
            
        self.var_dealer = tk.StringVar(value=dealer_codes[0] if dealer_codes else "N31913")
        self.cb_dealer = ttk.Combobox(ctrl_frame, textvariable=self.var_dealer, values=dealer_codes, state="readonly", width=12, font=("Segoe UI", 10))
        self.cb_dealer.grid(row=0, column=1, sticky="w", padx=(0, 15))

        # Filter mode
        self.var_mode = tk.StringVar(value="all")
        rb_all = tk.Radiobutton(ctrl_frame, text="Quét tất cả phiếu Mở của đại lý", variable=self.var_mode, value="all",
                                font=("Segoe UI", 9), fg="#f8fafc", bg="#1e293b", activebackground="#1e293b", selectcolor="#0f172a",
                                command=self.toggle_vin_input)
        rb_all.grid(row=0, column=2, sticky="w", padx=(0, 10))

        rb_vins = tk.Radiobutton(ctrl_frame, text="Lọc theo danh sách VIN cụ thể", variable=self.var_mode, value="custom",
                                 font=("Segoe UI", 9), fg="#f8fafc", bg="#1e293b", activebackground="#1e293b", selectcolor="#0f172a",
                                 command=self.toggle_vin_input)
        rb_vins.grid(row=0, column=3, sticky="w", padx=(0, 15))

        self.btn_scan = tk.Button(ctrl_frame, text="🔍 BẮT ĐẦU QUÉT", font=("Segoe UI", 10, "bold"),
                                  bg="#0284c7", fg="#ffffff", activebackground="#0369a1",
                                  relief="flat", padx=16, pady=5, cursor="hand2", command=self.start_scan)
        self.btn_scan.grid(row=0, column=4, sticky="e")
        ctrl_frame.columnconfigure(4, weight=1)

        # VIN input frame (hidden by default unless mode is custom)
        self.frame_vin_input = tk.Frame(ctrl_frame, bg="#1e293b")
        tk.Label(self.frame_vin_input, text="Dán danh sách VIN (cách nhau bởi dấu phẩy hoặc xuống dòng):", font=("Segoe UI", 9), fg="#94a3b8", bg="#1e293b").pack(anchor="w", pady=(6, 2))
        self.txt_vins = tk.Text(self.frame_vin_input, height=3, bg="#0f172a", fg="#f8fafc", font=("Consolas", 9), relief="flat", insertbackground="#38bdf8")
        self.txt_vins.pack(fill=tk.X)

        # Table
        table_frame = tk.Frame(self, bg="#1e293b", highlightbackground="#334155", highlightthickness=1)
        table_frame.pack(fill=tk.BOTH, expand=True, padx=15, pady=(0, 10))

        columns = ("stt", "reg_code", "vin", "plate", "policy", "attach", "eligible", "submit_status")
        self.tree = ttk.Treeview(table_frame, columns=columns, show="headings", selectmode="browse")

        self.tree.heading("stt", text="STT")
        self.tree.heading("reg_code", text="Mã phiếu")
        self.tree.heading("vin", text="Số khung (VIN)")
        self.tree.heading("plate", text="Biển số")
        self.tree.heading("policy", text="Loại biển / Sạc")
        self.tree.heading("attach", text="File đính kèm")
        self.tree.heading("eligible", text="Điều kiện Submit")
        self.tree.heading("submit_status", text="Trạng thái Submit")

        self.tree.column("stt", width=45, anchor="center")
        self.tree.column("reg_code", width=170, anchor="center")
        self.tree.column("vin", width=160, anchor="center")
        self.tree.column("plate", width=110, anchor="center")
        self.tree.column("policy", width=120, anchor="center")
        self.tree.column("attach", width=180, anchor="center")
        self.tree.column("eligible", width=140, anchor="center")
        self.tree.column("submit_status", width=120, anchor="center")

        scroll_y = ttk.Scrollbar(table_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroll_y.set)
        scroll_y.pack(side=tk.RIGHT, fill=tk.Y)

        scroll_x = ttk.Scrollbar(table_frame, orient=tk.HORIZONTAL, command=self.tree.xview)
        self.tree.configure(xscrollcommand=scroll_x.set)
        scroll_x.pack(side=tk.BOTTOM, fill=tk.X)

        self.tree.pack(fill=tk.BOTH, expand=True)

        # Bottom Frame
        bottom = tk.Frame(self, bg="#0f172a", padx=15, pady=10)
        bottom.pack(fill=tk.X)

        self.lbl_summary = tk.Label(bottom, text="Chưa quét. Bấm 'Bắt đầu quét' để tìm các phiếu Mở.",
                                    font=("Segoe UI", 10), fg="#94a3b8", bg="#0f172a")
        self.lbl_summary.pack(side=tk.LEFT)

        self.btn_submit_all = tk.Button(bottom, text="🚀 SUBMIT CÁC PHIẾU ĐỦ ĐIỀU KIỆN", font=("Segoe UI", 10, "bold"),
                                        bg="#ea580c", fg="#ffffff", activebackground="#c2410c",
                                        relief="flat", padx=18, pady=8, cursor="hand2", state=tk.DISABLED,
                                        command=self.confirm_and_submit)
        self.btn_submit_all.pack(side=tk.RIGHT)

    def toggle_vin_input(self):
        if self.var_mode.get() == "custom":
            self.frame_vin_input.grid(row=1, column=0, columnspan=5, sticky="ew", pady=(8, 0))
        else:
            self.frame_vin_input.grid_forget()

    def start_scan(self):
        if self.is_scanning or self.is_submitting:
            return

        dealer_code = self.var_dealer.get()
        dealer = next((d for d in self.parent.dealers if d.get("dealer_code") == dealer_code), None)
        if not dealer or not dealer.get("cookie", "").strip():
            messagebox.showwarning("Thông báo", f"Đại lý [{dealer_code}] chưa có Cookie hoặc chưa được cấu hình!")
            return

        for item in self.tree.get_children():
            self.tree.delete(item)
        self.records_data.clear()
        self.btn_submit_all.config(state=tk.DISABLED)
        self.btn_scan.config(state=tk.DISABLED, bg="#64748b")
        self.is_scanning = True

        custom_vins = []
        if self.var_mode.get() == "custom":
            raw = self.txt_vins.get("1.0", tk.END).strip()
            custom_vins = [x.strip().upper() for x in re.split(r"[\n,\s]+", raw) if x.strip()]

        self.lbl_summary.config(text=f"⏳ Đang quét danh sách phiếu 'Mở' từ đại lý [{dealer_code}]...", fg="#38bdf8")

        thread = threading.Thread(target=self.run_scan_thread, args=(dealer, custom_vins))
        thread.daemon = True
        thread.start()

    def run_scan_thread(self, dealer, custom_vins):
        cookie = dealer.get("cookie")
        headers = get_dms_headers(cookie)
        dealer_code = dealer.get("dealer_code")

        fxml = '''<fetch>
            <entity name="itv_vehicleregistration">
                <attribute name="itv_vehicleregistrationid"/>
                <attribute name="itv_name"/>
                <attribute name="itv_plateno"/>
                <attribute name="itv_status"/>
                <attribute name="itv_chargingpolicy"/>
                <attribute name="itv_attachment"/>
                <attribute name="itv_attachment_name"/>
                <attribute name="createdon"/>
                <filter type="and">
                    <condition attribute="itv_status" operator="eq" value="1"/>
                </filter>
                <link-entity name="xts_vehiclepublic" from="xts_vehiclepublicid" to="itv_vin" link-type="outer" alias="vp">
                    <attribute name="xts_chassisnumber"/>
                    <attribute name="xts_vehicleidentificationnumber"/>
                </link-entity>
            </entity>
        </fetch>'''

        try:
            r = requests.get(f"{BASE_API_URL}/itv_vehicleregistrations", headers=headers, params={"fetchXml": fxml}, timeout=15)
            if r.status_code != 200:
                self.after(0, lambda: self.finish_scan([], f"Lỗi HTTP {r.status_code}"))
                return

            items = r.json().get("value", [])
            results = []

            for row in items:
                vin = row.get("vp.xts_chassisnumber") or row.get("vp.xts_vehicleidentificationnumber") or ""
                if custom_vins and vin not in custom_vins:
                    continue

                plate = (row.get("itv_plateno") or "").strip()
                policy_val = row.get("itv_chargingpolicy")
                policy_label = row.get("itv_chargingpolicy@OData.Community.Display.V1.FormattedValue") or ""
                attach_id = row.get("itv_attachment")
                attach_name = row.get("itv_attachment_name") or ""

                has_plate = bool(plate)
                has_valid_policy = bool(policy_val and policy_val != 1)
                has_attach = bool(attach_id or attach_name)

                is_eligible = (has_plate and has_valid_policy and has_attach)

                reason = []
                if not has_plate:
                    reason.append("Thiếu biển")
                if not has_valid_policy:
                    reason.append("Chưa chọn loại biển")
                if not has_attach:
                    reason.append("Thiếu file ảnh")

                eligible_str = "🟢 ĐỦ ĐIỀU KIỆN" if is_eligible else f"🔴 {', '.join(reason)}"

                rec = {
                    "id": row.get("itv_vehicleregistrationid"),
                    "reg_code": row.get("itv_name") or "Chưa đặt tên",
                    "vin": vin,
                    "plate": plate or "---",
                    "policy": policy_label or "Chưa chọn",
                    "attach": attach_name or ("Có file" if attach_id else "Chưa có"),
                    "eligible": is_eligible,
                    "eligible_label": eligible_str,
                    "submit_status": "Chờ duyệt",
                    "cookie": cookie
                }
                results.append(rec)

            self.after(0, lambda: self.finish_scan(results, None))
        except Exception as e:
            self.after(0, lambda: self.finish_scan([], str(e)))

    def finish_scan(self, results, error):
        self.is_scanning = False
        self.btn_scan.config(state=tk.NORMAL, bg="#0284c7")

        if error:
            self.lbl_summary.config(text=f"❌ Quét thất bại: {error}", fg="#ef4444")
            messagebox.showerror("Lỗi", f"Không thể quét dữ liệu từ DMS:\n{error}")
            return

        self.records_data = results
        for idx, rec in enumerate(results, start=1):
            self.tree.insert("", tk.END, iid=str(idx-1), values=(
                idx,
                rec["reg_code"],
                rec["vin"],
                rec["plate"],
                rec["policy"],
                rec["attach"],
                rec["eligible_label"],
                rec["submit_status"]
            ))

        eligible_count = sum(1 for r in results if r["eligible"])
        self.lbl_summary.config(
            text=f"Tìm thấy {len(results)} phiếu Mở  |  🟢 Đủ điều kiện: {eligible_count} phiếu  |  🔴 Chưa đủ: {len(results) - eligible_count} phiếu",
            fg="#22c55e" if eligible_count > 0 else "#94a3b8"
        )

        if eligible_count > 0:
            self.btn_submit_all.config(state=tk.NORMAL)
        else:
            self.btn_submit_all.config(state=tk.DISABLED)

    def confirm_and_submit(self):
        eligible_recs = [r for r in self.records_data if r["eligible"] and r["submit_status"] == "Chờ duyệt"]
        if not eligible_recs:
            messagebox.showinfo("Thông báo", "Không có phiếu nào đủ điều kiện để submit!")
            return

        cf = messagebox.askyesno(
            "Xác nhận Submit",
            f"Bạn có chắc chắn muốn Submit {len(eligible_recs)} phiếu đăng ký xe đủ điều kiện lên hệ thống VinFast DMS không?\n\n"
            "Hành động này sẽ đổi trạng thái phiếu từ 'Mở' sang 'Đã gửi'!"
        )
        if not cf:
            return

        self.is_submitting = True
        self.btn_submit_all.config(state=tk.DISABLED)
        self.btn_scan.config(state=tk.DISABLED)

        thread = threading.Thread(target=self.run_submit_thread, args=(eligible_recs,))
        thread.daemon = True
        thread.start()

    def run_submit_thread(self, eligible_recs):
        success_count = 0
        error_count = 0

        for idx, rec in enumerate(eligible_recs):
            reg_id = rec["id"]
            cookie = rec["cookie"]
            headers = get_dms_headers(cookie)
            url = f"{BASE_API_URL}/itv_vehicleregistrations({reg_id})"

            payload = {"itv_handling": 2}
            try:
                r = requests.patch(url, headers=headers, json=payload, timeout=12)
                if r.status_code in [200, 204]:
                    rec["submit_status"] = "✅ Thành công"
                    success_count += 1
                else:
                    rec["submit_status"] = f"❌ Lỗi {r.status_code}"
                    error_count += 1
            except Exception as e:
                rec["submit_status"] = "❌ Lỗi mạng"
                error_count += 1

            for row_idx, r_item in enumerate(self.records_data):
                if r_item["id"] == reg_id:
                    self.after(0, lambda ri=row_idx, st=rec["submit_status"]: self.tree.set(str(ri), "submit_status", st))
                    break

            time.sleep(0.4)

        self.after(0, lambda: self.finish_submit(success_count, error_count))

    def finish_submit(self, success_count, error_count):
        self.is_submitting = False
        self.btn_scan.config(state=tk.NORMAL)
        msg = f"Đã hoàn tất Submit: {success_count} thành công"
        if error_count > 0:
            msg += f", {error_count} thất bại"
        self.lbl_summary.config(text=f"🏁 {msg}!", fg="#22c55e" if error_count == 0 else "#f59e0b")
        messagebox.showinfo("Kết quả Submit", f"{msg} trên hệ thống VinFast DMS!")

class PurchaseReceiptModal(tk.Toplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.parent = parent
        self.title("Nhập Kho Xe - Tự Động Tra VIN Tìm PO & Phát Hành PR")
        self.geometry("1140x720")
        self.minsize(980, 580)
        self.configure(bg="#0f172a")
        self.transient(parent)
        self.grab_set()

        self.records_data = []
        self.is_scanning = False
        self.is_releasing = False

        self.create_widgets()

    def create_widgets(self):
        # Header
        header = tk.Frame(self, bg="#1e293b", padx=20, pady=12)
        header.pack(fill=tk.X)

        lbl = tk.Label(header, text="📦 NHẬP KHO XE & PHÁT HÀNH PHIẾU PR (PURCHASE RECEIPT)",
                       font=("Segoe UI", 12, "bold"), fg="#a855f7", bg="#1e293b")
        lbl.pack(anchor="w")

        sub = tk.Label(header, text="Nhập số VIN -> Tự động tìm PO và Phiếu PR -> Phát hành nhập kho (xts_handling = 2, calculatetax = true).",
                       font=("Segoe UI", 9), fg="#94a3b8", bg="#1e293b")
        sub.pack(anchor="w", pady=(2, 0))

        # Controls Frame
        ctrl_frame = tk.Frame(self, bg="#1e293b", padx=15, pady=12, highlightbackground="#334155", highlightthickness=1)
        ctrl_frame.pack(fill=tk.X, padx=15, pady=12)

        # Row 0: Dealer selector + Mode options + Scan button
        f_top_ctrl = tk.Frame(ctrl_frame, bg="#1e293b")
        f_top_ctrl.pack(fill=tk.X)

        tk.Label(f_top_ctrl, text="Đại lý:", font=("Segoe UI", 10, "bold"), fg="#cbd5e1", bg="#1e293b").pack(side=tk.LEFT, padx=(0, 6))
        dealer_codes = [d.get("dealer_code") for d in self.parent.dealers if d.get("cookie", "").strip()]
        if not dealer_codes:
            dealer_codes = [d.get("dealer_code") for d in self.parent.dealers]
        
        combo_values = ["Tất cả đại lý"] + dealer_codes if len(dealer_codes) > 1 else dealer_codes
        self.var_dealer = tk.StringVar(value=combo_values[0] if combo_values else "N31913")
        self.cb_dealer = ttk.Combobox(f_top_ctrl, textvariable=self.var_dealer, values=combo_values, state="readonly", width=14, font=("Segoe UI", 10))
        self.cb_dealer.pack(side=tk.LEFT, padx=(0, 18))

        # Radio options
        self.var_mode = tk.StringVar(value="vin_list")
        
        rb_vin = tk.Radiobutton(f_top_ctrl, text="🚗 Tra theo số VIN (Khung)", variable=self.var_mode, value="vin_list",
                                font=("Segoe UI", 9, "bold"), fg="#38bdf8", bg="#1e293b", activebackground="#1e293b", selectcolor="#0f172a",
                                command=self.toggle_mode)
        rb_vin.pack(side=tk.LEFT, padx=(0, 14))

        rb_po = tk.Radiobutton(f_top_ctrl, text="📄 Tra theo số PO", variable=self.var_mode, value="po_list",
                               font=("Segoe UI", 9), fg="#f8fafc", bg="#1e293b", activebackground="#1e293b", selectcolor="#0f172a",
                               command=self.toggle_mode)
        rb_po.pack(side=tk.LEFT, padx=(0, 14))

        rb_open = tk.Radiobutton(f_top_ctrl, text="⚡ Quét tất cả PR Mở", variable=self.var_mode, value="all_open",
                                 font=("Segoe UI", 9), fg="#f8fafc", bg="#1e293b", activebackground="#1e293b", selectcolor="#0f172a",
                                 command=self.toggle_mode)
        rb_open.pack(side=tk.LEFT, padx=(0, 15))

        self.btn_scan = tk.Button(f_top_ctrl, text="🔍 TRA CỨU PHIẾU PR", font=("Segoe UI", 10, "bold"),
                                  bg="#7c3aed", fg="#ffffff", activebackground="#6d28d9",
                                  relief="flat", padx=16, pady=5, cursor="hand2", command=self.start_scan)
        self.btn_scan.pack(side=tk.RIGHT)

        # Input box container (shown when mode is vin_list or po_list)
        self.frame_input = tk.Frame(ctrl_frame, bg="#1e293b")
        self.frame_input.pack(fill=tk.X, pady=(10, 0))

        self.lbl_input_title = tk.Label(self.frame_input, text="Dán danh sách số VIN / Số Khung (cách nhau bởi dấu phẩy, khoảng trắng hoặc xuống dòng):",
                                        font=("Segoe UI", 9), fg="#94a3b8", bg="#1e293b")
        self.lbl_input_title.pack(anchor="w", pady=(0, 3))

        self.txt_input = tk.Text(self.frame_input, height=3, bg="#0f172a", fg="#f8fafc", font=("Consolas", 9), relief="flat", insertbackground="#38bdf8")
        self.txt_input.pack(fill=tk.X)
        self.txt_input.insert("1.0", "")

        # Table
        table_frame = tk.Frame(self, bg="#1e293b", highlightbackground="#334155", highlightthickness=1)
        table_frame.pack(fill=tk.BOTH, expand=True, padx=15, pady=(0, 10))

        columns = ("stt", "vin", "po_num", "pr_num", "pr_status", "createdon", "action_status")
        self.tree = ttk.Treeview(table_frame, columns=columns, show="headings", selectmode="browse")

        self.tree.heading("stt", text="STT")
        self.tree.heading("vin", text="Số Khung (VIN)")
        self.tree.heading("po_num", text="Số Đơn PO")
        self.tree.heading("pr_num", text="Số Phiếu PR (Nhập kho)")
        self.tree.heading("pr_status", text="Trạng thái PR")
        self.tree.heading("createdon", text="Ngày tạo PR")
        self.tree.heading("action_status", text="Trạng thái / Thao tác")

        self.tree.column("stt", width=45, anchor="center")
        self.tree.column("vin", width=175, anchor="center")
        self.tree.column("po_num", width=195, anchor="center")
        self.tree.column("pr_num", width=195, anchor="center")
        self.tree.column("pr_status", width=130, anchor="center")
        self.tree.column("createdon", width=150, anchor="center")
        self.tree.column("action_status", width=180, anchor="center")

        scroll_y = ttk.Scrollbar(table_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroll_y.set)
        scroll_y.pack(side=tk.RIGHT, fill=tk.Y)

        scroll_x = ttk.Scrollbar(table_frame, orient=tk.HORIZONTAL, command=self.tree.xview)
        self.tree.configure(xscrollcommand=scroll_x.set)
        scroll_x.pack(side=tk.BOTTOM, fill=tk.X)

        self.tree.pack(fill=tk.BOTH, expand=True)

        # Bottom Frame
        bottom = tk.Frame(self, bg="#0f172a", padx=15, pady=10)
        bottom.pack(fill=tk.X)

        self.lbl_summary = tk.Label(bottom, text="Chưa tra cứu. Vui lòng dán số VIN hoặc số PO rồi bấm 'Tra cứu'.",
                                    font=("Segoe UI", 10), fg="#94a3b8", bg="#0f172a")
        self.lbl_summary.pack(side=tk.LEFT)

        self.btn_release_all = tk.Button(bottom, text="🚀 PHÁT HÀNH TẤT CẢ PHIẾU PR (RELEASE)", font=("Segoe UI", 10, "bold"),
                                         bg="#7c3aed", fg="#ffffff", activebackground="#6d28d9",
                                         relief="flat", padx=18, pady=8, cursor="hand2", state=tk.DISABLED,
                                         command=self.confirm_and_release)
        self.btn_release_all.pack(side=tk.RIGHT)

    def toggle_mode(self):
        mode = self.var_mode.get()
        if mode == "vin_list":
            self.frame_input.pack(fill=tk.X, pady=(10, 0))
            self.lbl_input_title.config(text="Dán danh sách số VIN / Số Khung (cách nhau bởi dấu phẩy, khoảng trắng hoặc xuống dòng):")
        elif mode == "po_list":
            self.frame_input.pack(fill=tk.X, pady=(10, 0))
            self.lbl_input_title.config(text="Dán danh sách số Đơn PO (cách nhau bởi dấu phẩy, khoảng trắng hoặc xuống dòng):")
        else:
            self.frame_input.pack_forget()

    def start_scan(self):
        if self.is_scanning or self.is_releasing:
            return

        dealer_choice = self.var_dealer.get()
        target_dealers = []
        if dealer_choice == "Tất cả đại lý":
            target_dealers = [d for d in self.parent.dealers if d.get("cookie", "").strip()]
        else:
            dealer = next((d for d in self.parent.dealers if d.get("dealer_code") == dealer_choice), None)
            if dealer and dealer.get("cookie", "").strip():
                target_dealers = [dealer]

        if not target_dealers:
            messagebox.showwarning("Thông báo", f"Đại lý được chọn chưa có Cookie hoặc chưa được cấu hình!")
            return

        for item in self.tree.get_children():
            self.tree.delete(item)
        self.records_data.clear()
        self.btn_release_all.config(state=tk.DISABLED)
        self.btn_scan.config(state=tk.DISABLED, bg="#64748b")
        self.is_scanning = True

        mode = self.var_mode.get()
        input_list = []
        if mode in ["vin_list", "po_list"]:
            raw = self.txt_input.get("1.0", tk.END).strip()
            input_list = [x.strip().upper() for x in re.split(r"[\n,;\s]+", raw) if x.strip()]
            if not input_list:
                label_type = "số VIN" if mode == "vin_list" else "số PO"
                messagebox.showwarning("Thông báo", f"Vui lòng nhập ít nhất 1 {label_type}!")
                self.is_scanning = False
                self.btn_scan.config(state=tk.NORMAL, bg="#7c3aed")
                return

        self.lbl_summary.config(text=f"⏳ Đang tra cứu dữ liệu từ DMS ({dealer_choice})...", fg="#38bdf8")

        thread = threading.Thread(target=self.run_scan_thread, args=(target_dealers, mode, input_list))
        thread.daemon = True
        thread.start()

    def query_single_vin(self, clean_vin, target_dealers):
        """Dò tìm PO và PR từ số VIN trên danh sách các đại lý có cấu hình"""
        for dealer in target_dealers:
            cookie = dealer.get("cookie")
            headers = get_dms_headers(cookie)
            d_code = dealer.get("dealer_code")

            # 1. Tra cứu trực tiếp trong chi tiết phiếu nhập kho: xts_purchasereceiptdetails
            try:
                url_prd = f"{BASE_API_URL}/xts_purchasereceiptdetails?$filter=xts_chassisnumberregister eq '{clean_vin}'&$select=xts_purchasereceiptdetailid,xts_chassisnumberregister,_xts_purchasereceiptid_value,xts_productdescription"
                r_prd = requests.get(url_prd, headers=headers, timeout=12)
                if r_prd.status_code == 200:
                    prd_items = r_prd.json().get("value", [])
                    if prd_items:
                        res_list = []
                        for item in prd_items:
                            pr_id = item.get("_xts_purchasereceiptid_value")
                            pr_num = "---"
                            po_num = "---"
                            status_str = "---"
                            createdon = "---"
                            is_open = False

                            if pr_id:
                                r_pr = requests.get(f"{BASE_API_URL}/xts_purchasereceipts({pr_id})", headers=headers, timeout=12)
                                if r_pr.status_code == 200:
                                    pr_data = r_pr.json()
                                    pr_num = pr_data.get("xts_purchasereceiptnumber") or f"PR-{pr_id[:8]}"
                                    st_val = pr_data.get("xts_status")
                                    status_str = pr_data.get("xts_status@OData.Community.Display.V1.FormattedValue") or (
                                        "Mở (Chờ phát hành)" if st_val == 1 else ("Đã phát hành" if st_val == 3 else f"Trạng thái {st_val}")
                                    )
                                    is_open = (st_val == 1 or "mở" in status_str.lower())
                                    createdon = pr_data.get("createdon@OData.Community.Display.V1.FormattedValue") or pr_data.get("createdon", "")[:19].replace("T", " ")

                                    po_num = pr_data.get("xts_purchaseordernumber")
                                    po_id = pr_data.get("_xts_purchaseorderid_value")
                                    if not po_num and po_id:
                                        r_po = requests.get(f"{BASE_API_URL}/xts_purchaseorders({po_id})", headers=headers, timeout=10)
                                        if r_po.status_code == 200:
                                            po_num = r_po.json().get("xts_purchaseordernumber") or "---"

                            res_list.append({
                                "vin": clean_vin,
                                "po_num": po_num or "---",
                                "pr_id": pr_id,
                                "pr_num": pr_num,
                                "status": status_str,
                                "is_open": is_open,
                                "createdon": createdon,
                                "action_status": "Chờ phát hành" if is_open else "Đã phát hành trước đó",
                                "cookie": cookie,
                                "dealer": d_code
                            })
                        return res_list
            except Exception:
                pass

            # 2. Nếu chưa có trong PR details, tra trong Kho Xe: xts_inventorynewvehicles để lấy số PO
            try:
                url_inv = f"{BASE_API_URL}/xts_inventorynewvehicles?$filter=xts_chassisnumber eq '{clean_vin}'&$select=xts_inventorynewvehicleid,xts_chassisnumber,xts_referencenumber,xts_dmsreferencenumber"
                r_inv = requests.get(url_inv, headers=headers, timeout=12)
                if r_inv.status_code == 200:
                    inv_items = r_inv.json().get("value", [])
                    if inv_items:
                        po_num = inv_items[0].get("xts_referencenumber") or "---"
                        if po_num and po_num != "---":
                            # Tìm PR theo PO tìm được
                            r_po = requests.get(f"{BASE_API_URL}/xts_purchaseorders?$select=xts_purchaseorderid&$filter=xts_purchaseordernumber eq '{po_num}'", headers=headers, timeout=10)
                            if r_po.status_code == 200 and r_po.json().get("value"):
                                po_rec_id = r_po.json()["value"][0]["xts_purchaseorderid"]
                                r_pr = requests.get(f"{BASE_API_URL}/xts_purchasereceipts?$filter=_xts_purchaseorderid_value eq {po_rec_id}", headers=headers, timeout=10)
                                if r_pr.status_code == 200:
                                    pr_items = r_pr.json().get("value", [])
                                    if pr_items:
                                        res_list = []
                                        for pr_row in pr_items:
                                            p_id = pr_row.get("xts_purchasereceiptid")
                                            p_num = pr_row.get("xts_purchasereceiptnumber") or f"PR-{p_id[:8]}"
                                            st_v = pr_row.get("xts_status")
                                            st_s = pr_row.get("xts_status@OData.Community.Display.V1.FormattedValue") or (
                                                "Mở (Chờ phát hành)" if st_v == 1 else ("Đã phát hành" if st_v == 3 else f"Trạng thái {st_v}")
                                            )
                                            is_op = (st_v == 1 or "mở" in st_s.lower())
                                            c_on = pr_row.get("createdon@OData.Community.Display.V1.FormattedValue") or pr_row.get("createdon", "")[:19].replace("T", " ")
                                            res_list.append({
                                                "vin": clean_vin,
                                                "po_num": po_num,
                                                "pr_id": p_id,
                                                "pr_num": p_num,
                                                "status": st_s,
                                                "is_open": is_op,
                                                "createdon": c_on,
                                                "action_status": "Chờ phát hành" if is_op else "Đã phát hành trước đó",
                                                "cookie": cookie,
                                                "dealer": d_code
                                            })
                                        return res_list

                        return [{
                            "vin": clean_vin,
                            "po_num": po_num,
                            "pr_id": None,
                            "pr_num": "Chưa có PR",
                            "status": "Chưa tạo PR",
                            "is_open": False,
                            "createdon": "-",
                            "action_status": "⚠️ Đã có PO nhưng chưa tạo PR",
                            "cookie": cookie,
                            "dealer": d_code
                        }]
            except Exception:
                pass

        # 3. Không tìm thấy trên các đại lý
        return [{
            "vin": clean_vin,
            "po_num": "---",
            "pr_id": None,
            "pr_num": "Không tìm thấy PR",
            "status": "Không tìm thấy",
            "is_open": False,
            "createdon": "-",
            "action_status": "❌ Không tìm thấy xe trong hệ thống",
            "cookie": target_dealers[0].get("cookie") if target_dealers else "",
            "dealer": target_dealers[0].get("dealer_code") if target_dealers else ""
        }]

    def run_scan_thread(self, target_dealers, mode, input_list):
        results = []

        if mode == "vin_list":
            for vin in input_list:
                res = self.query_single_vin(vin, target_dealers)
                results.extend(res)

        elif mode == "all_open":
            for dealer in target_dealers:
                cookie = dealer.get("cookie")
                headers = get_dms_headers(cookie)
                d_code = dealer.get("dealer_code")
                fxml = '''<fetch>
                    <entity name="xts_purchasereceipt">
                        <attribute name="xts_purchasereceiptid" />
                        <attribute name="xts_purchasereceiptnumber" />
                        <attribute name="xts_status" />
                        <attribute name="xts_handling" />
                        <attribute name="createdon" />
                        <filter type="and">
                            <condition attribute="xts_status" operator="eq" value="1" />
                        </filter>
                        <link-entity name="xts_purchaseorder" from="xts_purchaseorderid" to="xts_purchaseorderid" link-type="outer" alias="po">
                            <attribute name="xts_purchaseordernumber" />
                        </link-entity>
                    </entity>
                </fetch>'''
                try:
                    r = requests.get(f"{BASE_API_URL}/xts_purchasereceipts", headers=headers, params={"fetchXml": fxml}, timeout=15)
                    if r.status_code == 200:
                        for row in r.json().get("value", []):
                            pr_id = row.get("xts_purchasereceiptid")
                            pr_num = row.get("xts_purchasereceiptnumber") or f"PR-{pr_id[:8]}"
                            po_num = row.get("po.xts_purchaseordernumber") or "---"
                            status_str = row.get("xts_status@OData.Community.Display.V1.FormattedValue") or "Mở (Chờ phát hành)"
                            created = row.get("createdon@OData.Community.Display.V1.FormattedValue") or row.get("createdon", "")[:19].replace("T", " ")
                            
                            # Tìm số VIN trong PR detail nếu có
                            vin_found = "---"
                            try:
                                r_detail = requests.get(f"{BASE_API_URL}/xts_purchasereceiptdetails?$filter=_xts_purchasereceiptid_value eq {pr_id}&$select=xts_chassisnumberregister&$top=1", headers=headers, timeout=6)
                                if r_detail.status_code == 200 and r_detail.json().get("value"):
                                    vin_found = r_detail.json()["value"][0].get("xts_chassisnumberregister") or "---"
                            except Exception:
                                pass

                            results.append({
                                "vin": vin_found,
                                "pr_id": pr_id,
                                "pr_num": pr_num,
                                "po_num": po_num,
                                "status": status_str,
                                "is_open": True,
                                "createdon": created,
                                "action_status": "Chờ phát hành",
                                "cookie": cookie,
                                "dealer": d_code
                            })
                except Exception as e:
                    self.after(0, lambda err=str(e): self.finish_scan([], err))
                    return

        else: # po_list
            for poNum in input_list:
                found_for_po = False
                for dealer in target_dealers:
                    cookie = dealer.get("cookie")
                    headers = get_dms_headers(cookie)
                    d_code = dealer.get("dealer_code")
                    clean_po = poNum.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')
                    fxml = f'''<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">
                        <entity name="xts_purchasereceipt">
                            <attribute name="xts_purchasereceiptid" />
                            <attribute name="xts_purchasereceiptnumber" />
                            <attribute name="xts_status" />
                            <attribute name="xts_handling" />
                            <attribute name="createdon" />
                            <link-entity name="xts_purchaseorder" from="xts_purchaseorderid" to="xts_purchaseorderid" link-type="inner" alias="po">
                                <attribute name="xts_purchaseordernumber" />
                                <filter type="and">
                                    <condition attribute="xts_purchaseordernumber" operator="eq" value="{clean_po}" />
                                </filter>
                            </link-entity>
                        </entity>
                    </fetch>'''
                    try:
                        r = requests.get(f"{BASE_API_URL}/xts_purchasereceipts", headers=headers, params={"fetchXml": fxml}, timeout=10)
                        items = r.json().get("value", []) if r.status_code == 200 else []

                        if not items:
                            r_po = requests.get(f"{BASE_API_URL}/xts_purchaseorders?$select=xts_purchaseorderid&$filter=xts_purchaseordernumber eq '{poNum}'", headers=headers, timeout=10)
                            if r_po.status_code == 200 and r_po.json().get("value"):
                                p_id = r_po.json()["value"][0]["xts_purchaseorderid"]
                                r_pr = requests.get(f"{BASE_API_URL}/xts_purchasereceipts?$filter=_xts_purchaseorderid_value eq {p_id}", headers=headers, timeout=10)
                                if r_pr.status_code == 200:
                                    items = r_pr.json().get("value", [])

                        if items:
                            found_for_po = True
                            for row in items:
                                pr_id = row.get("xts_purchasereceiptid")
                                pr_num = row.get("xts_purchasereceiptnumber") or f"PR-{pr_id[:8]}"
                                st_v = row.get("xts_status")
                                status_str = row.get("xts_status@OData.Community.Display.V1.FormattedValue") or (
                                    "Mở (Chờ phát hành)" if st_v == 1 else ("Đã phát hành" if st_v == 3 else f"Trạng thái {st_v}")
                                )
                                is_open = (st_v == 1 or "mở" in status_str.lower())
                                created = row.get("createdon@OData.Community.Display.V1.FormattedValue") or row.get("createdon", "")[:19].replace("T", " ")
                                
                                vin_found = "---"
                                try:
                                    r_det = requests.get(f"{BASE_API_URL}/xts_purchasereceiptdetails?$filter=_xts_purchasereceiptid_value eq {pr_id}&$select=xts_chassisnumberregister&$top=1", headers=headers, timeout=6)
                                    if r_det.status_code == 200 and r_det.json().get("value"):
                                        vin_found = r_det.json()["value"][0].get("xts_chassisnumberregister") or "---"
                                except Exception:
                                    pass

                                results.append({
                                    "vin": vin_found,
                                    "pr_id": pr_id,
                                    "pr_num": pr_num,
                                    "po_num": poNum,
                                    "status": status_str,
                                    "is_open": is_open,
                                    "createdon": created,
                                    "action_status": "Chờ phát hành" if is_open else "Đã phát hành trước đó",
                                    "cookie": cookie,
                                    "dealer": d_code
                                })
                            break
                    except Exception:
                        pass

                if not found_for_po:
                    results.append({
                        "vin": "---",
                        "pr_id": None,
                        "pr_num": "Không tìm thấy PR",
                        "po_num": poNum,
                        "status": "Không có PR",
                        "is_open": False,
                        "createdon": "-",
                        "action_status": "❌ Không có phiếu",
                        "cookie": target_dealers[0].get("cookie"),
                        "dealer": target_dealers[0].get("dealer_code")
                    })

        self.after(0, lambda: self.finish_scan(results, None))

    def finish_scan(self, results, error):
        self.is_scanning = False
        self.btn_scan.config(state=tk.NORMAL, bg="#7c3aed")

        if error:
            self.lbl_summary.config(text=f"❌ Lỗi tra cứu: {error}", fg="#ef4444")
            messagebox.showerror("Lỗi", f"Không thể tra cứu:\n{error}")
            return

        self.records_data = results
        for idx, rec in enumerate(results, start=1):
            self.tree.insert("", tk.END, iid=str(idx-1), values=(
                idx,
                rec["vin"],
                rec["po_num"],
                rec["pr_num"],
                rec["status"],
                rec["createdon"],
                rec["action_status"]
            ))

        open_count = sum(1 for r in results if r["is_open"] and r["pr_id"])
        self.lbl_summary.config(
            text=f"Tổng kết quả: {len(results)}  |  🟢 Cần phát hành (Mở): {open_count}  |  ⚪ Đã phát hành / Khác: {len(results) - open_count}",
            fg="#22c55e" if open_count > 0 else "#94a3b8"
        )

        if open_count > 0:
            self.btn_release_all.config(state=tk.NORMAL)
        else:
            self.btn_release_all.config(state=tk.DISABLED)

    def confirm_and_release(self):
        to_release = [r for r in self.records_data if r["is_open"] and r["pr_id"] and "Chờ" in r["action_status"]]
        if not to_release:
            messagebox.showinfo("Thông báo", "Không có phiếu PR nào đang ở trạng thái 'Mở' để phát hành!")
            return

        cf = messagebox.askyesno(
            "Xác nhận phát hành PR",
            f"Bạn có chắc chắn muốn PHÁT HÀNH (RELEASE) {len(to_release)} phiếu PR để nhập kho trên DMS không?\n\n"
            "Thao tác này tương đương nút Phát hành trên DMS (xts_handling=2, calculatetax=true)!"
        )
        if not cf:
            return

        self.is_releasing = True
        self.btn_release_all.config(state=tk.DISABLED)
        self.btn_scan.config(state=tk.DISABLED)

        thread = threading.Thread(target=self.run_release_thread, args=(to_release,))
        thread.daemon = True
        thread.start()

    def run_release_thread(self, to_release):
        success_count = 0
        fail_count = 0

        for idx, rec in enumerate(to_release):
            pr_id = rec["pr_id"]
            cookie = rec["cookie"]
            headers = get_dms_headers(cookie)
            url = f"{BASE_API_URL}/xts_purchasereceipts({pr_id})"

            payload = {
                "xts_handling": 2,
                "xts_calculatetax": True
            }

            try:
                r = requests.patch(url, headers=headers, json=payload, timeout=12)
                if r.status_code in [200, 204]:
                    rec["action_status"] = "✅ Đã phát hành (Nhập kho)"
                    rec["status"] = "Đã phát hành"
                    rec["is_open"] = False
                    success_count += 1
                else:
                    rec["action_status"] = f"❌ Lỗi {r.status_code}"
                    fail_count += 1
            except Exception as e:
                rec["action_status"] = f"❌ {e}"
                fail_count += 1

            for row_idx, r_item in enumerate(self.records_data):
                if r_item.get("pr_id") == pr_id:
                    self.after(0, lambda ri=row_idx, st=rec["action_status"], ps=rec["status"]: (
                        self.tree.set(str(ri), "action_status", st),
                        self.tree.set(str(ri), "pr_status", ps)
                    ))
                    break

            time.sleep(0.5)

        self.after(0, lambda: self.finish_release(success_count, fail_count))

    def finish_release(self, success_count, fail_count):
        self.is_releasing = False
        self.btn_scan.config(state=tk.NORMAL)
        msg = f"Đã phát hành {success_count} phiếu PR thành công"
        if fail_count > 0:
            msg += f", {fail_count} thất bại"
        self.lbl_summary.config(text=f"🏁 {msg}!", fg="#22c55e" if fail_count == 0 else "#f59e0b")
        messagebox.showinfo("Kết quả Nhập kho PR", f"{msg} trên hệ thống VinFast DMS!")




class ExtensionHelpModal(tk.Toplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.title("Đồng bộ Cookie từ Chrome đang mở (1 Click)")
        self.geometry("640x480")
        self.configure(bg="#0f172a")
        self.transient(parent)
        self.grab_set()

        lbl_title = tk.Label(self, text="🧩 ĐỒNG BỘ COOKIE TỪ CHROME ĐANG MỞ", font=("Segoe UI", 12, "bold"), fg="#38bdf8", bg="#0f172a")
        lbl_title.pack(pady=(16, 8))

        steps_text = (
            "Để App tự động lấy Cookie từ chính trình duyệt Chrome bạn đang đăng nhập sẵn:\n\n"
            "1️⃣  Trên Chrome đang mở, vào đường dẫn:  chrome://extensions\n\n"
            "2️⃣  Gạt bật công tắc 'Chế độ dành cho nhà phát triển' (Developer mode) ở góc phải trên.\n\n"
            "3️⃣  Bấm nút 'Tải tiện ích đã giải nén' (Load unpacked) -> Chọn thư mục:\n"
            f"     📁 {os.path.abspath('dms_sync_extension')}\n\n"
            "👉 Từ nay, mỗi khi ở tab DMS, bạn chỉ cần bấm biểu tượng Tiện ích trên Chrome -> "
            "Bấm 'ĐỒNG BỘ VÀO APP' là Cookie được nạp thẳng vào App ngay lập tức (không cần gõ lại mật khẩu)!"
        )

        lbl_steps = tk.Label(self, text=steps_text, font=("Segoe UI", 10), fg="#f8fafc", bg="#1e293b", 
                             justify="left", padx=16, pady=16, relief="flat", highlightbackground="#334155", highlightthickness=1)
        lbl_steps.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)

        btn_frame = tk.Frame(self, bg="#0f172a", pady=10)
        btn_frame.pack(fill=tk.X)

        btn_open_folder = tk.Button(btn_frame, text="📂 Mở Thư Mục Tiện Ích Trên Máy", font=("Segoe UI", 9, "bold"),
                                    bg="#0284c7", fg="#ffffff", padx=14, pady=6, relief="flat", cursor="hand2",
                                    command=lambda: os.startfile(os.path.abspath("dms_sync_extension")))
        btn_open_folder.pack(side=tk.LEFT, padx=20)

        btn_close = tk.Button(btn_frame, text="Đóng", font=("Segoe UI", 9), bg="#334155", fg="#cbd5e1",
                             padx=16, pady=6, relief="flat", cursor="hand2", command=self.destroy)
        btn_close.pack(side=tk.RIGHT, padx=20)

class ConfigModal(tk.Toplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.parent = parent
        self.title("Cài đặt Cookie / cURL các Đại lý DMS")
        self.geometry("860x640")
        self.minsize(700, 500)
        self.configure(bg="#0f172a")
        self.transient(parent)
        self.grab_set()

        lbl = tk.Label(self, text="CẤU HÌNH TÀI KHOẢN CÁC ĐẠI LÝ DMS", font=("Segoe UI", 12, "bold"), fg="#38bdf8", bg="#0f172a")
        lbl.pack(pady=(12, 4))

        inst = tk.Label(self, text="Hỗ trợ: Đồng bộ từ Tiện ích Chrome | Dán cURL (Copy as cURL) | Dán chuỗi Cookie.",
                        font=("Segoe UI", 9), fg="#94a3b8", bg="#0f172a", justify="center")
        inst.pack(pady=(0, 10))

        # Scrollable container for dealer list
        container = tk.Frame(self, bg="#0f172a")
        container.pack(fill=tk.BOTH, expand=True, padx=15)

        canvas = tk.Canvas(container, bg="#0f172a", highlightthickness=0)
        scrollbar = ttk.Scrollbar(container, orient="vertical", command=canvas.yview)
        self.scrollable_frame = tk.Frame(canvas, bg="#0f172a")

        self.scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas.create_window((0, 0), window=self.scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        self.text_boxes = {}
        self.status_badges = {}

        for idx, d in enumerate(self.parent.dealers):
            self.add_dealer_row(d)

        # Bottom buttons
        btn_frame = tk.Frame(self, bg="#0f172a", pady=10)
        btn_frame.pack(fill=tk.X)

        btn_add = tk.Button(btn_frame, text="+ Thêm Đại Lý Khác", font=("Segoe UI", 9), bg="#334155", fg="#cbd5e1",
                            padx=12, pady=6, relief="flat", cursor="hand2", command=self.prompt_add_dealer)
        btn_add.pack(side=tk.LEFT, padx=20)

        btn_save = tk.Button(btn_frame, text="💾 LƯU CẤU HÌNH", font=("Segoe UI", 10, "bold"), bg="#0284c7", fg="#ffffff",
                             padx=24, pady=8, relief="flat", cursor="hand2", command=self.save_and_close)
        btn_save.pack(side=tk.RIGHT, padx=20)

    def refresh_dealer_data(self):
        for d in self.parent.dealers:
            code = d.get("dealer_code")
            if code in self.text_boxes:
                self.text_boxes[code].delete("1.0", tk.END)
                self.text_boxes[code].insert("1.0", d.get("cookie", ""))
                badge = self.status_badges.get(code)
                if badge:
                    has_cookie = bool(d.get("cookie", "").strip())
                    badge.config(text="🟢 Đã có cấu hình" if has_cookie else "⚪ Chưa có Cookie", 
                                 fg="#22c55e" if has_cookie else "#94a3b8")

    def add_dealer_row(self, d):
        code = d.get("dealer_code")
        f_row = tk.Frame(self.scrollable_frame, bg="#1e293b", padx=12, pady=10, highlightbackground="#334155", highlightthickness=1)
        f_row.pack(fill=tk.X, pady=6, expand=True)

        header_row = tk.Frame(f_row, bg="#1e293b")
        header_row.pack(fill=tk.X)

        lbl_d = tk.Label(header_row, text=f"Đại lý: {code} ({d.get('name', '')})", font=("Segoe UI", 10, "bold"), fg="#38bdf8", bg="#1e293b")
        lbl_d.pack(side=tk.LEFT)

        # Status badge
        has_cookie = bool(d.get("cookie", "").strip())
        init_badge = "🟢 Đã có cấu hình" if has_cookie else "⚪ Chưa có Cookie"
        init_color = "#22c55e" if has_cookie else "#94a3b8"
        badge = tk.Label(header_row, text=init_badge, font=("Segoe UI", 9), fg=init_color, bg="#1e293b")
        badge.pack(side=tk.RIGHT, padx=(10, 0))
        self.status_badges[code] = badge

        # Test button
        btn_test = tk.Button(header_row, text="⚡ Kiểm tra", font=("Segoe UI", 8, "bold"),
                             bg="#0284c7", fg="#ffffff", activebackground="#0369a1",
                             relief="flat", padx=8, pady=2, cursor="hand2",
                             command=lambda c=code: self.test_connection_for(c))
        btn_test.pack(side=tk.RIGHT, padx=(0, 6))

        txt = tk.Text(f_row, height=3, bg="#0f172a", fg="#f8fafc", font=("Consolas", 9), relief="flat", insertbackground="#38bdf8")
        txt.pack(fill=tk.X, pady=(6, 0))
        txt.insert("1.0", d.get("cookie", ""))
        self.text_boxes[code] = txt

    def test_connection_for(self, code):
        badge = self.status_badges.get(code)
        raw = self.text_boxes[code].get("1.0", tk.END).strip()
        clean = extract_clean_cookie(raw)
        if not clean:
            badge.config(text="🔴 Chưa nhập Cookie", fg="#ef4444")
            return

        badge.config(text="⏳ Đang kiểm tra...", fg="#38bdf8")
        
        def run_test():
            ok, msg = test_dealer_connection(clean)
            if ok:
                badge.config(text="🟢 Kết nối thành công!", fg="#22c55e")
            else:
                badge.config(text=f"🔴 {msg}", fg="#ef4444")
                
        t = threading.Thread(target=run_test)
        t.daemon = True
        t.start()

    def prompt_add_dealer(self):
        dialog = tk.Toplevel(self)
        dialog.title("Thêm Đại Lý Mới")
        dialog.geometry("340x180")
        dialog.configure(bg="#0f172a")
        dialog.transient(self)
        dialog.grab_set()

        tk.Label(dialog, text="Mã đại lý (ví dụ: N31925):", font=("Segoe UI", 9, "bold"), fg="#cbd5e1", bg="#0f172a").pack(pady=(15, 2))
        e_code = tk.Entry(dialog, font=("Segoe UI", 10), bg="#1e293b", fg="#ffffff", insertbackground="#38bdf8")
        e_code.pack(padx=20, fill=tk.X)

        tk.Label(dialog, text="Tên đại lý:", font=("Segoe UI", 9, "bold"), fg="#cbd5e1", bg="#0f172a").pack(pady=(10, 2))
        e_name = tk.Entry(dialog, font=("Segoe UI", 10), bg="#1e293b", fg="#ffffff", insertbackground="#38bdf8")
        e_name.pack(padx=20, fill=tk.X)

        def do_add():
            c = e_code.get().strip().upper()
            n = e_name.get().strip() or f"VinFast Showroom {c}"
            if not c:
                messagebox.showwarning("Thiếu thông tin", "Vui lòng nhập mã đại lý!")
                return
            new_dealer = {"dealer_code": c, "name": n, "cookie": ""}
            self.parent.dealers.append(new_dealer)
            self.add_dealer_row(new_dealer)
            dialog.destroy()

        tk.Button(dialog, text="Thêm Ngay", font=("Segoe UI", 9, "bold"), bg="#0284c7", fg="#ffffff",
                  relief="flat", pady=4, padx=15, cursor="hand2", command=do_add).pack(pady=15)

    def save_and_close(self):
        for d in self.parent.dealers:
            code = d.get("dealer_code")
            if code in self.text_boxes:
                raw = self.text_boxes[code].get("1.0", tk.END).strip()
                d["cookie"] = extract_clean_cookie(raw)
        save_config(self.parent.dealers)
        messagebox.showinfo("Thành công", "Đã lưu cấu hình Cookie thành công!")
        self.destroy()

class BatchSearchModal(tk.Toplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.parent = parent
        self.title("Tra cứu hàng loạt nhiều số VIN")
        self.geometry("580x540")
        self.minsize(450, 400)
        self.configure(bg="#0f172a")
        self.transient(parent)
        self.grab_set()

        lbl = tk.Label(self, text="DÁN DANH SÁCH SỐ KHUNG (MỖI DÒNG 1 SỐ VIN):", font=("Segoe UI", 11, "bold"), fg="#38bdf8", bg="#0f172a")
        lbl.pack(pady=(15, 4))

        hint = tk.Label(self, text="Phím tắt: Bấm Ctrl + Enter để bắt đầu tìm kiếm ngay", font=("Segoe UI", 9), fg="#94a3b8", bg="#0f172a")
        hint.pack(pady=(0, 8))

        # Bottom action frame (packed first at BOTTOM so it is NEVER hidden!)
        btn_frame = tk.Frame(self, bg="#0f172a", pady=15)
        btn_frame.pack(side=tk.BOTTOM, fill=tk.X)

        btn_run = tk.Button(btn_frame, text="🔍 BẮT ĐẦU QUÉT HÀNG LOẠT", font=("Segoe UI", 10, "bold"), 
                            bg="#0284c7", fg="#ffffff", activebackground="#0369a1",
                            padx=20, pady=8, relief="flat", cursor="hand2", command=self.run_batch)
        btn_run.pack(side=tk.RIGHT, padx=20)

        btn_cancel = tk.Button(btn_frame, text="Đóng", font=("Segoe UI", 10), 
                               bg="#334155", fg="#cbd5e1", activebackground="#475569",
                               padx=16, pady=8, relief="flat", cursor="hand2", command=self.destroy)
        btn_cancel.pack(side=tk.RIGHT)

        # Center Text Box takes remaining space
        self.txt_batch = tk.Text(self, bg="#1e293b", fg="#f8fafc", font=("Consolas", 10), padx=12, pady=12, relief="flat", insertbackground="#38bdf8")
        self.txt_batch.pack(fill=tk.BOTH, expand=True, padx=20, pady=(0, 5))
        self.txt_batch.focus_set()
        self.txt_batch.bind("<Control-Return>", lambda e: self.run_batch())

    def run_batch(self):
        raw = self.txt_batch.get("1.0", tk.END).strip()
        vins = [x.strip().upper() for x in raw.split("\n") if x.strip()]
        if not vins:
            messagebox.showwarning("Thông báo", "Vui lòng nhập ít nhất 1 số khung!")
            return

        self.destroy()
        self.parent.status_lbl.config(text=f"⏳ Đang quét danh sách {len(vins)} xe trên toàn bộ đại lý...", fg="#38bdf8")
        thread = threading.Thread(target=self.parent.run_search_thread, args=(vins,))
        thread.daemon = True
        thread.start()

if __name__ == "__main__":
    app = DmsPlateFinderApp()
    app.mainloop()
