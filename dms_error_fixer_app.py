import os
import re
import json
import time
import threading
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import requests
from concurrent.futures import ThreadPoolExecutor
from dms_match_pin_fixer import DMSMatchPinFixer

CONFIG_FILE = "dms_dealers_config.json"
BASE_API_URL = "https://vinfastdms.crm5.dynamics.com/api/data/v9.0"

TARGET_CONFIG_PATHS = [
    r"c:\Users\USER\Documents\BIỂN SỐ\dms_dealers_config.json",
    r"c:\Users\USER\Documents\ordermanagement\dms_dealers_config.json"
]

DEFAULT_APPROVER_ID = "09d163f5-116d-ef11-a671-6045bd57a018" # Võ Hoàng Minh

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
    all_paths = set(TARGET_CONFIG_PATHS)
    all_paths.add(os.path.abspath(CONFIG_FILE))
    for p in all_paths:
        try:
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, "w", encoding="utf-8") as f:
                json.dump(dealers_data, f, indent=2, ensure_ascii=False)
        except Exception:
            pass

class DMSErrorFixerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("VinFast DMS - Công Cụ Sửa Lỗi Tự Động Toàn Diện v1.0")
        self.root.geometry("980x720")
        self.root.minsize(850, 600)

        self.dealers = load_dealers()
        self.current_dealer = self.dealers[0] if self.dealers else {}

        self.setup_ui()

    def get_headers(self):
        cookie = self.current_dealer.get("cookie", "")
        return {
            "Cookie": cookie,
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "Prefer": 'odata.include-annotations="*"'
        }

    def setup_ui(self):
        # Header Frame
        top_frame = ttk.LabelFrame(self.root, text=" Cấu Hình Đại Lý & Trạng Thái Kết Nối ")
        top_frame.pack(fill="x", padx=10, pady=5)

        ttk.Label(top_frame, text="Đại lý:").grid(row=0, column=0, padx=5, pady=5, sticky="w")
        self.dealer_cb = ttk.Combobox(top_frame, state="readonly", width=30)
        self.update_dealer_combobox()
        self.dealer_cb.grid(row=0, column=1, padx=5, pady=5, sticky="w")
        self.dealer_cb.bind("<<ComboboxSelected>>", self.on_dealer_change)

        self.btn_check_conn = ttk.Button(top_frame, text="⚡ Kiểm tra kết nối API", command=self.check_connection)
        self.btn_check_conn.grid(row=0, column=2, padx=5, pady=5)

        self.btn_relogin = ttk.Button(top_frame, text="🔑 Đăng nhập lại (Tự động lấy Token)", command=self.relogin_dms)
        self.btn_relogin.grid(row=0, column=3, padx=5, pady=5)

        # Tab Control
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill="both", expand=True, padx=10, pady=5)

        # Tab 1: Sửa Lỗi Đơn Hàng (Quote / SO)
        self.tab_quote = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_quote, text=" 🛠️ Sửa Lỗi Đơn Hàng / Báo Giá ")
        self.setup_tab_quote()

        # Tab 2: Xử Lý Trùng CCCD
        self.tab_cccd = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_cccd, text=" 👤 Xử Lý Trùng CCCD / Khách Hàng ")
        self.setup_tab_cccd()

        # Tab 3: Sửa Lỗi DPR
        self.tab_dpr = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_dpr, text=" 📋 Sửa Lỗi DPR (Người Duyệt / Treo Đơn) ")
        self.setup_tab_dpr()

        # Tab 4: Sửa Lỗi Ghép Xe & PIN
        self.tab_match_pin = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_match_pin, text=" 🚗 Sửa Lỗi Ghép Xe & PIN ")
        self.setup_tab_match_pin()

        # Tab 5: Gửi Phiếu Thu xuống SAP
        self.tab_phieu_thu_sap = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_phieu_thu_sap, text=" 🧾 Gửi Phiếu Thu Xuống SAP ")
        self.setup_tab_phieu_thu_sap()

        # Tab 6: Nhật Ký & Log System
        self.tab_log = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_log, text=" 📜 Nhật Ký Thực Thi (Log) ")
        self.setup_tab_log()

    def update_dealer_combobox(self):
        values = [f"{d.get('dealer_code')} - {d.get('name', 'N/A')}" for d in self.dealers]
        self.dealer_cb['values'] = values
        if values:
            self.dealer_cb.current(0)

    def on_dealer_change(self, event):
        idx = self.dealer_cb.current()
        if 0 <= idx < len(self.dealers):
            self.current_dealer = self.dealers[idx]
            self.log(f"📌 Đã chuyển sang Đại lý: {self.current_dealer.get('dealer_code')}")

    def log(self, msg):
        timestamp = time.strftime("[%H:%M:%S] ")
        full_msg = timestamp + str(msg) + "\n"
        if hasattr(self, 'txt_log'):
            self.txt_log.insert(tk.END, full_msg)
            self.txt_log.see(tk.END)
        print(full_msg, end="")

    def check_connection(self):
        def _task():
            self.log("🔍 Đang kiểm tra kết nối VinFast DMS OData API...")
            try:
                r = requests.get(f"{BASE_API_URL}/WhoAmI", headers=self.get_headers(), timeout=10)
                if r.status_code == 200:
                    data = r.json()
                    user_id = data.get("UserId")
                    self.log(f"✅ ĐÃ KẾT NỐI THÀNH CÔNG! User ID: {user_id}")
                    messagebox.showinfo("Thành công", f"Kết nối DMS thành công!\nUser ID: {user_id}")
                else:
                    self.log(f"❌ Kết nối thất bại (Mã lỗi {r.status_code}): Token/Cookie đã hết hạn!")
                    messagebox.showwarning("Lỗi Cookie", "Token Cookie đã hết hạn! Vui lòng bấm 'Đăng nhập lại' để làm mới.")
            except Exception as e:
                self.log(f"❌ Lỗi kết nối: {str(e)}")
                messagebox.showerror("Lỗi kết nối", str(e))
        threading.Thread(target=_task, daemon=True).start()

    def relogin_dms(self):
        def _task():
            dealer_code = self.current_dealer.get("dealer_code", "N31913")
            username = self.current_dealer.get("username", "")
            password = self.current_dealer.get("password", "")
            self.log(f"🚀 Đang khởi chạy tự động đăng nhập DMS cho Đại lý {dealer_code}...")
            try:
                import dms_auto_login
                success, cookie, msg = dms_auto_login.auto_login_dms(username, password, dealer_code, headless=True)
                if success:
                    self.log(f"✅ {msg}")
                    self.dealers = load_dealers()
                    self.update_dealer_combobox()
                    messagebox.showinfo("Đăng nhập thành công", "Đã cập nhật Cookie mới thành công!")
                else:
                    self.log(f"❌ {msg}")
                    messagebox.showerror("Đăng nhập thất bại", msg)
            except Exception as e:
                self.log(f"❌ Lỗi đăng nhập: {str(e)}")
                messagebox.showerror("Lỗi", str(e))
        threading.Thread(target=_task, daemon=True).start()

    # ---------------- TAB 1: SỬA LỖI ĐƠN HÀNG / BÁO GIÁ ----------------
    def setup_tab_quote(self):
        frame = ttk.Frame(self.tab_quote, padding=10)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame, text="Mã Báo Giá / Đơn Hàng (VD: N31913-26-2799):", font=("Segoe UI", 10, "bold")).grid(row=0, column=0, sticky="w", pady=5)
        self.txt_quote_code = ttk.Entry(frame, width=35, font=("Segoe UI", 10))
        self.txt_quote_code.grid(row=0, column=1, padx=10, pady=5, sticky="w")

        btn_fix_quote = ttk.Button(frame, text="⚡ Chẩn Đoán & Sửa Lỗi Tự Động", command=self.fix_quote_errors)
        btn_fix_quote.grid(row=0, column=2, padx=10, pady=5)

        ttk.Label(frame, text="Kết quả Chẩn đoán & Sửa chữa:").grid(row=1, column=0, columnspan=3, sticky="w", pady=(15, 5))
        self.txt_quote_res = scrolledtext.ScrolledText(frame, height=22, width=105, font=("Consolas", 9))
        self.txt_quote_res.grid(row=2, column=0, columnspan=3, sticky="nsew")

        frame.rowconfigure(2, weight=1)
        frame.columnconfigure(1, weight=1)

    def fix_quote_errors(self):
        quote_code = self.txt_quote_code.get().strip()
        if not quote_code:
            messagebox.showwarning("Cảnh báo", "Vui lòng nhập Mã Báo giá / Đơn hàng!")
            return

        def _task():
            self.txt_quote_res.delete("1.0", tk.END)
            def qlog(msg):
                self.txt_quote_res.insert(tk.END, msg + "\n")
                self.txt_quote_res.see(tk.END)
                self.log(msg)

            qlog(f"🔍 BẮT ĐẦU CHẨN ĐOÁN & SỬA LỖI CHO BÁO GIÁ: {quote_code}")
            headers = self.get_headers()

            # 1. Tìm Báo giá trong DMS
            url = f"{BASE_API_URL}/xts_newvehiclesalesquotes?$filter=xts_salesquotenumber eq '{quote_code}'"
            r = requests.get(url, headers=headers)
            if r.status_code != 200 or not r.json().get('value'):
                qlog(f"❌ Không tìm thấy Báo giá {quote_code} trên hệ thống VinFast DMS!")
                return

            quote = r.json()['value'][0]
            quote_id = quote.get('xts_newvehiclesalesquoteid')
            account_id = quote.get('_xts_potentialcustomerid_value')
            contact_id = quote.get('_xts_potentialcontactid_value')
            opp_id = quote.get('_xts_opportunityid_value')

            qlog(f"✅ Tìm thấy Báo giá ID: {quote_id}")
            qlog(f"   - Account liên kết: {account_id}")
            qlog(f"   - Contact liên kết: {contact_id}")
            qlog(f"   - Opportunity liên kết: {opp_id}")

            # 2. Xử lý Account nếu bị Inactive
            if account_id:
                acc_url = f"{BASE_API_URL}/accounts({account_id})"
                r_acc = requests.get(acc_url, headers=headers)
                if r_acc.status_code == 200:
                    acc_data = r_acc.json()
                    state = acc_data.get('statecode')
                    status = acc_data.get('statuscode')
                    name = acc_data.get('name')
                    qlog(f"📋 Trạng thái Account '{name}': statecode={state}, statuscode={status}")
                    
                    if state != 0:
                        qlog("⚠️ NGUYÊN NHÂN LỖI 'Object reference not set...': Account đang bị HẾT HIỆU LỰC (Inactive)!")
                        qlog("🛠️ Đang thực hiện Reactivate (Kích hoạt lại Account)...")
                        r_act = requests.patch(acc_url, headers=headers, json={"statecode": 0, "statuscode": 1})
                        if r_act.status_code in [200, 204]:
                            qlog("✅ Kích hoạt Account THÀNH CÔNG!")
                        else:
                            qlog(f"❌ Không thể kích hoạt Account: {r_act.status_code} - {r_act.text[:200]}")

            # 3. Đồng bộ Navigation Links (Primary Contact & Parent Customer)
            if account_id and contact_id:
                qlog("🛠️ Đang đồng bộ liên kết Khách hàng (Account <-> Contact)...")
                # Bind Account primarycontactid
                r1 = requests.patch(f"{BASE_API_URL}/accounts({account_id})", headers=headers, json={
                    "primarycontactid@odata.bind": f"/contacts({contact_id})"
                })
                # Bind Contact parentcustomerid_account
                r2 = requests.patch(f"{BASE_API_URL}/contacts({contact_id})", headers=headers, json={
                    "parentcustomerid_account@odata.bind": f"/accounts({account_id})"
                })
                qlog(f"   - Kết quả đồng bộ Contact/Account: {r1.status_code}/{r2.status_code} (204 = Chuẩn)")

            # 4. Đồng bộ Opportunity
            if opp_id and account_id:
                qlog("🛠️ Đang đồng bộ Opportunity liên kết...")
                r3 = requests.patch(f"{BASE_API_URL}/opportunities({opp_id})", headers=headers, json={
                    "customerid_account@odata.bind": f"/accounts({account_id})",
                    "parentaccountid@odata.bind": f"/accounts({account_id})"
                })
                qlog(f"   - Kết quả đồng bộ Opportunity: {r3.status_code}")

            qlog("\n🎉 HOÀN TẤT QUÁ TRÌNH SỬA LỖI!")
            qlog("👉 Vui lòng nhấn F5 (Tải lại) trang Báo giá trên trình duyệt DMS và thực hiện Lưu / Tạo Thành SO.")
            messagebox.showinfo("Hoàn tất", f"Đã xử lý xong toàn bộ lỗi dữ liệu cho Báo giá {quote_code}!")

        threading.Thread(target=_task, daemon=True).start()

    # ---------------- TAB 2: XỬ LÝ TRÙNG CCCD ----------------
    def setup_tab_cccd(self):
        frame = ttk.Frame(self.tab_cccd, padding=10)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame, text="Số CCCD / CMND cần kiểm tra:", font=("Segoe UI", 10, "bold")).grid(row=0, column=0, sticky="w", pady=5)
        self.txt_cccd_input = ttk.Entry(frame, width=35, font=("Segoe UI", 10))
        self.txt_cccd_input.grid(row=0, column=1, padx=10, pady=5, sticky="w")

        btn_search_cccd = ttk.Button(frame, text="🔍 Tra Cứu Trùng CCCD", command=self.search_cccd)
        btn_search_cccd.grid(row=0, column=2, padx=10, pady=5)

        ttk.Label(frame, text="Mã Báo Giá cần gán về Account chuẩn (nếu có):").grid(row=1, column=0, sticky="w", pady=5)
        self.txt_cccd_quote = ttk.Entry(frame, width=35, font=("Segoe UI", 10))
        self.txt_cccd_quote.grid(row=1, column=1, padx=10, pady=5, sticky="w")

        btn_bind_account = ttk.Button(frame, text="🔗 Ghép Báo Giá Vào Account Chọn", command=self.bind_quote_to_account)
        btn_bind_account.grid(row=1, column=2, padx=10, pady=5)

        self.txt_cccd_res = scrolledtext.ScrolledText(frame, height=20, width=105, font=("Consolas", 9))
        self.txt_cccd_res.grid(row=2, column=0, columnspan=3, sticky="nsew", pady=10)

        frame.rowconfigure(2, weight=1)
        frame.columnconfigure(1, weight=1)

    def search_cccd(self):
        cccd = self.txt_cccd_input.get().strip()
        if not cccd:
            messagebox.showwarning("Cảnh báo", "Vui lòng nhập số CCCD!")
            return

        def _task():
            self.txt_cccd_res.delete("1.0", tk.END)
            def clog(msg):
                self.txt_cccd_res.insert(tk.END, msg + "\n")
                self.txt_cccd_res.see(tk.END)

            clog(f"🔍 ĐANG TRA CỨU HỒ SƠ KHÁCH HÀNG CÓ CCCD: {cccd}...")
            headers = self.get_headers()

            # Search Accounts
            r_acc = requests.get(f"{BASE_API_URL}/accounts?$filter=xts_identificationnumber eq '{cccd}'", headers=headers)
            if r_acc.status_code == 200:
                accs = r_acc.json().get('value', [])
                clog(f"📋 TÌM THẤY {len(accs)} ACCOUNT (CÔNG TY / CÁ NHÂN):")
                for a in accs:
                    st_name = "Hiệu lực" if a.get('statecode') == 0 else "Hết hiệu lực (Inactive)"
                    clog(f"  • ID: {a.get('accountid')}")
                    clog(f"    Tên: {a.get('name')} | Trạng thái: {st_name} | SĐT: {a.get('telephone1')}")
            else:
                clog(f"❌ Lỗi tra cứu Account: {r_acc.status_code}")

            # Search Contacts
            r_ct = requests.get(f"{BASE_API_URL}/contacts?$filter=xts_identificationnumber eq '{cccd}'", headers=headers)
            if r_ct.status_code == 200:
                cts = r_ct.json().get('value', [])
                clog(f"\n📋 TÌM THẤY {len(cts)} CONTACT (NGƯỜI LIÊN HỆ):")
                for c in cts:
                    st_name = "Hiệu lực" if c.get('statecode') == 0 else "Hết hiệu lực (Inactive)"
                    clog(f"  • ID: {c.get('contactid')}")
                    clog(f"    Tên: {c.get('fullname')} | Trạng thái: {st_name} | SĐT: {c.get('mobilephone')}")
            else:
                clog(f"❌ Lỗi tra cứu Contact: {r_ct.status_code}")

        threading.Thread(target=_task, daemon=True).start()

    def bind_quote_to_account(self):
        quote_code = self.txt_cccd_quote.get().strip()
        cccd = self.txt_cccd_input.get().strip()
        if not quote_code or not cccd:
            messagebox.showwarning("Cảnh báo", "Vui lòng nhập cả Mã Báo Giá và Số CCCD!")
            return

        def _task():
            self.txt_cccd_res.delete("1.0", tk.END)
            def clog(msg):
                self.txt_cccd_res.insert(tk.END, msg + "\n")
                self.txt_cccd_res.see(tk.END)

            headers = self.get_headers()
            clog(f"🛠️ Đang tìm kiếm Account chuẩn có CCCD {cccd} để ghép vào Báo giá {quote_code}...")

            # Find active account
            r_acc = requests.get(f"{BASE_API_URL}/accounts?$filter=xts_identificationnumber eq '{cccd}'", headers=headers)
            if r_acc.status_code != 200 or not r_acc.json().get('value'):
                clog(f"❌ Không tìm thấy Account nào có CCCD {cccd}")
                return

            accs = r_acc.json()['value']
            target_acc = next((a for a in accs if a.get('statecode') == 0), accs[0])
            acc_id = target_acc.get('accountid')

            # Activate if inactive
            if target_acc.get('statecode') != 0:
                clog(f"⚡ Đang kích hoạt lại Account {acc_id}...")
                requests.patch(f"{BASE_API_URL}/accounts({acc_id})", headers=headers, json={"statecode": 0, "statuscode": 1})

            # Find Quote
            r_q = requests.get(f"{BASE_API_URL}/xts_newvehiclesalesquotes?$filter=xts_salesquotenumber eq '{quote_code}'", headers=headers)
            if r_q.status_code != 200 or not r_q.json().get('value'):
                clog(f"❌ Không tìm thấy Báo giá {quote_code}")
                return

            quote_id = r_q.json()['value'][0]['xts_newvehiclesalesquoteid']

            # Bind Quote potentialcustomerid
            clog(f"🔗 Đang gắn Báo giá {quote_code} vào Account {acc_id}...")
            r_patch = requests.patch(f"{BASE_API_URL}/xts_newvehiclesalesquotes({quote_id})", headers=headers, json={
                "xts_potentialcustomerid_account@odata.bind": f"/accounts({acc_id})"
            })
            clog(f"✅ Kết quả ghép nối: {r_patch.status_code} (204 = Thành công)")
            messagebox.showinfo("Thành công", f"Đã ghép Báo giá {quote_code} vào Account chính chủ {acc_id}!")

        threading.Thread(target=_task, daemon=True).start()

    # ---------------- TAB 3: SỬA LỖI DPR ----------------
    def setup_tab_dpr(self):
        frame = ttk.Frame(self.tab_dpr, padding=10)
        frame.pack(fill="both", expand=True)

        # Approver section
        lbl_frame1 = ttk.LabelFrame(frame, text=" Sửa Lỗi DPR Thiếu Người Duyệt ")
        lbl_frame1.grid(row=0, column=0, columnspan=3, sticky="ew", pady=5)

        ttk.Label(lbl_frame1, text="Mã VSO / DPR:").grid(row=0, column=0, padx=5, pady=5)
        self.txt_dpr_code = ttk.Entry(lbl_frame1, width=30)
        self.txt_dpr_code.grid(row=0, column=1, padx=5, pady=5)

        btn_fix_approver = ttk.Button(lbl_frame1, text="✍️ Bổ Sung Người Duyệt", command=self.fix_dpr_approver)
        btn_fix_approver.grid(row=0, column=2, padx=5, pady=5)

        # Deactivate duplicates section
        lbl_frame2 = ttk.LabelFrame(frame, text=" Xử Lý DPR Trùng Lặp / Treo Đơn ")
        lbl_frame2.grid(row=1, column=0, columnspan=3, sticky="ew", pady=5)

        ttk.Label(lbl_frame2, text="Danh sách mã DPR cần HỦY (phân cách dòng hoặc dấu phẩy):").grid(row=0, column=0, sticky="w", padx=5, pady=5)
        self.txt_dpr_deactivate_list = scrolledtext.ScrolledText(lbl_frame2, height=4, width=65, font=("Consolas", 9))
        self.txt_dpr_deactivate_list.grid(row=1, column=0, columnspan=2, padx=5, pady=5)

        btn_deactivate_dprs = ttk.Button(lbl_frame2, text="🗑️ Hủy Các Đơn DPR Này", command=self.deactivate_dpr_list)
        btn_deactivate_dprs.grid(row=1, column=2, padx=5, pady=5, sticky="n")

        self.txt_dpr_res = scrolledtext.ScrolledText(frame, height=14, width=105, font=("Consolas", 9))
        self.txt_dpr_res.grid(row=2, column=0, columnspan=3, sticky="nsew", pady=10)

        frame.rowconfigure(2, weight=1)
        frame.columnconfigure(1, weight=1)

    def fix_dpr_approver(self):
        dpr_code = self.txt_dpr_code.get().strip()
        if not dpr_code:
            messagebox.showwarning("Cảnh báo", "Vui lòng nhập Mã DPR hoặc Mã VSO!")
            return

        def _task():
            self.txt_dpr_res.delete("1.0", tk.END)
            def dlog(msg):
                self.txt_dpr_res.insert(tk.END, msg + "\n")
                self.txt_dpr_res.see(tk.END)

            headers = self.get_headers()
            dlog(f"🔍 Đang tìm kiếm DPR: {dpr_code}...")

            # Filter query
            filter_str = f"itv_name eq '{dpr_code}'" if "DPR" in dpr_code else f"contains(itv_vsonumber, '{dpr_code}')"
            r = requests.get(f"{BASE_API_URL}/itv_downpaymentrequests?$filter={filter_str}", headers=headers)
            if r.status_code != 200 or not r.json().get('value'):
                dlog(f"❌ Không tìm thấy DPR phù hợp với {dpr_code}")
                return

            dprs = r.json()['value']
            dlog(f"📋 Tìm thấy {len(dprs)} DPR:")
            for d in dprs:
                dpr_id = d.get('itv_downpaymentrequestid')
                num = d.get('itv_name')
                approver = d.get('_itv_approver_value')
                dlog(f"  • {num} (ID: {dpr_id}) - Người duyệt: {approver}")

                if not approver:
                    dlog(f"✍️ Đang tự động điền Người duyệt (Võ Hoàng Minh) cho {num}...")
                    r_patch = requests.patch(f"{BASE_API_URL}/itv_downpaymentrequests({dpr_id})", headers=headers, json={
                        "itv_Approver@odata.bind": f"/systemusers({DEFAULT_APPROVER_ID})"
                    })
                    dlog(f"    Kết quả: {r_patch.status_code} (204 = Thành công)")
                else:
                    dlog(f"    Đã có người duyệt -> Không cần sửa.")

            messagebox.showinfo("Thành công", f"Đã hoàn tất kiểm tra và bổ sung Người duyệt cho DPR!")

        threading.Thread(target=_task, daemon=True).start()

    def deactivate_dpr_list(self):
        raw_text = self.txt_dpr_deactivate_list.get("1.0", tk.END).strip()
        if not raw_text:
            messagebox.showwarning("Cảnh báo", "Vui lòng nhập danh sách DPR cần hủy!")
            return

        codes = [c.strip() for c in re.split(r'[\n,\s]+', raw_text) if c.strip()]
        if not codes:
            return

        def _task():
            self.txt_dpr_res.delete("1.0", tk.END)
            def dlog(msg):
                self.txt_dpr_res.insert(tk.END, msg + "\n")
                self.txt_dpr_res.see(tk.END)

            headers = self.get_headers()
            dlog(f"🗑️ BẮT ĐẦU HỦY {len(codes)} ĐƠN DPR...")
            for code in codes:
                r = requests.get(f"{BASE_API_URL}/itv_downpaymentrequests?$filter=itv_name eq '{code}'", headers=headers)
                if r.status_code == 200 and r.json().get('value'):
                    dpr_id = r.json()['value'][0]['itv_downpaymentrequestid']
                    r_deact = requests.patch(f"{BASE_API_URL}/itv_downpaymentrequests({dpr_id})", headers=headers, json={
                        "statecode": 1,
                        "statuscode": 2
                    })
                    dlog(f"  • Hủy {code}: {r_deact.status_code} (204 = Đã hủy)")
                else:
                    dlog(f"  • Không tìm thấy DPR: {code}")

            messagebox.showinfo("Thành công", f"Đã xử lý hủy {len(codes)} đơn DPR!")

        threading.Thread(target=_task, daemon=True).start()

    # ---------------- TAB 4: SỬA LỖI GHÉP XE & PIN ----------------
    def setup_tab_match_pin(self):
        container = ttk.Frame(self.tab_match_pin, padding=10)
        container.pack(fill="both", expand=True)

        opt_frame = ttk.Frame(container)
        opt_frame.pack(fill="x", pady=(0, 6))

        self.chk_match_auto_release = tk.BooleanVar(value=True)
        ttk.Checkbutton(opt_frame, text="Tự động Phát hành lệnh Ghép xe (Release Match/Unmatch)", variable=self.chk_match_auto_release).pack(side="left")

        input_frame = ttk.LabelFrame(container, text=" Danh Sách Số Khung (VIN) / Mã Ghép Xe (MU) / Đơn Hàng (VSO) ")
        input_frame.pack(fill="x", pady=5)

        ttk.Label(input_frame, text="Nhập hoặc dán danh sách mã (mỗi dòng 1 mã, tự động nhận diện kho & đại lý):", font=("Segoe UI", 9, "italic")).pack(anchor="w", padx=5, pady=(4, 2))

        self.txt_match_pin_input = scrolledtext.ScrolledText(input_frame, height=4, font=("Consolas", 10))
        self.txt_match_pin_input.pack(fill="x", padx=5, pady=4)

        btn_bar = ttk.Frame(input_frame)
        btn_bar.pack(fill="x", padx=5, pady=4)

        self.btn_run_match_pin = ttk.Button(btn_bar, text="⚡ BẮT ĐẦU CHẨN ĐOÁN & SỬA LỖI GHÉP XE", command=self.run_match_pin_fixer)
        self.btn_run_match_pin.pack(side="left", padx=5)

        ttk.Button(btn_bar, text="🧹 Xóa danh sách", command=lambda: self.txt_match_pin_input.delete("1.0", tk.END)).pack(side="left", padx=5)

        res_frame = ttk.LabelFrame(container, text=" Tiến Trình & Kết Quả Xử Lý ")
        res_frame.pack(fill="both", expand=True, pady=5)

        self.txt_match_pin_res = scrolledtext.ScrolledText(res_frame, font=("Consolas", 9), bg="#1e1e1e", fg="#d4d4d4", insertbackground="white")
        self.txt_match_pin_res.pack(fill="both", expand=True, padx=5, pady=5)

        self.txt_match_pin_res.tag_config("green", foreground="#4ec9b0")
        self.txt_match_pin_res.tag_config("yellow", foreground="#dcdcaa")
        self.txt_match_pin_res.tag_config("red", foreground="#f44747")
        self.txt_match_pin_res.tag_config("cyan", foreground="#9cdcfe")

    def run_match_pin_fixer(self):
        raw_text = self.txt_match_pin_input.get("1.0", tk.END).strip()
        if not raw_text:
            messagebox.showwarning("Cảnh báo", "Vui lòng nhập ít nhất 1 Số khung (VIN) hoặc Mã MU/VSO!")
            return

        lines = [c.strip() for c in re.split(r'[\r\n,;]+', raw_text) if c.strip()]
        if not lines:
            messagebox.showwarning("Cảnh báo", "Không tìm thấy mã hợp lệ!")
            return

        dealer_code = self.current_dealer.get("dealer_code")
        auto_rel = self.chk_match_auto_release.get()

        self.btn_run_match_pin.config(state="disabled")
        self.txt_match_pin_res.delete("1.0", tk.END)

        def _worker():
            def log_fn(msg, tag=None):
                if not tag:
                    if "✅" in msg or "🎉" in msg:
                        tag = "green"
                    elif "❌" in msg or "thất bại" in msg.lower():
                        tag = "red"
                    elif "⚠️" in msg or "👉" in msg or "PHÁT HIỆN" in msg:
                        tag = "yellow"
                    elif "🚀" in msg or "🔍" in msg or "BƯỚC" in msg:
                        tag = "cyan"
                self.txt_match_pin_res.insert(tk.END, msg + "\n", tag)
                self.txt_match_pin_res.see(tk.END)
                self.log(msg)

            total = len(lines)
            success_count = 0
            log_fn("======================================================================")
            log_fn(f"   BẮT ĐẦU XỬ LÝ {total} BẢN GHI (Tự động phát hành: {'BẬT' if auto_rel else 'TẮT'})")
            log_fn("======================================================================\n")

            for i, q in enumerate(lines, 1):
                log_fn(f"\n>>>>>>>>>>>>>>> [{i}/{total}] ĐANG XỬ LÝ: {q} <<<<<<<<<<<<<<<", "cyan")
                try:
                    fixer = DMSMatchPinFixer(dealer_code=dealer_code)
                    res = fixer.diagnose_and_fix(q, auto_release=auto_rel, log_fn=log_fn)
                    if res.get("success"):
                        success_count += 1
                except Exception as ex:
                    log_fn(f"❌ LỖI NGOẠI LỆ KHI XỬ LÝ {q}: {ex}", "red")

            log_fn("\n======================================================================")
            log_fn(f"   HOÀN TẤT! THÀNH CÔNG: {success_count}/{total} XE")
            log_fn("======================================================================")

            self.root.after(0, lambda: self.btn_run_match_pin.config(state="normal"))
            if success_count == total:
                messagebox.showinfo("Thành công", f"Đã xử lý và sửa lỗi thành công toàn bộ {total} xe!")
            else:
                messagebox.showwarning("Kết quả", f"Hoàn tất xử lý: {success_count}/{total} thành công.\nVui lòng xem chi tiết trên bảng nhật ký.")

        threading.Thread(target=_worker, daemon=True).start()

    # ---------------- TAB 5: GỬI PHIẾU THU XUỐNG SAP ----------------
    def setup_tab_phieu_thu_sap(self):
        container = ttk.Frame(self.tab_phieu_thu_sap, padding=10)
        container.pack(fill="both", expand=True)

        ttk.Label(container, text=(
            "Công cụ này xử lý lỗi:\n"
            "\"Hiện phiếu thu XYZ chưa được gửi xuống SAP. Bạn cần gửi phiếu thu xuống SAP trước khi gửi yêu cầu!\"\n"
            "Nhập danh sách mã phiếu thu (mỗi dòng 1 mã, ví dụ: N31920-TK-26-09-0022):"
        ), font=("Segoe UI", 9, "italic"), foreground="#555").pack(anchor="w", pady=(0, 8))

        input_frame = ttk.LabelFrame(container, text=" Danh Sách Mã Phiếu Thu (Payment Receipt) ")
        input_frame.pack(fill="x", pady=5)

        self.txt_phieu_thu_input = scrolledtext.ScrolledText(input_frame, height=5, font=("Consolas", 10))
        self.txt_phieu_thu_input.pack(fill="x", padx=5, pady=5)

        btn_bar = ttk.Frame(input_frame)
        btn_bar.pack(fill="x", padx=5, pady=4)

        self.btn_send_phieu_thu_sap = ttk.Button(btn_bar, text="🚀 GỬI PHIẾU THU XUỐNG SAP", command=self.send_phieu_thu_to_sap)
        self.btn_send_phieu_thu_sap.pack(side="left", padx=5)

        ttk.Button(btn_bar, text="🔍 CHỈ KIỂM TRA (không gửi)", command=lambda: self.send_phieu_thu_to_sap(check_only=True)).pack(side="left", padx=5)
        ttk.Button(btn_bar, text="🧹 Xóa danh sách", command=lambda: self.txt_phieu_thu_input.delete("1.0", tk.END)).pack(side="left", padx=5)

        res_frame = ttk.LabelFrame(container, text=" Tiến Trình & Kết Quả ")
        res_frame.pack(fill="both", expand=True, pady=5)

        self.txt_phieu_thu_res = scrolledtext.ScrolledText(res_frame, font=("Consolas", 9), bg="#1e1e1e", fg="#d4d4d4", insertbackground="white")
        self.txt_phieu_thu_res.pack(fill="both", expand=True, padx=5, pady=5)
        self.txt_phieu_thu_res.tag_config("green", foreground="#4ec9b0")
        self.txt_phieu_thu_res.tag_config("yellow", foreground="#dcdcaa")
        self.txt_phieu_thu_res.tag_config("red", foreground="#f44747")
        self.txt_phieu_thu_res.tag_config("cyan", foreground="#9cdcfe")
        self.txt_phieu_thu_res.tag_config("white", foreground="#ffffff")

        info = ttk.LabelFrame(container, text=" Hướng Dẫn ")
        info.pack(fill="x", pady=(5, 0))
        ttk.Label(info, text=(
            "• Dán mã phiếu thu từ thông báo lỗi DMS vào ô trên (VD: N31920-TK-26-09-0022)\n"
            "• Có thể nhập nhiều dòng cùng lúc\n"
            "• Bấm 'GỬI PHIẾU THU XUỐNG SAP' để tự động tìm và kích hoạt gửi SAP\n"
            "• Sau khi thành công, quay lại DMS thực hiện lại thao tác ban đầu"
        ), font=("Segoe UI", 9), justify="left").pack(anchor="w", padx=8, pady=6)

    def send_phieu_thu_to_sap(self, check_only=False):
        raw_text = self.txt_phieu_thu_input.get("1.0", tk.END).strip()
        if not raw_text:
            messagebox.showwarning("Cảnh báo", "Vui lòng nhập ít nhất 1 mã Phiếu Thu!")
            return

        codes = [c.strip() for c in re.split(r'[\n,;\s]+', raw_text) if c.strip()]
        if not codes:
            return

        self.btn_send_phieu_thu_sap.config(state="disabled")
        self.txt_phieu_thu_res.delete("1.0", tk.END)

        def dlog(msg, tag=None):
            if not tag:
                if any(k in msg for k in ["✅", "🎉", "Thành công", "đã gửi"]):
                    tag = "green"
                elif any(k in msg for k in ["❌", "thất bại", "Lỗi", "lỗi"]):
                    tag = "red"
                elif any(k in msg for k in ["⚠️", "Cảnh báo", "Bỏ qua"]):
                    tag = "yellow"
                elif any(k in msg for k in ["🔍", "🚀", "📋", "Đang"]):
                    tag = "cyan"
                else:
                    tag = "white"
            self.txt_phieu_thu_res.insert(tk.END, msg + "\n", tag)
            self.txt_phieu_thu_res.see(tk.END)
            self.log(msg)

        def _task():
            headers = self.get_headers()
            success_count = 0
            total = len(codes)

            dlog("=" * 70)
            dlog(f"   {'KIỂM TRA' if check_only else 'XỬ LÝ'} {total} PHIẾU THU → SAP")
            dlog("=" * 70)

            for i, code in enumerate(codes, 1):
                dlog(f"\n[{i}/{total}] 📋 Phiếu Thu: {code}", "cyan")
                try:
                    # ── BƯỚC 1: Tìm phiếu thu theo tên (thử nhiều tên entity) ────
                    # Các tên entity khả năng cho Phiếu Thu trong VinFast DMS
                    ENTITY_CANDIDATES = [
                        ("xts_accountreceivablereceipts", "xts_accountreceivablereceiptid", "xts_accountreceivablereceiptnumber"),
                        ("xts_accountreceivablereceipts", "xts_accountreceivablereceiptid", "xts_receiptnumber"),
                        ("xts_accountreceivablereceipts", "xts_accountreceivablereceiptid", "itv_name"),
                        ("xts_receipts",                 "xts_receiptid",                 "xts_receiptnumber"),
                        ("xts_cashreceipts",             "xts_cashreceiptid",             "xts_cashreceiptnumber"),
                        ("xts_accountreceivables",       "xts_accountreceivableid",       "xts_accountreceivablenumber"),
                        ("itv_customerdeposits",         "itv_customerdepositid",         "itv_name"),
                        ("itv_paymentreceipts",          "itv_paymentreceiptid",          "itv_name"),
                        ("itv_receipts",                 "itv_receiptid",                 "itv_name"),
                        ("itv_cashreceipts",             "itv_cashreceiptid",             "itv_name"),
                        ("itv_paymentrequests",          "itv_paymentrequestid",          "itv_name"),
                        ("itv_downpaymentrequests",      "itv_downpaymentrequestid",      "itv_name"),
                    ]

                    data = []
                    entity_name = None
                    id_field = None
                    name_field = None

                    dlog(f"  🔍 Đang tìm phiếu thu '{code}' trên DMS...")
                    for ent, id_f, name_f in ENTITY_CANDIDATES:
                        url = f"{BASE_API_URL}/{ent}?$filter={name_f} eq '{code}'&$top=5"
                        r = requests.get(url, headers=headers, timeout=15)
                        if r.status_code == 401:
                            dlog("  ❌ Lỗi 401: Cookie/Token đã hết hạn! Vui lòng đăng nhập lại.", "red")
                            return
                        if r.status_code == 404:
                            dlog(f"     Entity '{ent}' không tồn tại, thử tên khác...")
                            continue
                        if r.status_code == 200:
                            vals = r.json().get("value", [])
                            dlog(f"     ✅ Entity '{ent}' hợp lệ ({len(vals)} kết quả)")
                            entity_name = ent
                            id_field = id_f
                            name_field = name_f
                            data = vals
                            break
                        dlog(f"     Entity '{ent}': HTTP {r.status_code}")

                    if not entity_name:
                        dlog(f"  ❌ Không xác định được tên entity phiếu thu! Liên hệ hỗ trợ.", "red")
                        continue

                    if not data:
                        dlog(f"  ⚠️ Không tìm thấy '{code}', thử tìm mờ bằng phần số cuối...")
                        short = code.split("-")[-1] if "-" in code else code
                        url2 = f"{BASE_API_URL}/{entity_name}?$filter=contains({name_field},'{short}')&$top=5"
                        r2 = requests.get(url2, headers=headers, timeout=15)
                        if r2.status_code == 200:
                            data = r2.json().get("value", [])
                            if data:
                                dlog(f"  ℹ️ Tìm thấy {len(data)} kết quả gần đúng:")
                                for d in data:
                                    dlog(f"     → {d.get(name_field)} (ID: {d.get(id_field)})")

                    if not data:
                        dlog(f"  ❌ Không tìm thấy phiếu thu '{code}' trên hệ thống DMS!", "red")
                        continue

                    rec = data[0]
                    rec_id = rec.get(id_field)
                    rec_name = rec.get(name_field, code)
                    statecode = rec.get("statecode")
                    statuscode = rec.get("statuscode")

                    dlog(f"  ✅ Tìm thấy: {rec_name} (ID: {rec_id})")
                    dlog(f"     statecode={statecode}, statuscode={statuscode}")

                    # ── BƯỚC 2: Kiểm tra trạng thái SAP ─────────────────────────
                    # Ghi lại tất cả fields để debug
                    all_fields = {k: v for k, v in rec.items() if v is not None}
                    for k, v in all_fields.items():
                        if "sap" in k.lower() or "handling" in k.lower() or "sent" in k.lower():
                            dlog(f"     [SAP Field] {k} = {v}")

                    # Kiểm tra field itv_issentsap hoặc itv_hassentsap
                    is_sent = rec.get("itv_issentsap") or rec.get("itv_hassentsap") or False
                    handling = rec.get("xts_handling")

                    if is_sent:
                        dlog(f"  ⚠️ Phiếu thu này đã được gửi SAP rồi! (Bỏ qua)", "yellow")
                        success_count += 1
                        continue

                    if check_only:
                        dlog(f"  📋 [CHỈ KIỂM TRA] Trạng thái SAP: {'Đã gửi' if is_sent else 'CHƯA GỬI'}", "yellow")
                        continue

                    # ── BƯỚC 3: Gửi xuống SAP ────────────────────────────────────
                    dlog(f"  🚀 Đang gửi phiếu thu xuống SAP...")

                    # Thử các phương pháp theo thứ tự ưu tiên:
                    sent_ok = False

                    # Phương pháp 1: PATCH xts_handling = 3 (SAP submit pattern)
                    for handling_val in [3, 2, 1]:
                        patch_body = {"xts_handling": handling_val}
                        r_patch = requests.patch(
                            f"{BASE_API_URL}/{entity_name}({rec_id})",
                            headers=headers,
                            json=patch_body,
                            timeout=15
                        )
                        dlog(f"     Thử xts_handling={handling_val}: HTTP {r_patch.status_code}")
                        if r_patch.status_code in [200, 204]:
                            dlog(f"  ✅ Thành công! Đã gửi phiếu thu '{rec_name}' xuống SAP (handling={handling_val})", "green")
                            sent_ok = True
                            break
                        else:
                            resp_txt = r_patch.text[:300] if r_patch.text else ""
                            if resp_txt:
                                dlog(f"     Lỗi: {resp_txt}", "red")

                    if not sent_ok:
                        # Phương pháp 2: Gọi Custom Action nếu có
                        dlog(f"  🔄 Thử gọi Custom Action 'itv_SendPaymentReceiptToSAP'...")
                        try:
                            action_url = f"{BASE_API_URL}/itv_paymentreceipts({rec_id})/Microsoft.Dynamics.CRM.itv_SendPaymentReceiptToSAP"
                            r_act = requests.post(action_url, headers=headers, json={}, timeout=15)
                            dlog(f"     HTTP {r_act.status_code}: {r_act.text[:200]}")
                            if r_act.status_code in [200, 204]:
                                dlog(f"  ✅ Custom Action thành công!", "green")
                                sent_ok = True
                        except Exception as ex:
                            dlog(f"     Custom Action lỗi: {ex}", "red")

                    if not sent_ok:
                        # Phương pháp 3: Thay đổi statuscode
                        dlog(f"  🔄 Thử PATCH statuscode để trigger SAP workflow...")
                        r_p3 = requests.patch(
                            f"{BASE_API_URL}/{entity_name}({rec_id})",
                            headers=headers,
                            json={"statuscode": 100000001},
                            timeout=15
                        )
                        dlog(f"     HTTP {r_p3.status_code}")
                        if r_p3.status_code in [200, 204]:
                            dlog(f"  ✅ Gửi SAP qua statuscode thành công!", "green")
                            sent_ok = True

                    if sent_ok:
                        success_count += 1
                    else:
                        dlog(f"  ❌ KHÔNG THỂ gửi phiếu thu '{code}' xuống SAP! Cần xử lý thủ công.", "red")

                except Exception as ex:
                    dlog(f"  ❌ Lỗi ngoại lệ: {ex}", "red")

            dlog("\n" + "=" * 70)
            if check_only:
                dlog(f"   HOÀN TẤT KIỂM TRA: {total} phiếu thu")
            else:
                dlog(f"   HOÀN TẤT! THÀNH CÔNG: {success_count}/{total} PHIẾU THU")
            dlog("=" * 70)

            self.root.after(0, lambda: self.btn_send_phieu_thu_sap.config(state="normal"))
            if not check_only:
                if success_count == total:
                    messagebox.showinfo("Thành công", f"Đã gửi {total} phiếu thu xuống SAP thành công!\nQuay lại DMS và thử lại thao tác.")
                else:
                    messagebox.showwarning("Kết quả", f"Hoàn tất: {success_count}/{total} thành công.\nVui lòng xem log để biết chi tiết.")

        threading.Thread(target=_task, daemon=True).start()
    # ---------------- TAB 5: LOG SYSTEM ----------------
    def setup_tab_log(self):
        frame = ttk.Frame(self.tab_log, padding=10)
        frame.pack(fill="both", expand=True)

        self.txt_log = scrolledtext.ScrolledText(frame, font=("Consolas", 9))
        self.txt_log.pack(fill="both", expand=True)

        btn_clear_log = ttk.Button(frame, text="🧹 Xóa nhật ký", command=lambda: self.txt_log.delete("1.0", tk.END))
        btn_clear_log.pack(anchor="e", pady=5)

if __name__ == "__main__":
    root = tk.Tk()
    app = DMSErrorFixerApp(root)
    root.mainloop()


