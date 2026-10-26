# -*- coding: utf-8 -*-
"""
Công Cụ Desktop: VINFAST DMS - NHẬP HÀNG LOẠT LỊCH LÁI THỬ (TEST DRIVE)
Hỗ trợ đọc từ file Excel (.xlsx) hoặc dán trực tiếp danh sách khách hàng.
Tự động gọi Web API của VinFast Dynamics 365 để tạo Bookable Resource Bookings.
"""

import os
import re
import json
import time
import threading
from datetime import datetime, timedelta
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import requests
import openpyxl

CONFIG_FILE = "dms_dealers_config.json"
BASE_API_URL = "https://vinfastdms.crm5.dynamics.com/api/data/v9.0"

TARGET_CONFIG_PATHS = [
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "dms_dealers_config.json"),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ordermanagement", "dms_dealers_config.json"),
    os.path.expanduser(r"~\Documents\ordermanagement\dms_dealers_config.json"),
]

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

def get_headers(cookie):
    return {
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Prefer": 'odata.include-annotations="*"',
        "Cookie": cookie
    }

class TestDriveImporterApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("VinFast DMS ⚡ Nhập Hàng Loạt Lịch Lái Thử (Test Drive)")
        self.geometry("1020x720")
        self.minsize(900, 600)
        self.configure(bg="#090d16")

        self.dealers = load_dealers()
        self.current_dealer = None
        self.parsed_list = []
        self.is_running = False

        self.setup_styles()
        self.create_widgets()
        self.auto_select_dealer()

    def setup_styles(self):
        style = ttk.Style()
        style.theme_use("clam")

        style.configure("Treeview",
                        background="#0f172a",
                        foreground="#f8fafc",
                        fieldbackground="#0f172a",
                        rowheight=28,
                        font=("Segoe UI", 10))
        style.configure("Treeview.Heading",
                        background="#1e293b",
                        foreground="#38bdf8",
                        font=("Segoe UI", 10, "bold"),
                        relief="flat")
        style.map("Treeview", background=[("selected", "#0284c7")])

    def create_widgets(self):
        # 1. Header Bar
        header_frame = tk.Frame(self, bg="#0f172a", height=60, padx=20, pady=10)
        header_frame.pack(fill=tk.X)

        title_label = tk.Label(header_frame, text="🚗 VINFAST DMS - NHẬP HÀNG LOẠT LỊCH LÁI THỬ",
                               font=("Segoe UI", 14, "bold"), fg="#38bdf8", bg="#0f172a")
        title_label.pack(side=tk.LEFT)

        sub_label = tk.Label(header_frame, text="(Đăng ký Nguồn lực / Bookable Resource Booking)",
                             font=("Segoe UI", 10), fg="#94a3b8", bg="#0f172a")
        sub_label.pack(side=tk.LEFT, padx=10)

        # 2. Main Content Split
        main_frame = tk.Frame(self, bg="#090d16", padx=15, pady=10)
        main_frame.pack(fill=tk.BOTH, expand=True)

        left_pane = tk.Frame(main_frame, bg="#0f172a", width=380, padx=15, pady=15,
                             highlightbackground="#1e293b", highlightthickness=1)
        left_pane.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))
        left_pane.pack_propagate(False)

        right_pane = tk.Frame(main_frame, bg="#0f172a", padx=15, pady=15,
                              highlightbackground="#1e293b", highlightthickness=1)
        right_pane.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

        # --- LEFT PANE: CONFIGURATION & INPUT ---
        # Showroom selection
        tk.Label(left_pane, text="1. SHOWROOM / ĐẠI LÝ:", font=("Segoe UI", 10, "bold"),
                 fg="#38bdf8", bg="#0f172a").pack(anchor=tk.W, pady=(0, 4))
        
        self.cbo_dealer = ttk.Combobox(left_pane, state="readonly", font=("Segoe UI", 9))
        self.cbo_dealer.pack(fill=tk.X, pady=(0, 12))
        self.cbo_dealer.bind("<<ComboboxSelected>>", self.on_dealer_change)

        # Test Drive Event Code
        tk.Label(left_pane, text="2. MÃ SỰ KIỆN LÁI THỬ (EVENT):", font=("Segoe UI", 10, "bold"),
                 fg="#38bdf8", bg="#0f172a").pack(anchor=tk.W, pady=(0, 4))
        
        self.ent_event = tk.Entry(left_pane, font=("Segoe UI", 10), bg="#1e293b", fg="#ffffff",
                                  insertbackground="#ffffff", relief="flat")
        self.ent_event.insert(0, "N31913-TDE-1026-0001")
        self.ent_event.pack(fill=tk.X, ipady=4, pady=(0, 10))

        # Resource (Vehicle)
        tk.Label(left_pane, text="3. XE LÁI THỬ (NGUỒN LỰC):", font=("Segoe UI", 10, "bold"),
                 fg="#38bdf8", bg="#0f172a").pack(anchor=tk.W, pady=(0, 4))
        
        self.ent_resource = tk.Entry(left_pane, font=("Segoe UI", 10), bg="#1e293b", fg="#ffffff",
                                    insertbackground="#ffffff", relief="flat")
        self.ent_resource.insert(0, "10A1 - VF 5 xe nguồn lực 02")
        self.ent_resource.pack(fill=tk.X, ipady=4, pady=(0, 10))

        # Model & Location
        meta_sub_frame = tk.Frame(left_pane, bg="#0f172a")
        meta_sub_frame.pack(fill=tk.X, pady=(0, 10))

        col_m = tk.Frame(meta_sub_frame, bg="#0f172a")
        col_m.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 4))
        tk.Label(col_m, text="Dòng xe (Model):", font=("Segoe UI", 9, "bold"), fg="#38bdf8", bg="#0f172a").pack(anchor=tk.W)
        self.ent_model = tk.Entry(col_m, font=("Segoe UI", 9), bg="#1e293b", fg="#ffffff", relief="flat")
        self.ent_model.insert(0, "VF 3")
        self.ent_model.pack(fill=tk.X, ipady=3)

        col_l = tk.Frame(meta_sub_frame, bg="#0f172a")
        col_l.pack(side=tk.RIGHT, fill=tk.X, expand=True, padx=(4, 0))
        tk.Label(col_l, text="Showroom:", font=("Segoe UI", 9, "bold"), fg="#38bdf8", bg="#0f172a").pack(anchor=tk.W)
        self.ent_location = tk.Entry(col_l, font=("Segoe UI", 9), bg="#1e293b", fg="#ffffff", relief="flat")
        self.ent_location.insert(0, "N31913")
        self.ent_location.pack(fill=tk.X, ipady=3)

        # Time settings
        tk.Label(left_pane, text="4. CẤU HÌNH THỜI GIAN (15 PHÚT):", font=("Segoe UI", 10, "bold"),
                 fg="#fbbf24", bg="#0f172a").pack(anchor=tk.W, pady=(0, 4))

        time_frame = tk.Frame(left_pane, bg="#0f172a")
        time_frame.pack(fill=tk.X, pady=(0, 12))

        now = datetime.now()
        self.ent_date = tk.Entry(time_frame, font=("Segoe UI", 9), bg="#1e293b", fg="#ffffff", width=12, relief="flat")
        self.ent_date.insert(0, now.strftime("%Y-%m-%d"))
        self.ent_date.pack(side=tk.LEFT, ipady=3, padx=(0, 5))

        self.ent_time = tk.Entry(time_frame, font=("Segoe UI", 9), bg="#1e293b", fg="#ffffff", width=8, relief="flat")
        self.ent_time.insert(0, now.strftime("%H:%M"))
        self.ent_time.pack(side=tk.LEFT, ipady=3, padx=(0, 5))

        self.cbo_duration = ttk.Combobox(time_frame, state="readonly", width=9, font=("Segoe UI", 9),
                                         values=["15 phút", "20 phút", "30 phút", "45 phút", "60 phút", "Cùng giờ"])
        self.cbo_duration.current(0)
        self.cbo_duration.pack(side=tk.LEFT, ipady=1)

        # Input data methods
        tk.Label(left_pane, text="5. DANH SÁCH KHÁCH HÀNG:", font=("Segoe UI", 10, "bold"),
                 fg="#38bdf8", bg="#0f172a").pack(anchor=tk.W, pady=(0, 4))

        btn_box = tk.Frame(left_pane, bg="#0f172a")
        btn_box.pack(fill=tk.X, pady=(0, 6))

        btn_excel = tk.Button(btn_box, text="📂 Chọn file Excel (.xlsx)", font=("Segoe UI", 9, "bold"),
                              bg="#1e293b", fg="#38bdf8", relief="flat", cursor="hand2", command=self.load_excel_file)
        btn_excel.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 4), ipady=3)

        btn_sample = tk.Button(btn_box, text="Dán mẫu", font=("Segoe UI", 9),
                               bg="#1e293b", fg="#94a3b8", relief="flat", cursor="hand2", command=self.insert_sample_data)
        btn_sample.pack(side=tk.RIGHT, ipady=3, padx=(4, 0))

        self.txt_input = tk.Text(left_pane, bg="#0b1120", fg="#f8fafc", font=("Consolas", 9),
                                 insertbackground="#ffffff", relief="flat", height=9)
        self.txt_input.pack(fill=tk.BOTH, expand=True, pady=(0, 8))

        btn_parse = tk.Button(left_pane, text="🔍 Kiểm Tra & Phân Tích Danh Sách", font=("Segoe UI", 10, "bold"),
                              bg="#334155", fg="#ffffff", relief="flat", cursor="hand2", command=self.parse_input_data)
        btn_parse.pack(fill=tk.X, ipady=5)

        # --- RIGHT PANE: PREVIEW & PROGRESS ---
        tk.Label(right_pane, text="DANH SÁCH XEM TRƯỚC VÀ TRẠNG THÁI TẠO TRÊN VINFAST DMS:",
                 font=("Segoe UI", 10, "bold"), fg="#f8fafc", bg="#0f172a").pack(anchor=tk.W, pady=(0, 8))

        tree_frame = tk.Frame(right_pane, bg="#0f172a")
        tree_frame.pack(fill=tk.BOTH, expand=True)

        columns = ("idx", "name", "phone", "email", "time", "status")
        self.tree = ttk.Treeview(tree_frame, columns=columns, show="headings")
        self.tree.heading("idx", text="#")
        self.tree.heading("name", text="Họ và tên")
        self.tree.heading("phone", text="Số điện thoại")
        self.tree.heading("email", text="Email (Tự chuẩn hóa)")
        self.tree.heading("time", text="Khung giờ lái thử")
        self.tree.heading("status", text="Trạng thái DMS")

        self.tree.column("idx", width=40, anchor=tk.CENTER)
        self.tree.column("name", width=140, anchor=tk.W)
        self.tree.column("phone", width=110, anchor=tk.CENTER)
        self.tree.column("email", width=170, anchor=tk.W)
        self.tree.column("time", width=110, anchor=tk.CENTER)
        self.tree.column("status", width=160, anchor=tk.W)

        scrollbar = ttk.Scrollbar(tree_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # Bottom Action Bar
        bottom_bar = tk.Frame(right_pane, bg="#0f172a", pady=10)
        bottom_bar.pack(fill=tk.X)

        self.lbl_status = tk.Label(bottom_bar, text="Sẵn sàng. Vui lòng kiểm tra danh sách trước khi nhập.",
                                   font=("Segoe UI", 10), fg="#94a3b8", bg="#0f172a")
        self.lbl_status.pack(side=tk.LEFT)

        self.btn_start = tk.Button(bottom_bar, text="🚀 BẮT ĐẦU NHẬP HÀNG LOẠT VÀO DMS",
                                   font=("Segoe UI", 11, "bold"), bg="#0284c7", fg="#ffffff",
                                   relief="flat", cursor="hand2", padx=20, ipady=6, command=self.start_import)
        self.btn_start.pack(side=tk.RIGHT)

        # Progress bar
        self.pbar = ttk.Progressbar(right_pane, mode="determinate")
        self.pbar.pack(fill=tk.X, pady=(5, 0))

    def auto_select_dealer(self):
        dealer_names = [f"{d.get('dealer_code')} - {d.get('name')}" for d in self.dealers]
        self.cbo_dealer["values"] = dealer_names
        # Default to N31913 (Thuận An)
        target_idx = 0
        for i, d in enumerate(self.dealers):
            if d.get("dealer_code") == "N31913":
                target_idx = i
                break
        if dealer_names:
            self.cbo_dealer.current(target_idx)
            self.current_dealer = self.dealers[target_idx]

    def on_dealer_change(self, event):
        idx = self.cbo_dealer.current()
        if 0 <= idx < len(self.dealers):
            self.current_dealer = self.dealers[idx]

    def insert_sample_data(self):
        sample = (
            "Nguyễn Văn Vũ\t0975182333\tvu.nv@gmail.com\n"
            "Trần Thị Mai Anh\t0912345678\t\n"
            "Lê Hoàng Phúc\t0908889999\tphuc.lh@vinfast.vn\n"
            "Phạm Quốc Bảo\t0933221100\t"
        )
        self.txt_input.delete("1.0", tk.END)
        self.txt_input.insert(tk.END, sample)
        self.parse_input_data()

    def load_excel_file(self):
        file_path = filedialog.askopenfilename(
            title="Chọn file Excel danh sách khách hàng",
            filetypes=[("Excel Files", "*.xlsx;*.xls"), ("All Files", "*.*")]
        )
        if not file_path:
            return

        try:
            wb = openpyxl.load_workbook(file_path, data_only=True)
            sheet = wb.active
            rows_text = []
            for row in sheet.iter_rows(values_only=True):
                if not row or not any(row):
                    continue
                # Get name, phone, email from first 3 non-empty or detected cols
                vals = [str(c).strip() if c is not None else "" for c in row]
                # Filter out header if contains 'họ và tên' or 'stt'
                if any("họ và tên" in v.lower() or "số điện thoại" in v.lower() for v in vals):
                    continue
                name = vals[0] if len(vals) > 0 else ""
                phone = vals[1] if len(vals) > 1 else ""
                email = vals[2] if len(vals) > 2 else ""
                if name:
                    rows_text.append(f"{name}\t{phone}\t{email}")

            self.txt_input.delete("1.0", tk.END)
            self.txt_input.insert(tk.END, "\n".join(rows_text))
            self.parse_input_data()
            messagebox.showinfo("Thành công", f"Đã nạp {len(rows_text)} khách hàng từ file Excel!")
        except Exception as e:
            messagebox.showerror("Lỗi", f"Không thể đọc file Excel: {e}")

    def parse_input_data(self):
        raw = self.txt_input.get("1.0", tk.END).strip()
        if not raw:
            messagebox.showwarning("Cảnh báo", "Vui lòng nhập hoặc dán danh sách khách hàng!")
            return

        date_str = self.ent_date.get().strip()
        time_str = self.ent_time.get().strip()
        try:
            start_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        except Exception:
            start_dt = datetime.now()

        dur_text = self.cbo_duration.get()
        duration_min = 30
        if "20" in dur_text: duration_min = 20
        elif "45" in dur_text: duration_min = 45
        elif "60" in dur_text: duration_min = 60
        elif "Cùng" in dur_text: duration_min = 0

        lines = raw.split("\n")
        self.parsed_list = []
        for i in self.tree.get_children():
            self.tree.delete(i)

        current_slot = start_dt
        for idx, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            parts = line.split("\t")
            if len(parts) < 2: parts = line.split(",")
            if len(parts) < 2: parts = line.split(";")

            name = parts[0].strip() if len(parts) > 0 else ""
            phone = parts[1].strip() if len(parts) > 1 else ""
            email = parts[2].strip() if len(parts) > 2 else ""

            phone = re.sub(r"[^0-9]", "", phone)
            if len(phone) == 9 and not phone.startswith("0"):
                phone = "0" + phone

            # Auto-generate email to prevent VinFast ISV domain exception
            if not email or "@" not in email:
                email = f"{phone or 'khachhang' + str(idx+1)}@khachhang.vinfast.vn"

            slot_start = current_slot
            if duration_min > 0:
                slot_end = slot_start + timedelta(minutes=duration_min)
                current_slot = slot_end
            else:
                slot_end = slot_start + timedelta(minutes=60)

            time_display = f"{slot_start.strftime('%H:%M')} - {slot_end.strftime('%H:%M')}"

            item = {
                "idx": idx + 1,
                "name": name,
                "phone": phone,
                "email": email,
                "start": slot_start,
                "end": slot_end,
                "time_display": time_display,
                "status": "Sẵn sàng"
            }
            self.parsed_list.append(item)
            self.tree.insert("", tk.END, iid=str(idx+1), values=(
                idx + 1, name, phone, email, time_display, "Sẵn sàng"
            ))

        self.lbl_status.config(text=f"Đã phân tích {len(self.parsed_list)} khách hàng sẵn sàng nhập.", fg="#38bdf8")

    def start_import(self):
        if self.is_running:
            return
        if not self.parsed_list:
            self.parse_input_data()
            if not self.parsed_list:
                return

        if not self.current_dealer or not self.current_dealer.get("cookie"):
            messagebox.showerror("Lỗi", "Chưa có Cookie DMS của Showroom. Vui lòng kiểm tra dms_dealers_config.json!")
            return

        event_name = self.ent_event.get().strip()
        resource_name = self.ent_resource.get().strip()

        confirm = messagebox.askyesno(
            "Xác nhận nhập hàng loạt",
            f"Bắt đầu nhập {len(self.parsed_list)} lịch lái thử vào VinFast DMS?\n\n"
            f"- Showroom: {self.current_dealer.get('dealer_code')}\n"
            f"- Sự kiện: {event_name}\n"
            f"- Xe lái thử: {resource_name}"
        )
        if not confirm:
            return

        self.is_running = True
        self.btn_start.config(state=tk.DISABLED, bg="#475569", text="⏳ Đang nhập dữ liệu...")
        self.pbar["maximum"] = len(self.parsed_list)
        self.pbar["value"] = 0

        threading.Thread(target=self._worker_import, daemon=True).start()

    def _worker_import(self):
        cookie = self.current_dealer.get("cookie")
        headers = get_headers(cookie)
        event_code = self.ent_event.get().strip()
        resource_name = self.ent_resource.get().strip()

        # Step 1: Query Event GUID & Resource GUID
        event_id = None
        resource_id = None
        status_id = None

        try:
            # Query Resource
            res_url = f"{BASE_API_URL}/bookableresources?$filter=contains(name,'{resource_name.split()[0]}')&$top=1"
            r = requests.get(res_url, headers=headers, timeout=12)
            if r.status_code == 200 and r.json().get("value"):
                resource_id = r.json()["value"][0]["bookableresourceid"]
        except Exception:
            pass

        try:
            # Query Status 'Reserved'
            st_url = f"{BASE_API_URL}/bookingstatuses?$filter=name eq 'Reserved' or status eq 1&$top=1"
            r = requests.get(st_url, headers=headers, timeout=12)
            if r.status_code == 200 and r.json().get("value"):
                status_id = r.json()["value"][0]["bookingstatusid"]
        except Exception:
            pass

        success_count = 0
        fail_count = 0

        # Cấu hình chuẩn đã bẻ khóa Status 204
        car_id = "fa65fb33-1484-f111-ab0e-000d3a8213ad"
        model_id = "e92552f3-647b-f111-ab0f-002248ee5474" # VF 2 chuẩn của Thuận An
        model_text = "VF 2"
        bu_id = "360e2f16-ba9d-ef11-8a6b-6045bd5754c8"   # Thuận An N31913
        event_id = "bb96eb15-85cf-f111-a05b-00224817239a" # N31913-TDE-1026-0001
        event_common_id = "cbdf98e1-53ca-ed11-b596-002248ebf467"
        status_id = "026bdcef-9257-4c10-9e49-c92539b883d6"
        requirement_id = "97d66c26-1ead-ed11-83ff-000d3a85cb76"

        for idx, item in enumerate(self.parsed_list):
            item_id = str(item["idx"])
            self.tree.set(item_id, "status", "Đang tạo...")
            self.lbl_status.config(text=f"Đang xử lý {idx+1}/{len(self.parsed_list)}: {item['name']}...")

            payload = {
                "name": f"{item['name']} - Lái thử {model_text}",
                "starttime": item["start"].strftime("%Y-%m-%dT%H:%M:%SZ"),
                "endtime": item["end"].strftime("%Y-%m-%dT%H:%M:%SZ"),
                "duration": 15,
                "itv_name": item["name"],
                "itv_phone": item["phone"],
                "itv_email": item["email"] if ("@" in item.get("email", "") and "khachhang" not in item.get("email", "")) else "null@gmail.com",
                "itv_vfdivision": 20,
                "itv_vehiclemodeltext": model_text,
                "itv_state": 960810000,
                "bookingtype": 1,
                "statuscode": 1,
                "msdyn_effort": 1,
                "msdyn_bookingmethod": 690970003,
                "itv_externaldata": '{"type":"Test_Drive_Event_Car_2023","surveyname":"Test_Drive_Event_Car_2023","toonline":false}',
                "Resource@odata.bind": f"/bookableresources({car_id})",
                "BookingStatus@odata.bind": f"/bookingstatuses({status_id})",
                "msdyn_ResourceRequirement@odata.bind": f"/msdyn_resourcerequirements({requirement_id})",
                "itv_testdriveeventname@odata.bind": f"/xts_commons({event_common_id})",
                "itv_testdriveeventid@odata.bind": f"/itv_testdriveevents({event_id})",
                "itv_vehiclemodel@odata.bind": f"/xts_vehiclemodels({model_id})",
                "itv_businessunit@odata.bind": f"/businessunits({bu_id})"
            }

            try:
                post_url = f"{BASE_API_URL}/bookableresourcebookings"
                resp = requests.post(post_url, headers=headers, json=payload, timeout=15)
                if resp.status_code in [200, 201, 204]:
                    success_count += 1
                    self.tree.set(item_id, "status", "✅ Thành công")
                else:
                    fail_count += 1
                    err_msg = resp.text[:40]
                    self.tree.set(item_id, "status", f"❌ Lỗi: {resp.status_code}")
            except Exception as e:
                fail_count += 1
                self.tree.set(item_id, "status", f"❌ Lỗi: {str(e)[:30]}")

            self.pbar["value"] = idx + 1
            time.sleep(0.3)

        self.is_running = False
        self.btn_start.config(state=tk.NORMAL, bg="#0284c7", text="🚀 NHẬP ĐỢT KHÁC")
        self.lbl_status.config(text=f"Hoàn tất: {success_count} thành công, {fail_count} lỗi.", fg="#4ade80")
        messagebox.showinfo("Hoàn tất", f"Đã nhập xong!\n\n- Thành công: {success_count}\n- Thất bại: {fail_count}")

if __name__ == "__main__":
    app = TestDriveImporterApp()
    app.mainloop()
