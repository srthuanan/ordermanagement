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

class BulkExporterApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("VinFast DMS - Xuất Toàn Bộ Dữ Liệu Biển Số Xe")
        self.geometry("980x680")
        self.minsize(850, 520)
        self.configure(bg="#0f172a")

        self.dealers = load_config()
        self.all_downloaded_data = []
        self.is_running = False

        self.setup_styles()
        self.create_widgets()

    def setup_styles(self):
        style = ttk.Style()
        style.theme_use("clam")

        style.configure("Treeview",
                        background="#1e293b",
                        foreground="#f8fafc",
                        fieldbackground="#1e293b",
                        rowheight=28,
                        font=("Segoe UI", 9))
        style.map("Treeview",
                  background=[("selected", "#0284c7")],
                  foreground=[("selected", "#ffffff")])

        style.configure("Treeview.Heading",
                        background="#090d16",
                        foreground="#38bdf8",
                        font=("Segoe UI", 9, "bold"))

        style.configure("Horizontal.TProgressbar",
                        background="#0284c7",
                        troughcolor="#1e293b",
                        bordercolor="#334155")

    def create_widgets(self):
        # Header
        header = tk.Frame(self, bg="#1e293b", height=60, padx=20, pady=12)
        header.pack(fill=tk.X)

        lbl_title = tk.Label(header, text="📥 TẢI TOÀN BỘ DỮ LIỆU BIỂN SỐ XE TỪ CÁC ĐẠI LÝ DMS", 
                             font=("Segoe UI", 13, "bold"), fg="#38bdf8", bg="#1e293b")
        lbl_title.pack(side=tk.LEFT)

        # Body
        body = tk.Frame(self, bg="#0f172a", padx=20, pady=15)
        body.pack(fill=tk.BOTH, expand=True)

        # Options Box
        opts_box = tk.Frame(body, bg="#1e293b", padx=15, pady=12, highlightbackground="#334155", highlightthickness=1)
        opts_box.pack(fill=tk.X, pady=(0, 12))

        lbl_sec1 = tk.Label(opts_box, text="1. Chọn Đại lý để tải dữ liệu:", font=("Segoe UI", 10, "bold"), fg="#cbd5e1", bg="#1e293b")
        lbl_sec1.grid(row=0, column=0, sticky="w", columnspan=4, pady=(0, 6))

        self.dealer_vars = {}
        col_idx = 0
        row_idx = 1
        has_active = False

        for d in self.dealers:
            code = d.get("dealer_code")
            has_cookie = bool(d.get("cookie", "").strip())
            if has_cookie:
                has_active = True
            var = tk.BooleanVar(value=has_cookie)
            self.dealer_vars[code] = var

            state_txt = f"{code} ({'🟢 Sẵn sàng' if has_cookie else '⚪ Chưa có Cookie'})"
            chk = tk.Checkbutton(opts_box, text=state_txt, variable=var,
                                 font=("Segoe UI", 9, "bold" if has_cookie else "normal"),
                                 fg="#38bdf8" if has_cookie else "#64748b", bg="#1e293b",
                                 activebackground="#1e293b", activeforeground="#38bdf8",
                                 selectcolor="#0f172a")
            chk.grid(row=row_idx, column=col_idx, sticky="w", padx=(0, 20), pady=2)
            col_idx += 1
            if col_idx > 3:
                col_idx = 0
                row_idx += 1

        # Filter Options
        lbl_sec2 = tk.Label(opts_box, text="2. Lọc dữ liệu:", font=("Segoe UI", 10, "bold"), fg="#cbd5e1", bg="#1e293b")
        lbl_sec2.grid(row=row_idx + 1, column=0, sticky="w", pady=(10, 4))

        self.filter_var = tk.StringVar(value="has_plate")
        rb_all = tk.Radiobutton(opts_box, text="Tất cả bản ghi đăng ký xe", variable=self.filter_var, value="all",
                                font=("Segoe UI", 9), fg="#f8fafc", bg="#1e293b", activebackground="#1e293b",
                                selectcolor="#0f172a")
        rb_all.grid(row=row_idx + 2, column=0, sticky="w", padx=(0, 15))

        rb_plate_only = tk.Radiobutton(opts_box, text="Chỉ tải xe ĐÃ CÓ BIỂN SỐ (Khuyên dùng)", variable=self.filter_var, value="has_plate",
                                       font=("Segoe UI", 9, "bold"), fg="#22c55e", bg="#1e293b", activebackground="#1e293b",
                                       selectcolor="#0f172a")
        rb_plate_only.grid(row=row_idx + 2, column=1, sticky="w", padx=(0, 15), columnspan=2)

        # Action Buttons
        self.btn_start = tk.Button(opts_box, text="🚀 BẮT ĐẦU TẢI DỮ LIỆU", font=("Segoe UI", 10, "bold"),
                                   bg="#0284c7", fg="#ffffff", activebackground="#0369a1",
                                   relief="flat", padx=20, pady=6, cursor="hand2", command=self.start_download)
        self.btn_start.grid(row=row_idx + 2, column=3, sticky="e", padx=(10, 0))

        # Progress bar & Status
        self.progress_bar = ttk.Progressbar(body, style="Horizontal.TProgressbar", mode="indeterminate")
        self.progress_bar.pack(fill=tk.X, pady=(0, 6))

        self.status_lbl = tk.Label(body, text="Sẵn sàng tải. Bấm 'Bắt đầu tải dữ liệu' để quét toàn bộ hệ thống.",
                                   font=("Segoe UI", 10), fg="#94a3b8", bg="#0f172a", anchor="w")
        self.status_lbl.pack(fill=tk.X, pady=(0, 10))

        # Preview Treeview
        table_frame = tk.Frame(body, bg="#1e293b", highlightbackground="#334155", highlightthickness=1)
        table_frame.pack(fill=tk.BOTH, expand=True)

        columns = ("stt", "dealer", "vin", "plate", "status", "policy", "reg_code", "createdon")
        self.tree = ttk.Treeview(table_frame, columns=columns, show="headings", selectmode="browse")

        self.tree.heading("stt", text="STT")
        self.tree.heading("dealer", text="Đại lý")
        self.tree.heading("vin", text="Số khung (VIN)")
        self.tree.heading("plate", text="Biển số xe")
        self.tree.heading("status", text="Trạng thái")
        self.tree.heading("policy", text="Chính sách sạc")
        self.tree.heading("reg_code", text="Mã phiếu")
        self.tree.heading("createdon", text="Ngày đăng ký")

        self.tree.column("stt", width=50, anchor="center")
        self.tree.column("dealer", width=90, anchor="center")
        self.tree.column("vin", width=170, anchor="center")
        self.tree.column("plate", width=120, anchor="center")
        self.tree.column("status", width=90, anchor="center")
        self.tree.column("policy", width=130, anchor="center")
        self.tree.column("reg_code", width=190, anchor="center")
        self.tree.column("createdon", width=140, anchor="center")

        scroll_y = ttk.Scrollbar(table_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroll_y.set)
        scroll_y.pack(side=tk.RIGHT, fill=tk.Y)

        scroll_x = ttk.Scrollbar(table_frame, orient=tk.HORIZONTAL, command=self.tree.xview)
        self.tree.configure(xscrollcommand=scroll_x.set)
        scroll_x.pack(side=tk.BOTTOM, fill=tk.X)

        self.tree.pack(fill=tk.BOTH, expand=True)

        # Footer
        footer = tk.Frame(body, bg="#0f172a", pady=10)
        footer.pack(fill=tk.X)

        self.lbl_count = tk.Label(footer, text="Tổng số bản ghi đã tải: 0", font=("Segoe UI", 10, "bold"), fg="#38bdf8", bg="#0f172a")
        self.lbl_count.pack(side=tk.LEFT)

        self.btn_export = tk.Button(footer, text="📊 Xuất File Excel (.xlsx)", font=("Segoe UI", 9, "bold"),
                                    bg="#059669", fg="#ffffff", activebackground="#047857",
                                    relief="flat", padx=16, pady=5, cursor="hand2", state=tk.DISABLED,
                                    command=self.save_excel_file)
        self.btn_export.pack(side=tk.RIGHT, padx=(8, 0))

        self.btn_open_file = tk.Button(footer, text="📂 Mở File Vừa Xuất", font=("Segoe UI", 9),
                                      bg="#334155", fg="#cbd5e1", relief="flat", padx=12, pady=5,
                                      cursor="hand2", state=tk.DISABLED, command=self.open_exported_file)
        self.btn_open_file.pack(side=tk.RIGHT)
        self.last_saved_filepath = None

    def start_download(self):
        if self.is_running:
            return

        selected_dealers = [d for d in self.dealers if self.dealer_vars.get(d.get("dealer_code"), tk.BooleanVar()).get()]
        active_dealers = [d for d in selected_dealers if d.get("cookie", "").strip()]

        if not active_dealers:
            messagebox.showwarning("Thông báo", "Vui lòng chọn ít nhất một đại lý ĐÃ CÓ COOKIE để tải dữ liệu!")
            return

        self.is_running = True
        self.btn_start.config(state=tk.DISABLED, bg="#64748b")
        self.btn_export.config(state=tk.DISABLED)
        self.btn_open_file.config(state=tk.DISABLED)
        self.progress_bar.start(10)

        # Clear treeview
        for item in self.tree.get_children():
            self.tree.delete(item)
        self.all_downloaded_data.clear()

        thread = threading.Thread(target=self.run_download_thread, args=(active_dealers,))
        thread.daemon = True
        thread.start()

    def run_download_thread(self, active_dealers):
        only_has_plate = (self.filter_var.get() == "has_plate")
        total_found = 0
        errors = []

        for d in active_dealers:
            code = d.get("dealer_code")
            cookie = d.get("cookie")
            headers = get_dms_headers(cookie)

            self.after(0, lambda c=code: self.status_lbl.config(
                text=f"⏳ Đang tải dữ liệu từ đại lý [{c}]...", fg="#38bdf8"
            ))

            page = 1
            dealer_records = 0

            while True:
                # FetchXML kết hợp link-entity sang xts_vehiclepublic lấy thẳng số khung VIN
                filter_xml = '<condition attribute="itv_plateno" operator="not-null"/>' if only_has_plate else ''
                fxml = f'''<fetch page="{page}" count="500">
                    <entity name="itv_vehicleregistration">
                        <attribute name="itv_vehicleregistrationid"/>
                        <attribute name="itv_name"/>
                        <attribute name="itv_plateno"/>
                        <attribute name="itv_status"/>
                        <attribute name="itv_chargingpolicy"/>
                        <attribute name="createdon"/>
                        <attribute name="modifiedon"/>
                        <order attribute="createdon" descending="true"/>
                        <filter type="and">
                            {filter_xml}
                        </filter>
                        <link-entity name="xts_vehiclepublic" from="xts_vehiclepublicid" to="itv_vin" link-type="outer" alias="vp">
                            <attribute name="xts_chassisnumber"/>
                            <attribute name="xts_vehicleidentificationnumber"/>
                        </link-entity>
                    </entity>
                </fetch>'''

                try:
                    r = requests.get(f"{BASE_API_URL}/itv_vehicleregistrations", headers=headers, params={"fetchXml": fxml}, timeout=15)
                    if r.status_code == 401:
                        errors.append(f"Đại lý [{code}]: Cookie hết hạn (401)")
                        break
                    elif r.status_code != 200:
                        errors.append(f"Đại lý [{code}]: Lỗi HTTP {r.status_code}")
                        break

                    items = r.json().get("value", [])
                    if not items:
                        break

                    for row in items:
                        vin = row.get("vp.xts_chassisnumber") or row.get("vp.xts_vehicleidentificationnumber") or ""
                        plate = row.get("itv_plateno") or ""
                        
                        if only_has_plate and not plate:
                            continue

                        status_map = {1: "Mới", 2: "Đã gửi", 3: "Đã hủy"}
                        policy_map = {1: "Không xác định", 2: "Biển trắng", 3: "Biển vàng"}

                        item_data = {
                            "dealer": code,
                            "vin": vin,
                            "plate": plate,
                            "status": status_map.get(row.get("itv_status"), row.get("itv_status@OData.Community.Display.V1.FormattedValue") or "Đã gửi"),
                            "policy": policy_map.get(row.get("itv_chargingpolicy"), row.get("itv_chargingpolicy@OData.Community.Display.V1.FormattedValue") or "-"),
                            "reg_code": row.get("itv_name") or "",
                            "createdon": row.get("createdon@OData.Community.Display.V1.FormattedValue") or row.get("createdon", "")[:19].replace("T", " ")
                        }

                        self.all_downloaded_data.append(item_data)
                        dealer_records += 1
                        total_found += 1

                        # Thêm vào bảng giao diện (giới hạn hiển thị 1000 dòng để mượt)
                        if total_found <= 1000:
                            self.after(0, lambda idx=total_found, itm=item_data: self.tree.insert("", tk.END, values=(
                                idx,
                                itm["dealer"],
                                itm["vin"],
                                itm["plate"],
                                itm["status"],
                                itm["policy"],
                                itm["reg_code"],
                                itm["createdon"]
                            )))

                    self.after(0, lambda t=total_found: self.lbl_count.config(text=f"Tổng số bản ghi đã tải: {t:,}"))

                    if len(items) < 500:
                        break
                    page += 1

                except Exception as e:
                    errors.append(f"Đại lý [{code}]: {e}")
                    break

        self.after(0, lambda: self.finish_download(total_found, errors))

    def finish_download(self, total_found, errors):
        self.is_running = False
        self.progress_bar.stop()
        self.btn_start.config(state=tk.NORMAL, bg="#0284c7")

        if total_found > 0:
            self.btn_export.config(state=tk.NORMAL)
            msg = f"✅ TẢI THÀNH CÔNG {total_found:,} BẢN GHI BIỂN SỐ XE TỪ CÁC ĐẠI LÝ!"
            if errors:
                msg += f" (Có {len(errors)} thông báo lỗi)"
            self.status_lbl.config(text=msg, fg="#22c55e")
            
            # Tự động xuất file Excel luôn cho người dùng
            self.auto_export_excel()
        else:
            err_txt = errors[0] if errors else "Không có bản ghi nào phù hợp tiêu chí."
            self.status_lbl.config(text=f"❌ Không tải được dữ liệu: {err_txt}", fg="#ef4444")
            messagebox.showerror("Thông báo", f"Không tải được dữ liệu:\n{err_txt}")

    def auto_export_excel(self):
        # Tự động lưu vào thư mục hiện tại với tên theo ngày giờ
        now_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"Danh_Sach_Bien_So_DMS_{now_str}.xlsx"
        filepath = os.path.abspath(filename)
        self.write_excel(filepath)
        self.last_saved_filepath = filepath
        self.btn_open_file.config(state=tk.NORMAL)

        res = messagebox.askyesno("Tải Dữ Liệu Hoàn Tất", 
                                  f"Đã tải thành công {len(self.all_downloaded_data):,} bản ghi biển số xe!\n\n"
                                  f"File Excel đã được lưu tự động tại:\n{filename}\n\n"
                                  f"Bạn có muốn MỞ FILE EXCEL NGAY BÂY GIỜ không?")
        if res:
            self.open_exported_file()

    def save_excel_file(self):
        if not self.all_downloaded_data:
            messagebox.showinfo("Thông báo", "Chưa có dữ liệu để xuất!")
            return

        now_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        default_name = f"Danh_Sach_Bien_So_DMS_{now_str}.xlsx"
        file_path = filedialog.asksaveasfilename(defaultextension=".xlsx", 
                                                 initialfile=default_name,
                                                 filetypes=[("Excel Workbook", "*.xlsx"), ("CSV file", "*.csv")],
                                                 title="Lưu file danh sách biển số xe")
        if file_path:
            try:
                self.write_excel(file_path)
                self.last_saved_filepath = file_path
                self.btn_open_file.config(state=tk.NORMAL)
                messagebox.showinfo("Thành công", f"Đã xuất file thành công tại:\n{file_path}")
            except Exception as e:
                messagebox.showerror("Lỗi", f"Không thể ghi file: {e}")

    def write_excel(self, file_path):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Bien_So_Xe_DMS"

        # Headers
        headers = ["STT", "Đại Lý", "Số Khung (VIN)", "Biển Số Xe", "Trạng Thái", "Chính Sách Sạc", "Mã Phiếu Đăng Ký", "Ngày Đăng Ký"]
        ws.append(headers)

        # Style Header
        header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        header_font = Font(name="Segoe UI", size=11, bold=True, color="38BDF8")
        thin_border = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='CBD5E1'),
            bottom=Side(style='thin', color='CBD5E1')
        )

        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = thin_border
        ws.row_dimensions[1].height = 28

        # Data rows
        plate_font = Font(name="Segoe UI", size=10, bold=True, color="0284C7")
        regular_font = Font(name="Segoe UI", size=10)

        for idx, r in enumerate(self.all_downloaded_data, start=1):
            row_data = [
                idx,
                r["dealer"],
                r["vin"],
                r["plate"],
                r["status"],
                r["policy"],
                r["reg_code"],
                r["createdon"]
            ]
            ws.append(row_data)
            row_num = idx + 1
            ws.row_dimensions[row_num].height = 20

            for col_num in range(1, len(row_data) + 1):
                c = ws.cell(row=row_num, column=col_num)
                c.border = thin_border
                c.alignment = Alignment(vertical="center", horizontal="center" if col_num in [1, 2, 4, 5, 8] else "left")
                if col_num == 4:
                    c.font = plate_font
                else:
                    c.font = regular_font

        # Auto-adjust column width
        col_widths = {1: 8, 2: 12, 3: 24, 4: 16, 5: 14, 6: 20, 7: 30, 8: 22}
        for col_idx, width in col_widths.items():
            ws.column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = width

        wb.save(file_path)

    def open_exported_file(self):
        if self.last_saved_filepath and os.path.exists(self.last_saved_filepath):
            try:
                os.startfile(self.last_saved_filepath)
            except Exception as e:
                messagebox.showerror("Lỗi mở file", f"Không thể mở file: {e}")
        else:
            messagebox.showwarning("Thông báo", "Chưa có file nào được lưu!")

if __name__ == "__main__":
    app = BulkExporterApp()
    app.mainloop()
