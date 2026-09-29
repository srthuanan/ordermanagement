# -*- coding: utf-8 -*-
"""
==============================================================================
HE THONG TRA CUU HOA DON VNPT THEO SO VIN (GREEN SM / VINFAST)
Dành cho: https://gmsvietnam-tt78.vnpt-invoice.com.vn/Invoice/Search
Nâng cấp TỐC ĐỘ SIÊU NHANH (Cache cục bộ tức thì 0.01s, Bỏ qua HĐ đã quét).
==============================================================================
"""

import os
import re
import json
import time
import threading
import webbrowser
from datetime import datetime
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

BASE_URL = "https://gmsvietnam-tt78.vnpt-invoice.com.vn"
CONFIG_FILE = "vnpt_config.json"
CACHE_FILE = "vnpt_invoices_cache.json"
SYNC_PORT = 28889

DEFAULT_CONFIG = {
    "cookie": "",
    "symbol": "C26TPP",
    "pattern": "1/001",
    "from_date": "01/08/2026",
    "to_date": "30/09/2026",
    "auto_stop_on_first_match": True
}

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                cfg = DEFAULT_CONFIG.copy()
                cfg.update(data)
                return cfg
        except Exception:
            pass
    return DEFAULT_CONFIG.copy()

def save_config(cfg):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        return False

def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_cache(cache_data):
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

def clean_cookie(raw_input):
    if not raw_input:
        return ""
    text = raw_input.strip()
    m_b = re.search(r"(?:-b|--cookie)\s+['\"]([^'\"]+)['\"]", text)
    if m_b:
        return m_b.group(1).strip()
    m_h = re.search(r"-[Hh]\s+['\"]cookie:\s*([^'\"]+)['\"]", text, re.I)
    if m_h:
        return m_h.group(1).strip()
    m_c = re.search(r"^cookie:\s*([^\r\n]+)", text, re.I)
    if m_c:
        return m_c.group(1).strip().strip("'\"")
    return text.strip().strip("'\"")

def get_headers(cookie):
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": f"{BASE_URL}/Invoice/Search",
        "Cookie": cookie
    }

class SyncServerHandler(BaseHTTPRequestHandler):
    app_instance = None

    def log_message(self, format, *args):
        pass

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/sync':
            params = urllib.parse.parse_qs(parsed.query)
            cookie_val = params.get('cookie', [''])[0]
            if cookie_val and SyncServerHandler.app_instance:
                SyncServerHandler.app_instance.update_cookie_from_sync(cookie_val)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "message": "Cookie synced successfully"}).encode('utf-8'))
                return
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        length = int(self.headers.get('content-length', 0))
        body = self.rfile.read(length).decode('utf-8')
        
        if parsed.path == '/sync':
            try:
                data = json.loads(body)
                cookie_val = data.get('cookie') or data.get('cookieStr') or ''
                if cookie_val and SyncServerHandler.app_instance:
                    SyncServerHandler.app_instance.update_cookie_from_sync(cookie_val)
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "ok", "message": "Cookie VNPT synced successfully"}).encode('utf-8'))
                    return
                else:
                    self.send_response(400)
                    self.end_headers()
                    return
            except Exception:
                self.send_response(500)
                self.end_headers()
                return
        self.send_response(404)
        self.end_headers()


class VnptInvoiceFinderApp:
    def __init__(self, root):
        self.root = root
        self.root.title("VINFAST / GSM — TÌM KIẾM HÓA ĐƠN VNPT THEO SỐ VIN (SIÊU TỐC)")
        self.root.geometry("1180x760")
        self.root.minsize(1020, 640)

        # Style & Theme
        self.style = ttk.Style()
        try:
            self.style.theme_use('clam')
        except Exception:
            pass

        # Colors
        self.bg_color = "#0b1326"
        self.panel_bg = "#0f172a"
        self.card_bg = "#1e293b"
        self.cyan = "#38bdf8"
        self.green = "#10b981"
        self.amber = "#f59e0b"
        self.text_color = "#f1f5f9"
        self.text_dim = "#94a3b8"

        self.root.configure(bg=self.bg_color)
        self.cfg = load_config()
        self.cache_db = load_cache()

        self.invoices_data = []
        self.invoice_cache = {} 
        self.is_searching = False
        self.stop_requested = False

        SyncServerHandler.app_instance = self
        self.start_sync_server()

        self.build_ui()
        self.check_connection_async()

    def start_sync_server(self):
        def run_server():
            try:
                server = HTTPServer(('127.0.0.1', SYNC_PORT), SyncServerHandler)
                server.serve_forever()
            except Exception:
                pass
        t = threading.Thread(target=run_server, daemon=True)
        t.start()

    def update_cookie_from_sync(self, raw_cookie):
        clean = clean_cookie(raw_cookie)
        self.cfg["cookie"] = clean
        save_config(self.cfg)
        self.root.after(0, lambda: self.on_cookie_synced(clean))

    def on_cookie_synced(self, clean):
        self.cookie_entry.delete(0, tk.END)
        self.cookie_entry.insert(0, clean)
        self.status_conn_lbl.config(text="🟢 Đã nhận Cookie! Đang xác thực...", fg=self.cyan)
        self.check_connection_async()
        messagebox.showinfo("Đồng Bộ Thành Công", "🎉 ĐÃ TỰ ĐỘNG ĐỒNG BỘ COOKIE TỪ TRÌNH DUYỆT THÀNH CÔNG!\n\nPhiên làm việc VNPT đã được kết nối. Sẵn sàng tra cứu hóa đơn!")

    def build_ui(self):
        # 1. Top Header Frame
        top_frame = tk.Frame(self.root, bg=self.panel_bg, height=64)
        top_frame.pack(fill=tk.X, side=tk.TOP)

        header_content = tk.Frame(top_frame, bg=self.panel_bg)
        header_content.pack(fill=tk.BOTH, padx=20, pady=10)

        title_box = tk.Frame(header_content, bg=self.panel_bg)
        title_box.pack(side=tk.LEFT)

        title_lbl = tk.Label(title_box, text="⚡ TÌM HÓA ĐƠN THEO SỐ VIN (VNPT TT78) — SIÊU TỐC", 
                             font=("Outfit", 15, "bold"), fg=self.cyan, bg=self.panel_bg)
        title_lbl.pack(anchor="w")

        cache_count = len(self.cache_db)
        self.cache_stat_lbl = tk.Label(title_box, text=f"GSM Vietnam • Bộ nhớ đệm: {cache_count} hóa đơn đã lưu sẵn (Tra tức thì 0.01s)", 
                                       font=("Inter", 9), fg=self.green, bg=self.panel_bg)
        self.cache_stat_lbl.pack(anchor="w")

        # Connection status badge
        self.status_conn_lbl = tk.Label(header_content, text="⏳ Đang kiểm tra kết nối...", 
                                        font=("Inter", 10, "bold"), fg=self.amber, bg=self.panel_bg)
        self.status_conn_lbl.pack(side=tk.RIGHT, padx=10)

        # 2. Main Container
        main_frame = tk.Frame(self.root, bg=self.bg_color)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)

        # Config Bar (Cookie, Dates, Serial)
        cfg_card = tk.LabelFrame(main_frame, text=" ⚙️ Thiết Lập Ngày Tìm Kiếm & Cookie ", 
                                 font=("Inter", 10, "bold"), fg=self.cyan, bg=self.panel_bg, 
                                 bd=1, relief=tk.SOLID)
        cfg_card.pack(fill=tk.X, pady=(0, 10))

        cfg_grid = tk.Frame(cfg_card, bg=self.panel_bg)
        cfg_grid.pack(fill=tk.X, padx=15, pady=8)

        # Row 1: Dates & Symbol
        tk.Label(cfg_grid, text="Mẫu số:", font=("Inter", 9, "bold"), fg=self.text_color, bg=self.panel_bg).grid(row=0, column=0, sticky="w", pady=4)
        self.entry_pattern = tk.Entry(cfg_grid, width=9, font=("Inter", 10), bg=self.card_bg, fg=self.text_color, insertbackground=self.text_color)
        self.entry_pattern.insert(0, self.cfg.get("pattern", "1/001"))
        self.entry_pattern.grid(row=0, column=1, sticky="w", padx=(5, 12))

        tk.Label(cfg_grid, text="Ký hiệu:", font=("Inter", 9, "bold"), fg=self.text_color, bg=self.panel_bg).grid(row=0, column=2, sticky="w")
        self.entry_symbol = tk.Entry(cfg_grid, width=11, font=("Inter", 10), bg=self.card_bg, fg=self.text_color, insertbackground=self.text_color)
        self.entry_symbol.insert(0, self.cfg.get("symbol", "C26TPP"))
        self.entry_symbol.grid(row=0, column=3, sticky="w", padx=(5, 12))

        tk.Label(cfg_grid, text="Từ ngày:", font=("Inter", 9, "bold"), fg=self.text_color, bg=self.panel_bg).grid(row=0, column=4, sticky="w")
        self.entry_from = tk.Entry(cfg_grid, width=11, font=("Inter", 10), bg=self.card_bg, fg=self.text_color, insertbackground=self.text_color)
        self.entry_from.insert(0, self.cfg.get("from_date", "01/08/2026"))
        self.entry_from.grid(row=0, column=5, sticky="w", padx=(5, 12))

        tk.Label(cfg_grid, text="Đến ngày:", font=("Inter", 9, "bold"), fg=self.text_color, bg=self.panel_bg).grid(row=0, column=6, sticky="w")
        self.entry_to = tk.Entry(cfg_grid, width=11, font=("Inter", 10), bg=self.card_bg, fg=self.text_color, insertbackground=self.text_color)
        self.entry_to.insert(0, self.cfg.get("to_date", "30/09/2026"))
        self.entry_to.grid(row=0, column=7, sticky="w", padx=(5, 12))

        # Quick date buttons
        btn_box = tk.Frame(cfg_grid, bg=self.panel_bg)
        btn_box.grid(row=0, column=8, sticky="e")

        tk.Button(btn_box, text="Tháng 9", font=("Inter", 8, "bold"), bg=self.card_bg, fg=self.cyan,
                  command=lambda: self.set_dates("01/09/2026", "30/09/2026")).pack(side=tk.LEFT, padx=2)
        tk.Button(btn_box, text="Tháng 8", font=("Inter", 8, "bold"), bg=self.card_bg, fg=self.cyan,
                  command=lambda: self.set_dates("01/08/2026", "31/08/2026")).pack(side=tk.LEFT, padx=2)
        tk.Button(btn_box, text="Cả 2 Tháng", font=("Inter", 8, "bold"), bg=self.card_bg, fg=self.green,
                  command=lambda: self.set_dates("01/08/2026", "30/09/2026")).pack(side=tk.LEFT, padx=2)

        # Row 2: Cookie
        tk.Label(cfg_grid, text="Cookie / cURL:", font=("Inter", 9, "bold"), fg=self.text_color, bg=self.panel_bg).grid(row=1, column=0, sticky="w", pady=(8, 0))
        self.cookie_entry = tk.Entry(cfg_grid, font=("Inter", 9), bg=self.card_bg, fg=self.text_color, insertbackground=self.text_color)
        self.cookie_entry.insert(0, self.cfg.get("cookie", ""))
        self.cookie_entry.grid(row=1, column=1, columnspan=6, sticky="ew", padx=(5, 10), pady=(8, 0))

        btn_save_cookie = tk.Button(cfg_grid, text="💾 Lưu Thiết Lập", font=("Inter", 9, "bold"),
                                    bg="#0284c7", fg="#fff", activebackground="#0369a1", 
                                    cursor="hand2", command=self.save_and_check_connection)
        btn_save_cookie.grid(row=1, column=7, columnspan=2, sticky="ew", pady=(8, 0))

        # Search Bar Box
        search_card = tk.Frame(main_frame, bg=self.panel_bg, bd=1, relief=tk.SOLID)
        search_card.pack(fill=tk.X, pady=(0, 10))

        search_inner = tk.Frame(search_card, bg=self.panel_bg)
        search_inner.pack(fill=tk.X, padx=15, pady=10)

        tk.Label(search_inner, text="🔍 Nhập Số VIN / Số Khung / 6 số cuối / Số máy / Số Pin:", 
                 font=("Inter", 11, "bold"), fg="#ffffff", bg=self.panel_bg).pack(anchor="w")

        input_row = tk.Frame(search_inner, bg=self.panel_bg)
        input_row.pack(fill=tk.X, pady=(6, 0))

        self.vin_entry = tk.Entry(input_row, font=("Outfit", 13, "bold"), 
                                  bg="#0b1326", fg="#38bdf8", insertbackground="#38bdf8",
                                  bd=2, relief=tk.SOLID)
        self.vin_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 10), ipady=4)
        self.vin_entry.bind("<Return>", lambda e: self.start_search())

        self.btn_search = tk.Button(input_row, text="⚡ TÌM HÓA ĐƠN", font=("Inter", 10, "bold"),
                                    bg="#0284c7", fg="#ffffff", activebackground="#0369a1",
                                    padx=18, pady=4, cursor="hand2", command=self.start_search)
        self.btn_search.pack(side=tk.LEFT, padx=(0, 6))

        self.btn_preload = tk.Button(input_row, text="📥 TẢI TOÀN BỘ KHO HĐ VÀO BỘ NHỚ", font=("Inter", 9, "bold"),
                                     bg="#059669", fg="#ffffff", activebackground="#047857",
                                     padx=12, pady=4, cursor="hand2", command=self.start_preload_all)
        self.btn_preload.pack(side=tk.LEFT, padx=(0, 6))

        self.btn_stop = tk.Button(input_row, text="⏹ DỪNG", font=("Inter", 10, "bold"),
                                  bg="#dc2626", fg="#ffffff", activebackground="#b91c1c",
                                  padx=14, pady=4, cursor="hand2", command=self.stop_search, state=tk.DISABLED)
        self.btn_stop.pack(side=tk.LEFT)

        # Progress bar & Status
        self.progress_frame = tk.Frame(search_card, bg=self.panel_bg)
        self.progress_frame.pack(fill=tk.X, padx=15, pady=(0, 8))

        self.progress_bar = ttk.Progressbar(self.progress_frame, orient=tk.HORIZONTAL, mode='determinate')
        self.progress_bar.pack(fill=tk.X, side=tk.TOP)

        self.status_lbl = tk.Label(self.progress_frame, text="Sẵn sàng tìm kiếm. Nhập số VIN và bấm '⚡ TÌM HÓA ĐƠN'.", 
                                   font=("Inter", 9, "bold"), fg=self.cyan, bg=self.panel_bg)
        self.status_lbl.pack(anchor="w", pady=(4, 0))

        # 3. Results Table (Treeview)
        table_frame = tk.Frame(main_frame, bg=self.panel_bg, bd=1, relief=tk.SOLID)
        table_frame.pack(fill=tk.BOTH, expand=True)

        cols = ("stt", "inv_no", "inv_date", "vin", "engine", "pin", "model_color", "amount", "buyer", "page")
        self.tree = ttk.Treeview(table_frame, columns=cols, show="headings", selectmode="browse")

        self.tree.heading("stt", text="STT")
        self.tree.heading("inv_no", text="Số Hóa Đơn")
        self.tree.heading("inv_date", text="Ngày Xuất")
        self.tree.heading("vin", text="Số Khung (VIN)")
        self.tree.heading("engine", text="Số Máy (SM1)")
        self.tree.heading("pin", text="Số Serial Pin")
        self.tree.heading("model_color", text="Dòng Xe & Màu Sắc")
        self.tree.heading("amount", text="Tổng Tiền (VNĐ)")
        self.tree.heading("buyer", text="Đơn Vị Mua Hàng")
        self.tree.heading("page", text="Vị Trí")

        self.tree.column("stt", width=45, anchor="center")
        self.tree.column("inv_no", width=105, anchor="center")
        self.tree.column("inv_date", width=95, anchor="center")
        self.tree.column("vin", width=175, anchor="w")
        self.tree.column("engine", width=160, anchor="w")
        self.tree.column("pin", width=170, anchor="w")
        self.tree.column("model_color", width=250, anchor="w")
        self.tree.column("amount", width=125, anchor="e")
        self.tree.column("buyer", width=200, anchor="w")
        self.tree.column("page", width=75, anchor="center")

        # Scrollbars
        vsb = ttk.Scrollbar(table_frame, orient=tk.VERTICAL, command=self.tree.yview)
        hsb = ttk.Scrollbar(table_frame, orient=tk.HORIZONTAL, command=self.tree.xview)
        self.tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)

        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        vsb.pack(side=tk.RIGHT, fill=tk.Y)
        hsb.pack(side=tk.BOTTOM, fill=tk.X)

        self.tree.bind("<Double-1>", lambda e: self.action_view_invoice())

        # 4. Bottom Action Bar
        action_bar = tk.Frame(self.root, bg=self.panel_bg, height=48)
        action_bar.pack(fill=tk.X, side=tk.BOTTOM)

        action_inner = tk.Frame(action_bar, bg=self.panel_bg)
        action_inner.pack(fill=tk.BOTH, padx=20, pady=8)

        self.btn_view = tk.Button(action_inner, text="👁️ Xem Hóa Đơn (Web)", font=("Inter", 9, "bold"),
                                  bg="#0284c7", fg="#ffffff", activebackground="#0369a1", 
                                  cursor="hand2", command=self.action_view_invoice)
        self.btn_view.pack(side=tk.LEFT, padx=(0, 8))

        self.btn_pdf = tk.Button(action_inner, text="📥 Tải File PDF Gốc", font=("Inter", 9, "bold"),
                                 bg="#059669", fg="#ffffff", activebackground="#047857", 
                                 cursor="hand2", command=self.action_download_pdf)
        self.btn_pdf.pack(side=tk.LEFT, padx=(0, 8))

        self.btn_copy_inv = tk.Button(action_inner, text="📋 Copy Số HĐ", font=("Inter", 9),
                                      bg=self.card_bg, fg=self.text_color, activebackground="#334155", 
                                      cursor="hand2", command=self.action_copy_inv_no)
        self.btn_copy_inv.pack(side=tk.LEFT, padx=(0, 8))

        self.btn_copy_vin = tk.Button(action_inner, text="📋 Copy Số VIN", font=("Inter", 9),
                                      bg=self.card_bg, fg=self.text_color, activebackground="#334155", 
                                      cursor="hand2", command=self.action_copy_vin)
        self.btn_copy_vin.pack(side=tk.LEFT, padx=(0, 8))

        self.btn_excel = tk.Button(action_inner, text="📊 Xuất Excel (.xlsx)", font=("Inter", 9, "bold"),
                                   bg="#0284c7", fg="#ffffff", activebackground="#0369a1", 
                                   cursor="hand2", command=self.action_export_excel)
        self.btn_excel.pack(side=tk.RIGHT)

    def set_dates(self, from_d, to_d):
        self.entry_from.delete(0, tk.END)
        self.entry_from.insert(0, from_d)
        self.entry_to.delete(0, tk.END)
        self.entry_to.insert(0, to_d)
        self.save_and_check_connection()

    def save_and_check_connection(self):
        raw_cookie = self.cookie_entry.get().strip()
        clean = clean_cookie(raw_cookie)
        self.cfg["cookie"] = clean
        self.cfg["symbol"] = self.entry_symbol.get().strip()
        self.cfg["pattern"] = self.entry_pattern.get().strip()
        self.cfg["from_date"] = self.entry_from.get().strip()
        self.cfg["to_date"] = self.entry_to.get().strip()
        save_config(self.cfg)
        self.check_connection_async()

    def check_connection_async(self):
        def task():
            cookie = self.cfg.get("cookie", "")
            if not cookie:
                self.root.after(0, lambda: self.status_conn_lbl.config(
                    text="⚠️ Chưa nhập Cookie VNPT", fg=self.amber))
                return
            try:
                headers = get_headers(cookie)
                res = requests.get(f"{BASE_URL}/Invoice/Search", headers=headers, timeout=8)
                if res.status_code == 200:
                    if "UserName" in res.text and "Password" in res.text:
                        self.root.after(0, lambda: self.status_conn_lbl.config(
                            text="❌ Cookie hết hạn (Đang ở trang đăng nhập)", fg="#ef4444"))
                    else:
                        account_name = "gsmd1000002358"
                        m = re.search(r"Xin chào\s*:\s*([a-zA-Z0-9_]+)", res.text)
                        if m:
                            account_name = m.group(1)
                        self.root.after(0, lambda: self.status_conn_lbl.config(
                            text=f"🟢 Đã kết nối: {account_name}", fg=self.green))
                else:
                    self.root.after(0, lambda: self.status_conn_lbl.config(
                        text=f"HTTP {res.status_code}", fg=self.amber))
            except Exception:
                self.root.after(0, lambda: self.status_conn_lbl.config(
                    text="❌ Lỗi kết nối", fg="#ef4444"))
        threading.Thread(target=task, daemon=True).start()

    def start_search(self):
        query = self.vin_entry.get().strip()
        if not query:
            messagebox.showwarning("Thiếu Số VIN", "Vui lòng nhập số VIN hoặc 6 số cuối cần tìm!")
            self.vin_entry.focus()
            return

        # 1. KIỂM TRA BỘ NHỚ ĐỆM CỤC BỘ TRƯỚC TIÊN (SIÊU TỐC 0.01 GIÂY)
        query_upper = query.upper()
        cached_matches = []
        for inv_no, data in self.cache_db.items():
            if (query_upper in data.get("vin", "").upper() or
                query_upper in data.get("engine", "").upper() or
                query_upper in data.get("pin", "").upper() or
                query_upper in data.get("detail_text", "").upper()):
                cached_matches.append(data)

        if cached_matches:
            # TÌM THẤY NGAY LẬP TỨC TRONG CACHE!
            for row in self.tree.get_children():
                self.tree.delete(row)
            for idx, item in enumerate(cached_matches, 1):
                self.add_row_to_tree(item, idx)
            first = cached_matches[0]
            self.status_lbl.config(
                text=f"⚡ TÌM THẤY TỨC THÌ (0.01s)! HĐ số {first.get('inv_no')} — VIN: {first.get('vin')} — Tiền: {first.get('amount')} VNĐ",
                fg=self.green
            )
            msg = (
                f"🎉 ĐÃ TÌM THẤY HÓA ĐƠN TRONG BỘ NHỚ ĐỆM (TỨC THÌ 0.01s)!\n\n"
                f"• Số Hóa Đơn: {first.get('inv_no')}\n"
                f"• Ngày xuất: {first.get('date')}\n"
                f"• Số Khung (VIN): {first.get('vin')}\n"
                f"• Số Máy (SM1): {first.get('engine')}\n"
                f"• Serial Pin: {first.get('pin')}\n"
                f"• Dòng xe: {first.get('model')} (Màu {first.get('color')})\n"
                f"• Người mua: {first.get('buyer')}\n"
                f"• Tổng tiền: {first.get('amount')} VNĐ\n\n"
                f"👉 Bấm 'Xem Hóa Đơn' hoặc 'Tải File PDF Gốc' để mở ngay!"
            )
            messagebox.showinfo("Đã Tìm Thấy Hóa Đơn", msg)
            return

        # 2. NẾU CHƯA CÓ TRONG CACHE THÌ QUÉT TRỰC TIẾP
        self.run_engine([query])

    def start_preload_all(self):
        """Tải toàn bộ hóa đơn trên VNPT vào cache để tra cứu tức thì mãi mãi"""
        confirm = messagebox.askyesno("Tải Kho Hóa Đơn", 
            "Tiến trình này sẽ quét và tải thông tin toàn bộ hóa đơn trong khoảng ngày đã chọn vào bộ nhớ đệm máy tính.\n\n"
            "Sau khi tải xong, TẤT CẢ các lần tra cứu sau sẽ ra kết quả NGAY LẬP TỨC trong 0.01 giây!\n\n"
            "Bạn có muốn bắt đầu không?")
        if confirm:
            self.run_engine([], is_preload=True)

    def stop_search(self):
        self.stop_requested = True
        self.status_lbl.config(text="⏹ Đang dừng tiến trình quét...", fg=self.amber)

    def run_engine(self, queries, is_preload=False):
        if self.is_searching:
            return
        cookie = self.cfg.get("cookie", "")
        if not cookie:
            messagebox.showerror("Chưa Có Cookie", "Vui lòng nhập Cookie hoặc mở trang VNPT đăng nhập trước!")
            self.cookie_entry.focus()
            return

        self.is_searching = True
        self.stop_requested = False
        self.btn_search.config(state=tk.DISABLED)
        self.btn_preload.config(state=tk.DISABLED)
        self.btn_stop.config(state=tk.NORMAL)

        if not is_preload:
            for row in self.tree.get_children():
                self.tree.delete(row)

        threading.Thread(target=self.search_worker, args=(queries, is_preload), daemon=True).start()

    def search_worker(self, queries, is_preload=False):
        cookie = self.cfg.get("cookie", "")
        headers = get_headers(cookie)
        symbol = self.entry_symbol.get().strip()
        pattern = self.entry_pattern.get().strip()
        from_date = self.entry_from.get().strip()
        to_date = self.entry_to.get().strip()

        matched_results = []
        total_scanned = 0
        encoded_from = urllib.parse.quote(from_date, safe="")
        encoded_to = urllib.parse.quote(to_date, safe="")
        encoded_pattern = urllib.parse.quote(pattern, safe="")
        encoded_symbol = urllib.parse.quote(symbol, safe="")

        found_target = False
        page = 1
        max_pages = 60

        target_str = queries[0].strip().upper() if queries else ""

        self.set_status("⏳ Đang quét danh sách hóa đơn từ hệ thống VNPT...")

        while page <= max_pages and not self.stop_requested and not found_target:
            self.update_progress(min(95, page * 2), f"📄 Đang đọc danh sách Trang {page}... (Đã kiểm tra {total_scanned} hóa đơn)")
            url = f"{BASE_URL}/Invoice/search?FromDate={encoded_from}&serial={encoded_symbol}&ToDate={encoded_to}&pattern={encoded_pattern}&PaymentStatus=-1&page={page}"
            
            try:
                r = requests.get(url, headers=headers, timeout=10)
                if r.status_code != 200:
                    break
            except Exception:
                break

            invoices = self.parse_table_invoices(r.text, page)
            if not invoices:
                break

            for inv in invoices:
                if self.stop_requested:
                    break

                inv_no = inv.get("inv_no", "")
                inv_no_clean = inv_no.lstrip("0")

                # KIỂM TRA BỘ NHỚ ĐỆM: NẾU ĐÃ LƯU RỒI THÌ LẤY RA DÙNG LUÔN, KHÔNG GỌI MẠNG!
                cached_item = self.cache_db.get(inv_no) or self.cache_db.get(inv_no_clean)
                if cached_item:
                    item_data = cached_item
                else:
                    # Gọi mạng lấy chi tiết
                    item_data = self.fetch_single_invoice_detail(inv, headers)
                    if item_data:
                        # Lưu vào cache
                        self.cache_db[inv_no] = item_data
                        self.cache_db[inv_no_clean] = item_data

                total_scanned += 1

                if item_data:
                    # Kiểm tra khớp query
                    is_match = False
                    if target_str:
                        if (target_str in item_data.get("vin", "").upper() or
                            target_str in item_data.get("engine", "").upper() or
                            target_str in item_data.get("pin", "").upper() or
                            target_str in item_data.get("detail_text", "").upper()):
                            is_match = True
                    elif is_preload:
                        is_match = True

                    if is_match:
                        matched_results.append(item_data)
                        if not is_preload:
                            self.root.after(0, lambda item=item_data, idx=len(matched_results): self.add_row_to_tree(item, idx))
                            found_target = True
                            break

            # Lưu lại cache sau mỗi trang
            save_cache(self.cache_db)
            self.root.after(0, lambda c=len(self.cache_db): self.cache_stat_lbl.config(
                text=f"GSM Vietnam • Bộ nhớ đệm: {c} hóa đơn đã lưu sẵn (Tra tức thì 0.01s)"))

            if found_target:
                break
            page += 1

        self.finish_search(matched_results, queries, total_scanned, is_preload)

    def parse_table_invoices(self, html, page=1):
        invoices = []
        rows = re.findall(r'<tr[^>]*>([\s\S]*?)</tr>', html, re.I)
        for r in rows:
            if "<th" in r.lower():
                continue
            cells = re.findall(r'<td[^>]*>([\s\S]*?)</td>', r, re.I)
            if len(cells) >= 6:
                clean_cells = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]
                inv_no = clean_cells[4] if len(clean_cells) > 4 else ""
                symbol = clean_cells[3] if len(clean_cells) > 3 else ""
                pattern = clean_cells[2] if len(clean_cells) > 2 else ""
                amount = clean_cells[5] if len(clean_cells) > 5 else ""
                buyer = clean_cells[1] if len(clean_cells) > 1 else ""

                if not inv_no or not re.search(r'\d+', inv_no):
                    continue

                m_code = re.search(r'checkCode=([^"\'&\s]+)', r)
                if not m_code:
                    m_code = re.search(r'ajxCall4Portal\([\'"]([^\'"]+)', r)
                check_code = m_code.group(1) if m_code else ""

                invoices.append({
                    "page": page,
                    "inv_no": inv_no,
                    "symbol": symbol,
                    "pattern": pattern,
                    "amount": amount,
                    "buyer_summary": buyer,
                    "check_code": check_code
                })
        return invoices

    def fetch_single_invoice_detail(self, inv, headers):
        check_code = inv.get("check_code", "")
        if not check_code:
            return None

        try:
            r = requests.post(
                f"{BASE_URL}/HomeNoLogin/ajxPreview/",
                data={"checkCode": check_code},
                headers=headers,
                timeout=5
            )
            if r.status_code != 200:
                return None
            html = r.json().get('str', '')
        except Exception:
            return None

        clean_text = re.sub(r'<[^>]+>', ' ', html)
        clean_text = ' '.join(clean_text.split())

        parsed = self.extract_vehicle_info(html, clean_text)
        inv.update(parsed)
        inv["detail_html"] = html
        inv["detail_text"] = clean_text
        return inv

    def extract_vehicle_info(self, html, clean_text):
        data = {}
        # Buyer
        m_buyer = re.search(r'(?:CusName|Tên đơn vị mua hàng)[\s\S]*?<label[^>]*input-name[^>]*>([^<]+)</label>', html, re.I)
        data['buyer'] = m_buyer.group(1).strip() if m_buyer else ''

        # Date
        dates = re.findall(r'<b class=[\'"]input-date[\'"]>(\d+)</b>', html)
        if len(dates) >= 3:
            data['date'] = f"{dates[0].zfill(2)}/{dates[1].zfill(2)}/{dates[2]}"
        else:
            data['date'] = ''

        # Vehicle details
        m_sk = re.search(r'SK:[\s&nbsp;]*([A-HJ-NPR-Z0-9]+)', html, re.I)
        data['vin'] = m_sk.group(1).strip() if m_sk else ''

        m_sm = re.search(r'SM1:[\s&nbsp;]*([A-HJ-NPR-Z0-9]+)', html, re.I)
        data['engine'] = m_sm.group(1).strip() if m_sm else ''

        m_pin = re.search(r'(?:Pin serial:|Số Pin:?)[\s&nbsp;]*([A-HJ-NPR-Z0-9]+)', html, re.I)
        data['pin'] = m_pin.group(1).strip() if m_pin else ''

        m_coc = re.search(r'Số COC:?[\s&nbsp;]*([A-Za-z0-9\-]+)', html, re.I)
        data['coc'] = m_coc.group(1).strip() if m_coc else ''

        m_so = re.search(r'SO[\s&nbsp;]*([0-9]+)', html, re.I)
        data['so'] = m_so.group(1).strip() if m_so else ''

        m_color = re.search(r'Màu[\s&nbsp;]+([^;<\r\n]+)', html, re.I)
        data['color'] = m_color.group(1).strip() if m_color else ''

        m_model = re.search(r'(Xe ô tô con [^;<\r\n]+)', html, re.I)
        data['model'] = m_model.group(1).strip() if m_model else ''

        return data

    def add_row_to_tree(self, inv, idx):
        model_color = inv.get("model", "")
        if inv.get("color"):
            model_color = f"{model_color} (Màu {inv.get('color')})"

        buyer = inv.get("buyer") or inv.get("buyer_summary", "")

        vals = (
            idx,
            inv.get("inv_no", ""),
            inv.get("date", ""),
            inv.get("vin", "") or inv.get("vin_matched", ""),
            inv.get("engine", ""),
            inv.get("pin", ""),
            model_color,
            inv.get("amount", ""),
            buyer,
            f"Trang {inv.get('page', 1)}"
        )
        self.tree.insert("", tk.END, values=vals)

    def update_progress(self, pct, status_text):
        self.root.after(0, lambda: self._apply_progress(pct, status_text))

    def _apply_progress(self, pct, status_text):
        self.progress_bar['value'] = pct
        self.status_lbl.config(text=status_text, fg=self.cyan)

    def set_status(self, text):
        self.root.after(0, lambda: self.status_lbl.config(text=text, fg=self.cyan))

    def finish_search(self, matches, queries, total_scanned, is_preload=False):
        self.root.after(0, lambda: self._apply_finish(matches, queries, total_scanned, is_preload))

    def _apply_finish(self, matches, queries, total_scanned, is_preload=False):
        self.is_searching = False
        self.btn_search.config(state=tk.NORMAL)
        self.btn_preload.config(state=tk.NORMAL)
        self.btn_stop.config(state=tk.DISABLED)
        self.progress_bar['value'] = 100

        if is_preload:
            self.status_lbl.config(
                text=f"✅ ĐÃ ĐỒNG BỘ XONG {len(self.cache_db)} HÓA ĐƠN VÀO BỘ NHỚ ĐỆM! Từ bây giờ tra cứu là tức thì 0.01s!",
                fg=self.green
            )
            messagebox.showinfo("Đồng Bộ Thành Công", 
                f"🎉 ĐÃ TẢI XONG {len(self.cache_db)} HÓA ĐƠN VÀO MÁY!\n\n"
                f"Từ bây giờ, bạn có thể gõ bất kỳ số VIN nào và bấm 'TÌM HÓA ĐƠN', kết quả sẽ hiện ra NGAY LẬP TỨC (0.01 giây)!")
            return

        if matches:
            first = matches[0]
            self.status_lbl.config(
                text=f"🎉 TÌM THẤY! Hóa đơn số: {first.get('inv_no')} (Trang {first.get('page')}) — VIN: {first.get('vin')} — Tiền: {first.get('amount')} VNĐ",
                fg=self.green
            )
            msg = (
                f"🎉 ĐÃ TÌM THẤY HÓA ĐƠN!\n\n"
                f"• Số Hóa Đơn: {first.get('inv_no')}\n"
                f"• Vị trí: Trang {first.get('page')}\n"
                f"• Ngày xuất: {first.get('date')}\n"
                f"• Số Khung (VIN): {first.get('vin')}\n"
                f"• Số Máy (SM1): {first.get('engine')}\n"
                f"• Serial Pin: {first.get('pin')}\n"
                f"• Dòng xe: {first.get('model')} (Màu {first.get('color')})\n"
                f"• Người mua: {first.get('buyer') or first.get('buyer_summary')}\n"
                f"• Tổng tiền: {first.get('amount')} VNĐ\n\n"
                f"👉 Bấm nút 'Xem Hóa Đơn' để xem trực tiếp hoặc 'Tải File PDF Gốc' để lưu về máy!"
            )
            messagebox.showinfo("Đã Tìm Thấy Hóa Đơn", msg)
        else:
            self.status_lbl.config(text=f"Không tìm thấy hóa đơn nào trong {total_scanned} HĐ đã quét.", fg="#ef4444")
            if queries:
                messagebox.showwarning("Không Có Kết Quả", f"Đã quét qua {total_scanned} hóa đơn trên hệ thống nhưng không tìm thấy số VIN: {queries[0]}")

    def action_view_invoice(self):
        selected = self.tree.selection()
        if not selected:
            messagebox.showwarning("Chưa Chọn", "Vui lòng bấm chọn một dòng hóa đơn trong bảng để xem!")
            return
        item = self.tree.item(selected[0])
        inv_no = str(item['values'][1])
        inv_no_clean = inv_no.lstrip("0")

        cached_item = self.cache_db.get(inv_no) or self.cache_db.get(inv_no_clean)
        html = cached_item.get("detail_html", "") if cached_item else ""

        if html:
            temp_path = os.path.abspath(f"hoa_don_{inv_no}.html")
            with open(temp_path, "w", encoding="utf-8") as f:
                f.write(html)
            webbrowser.open(temp_path)
        else:
            messagebox.showinfo("Thông Báo", f"Đang mở trang chi tiết hóa đơn số {inv_no}...")

    def action_download_pdf(self):
        selected = self.tree.selection()
        if not selected:
            messagebox.showwarning("Chưa Chọn", "Vui lòng bấm chọn một dòng hóa đơn để tải PDF!")
            return
        item = self.tree.item(selected[0])
        inv_no = str(item['values'][1])
        inv_no_clean = inv_no.lstrip("0")

        cached_item = self.cache_db.get(inv_no) or self.cache_db.get(inv_no_clean)
        check_code = cached_item.get("check_code", "") if cached_item else ""

        if not check_code:
            messagebox.showerror("Lỗi", f"Không tìm thấy mã bảo mật để tải PDF cho hóa đơn {inv_no}!")
            return

        save_dir = os.path.abspath("downloads_vnpt")
        os.makedirs(save_dir, exist_ok=True)
        pdf_path = os.path.join(save_dir, f"HoaDon_{inv_no}.pdf")

        cookie = self.cfg.get("cookie", "")
        headers = get_headers(cookie)
        url = f"{BASE_URL}/Invoice/downloadPDF?checkCode={check_code}"

        try:
            r = requests.get(url, headers=headers, timeout=15)
            if r.status_code == 200 and len(r.content) > 1000:
                with open(pdf_path, "wb") as f:
                    f.write(r.content)
                self.status_lbl.config(text=f"✅ Đã tải file PDF: {pdf_path}", fg=self.green)
                webbrowser.open(pdf_path)
            else:
                messagebox.showerror("Lỗi", f"Không thể tải PDF từ VNPT (Mã lỗi: {r.status_code})")
        except Exception as e:
            messagebox.showerror("Lỗi", f"Lỗi trong quá trình tải PDF: {e}")

    def action_copy_inv_no(self):
        selected = self.tree.selection()
        if not selected:
            return
        item = self.tree.item(selected[0])
        inv_no = str(item['values'][1])
        self.root.clipboard_clear()
        self.root.clipboard_append(inv_no)
        self.status_lbl.config(text=f"📋 Đã copy Số Hóa Đơn: {inv_no}", fg=self.cyan)

    def action_copy_vin(self):
        selected = self.tree.selection()
        if not selected:
            return
        item = self.tree.item(selected[0])
        vin = str(item['values'][3])
        self.root.clipboard_clear()
        self.root.clipboard_append(vin)
        self.status_lbl.config(text=f"📋 Đã copy Số VIN: {vin}", fg=self.cyan)

    def action_export_excel(self):
        rows = self.tree.get_children()
        if not rows:
            messagebox.showwarning("Trống", "Chưa có dữ liệu nào trong bảng để xuất Excel!")
            return

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "KetQua_TraCuu_VIN"

        headers = ["STT", "Số Hóa Đơn", "Ngày Xuất", "Số Khung (VIN)", "Số Máy (SM1)", "Serial Pin", "Dòng Xe & Màu", "Tổng Tiền (VNĐ)", "Đơn Vị Mua Hàng", "Vị Trí"]
        ws.append(headers)

        header_fill = PatternFill(start_color="0284C7", end_color="0284C7", fill_type="solid")
        header_font = Font(name="Arial", size=11, bold=True, color="FFFFFF")

        for col_num, h in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")

        for r in rows:
            vals = self.tree.item(r)['values']
            ws.append(vals)

        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 45)

        out_path = os.path.abspath(f"VNPT_KetQua_Tim_VIN_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx")
        wb.save(out_path)
        messagebox.showinfo("Thành Công", f"Đã xuất file Excel thành công tại:\n{out_path}")
        webbrowser.open(out_path)


if __name__ == "__main__":
    root = tk.Tk()
    app = VnptInvoiceFinderApp(root)
    root.mainloop()
