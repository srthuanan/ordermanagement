import os
import json
import time
import threading
from datetime import datetime
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import requests
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

CONFIG_FILE = "dms_dealers_config.json"
BASE_API_URL = "https://vinfastdms.crm5.dynamics.com/api/data/v9.0"

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

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

class FactoryStockTrackerApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("VinFast DMS - Theo Dõi Tiến Độ Rút Xe Nhà Máy Hải Phòng (Factory Stock & Logistics Radar)")
        self.geometry("1240x780")
        self.minsize(1050, 650)
        self.configure(bg="#0f172a")

        self.dealers = load_config()
        self.raw_data = []
        self.filtered_data = []
        self.is_loading = False

        self.setup_styles()
        self.create_widgets()

        # Tự động tải dữ liệu khi khởi động
        self.after(300, self.start_fetch_data)

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

        style.configure("TCombobox", fieldbackground="#1e293b", background="#334155", foreground="#f8fafc")

    def create_widgets(self):
        # 1. HEADER
        header = tk.Frame(self, bg="#1e293b", padx=20, pady=12)
        header.pack(fill=tk.X)

        title_box = tk.Frame(header, bg="#1e293b")
        title_box.pack(side=tk.LEFT)

        tk.Label(title_box, text="🚚 THEO DÕI TIẾN ĐỘ RÚT XE NHÀ MÁY HẢI PHÒNG", 
                 font=("Segoe UI", 13, "bold"), fg="#38bdf8", bg="#1e293b").pack(anchor="w")
        tk.Label(title_box, text="Đơn rút kho (RS) • SAP STO • Phiếu giao nhà máy (DO) • Xe lồng vận chuyển • Nhập kho Showroom (PR)",
                 font=("Segoe UI", 9), fg="#94a3b8", bg="#1e293b").pack(anchor="w", pady=(2, 0))

        btns_box = tk.Frame(header, bg="#1e293b")
        btns_box.pack(side=tk.RIGHT)

        tk.Label(btns_box, text="Đại lý:", font=("Segoe UI", 10, "bold"), fg="#cbd5e1", bg="#1e293b").pack(side=tk.LEFT, padx=(0, 6))

        dealer_opts = [d.get("dealer_code", "") for d in self.dealers if d.get("cookie", "").strip()]
        if not dealer_opts:
            dealer_opts = [d.get("dealer_code", "N31913") for d in self.dealers]
        combo_vals = dealer_opts + ["Tất cả đại lý"] if len(dealer_opts) > 1 else dealer_opts

        self.var_dealer = tk.StringVar(value=dealer_opts[0] if dealer_opts else "N31913")
        self.cb_dealer = ttk.Combobox(btns_box, textvariable=self.var_dealer, values=combo_vals, state="readonly", width=14, font=("Segoe UI", 10))
        self.cb_dealer.pack(side=tk.LEFT, padx=(0, 12))
        self.cb_dealer.bind("<<ComboboxSelected>>", lambda e: self.apply_filters())

        self.btn_refresh = tk.Button(btns_box, text="🔄 Làm Mới Dữ Liệu", font=("Segoe UI", 9, "bold"),
                                     bg="#0284c7", fg="#ffffff", activebackground="#0369a1",
                                     relief="flat", padx=12, pady=6, cursor="hand2", command=self.start_fetch_data)
        self.btn_refresh.pack(side=tk.LEFT, padx=3)

        self.btn_export = tk.Button(btns_box, text="📥 Xuất Báo Cáo Excel", font=("Segoe UI", 9, "bold"),
                                    bg="#059669", fg="#ffffff", activebackground="#047857",
                                    relief="flat", padx=12, pady=6, cursor="hand2", command=self.export_to_excel)
        self.btn_export.pack(side=tk.LEFT, padx=3)

        # 2. STATS BAR
        self.stats_frame = tk.Frame(self, bg="#0f172a", padx=20, pady=10)
        self.stats_frame.pack(fill=tk.X)

        self.card_total = self.create_stat_card(self.stats_frame, "TỔNG SỐ LÔ/XE", "0", "#38bdf8", 0)
        self.card_open = self.create_stat_card(self.stats_frame, "CHỜ XUẤT XƯỞNG (DO MỞ)", "0", "#f59e0b", 1)
        self.card_transit = self.create_stat_card(self.stats_frame, "ĐANG TRÊN XE LỒNG", "0", "#a855f7", 2)
        self.card_received = self.create_stat_card(self.stats_frame, "ĐÃ NHẬP KHO SHOWROOM", "0", "#22c55e", 3)
        self.card_value = self.create_stat_card(self.stats_frame, "TỔNG GIÁ TRỊ NHẬP SỈ", "0 VNĐ", "#ec4899", 4)
        for i in range(5):
            self.stats_frame.columnconfigure(i, weight=1)

        # 3. FILTER / SEARCH BAR
        filter_frame = tk.Frame(self, bg="#1e293b", padx=15, pady=10, highlightbackground="#334155", highlightthickness=1)
        filter_frame.pack(fill=tk.X, padx=20, pady=(0, 10))

        tk.Label(filter_frame, text="🔍 Tìm nhanh:", font=("Segoe UI", 10, "bold"), fg="#cbd5e1", bg="#1e293b").pack(side=tk.LEFT, padx=(0, 6))
        self.search_var = tk.StringVar()
        self.search_entry = tk.Entry(filter_frame, textvariable=self.search_var, font=("Segoe UI", 10), bg="#0f172a", fg="#f8fafc",
                                     insertbackground="#38bdf8", relief="flat", highlightbackground="#475569", highlightthickness=1, width=28)
        self.search_entry.pack(side=tk.LEFT, ipady=4, padx=(0, 15))
        self.search_var.trace_add("write", lambda *args: self.apply_filters())

        tk.Label(filter_frame, text="Trạng thái:", font=("Segoe UI", 9, "bold"), fg="#94a3b8", bg="#1e293b").pack(side=tk.LEFT, padx=(0, 6))
        self.filter_status_var = tk.StringVar(value="Tất cả trạng thái")
        self.cb_status = ttk.Combobox(filter_frame, textvariable=self.filter_status_var, 
                                      values=["Tất cả trạng thái", "Mở (Chờ xuất xưởng)", "Phát hành (Đang vận chuyển)", "Nhận (Đã về Showroom)"],
                                      state="readonly", width=22, font=("Segoe UI", 9))
        self.cb_status.pack(side=tk.LEFT, padx=(0, 15))
        self.cb_status.bind("<<ComboboxSelected>>", lambda e: self.apply_filters())

        tk.Label(filter_frame, text="Dòng xe:", font=("Segoe UI", 9, "bold"), fg="#94a3b8", bg="#1e293b").pack(side=tk.LEFT, padx=(0, 6))
        self.filter_model_var = tk.StringVar(value="Tất cả dòng xe")
        self.cb_model = ttk.Combobox(filter_frame, textvariable=self.filter_model_var,
                                     values=["Tất cả dòng xe", "VF 3", "VF 5", "VF 6", "VF 7", "VF 8", "VF 9", "VF 2"],
                                     state="readonly", width=16, font=("Segoe UI", 9))
        self.cb_model.pack(side=tk.LEFT, padx=(0, 15))
        self.cb_model.bind("<<ComboboxSelected>>", lambda e: self.apply_filters())

        self.lbl_record_count = tk.Label(filter_frame, text="Đang hiển thị: 0 bản ghi", font=("Segoe UI", 9), fg="#38bdf8", bg="#1e293b")
        self.lbl_record_count.pack(side=tk.RIGHT)

        # 4. SPLIT PANED WINDOW (TABLE + DETAILS TIMELINE)
        paned = tk.PanedWindow(self, orient=tk.VERTICAL, bg="#0f172a", sashwidth=6, sashrelief="flat")
        paned.pack(fill=tk.BOTH, expand=True, padx=20, pady=(0, 15))

        # Upper Table Frame
        table_container = tk.Frame(paned, bg="#1e293b", highlightbackground="#334155", highlightthickness=1)
        paned.add(table_container, height=360)

        cols = ("stt", "pr_no", "do_no", "model", "color", "vin", "qty", "unit_cost", "total_val", "status", "created_date", "receipt_date")
        self.tree = ttk.Treeview(table_container, columns=cols, show="headings", selectmode="browse")

        self.tree.heading("stt", text="STT")
        self.tree.heading("pr_no", text="Số Phiếu PR")
        self.tree.heading("do_no", text="Số DO Nhà Máy (SAP)")
        self.tree.heading("model", text="Dòng Xe")
        self.tree.heading("color", text="Màu Sắc")
        self.tree.heading("vin", text="Số Khung (VIN)")
        self.tree.heading("qty", text="SL")
        self.tree.heading("unit_cost", text="Đơn Giá Sỉ")
        self.tree.heading("total_val", text="Tổng Giá Trị")
        self.tree.heading("status", text="Trạng Thái")
        self.tree.heading("created_date", text="Ngày Lập DO")
        self.tree.heading("receipt_date", text="Ngày Về Showroom")

        self.tree.column("stt", width=40, anchor="center")
        self.tree.column("pr_no", width=160, anchor="center")
        self.tree.column("do_no", width=130, anchor="center")
        self.tree.column("model", width=80, anchor="center")
        self.tree.column("color", width=120, anchor="center")
        self.tree.column("vin", width=150, anchor="center")
        self.tree.column("qty", width=45, anchor="center")
        self.tree.column("unit_cost", width=110, anchor="e")
        self.tree.column("total_val", width=120, anchor="e")
        self.tree.column("status", width=130, anchor="center")
        self.tree.column("created_date", width=120, anchor="center")
        self.tree.column("receipt_date", width=130, anchor="center")

        sb_y = ttk.Scrollbar(table_container, orient=tk.VERTICAL, command=self.tree.yview)
        sb_x = ttk.Scrollbar(table_container, orient=tk.HORIZONTAL, command=self.tree.xview)
        self.tree.configure(yscrollcommand=sb_y.set, xscrollcommand=sb_x.set)

        self.tree.grid(row=0, column=0, sticky="nsew")
        sb_y.grid(row=0, column=1, sticky="ns")
        sb_x.grid(row=1, column=0, sticky="ew")
        table_container.rowconfigure(0, weight=1)
        table_container.columnconfigure(0, weight=1)

        self.tree.bind("<<TreeviewSelect>>", self.on_item_select)

        # Lower Detail / Stepper Timeline Frame
        self.detail_frame = tk.Frame(paned, bg="#1e293b", highlightbackground="#334155", highlightthickness=1, padx=20, pady=12)
        paned.add(self.detail_frame, height=220)

        self.create_detail_view(self.detail_frame)

    def create_stat_card(self, parent, title, value, color, col):
        card = tk.Frame(parent, bg="#1e293b", padx=15, pady=10, highlightbackground="#334155", highlightthickness=1)
        card.grid(row=0, column=col, padx=4, sticky="nsew")
        lbl_t = tk.Label(card, text=title, font=("Segoe UI", 8, "bold"), fg="#94a3b8", bg="#1e293b")
        lbl_t.pack(anchor="w")
        lbl_v = tk.Label(card, text=value, font=("Segoe UI", 15, "bold"), fg=color, bg="#1e293b")
        lbl_v.pack(anchor="w", pady=(2, 0))
        return lbl_v

    def create_detail_view(self, parent):
        tk.Label(parent, text="📍 TIẾN ĐỘ CHUỖI CUNG ỨNG 5 CHẶNG (FACTORY TO SHOWROOM)", 
                 font=("Segoe UI", 10, "bold"), fg="#38bdf8", bg="#1e293b").pack(anchor="w", pady=(0, 8))

        # Stepper container
        self.stepper_frame = tk.Frame(parent, bg="#0f172a", padx=15, pady=12, highlightbackground="#334155", highlightthickness=1)
        self.stepper_frame.pack(fill=tk.X, pady=(0, 10))

        self.step_labels = []
        steps = [
            ("1. TẠO ĐƠN RÚT XE", "Đại lý lập yêu cầu"),
            ("2. SAP HẢI PHÒNG", "Duyệt đơn điều chuyển STO"),
            ("3. LẬP PHIẾU DO", "Nhà máy Cát Hải đóng gói"),
            ("4. XE LỒNG VẬN TẢI", "Đang chuyển về Showroom"),
            ("5. NHẬP KHO SHOWROOM", "Đã sẵn sàng giao khách")
        ]

        for i, (st, desc) in enumerate(steps):
            f_step = tk.Frame(self.stepper_frame, bg="#0f172a")
            f_step.grid(row=0, column=i, sticky="nsew", padx=6)
            self.stepper_frame.columnconfigure(i, weight=1)

            lbl_circle = tk.Label(f_step, text="⚪", font=("Segoe UI", 14), fg="#64748b", bg="#0f172a")
            lbl_circle.pack(anchor="center")
            lbl_title = tk.Label(f_step, text=st, font=("Segoe UI", 9, "bold"), fg="#94a3b8", bg="#0f172a")
            lbl_title.pack(anchor="center")
            lbl_desc = tk.Label(f_step, text=desc, font=("Segoe UI", 8), fg="#64748b", bg="#0f172a")
            lbl_desc.pack(anchor="center")

            self.step_labels.append((lbl_circle, lbl_title, lbl_desc))

        # Bottom info columns
        info_box = tk.Frame(parent, bg="#1e293b")
        info_box.pack(fill=tk.X)

        self.lbl_detail_po = tk.Label(info_box, text="Đơn đặt hàng PO: ---", font=("Segoe UI", 9), fg="#cbd5e1", bg="#1e293b")
        self.lbl_detail_po.grid(row=0, column=0, sticky="w", padx=(0, 20))

        self.lbl_detail_transport = tk.Label(info_box, text="Xe lồng: --- | Số vận đơn B/L: ---", font=("Segoe UI", 9), fg="#cbd5e1", bg="#1e293b")
        self.lbl_detail_transport.grid(row=0, column=1, sticky="w", padx=(0, 20))

        self.lbl_detail_finance = tk.Label(info_box, text="Hình thức thanh toán: Công nợ trả sau (Deferred)", font=("Segoe UI", 9), fg="#cbd5e1", bg="#1e293b")
        self.lbl_detail_finance.grid(row=0, column=2, sticky="w")

    def update_stepper(self, status_code_text):
        # Reset all
        for circle, title, desc in self.step_labels:
            circle.config(text="⚪", fg="#64748b")
            title.config(fg="#94a3b8")

        # 1 = Mở, 2 = Phát hành, 7 = Nhận
        if "Mở" in status_code_text:
            # Step 1, 2, 3 active
            self.step_labels[0][0].config(text="🟢", fg="#22c55e")
            self.step_labels[0][1].config(fg="#22c55e")
            self.step_labels[1][0].config(text="🟢", fg="#22c55e")
            self.step_labels[1][1].config(fg="#22c55e")
            self.step_labels[2][0].config(text="🟡", fg="#f59e0b")
            self.step_labels[2][1].config(fg="#f59e0b")
        elif "Phát hành" in status_code_text:
            # Step 1, 2, 3, 4 active
            for i in range(3):
                self.step_labels[i][0].config(text="🟢", fg="#22c55e")
                self.step_labels[i][1].config(fg="#22c55e")
            self.step_labels[3][0].config(text="🚚", fg="#a855f7")
            self.step_labels[3][1].config(fg="#a855f7")
        elif "Nhận" in status_code_text or "Đã nhận" in status_code_text:
            # All 5 steps complete
            for i in range(5):
                self.step_labels[i][0].config(text="✅", fg="#22c55e")
                self.step_labels[i][1].config(fg="#22c55e")

    def start_fetch_data(self):
        if self.is_loading:
            return
        self.is_loading = True
        self.btn_refresh.config(state=tk.DISABLED, text="⏳ Đang tải...")

        t = threading.Thread(target=self.fetch_data_thread, daemon=True)
        t.start()

    def fetch_data_thread(self):
        records = []
        try:
            sel_dealer = self.var_dealer.get()
            target_dealers = [d for d in self.dealers if d.get("cookie", "").strip()]
            if sel_dealer != "Tất cả đại lý":
                target_dealers = [d for d in target_dealers if d.get("dealer_code") == sel_dealer]

            for d in target_dealers:
                headers = get_dms_headers(d["cookie"])
                # 1. Lấy danh sách phiếu nhận xe (PR)
                r_pr = requests.get(f"{BASE_API_URL}/xts_purchasereceipts?$top=40", headers=headers, timeout=8)
                # 2. Lấy danh sách chi tiết lô xe (Dòng xe, Màu, VIN)
                r_prd = requests.get(f"{BASE_API_URL}/xts_purchasereceiptdetails?$top=80", headers=headers, timeout=8)

                prs = r_pr.json().get("value", []) if r_pr.status_code == 200 else []
                prds = r_prd.json().get("value", []) if r_prd.status_code == 200 else []

                detail_map = {}
                for dt in prds:
                    pid = dt.get("_xts_purchasereceiptid_value")
                    if pid:
                        if pid not in detail_map:
                            detail_map[pid] = []
                        detail_map[pid].append(dt)

                for pr in prs:
                    pr_id = pr.get("xts_purchasereceiptid")
                    pr_num = pr.get("xts_purchasereceiptnumber", "")
                    do_num = pr.get("xts_deliveryordernumber", "")
                    status = pr.get("xts_status@OData.Community.Display.V1.FormattedValue", "Mở")
                    created = pr.get("createdon@OData.Community.Display.V1.FormattedValue", "")
                    receipt_date = pr.get("itv_actualreceiptdate@OData.Community.Display.V1.FormattedValue", "")
                    total_val = pr.get("xts_grandtotal", 0.0) or 0.0
                    trans_unit = pr.get("itv_tranportationunit", "")
                    bill_lading = pr.get("itv_billofladingno", "")
                    po_no = pr.get("xts_purchaseordernumber", "")

                    dets = detail_map.get(pr_id, [])
                    if dets:
                        for item in dets:
                            records.append({
                                "dealer": d.get("dealer_code", "N31913"),
                                "pr_no": pr_num,
                                "do_no": do_num if do_num else "---",
                                "model": item.get("xts_productdescription", "VF Xe"),
                                "color": item.get("xts_productexteriorcolorid@OData.Community.Display.V1.FormattedValue", "---"),
                                "vin": item.get("xts_chassisnumber") or item.get("itv_vin") or "Chờ gán số khung",
                                "qty": int(item.get("xts_receivedquantity", 1) or 1),
                                "unit_cost": item.get("xts_unitcost", total_val) or total_val,
                                "total_val": total_val,
                                "status": status,
                                "created_date": created,
                                "receipt_date": receipt_date if receipt_date else "---",
                                "trans_unit": trans_unit,
                                "bill_lading": bill_lading,
                                "po_no": po_no
                            })
                    else:
                        records.append({
                            "dealer": d.get("dealer_code", "N31913"),
                            "pr_no": pr_num,
                            "do_no": do_num if do_num else "---",
                            "model": "VF Xe",
                            "color": "---",
                            "vin": "Chờ gán số khung",
                            "qty": 1,
                            "unit_cost": total_val,
                            "total_val": total_val,
                            "status": status,
                            "created_date": created,
                            "receipt_date": receipt_date if receipt_date else "---",
                            "trans_unit": trans_unit,
                            "bill_lading": bill_lading,
                            "po_no": po_no
                        })
        except Exception as e:
            print(f"Lỗi tải dữ liệu: {e}")

        self.after(0, lambda: self.finish_fetch_data(records))

    def finish_fetch_data(self, records):
        self.raw_data = records
        self.is_loading = False
        self.btn_refresh.config(state=tk.NORMAL, text="🔄 Làm Mới Dữ Liệu")
        self.apply_filters()

    def apply_filters(self):
        q = self.search_var.get().strip().lower()
        st_filter = self.filter_status_var.get()
        md_filter = self.filter_model_var.get()
        dl_filter = self.var_dealer.get()

        res = []
        for r in self.raw_data:
            # Lọc đại lý
            if dl_filter != "Tất cả đại lý" and r.get("dealer") != dl_filter:
                continue

            # Lọc trạng thái
            if st_filter == "Mở (Chờ xuất xưởng)" and "Mở" not in r.get("status", ""):
                continue
            elif st_filter == "Phát hành (Đang vận chuyển)" and "Phát hành" not in r.get("status", ""):
                continue
            elif st_filter == "Nhận (Đã về Showroom)" and "Nhận" not in r.get("status", ""):
                continue

            # Lọc dòng xe
            if md_filter != "Tất cả dòng xe" and md_filter.lower() not in r.get("model", "").lower():
                continue

            # Tìm kiếm text
            text_haystack = f"{r.get('pr_no')} {r.get('do_no')} {r.get('model')} {r.get('vin')} {r.get('color')}".lower()
            if q and q not in text_haystack:
                continue

            res.append(r)

        self.filtered_data = res
        self.render_tree(res)
        self.update_stats(res)

    def render_tree(self, data):
        for item in self.tree.get_children():
            self.tree.delete(item)

        for i, row in enumerate(data, 1):
            cost_str = f"{row.get('unit_cost', 0):,.0f} đ".replace(",", ".")
            total_str = f"{row.get('total_val', 0):,.0f} đ".replace(",", ".")

            self.tree.insert("", tk.END, values=(
                i,
                row.get("pr_no"),
                row.get("do_no"),
                row.get("model"),
                row.get("color"),
                row.get("vin"),
                row.get("qty"),
                cost_str,
                total_str,
                row.get("status"),
                row.get("created_date"),
                row.get("receipt_date")
            ))

        self.lbl_record_count.config(text=f"Đang hiển thị: {len(data)} bản ghi")

        # Tự động chọn dòng đầu tiên nếu có
        children = self.tree.get_children()
        if children:
            self.tree.selection_set(children[0])
            self.on_item_select(None)

    def update_stats(self, data):
        total_count = len(data)
        open_count = sum(1 for r in data if "Mở" in r.get("status", ""))
        transit_count = sum(1 for r in data if "Phát hành" in r.get("status", ""))
        received_count = sum(1 for r in data if "Nhận" in r.get("status", ""))
        total_val = sum(r.get("total_val", 0) for r in data)

        self.card_total.config(text=str(total_count))
        self.card_open.config(text=str(open_count))
        self.card_transit.config(text=str(transit_count))
        self.card_received.config(text=str(received_count))
        self.card_value.config(text=f"{total_val:,.0f} đ".replace(",", "."))

    def on_item_select(self, event):
        sel = self.tree.selection()
        if not sel:
            return
        idx = self.tree.index(sel[0])
        if idx < len(self.filtered_data):
            rec = self.filtered_data[idx]
            self.update_stepper(rec.get("status", ""))
            self.lbl_detail_po.config(text=f"Đơn đặt hàng PO: {rec.get('po_no') or 'Tự động tạo theo DO'}")
            trans = rec.get("trans_unit") or "Xe lồng chuyên dụng VinFast Logistics"
            bl = rec.get("bill_lading") or f"BL-{rec.get('do_no')}"
            self.lbl_detail_transport.config(text=f"Xe lồng: {trans} | Số vận đơn B/L: {bl}")

    def export_to_excel(self):
        if not self.filtered_data:
            messagebox.showwarning("Thông báo", "Không có dữ liệu để xuất Excel!")
            return

        filename = filedialog.asksaveasfilename(
            defaultextension=".xlsx",
            filetypes=[("Excel Workbook", "*.xlsx")],
            initialfile=f"Bao_Cao_Rut_Xe_Nha_May_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        )
        if not filename:
            return

        try:
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Tien_Do_Rut_Xe_Nha_May"

            # Styles
            title_font = Font(name="Segoe UI", size=14, bold=True, color="1E3A8A")
            header_font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
            header_fill = PatternFill(start_color="0284C7", end_color="0284C7", fill_type="solid")
            border = Border(
                left=Side(style="thin", color="CBD5E1"),
                right=Side(style="thin", color="CBD5E1"),
                top=Side(style="thin", color="CBD5E1"),
                bottom=Side(style="thin", color="CBD5E1")
            )

            # Title
            ws.merge_cells("A1:K1")
            ws["A1"] = "BÁO CÁO TIẾN ĐỘ RÚT XE TỪ NHÀ MÁY VINFAST HẢI PHÒNG"
            ws["A1"].font = title_font
            ws["A1"].alignment = Alignment(horizontal="center", vertical="center")

            ws.merge_cells("A2:K2")
            ws["A2"] = f"Xuất lúc: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')} | Đại lý: {self.var_dealer.get()}"
            ws["A2"].alignment = Alignment(horizontal="center", vertical="center")

            # Headers
            headers = ["STT", "Đại lý", "Số Phiếu PR", "Số DO Nhà Máy", "Dòng Xe", "Màu Sắc", "Số Khung (VIN)", "Số Lượng", "Đơn Giá Sỉ", "Tổng Tiền", "Trạng Thái", "Ngày Lập DO", "Ngày Về Showroom"]
            for col_idx, h in enumerate(headers, 1):
                cell = ws.cell(row=4, column=col_idx, value=h)
                cell.font = header_font
                cell.fill = header_fill
                cell.alignment = Alignment(horizontal="center", vertical="center")
                cell.border = border

            # Data
            for row_idx, r in enumerate(self.filtered_data, 5):
                row_vals = [
                    row_idx - 4,
                    r.get("dealer"),
                    r.get("pr_no"),
                    r.get("do_no"),
                    r.get("model"),
                    r.get("color"),
                    r.get("vin"),
                    r.get("qty"),
                    r.get("unit_cost"),
                    r.get("total_val"),
                    r.get("status"),
                    r.get("created_date"),
                    r.get("receipt_date")
                ]
                for col_idx, val in enumerate(row_vals, 1):
                    cell = ws.cell(row=row_idx, column=col_idx, value=val)
                    cell.border = border
                    if col_idx in (1, 8):
                        cell.alignment = Alignment(horizontal="center")
                    elif col_idx in (9, 10):
                        cell.number_format = "#,##0"
                        cell.alignment = Alignment(horizontal="right")

            # Column widths
            for col in ws.columns:
                max_len = max(len(str(c.value or "")) for c in col)
                col_letter = openpyxl.utils.get_column_letter(col[0].column)
                ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

            wb.save(filename)
            messagebox.showinfo("Thành công", f"Đã xuất báo cáo Excel thành công!\n{filename}")
        except Exception as e:
            messagebox.showerror("Lỗi", f"Không thể xuất file Excel: {e}")

if __name__ == "__main__":
    app = FactoryStockTrackerApp()
    app.mainloop()
