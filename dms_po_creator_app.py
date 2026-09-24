import os
import re
import json
import time
import threading
import unicodedata
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from http.server import HTTPServer, BaseHTTPRequestHandler
import requests
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.workbook.defined_name import DefinedName

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
    "year": {},
    "product": {}
}

def normalize_vietnamese(text):
    if not text:
        return ""
    text = unicodedata.normalize('NFD', str(text))
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    return ' '.join(text.lower().replace('đ', 'd').split())

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


DEFAULT_VEHICLES = {
    "VF 3": {
        "shared_code": "EI13_1024",
        "packages": [
            {
                "name": "VF 3 PLUS",
                "id": "442885ad-3baa-f011-bbd2-6045bd568f89",
                "code": "EI13_1024_TI1BV_20250101",
                "cfg_name": "VF 3 PLUS",
                "cfg_id": "76a97378-39aa-f011-bbd2-6045bd568f89",
                "c_cfg_id": "d44bf793-3aaa-f011-bbd2-6045bd568f89"
            },
            {
                "name": "VF 3 ECO",
                "id": "59abea85-3baa-f011-bbd2-6045bd568f89",
                "code": "EI13_1024_TI1CV_20250101",
                "cfg_name": "VF 3 ECO",
                "cfg_id": "1b5c5072-39aa-f011-bbd2-6045bd568f89",
                "c_cfg_id": "310a2c4e-3aaa-f011-bbd2-6045bd568f89"
            },
            {
                "name": "VF 3 Facelift PLUS",
                "id": "bbdf2c56-7a89-f111-8076-002248ec2303",
                "code": "EI13_1024_TI1DV_270726",
                "cfg_name": "VF 3 PLUS",
                "cfg_id": "76a97378-39aa-f011-bbd2-6045bd568f89"
            },
            {
                "name": "VF 3 Facelift ECO",
                "id": "bad54b86-7a89-f111-8076-002248ec2303",
                "code": "EI13_1024_TI1EV_270726",
                "cfg_name": "VF 3 ECO",
                "cfg_id": "1b5c5072-39aa-f011-bbd2-6045bd568f89"
            },
            {
                "name": "VF 3 Base (Tiêu chuẩn)",
                "id": "fbae6ed2-7a72-f011-b4cd-00224816507b",
                "code": "Ei13_1024_TI10V_20250101",
                "cfg_name": "BASE"
            }
        ],
        "ext_colors": [
            {
                "name": "Màu Trắng (Brahminy White)",
                "code": "CE18",
                "id": "4d3285a1-3589-f011-b4cc-000d3a85b30e",
                "c_id": "a1c51753-d871-f011-b4cd-00224817e379"
            },
            {
                "name": "Màu Đen (Jet Black)",
                "code": "CE11",
                "id": "abe8ab61-2c89-f011-b4cc-000d3a85b30e",
                "c_id": "afc51753-d871-f011-b4cd-00224817e379"
            },
            {
                "name": "Màu Xám (Zenith Grey)",
                "code": "CE1V",
                "id": "9ea0718f-2c89-f011-b4cc-000d3a85b30e",
                "c_id": "afc51753-d871-f011-b4cd-00224817e379"
            },
            {
                "name": "Màu Vàng (Summer Yellow)",
                "code": "CE1U",
                "id": "b3316689-2c89-f011-b4cc-000d3a85b30e"
            },
            {
                "name": "Màu Vàng Nóc Trắng",
                "code": "181U",
                "id": "436170f7-2c89-f011-b4cc-000d3a85b30e",
                "c_id": "a3c51753-d871-f011-b4cd-00224817e379"
            },
            {
                "name": "Màu Xanh Lá Nhạt (Urban Mint)",
                "code": "CE1W",
                "id": "63b4699b-2c89-f011-b4cc-000d3a85b30e",
                "c_id": "b1c51753-d871-f011-b4cd-00224817e379"
            },
            {
                "name": "Màu Xanh Lá Nóc Trắng",
                "code": "181Y",
                "id": "b29680fd-2c89-f011-b4cc-000d3a85b30e"
            },
            {
                "name": "Màu Hồng Phấn Nóc Trắng",
                "code": "1821",
                "id": "15fc7803-2d89-f011-b4cc-000d3a85b30e",
                "c_id": "a7c51753-d871-f011-b4cd-00224817e379"
            },
            {
                "name": "Màu Đỏ Ruby (Solar Ruby)",
                "code": "CE2Q",
                "id": "0b4b88f1-fde1-f011-8406-70a8a5013371",
                "c_id": "a286e0b9-01e2-f011-8406-70a8a5013371"
            },
            {
                "name": "Màu Đỏ Cờ (Crimson Red)",
                "code": "CE1M",
                "id": "764a0aa8-3589-f011-b4cc-000d3a85b30e"
            },
            {
                "name": "Màu Xanh Aqua (Aqua Blue)",
                "code": "CE1P",
                "id": "4a6c9282-2c89-f011-b4cc-000d3a85b30e"
            },
            {
                "name": "Màu Xanh Dương Đậm (VinFast Blue)",
                "code": "CE1J",
                "id": "1b33e56f-2c89-f011-b4cc-000d3a85b30e"
            },
            {
                "name": "Màu Hồng Tím (Iris Berry)",
                "code": "CE1X",
                "id": "8092e870-d8bd-f011-bbd3-00224817e49f"
            }
        ],
        "int_colors": [
            {
                "name": "Màu Đen",
                "code": "CI11",
                "id": "6d9891ba-2c89-f011-b4cc-000d3a85b30e",
                "c_id": "bac51753-d871-f011-b4cd-00224817e379"
            }
        ]
    },
    "VF 2": {
        "shared_code": "EI23_2025",
        "packages": [
            {
                "name": "VF 2",
                "id": "5cacbba8-687b-f111-ab0f-002248ee5474",
                "code": "EI23_2025_TH14V_090726",
                "cfg_name": "VF 2",
                "cfg_id": "7b48661d-657b-f111-ab0f-002248ee5474",
                "c_cfg_id": "880b103e-667b-f111-ab0f-002248ee5474"
            },
            {
                "name": "Minio Green",
                "id": "9c215ba4-7a89-f111-8076-002248ec2303",
                "code": "EI23_2025_TH13V_270726",
                "cfg_name": "Minio Green",
                "cfg_id": "7b48661d-657b-f111-ab0f-002248ee5474"
            },
            {
                "name": "VF 2 BCO2",
                "id": "cf01182b-ee9a-f111-b8dc-70a8a5055894",
                "code": "EI23_2025_TH15V",
                "cfg_name": "VF 2"
            }
        ],
        "ext_colors": [
            {
                "name": "Màu Trắng",
                "code": "CE18",
                "id": "f9453715-e9d3-f011-8544-000d3a85a224",
                "c_id": "68ffb14b-e9d3-f011-8544-000d3a85a224"
            },
            {
                "name": "Màu Đỏ Ruby",
                "code": "CE13",
                "id": "40b356f8-603c-f111-88b5-7ced8dfee225",
                "c_id": "c5b66e55-f632-f111-88b5-000d3a829dfa"
            },
            {
                "name": "Urban Mint (Xanh Lá Nhạt)",
                "code": "CE15",
                "id": "590c2998-657b-f111-ab0f-002248ee5474",
                "c_id": "e1b2a504-677b-f111-ab0f-002248ee5474"
            },
            {
                "name": "Màu Bạc",
                "code": "CE12",
                "id": "4555ca6b-d202-f011-bae2-6045bd572ca9",
                "c_id": "f4659965-5f02-f011-bae4-00224816cf50"
            },
            {
                "name": "Màu Vàng",
                "code": "CE1V",
                "id": "b4000372-d202-f011-bae2-6045bd572ca9"
            },
            {
                "name": "Màu Hồng Phấn",
                "code": "CE16",
                "id": "7e88c1c2-657b-f111-ab0f-002248ee5474"
            },
            {
                "name": "Màu Vàng Nóc Đen",
                "code": "1U11",
                "id": "f5e9856a-23ae-f011-bbd2-000d3a8030c4"
            },
            {
                "name": "Màu Đỏ Nóc Trắng",
                "code": "181M",
                "id": "a5830871-23ae-f011-bbd2-000d3a8030c4"
            },
            {
                "name": "Màu Vàng Nóc Trắng",
                "code": "181U",
                "id": "8bd1ff82-23ae-f011-bbd2-000d3a8030c4"
            },
            {
                "name": "Màu Bạc Nóc Đen",
                "code": "1117",
                "id": "b2e00077-23ae-f011-bbd2-000d3a8030c4"
            }
        ],
        "int_colors": [
            {
                "name": "Màu Xám Đen",
                "code": "CI12",
                "id": "d2310476-9c10-f011-998a-002248ec75b4",
                "c_id": "fc659965-5f02-f011-bae4-00224816cf50"
            },
            {
                "name": "Màu Đen",
                "code": "CI11",
                "id": "d97cdd08-d402-f011-bae2-6045bd572ca9"
            }
        ]
    },
    "VF 5": {
        "shared_code": "EA15_2023",
        "packages": [
            {
                "name": "VF 5 PLUS",
                "id": "a62d90be-4a1f-f011-998a-6045bd572ca9",
                "code": "EA15_2023_GA1RV_20240101",
                "cfg_name": "VF 5 Plus",
                "cfg_id": "f558c6bf-8bc7-ef11-b8e9-6045bd55b842",
                "c_cfg_id": "267b4301-6f1e-f011-998a-6045bd5b2bd6"
            },
            {
                "name": "VF 5 ECO (VF 5S)",
                "id": "164a5d9a-db54-ef11-bfe2-6045bd574bda",
                "code": "EA15_2023_GA1KV_20240101",
                "cfg_name": "VF 5 ECO",
                "cfg_id": "02952077-5a71-ed11-81ac-000d3a85630d",
                "c_cfg_id": "267b4301-6f1e-f011-998a-6045bd5b2bd6"
            },
            {
                "name": "Herio Green",
                "id": "2bf064a9-dcf4-f011-8407-7ced8dfee221",
                "code": "EA15_2023_GA1XV_190126",
                "cfg_name": "Herio Green"
            }
        ],
        "ext_colors": [
            {
                "name": "Màu Trắng",
                "code": "CE18",
                "id": "59c93983-5a71-ed11-81ac-000d3a85630d",
                "c_id": "ad6c9873-b96f-ed11-81ac-000d3a856184"
            },
            {
                "name": "Màu Đỏ",
                "code": "CE13",
                "id": "6ec93983-5a71-ed11-81ac-000d3a85630d",
                "c_id": "b16c9873-b96f-ed11-81ac-000d3a856184"
            },
            {
                "name": "Màu Xám",
                "code": "CE14",
                "id": "93b700f9-dd1e-ee11-9cbd-6045bd55e32f",
                "c_id": "e5db1d9a-df1e-ee11-9cbd-6045bd55e32f"
            },
            {
                "name": "Màu Xanh Lá Nhạt",
                "code": "CE15",
                "id": "f8be360d-2f35-ef11-8e4e-002248ecc5a2",
                "c_id": "175e0374-3035-ef11-8e4e-6045bd5754c8"
            },
            {
                "name": "Màu Vàng",
                "code": "CE1V",
                "id": "9a0479b8-7835-ef11-a317-002248ec8105",
                "c_id": "0f5e0374-3035-ef11-8e4e-6045bd5754c8"
            },
            {
                "name": "Màu Đen",
                "code": "CE11",
                "id": "53c93983-5a71-ed11-81ac-000d3a85630d",
                "c_id": "b56c9873-b96f-ed11-81ac-000d3a856184"
            },
            {
                "name": "Màu Đỏ Ruby Nóc Trắng",
                "code": "182Q",
                "id": "ad8afad9-0be2-f011-8406-70a8a5013371"
            },
            {
                "name": "Màu Vàng Nóc Trắng",
                "code": "181U",
                "id": "509713c6-882f-ef11-840a-6045bd55e9fe"
            },
            {
                "name": "Màu Trắng Nóc Đen",
                "code": "1118",
                "id": "7f298be6-dd1e-ee11-9cbd-6045bd55e32f"
            },
            {
                "name": "Màu Xám Nóc Trắng",
                "code": "1814",
                "id": "71fbd3f2-dd1e-ee11-9cbd-6045bd55e32f"
            },
            {
                "name": "Màu Đỏ Nóc Đen",
                "code": "111M",
                "id": "d45c26cd-dd1e-ee11-9cbd-6045bd55e32f"
            },
            {
                "name": "Màu Xanh Dương Nóc Đen",
                "code": "111N",
                "id": "6cc582d3-dd1e-ee11-9cbd-6045bd55e32f"
            },
            {
                "name": "Màu Cam Nóc Trắng",
                "code": "181A",
                "id": "1f667bd9-dd1e-ee11-9cbd-6045bd55e32f"
            }
        ],
        "int_colors": [
            {
                "name": "Màu Đen",
                "code": "CI11",
                "id": "01952077-5a71-ed11-81ac-000d3a85630d",
                "c_id": "b56c9873-b96f-ed11-81ac-000d3a856184"
            }
        ]
    },
    "VF 6": {
        "shared_code": "EB15_2023",
        "packages": [
            {
                "name": "VF 6 PLUS",
                "id": "a65e7da1-7b72-f011-b4cd-00224816507b",
                "code": "EB15_2023_HB14V_20250101",
                "cfg_name": "PLUS",
                "cfg_id": "170f0d02-c771-f011-b4cd-000d3a80a6db",
                "c_cfg_id": "34396f67-7b72-f011-b4cd-00224816507b"
            },
            {
                "name": "VF 6 ECO",
                "id": "dc9b006f-40e4-ef11-9342-6045bd5a7f3e",
                "code": "EB15_2023_JB10V_20240101",
                "cfg_name": "Bản ECO",
                "cfg_id": "c6ce677f-37e4-ef11-9342-6045bd5a7f3e",
                "c_cfg_id": "3bcb8da5-37e4-ef11-9342-6045bd5a7f3e"
            },
            {
                "name": "VF 6 PLUS Pin CKD",
                "id": "bc963972-5a9d-ee11-be37-000d3a85d629",
                "code": "EB15_2023_CB12V_20232110",
                "cfg_name": "Bản Plus Pin CKD"
            },
            {
                "name": "VF 6 Base Pin CKD",
                "id": "086fbdea-599d-ee11-be37-000d3a85d629",
                "code": "EB15_2023_CB10V_20232110",
                "cfg_name": "Bản Base Pin CKD"
            }
        ],
        "ext_colors": [
            {
                "name": "Màu Đen",
                "code": "CE11",
                "id": "566f97d3-10cf-ed11-a7c7-000d3a85ca88",
                "c_id": "73d42b14-d984-ed11-81ad-000d3a85c8c0"
            },
            {
                "name": "Màu Trắng",
                "code": "CE18",
                "id": "162257ac-03c7-ed11-b597-002248ebf6a1",
                "c_id": "70d42b14-d984-ed11-81ad-000d3a85c8c0"
            },
            {
                "name": "Màu Xám",
                "code": "CE14",
                "id": "6dee4768-0bf5-ef11-be20-6045bd590b24",
                "c_id": "2bc66dbc-8cd2-ef11-8ee9-002248edbb12"
            },
            {
                "name": "Màu Đỏ Ruby",
                "code": "CE13",
                "id": "763b7200-fee1-f011-8406-70a8a5013371",
                "c_id": "8f41e140-02e2-f011-8406-70a8a5013371"
            },
            {
                "name": "Màu Xanh Lá Nhạt",
                "code": "CE15",
                "id": "d6012673-e4d2-ef11-8ee9-000d3a82ca77"
            }
        ],
        "int_colors": [
            {
                "name": "Màu Mocha Nâu",
                "code": "CI1M",
                "id": "ea2176fe-b666-ee11-9ae7-000d3a85ca88",
                "c_id": "d80d4ea0-b266-ee11-9ae7-002248ebf578"
            },
            {
                "name": "Màu Đen",
                "code": "CI11",
                "id": "5c5b4004-04c7-ed11-b597-002248ebf6a1",
                "c_id": "6ad42b14-d984-ed11-81ad-000d3a85c8c0"
            },
            {
                "name": "Màu Be",
                "code": "CI13",
                "id": "b8dad710-04c7-ed11-b597-002248ebf6a1",
                "c_id": "ebe3afb0-1d6e-f011-b4cc-002248177f2a"
            }
        ]
    },
    "VF 7": {
        "shared_code": "EC15_2023",
        "packages": [
            {
                "name": "VF 7 ECO BCO3",
                "id": "27974d50-be9a-f011-b41c-000d3a8119d2",
                "code": "EC15_2023_HC1CV_20250101",
                "cfg_name": "ECO BCO3",
                "cfg_id": "f2103ebb-ba9a-f011-b41c-000d3a8119d2",
                "c_cfg_id": "c5e64226-bc9a-f011-b41c-000d3a8119d2"
            },
            {
                "name": "VF 7 PLUS Trần Kính",
                "id": "86d39bb3-94d2-ef11-8ee9-002248edbb12",
                "code": "EC15_2023_GC15V_20250101",
                "cfg_name": "PLUS Trần Kính",
                "cfg_id": "f2103ebb-ba9a-f011-b41c-000d3a8119d2"
            },
            {
                "name": "VF 7 PLUS Trần Thép",
                "id": "325b8753-92d2-ef11-8ee9-002248edbb12",
                "code": "EC15_2023_GC12V_20250101",
                "cfg_name": "PLUS Trần Thép",
                "cfg_id": "f2103ebb-ba9a-f011-b41c-000d3a8119d2"
            },
            {
                "name": "VF 7 Eco Tiêu chuẩn",
                "id": "ff8f737a-3f5a-f111-a825-000d3a827ff2",
                "code": "EC15_2023_HC1DV_280526"
            }
        ],
        "ext_colors": [
            {
                "name": "Màu Xám (Zenith Grey)",
                "code": "CE14",
                "id": "70ff53fb-bf0a-f011-bae3-002248ebb2e7",
                "c_id": "d6779c1a-91d2-ef11-8ee9-002248edbb12"
            },
            {
                "name": "Màu Đen",
                "code": "CE11",
                "id": "981b0e68-14cf-ed11-a7c7-000d3a85630d",
                "c_id": "74d42b14-d984-ed11-81ad-000d3a85c8c0"
            },
            {
                "name": "Màu Trắng",
                "code": "CE18",
                "id": "e5d019d9-03c7-ed11-b597-002248ebf6a1"
            },
            {
                "name": "Màu Đỏ Ruby",
                "code": "CE13",
                "id": "e04cc55a-366e-ec11-8941-000d3a801a58"
            }
        ],
        "int_colors": [
            {
                "name": "Màu Đen",
                "code": "CI11",
                "id": "c5a3f91d-04c7-ed11-b597-002248ebf6a1",
                "c_id": "e02a241a-d984-ed11-81ad-000d3a85c8c0"
            },
            {
                "name": "Màu Mocha Nâu",
                "code": "CI1M",
                "id": "e017a7a3-e4d2-ef11-8ee9-000d3a82ca77"
            }
        ]
    },
    "VF 8": {
        "shared_code": "PD1U_2023",
        "packages": [
            {
                "name": "PLUS Pin CATL",
                "id": "158ea12c-578c-ef11-8a69-0022481962de",
                "code": "PD1U_2023_ND42V_20241807",
                "cfg_name": "PLUS"
            },
            {
                "name": "ECO Pin CATL",
                "id": "821f41e7-568c-ef11-8a69-0022481962de",
                "code": "PD1U_2023_ND41V_20241807",
                "cfg_name": "ECO"
            },
            {
                "name": "PLUS Limited",
                "id": "f7cad1f8-7b72-f011-b4cd-00224816507b",
                "code": "PD1U_2023_HD14V_20250101",
                "cfg_name": "PLUS"
            },
            {
                "name": "ECO Limited",
                "id": "098928df-7b72-f011-b4cd-00224816507b",
                "code": "PD1U_2023_HD13V_20250101",
                "cfg_name": "ECO"
            }
        ],
        "ext_colors": [
            {
                "name": "Màu Đen",
                "code": "CE11",
                "id": "d4f22276-eb65-ef11-a670-6045bd575473"
            },
            {
                "name": "Màu Trắng",
                "code": "CE18",
                "id": "90f02276-eb65-ef11-a670-6045bd575473"
            },
            {
                "name": "Màu Xám",
                "code": "CE14",
                "id": "62535cd2-0882-ef11-ac21-6045bd579d7a"
            },
            {
                "name": "Màu Đỏ Ruby",
                "code": "CE13",
                "id": "ebcd8612-fee1-f011-8406-70a8a5013371"
            }
        ],
        "int_colors": [
            {
                "name": "Màu Nâu",
                "code": "CI1M",
                "id": "692c760e-486e-ec11-8941-000d3a80a1bd"
            },
            {
                "name": "Màu Đen",
                "code": "CI11",
                "id": "672c760e-486e-ec11-8941-000d3a80a1bd"
            }
        ]
    },
    "VF 9": {
        "shared_code": "PE1U_2023",
        "packages": [
            {
                "name": "PLUS 7 Chỗ PIN CATL Trần Thép CPDU 3 Vùng ĐH",
                "id": "918cec8c-0980-ef11-ac21-002248ee495a",
                "code": "PE1U_2023_NE3MV_20240101",
                "cfg_name": "PLUS 7 Chỗ PIN CATL Trần Thép CPDU 3 Vùng ĐH",
                "cfg_id": "ebe2e05f-ee7c-ef11-ac20-000d3a8268c7",
                "c_cfg_id": "4bd640fa-0780-ef11-ac21-002248ee495a"
            },
            {
                "name": "PLUS 6 Chỗ PIN CATL (Cơ trưởng)",
                "id": "0b60c4af-0980-ef11-ac21-002248ee495a",
                "code": "PE1U_2023_NE3NV_20240101",
                "cfg_name": "PLUS 6 Chỗ",
                "cfg_id": "ebe2e05f-ee7c-ef11-ac20-000d3a8268c7"
            },
            {
                "name": "ECO 7 Chỗ PIN CATL",
                "id": "9e50a9e6-5185-ef11-ac21-6045bd57a018",
                "code": "PE1U_2023_NE3LV_20240101",
                "cfg_name": "ECO 7 Chỗ",
                "cfg_id": "ebe2e05f-ee7c-ef11-ac20-000d3a8268c7"
            }
        ],
        "ext_colors": [
            {
                "name": "Màu Đen",
                "code": "CE11",
                "id": "39fca12e-366e-ec11-8941-000d3a801d3c",
                "c_id": "63a560a5-326e-ec11-8943-000d3a817558"
            },
            {
                "name": "Màu Trắng",
                "code": "CE18",
                "id": "c711b17e-366e-ec11-8941-000d3a801a58"
            },
            {
                "name": "Màu Xám",
                "code": "CE14",
                "id": "eaf0a38a-366e-ec11-8941-000d3a801a58"
            },
            {
                "name": "Màu Đỏ",
                "code": "CE13",
                "id": "e04cc55a-366e-ec11-8941-000d3a801a58"
            },
            {
                "name": "Màu Xanh Dương",
                "code": "CE17",
                "id": "d17348eb-3c99-ec11-b400-000d3a853a2a"
            },
            {
                "name": "Màu Đỏ Ruby",
                "code": "CE13",
                "id": "27567406-fee1-f011-8406-70a8a5013371"
            }
        ],
        "int_colors": [
            {
                "name": "Màu Nâu",
                "code": "CI1M",
                "id": "5b880511-376e-ec11-8942-000d3a8018a4",
                "c_id": "70a560a5-326e-ec11-8943-000d3a817558"
            },
            {
                "name": "Màu Be",
                "code": "CI13",
                "id": "3902e076-376e-ec11-8941-000d3a80a1bd"
            },
            {
                "name": "Màu Đen",
                "code": "CI11",
                "id": "59c90ea1-366e-ec11-8941-000d3a80acd3"
            },
            {
                "name": "Màu Xanh",
                "code": "CI15",
                "id": "3e1067e0-376e-ec11-8941-000d3a80acd3"
            }
        ]
    },
    "VF e34": {
        "shared_code": "EB15_2020",
        "packages": [
            {
                "name": "VF e34 Tiêu chuẩn",
                "id": "028d4005-f8af-f011-bbd2-6045bd584ccf",
                "code": "EB15_2020_GK1DI_20250101",
                "cfg_name": "VF e34"
            },
            {
                "name": "VF e34 Base",
                "id": "089576b9-b0a5-f011-bbd2-6045bd5a9de5",
                "code": "EB15_2020_GK1DI_20243112",
                "cfg_name": "VF e34"
            }
        ],
        "ext_colors": [
            {
                "name": "Màu Trắng",
                "code": "CE18",
                "id": "162257ac-03c7-ed11-b597-002248ebf6a1"
            },
            {
                "name": "Màu Đen",
                "code": "CE11",
                "id": "566f97d3-10cf-ed11-a7c7-000d3a85ca88"
            },
            {
                "name": "Màu Xám",
                "code": "CE14",
                "id": "6dee4768-0bf5-ef11-be20-6045bd590b24"
            },
            {
                "name": "Màu Đỏ Ruby",
                "code": "CE13",
                "id": "763b7200-fee1-f011-8406-70a8a5013371"
            },
            {
                "name": "Màu Xanh Dương",
                "code": "CE1J",
                "id": "1b33e56f-2c89-f011-b4cc-000d3a85b30e"
            }
        ],
        "int_colors": [
            {
                "name": "Màu Đen",
                "code": "CI11",
                "id": "5c5b4004-04c7-ed11-b597-002248ebf6a1"
            },
            {
                "name": "Màu Be",
                "code": "CI13",
                "id": "b8dad710-04c7-ed11-b597-002248ebf6a1"
            }
        ]
    },
    "EC Van": {
        "shared_code": "EM1V_2025",
        "packages": [
            {
                "name": "Bản Nâng Cao",
                "id": "86f206db-26d0-f011-8544-6045bd568278",
                "code": "EM1V_2025_TG11V_20250101",
                "cfg_name": "Bản Nâng Cao",
                "cfg_id": "583602e3-25d0-f011-8544-6045bd568278",
                "c_cfg_id": "b833a913-25d0-f011-8544-6045bd568278"
            },
            {
                "name": "Bản Nâng Cao Cửa Trượt",
                "id": "0fb448ed-26d0-f011-8544-6045bd568278",
                "code": "EM1V_2025_TG12V_20250101",
                "cfg_name": "Bản Nâng Cao Cửa Trượt",
                "cfg_id": "53397afb-25d0-f011-8544-6045bd568278",
                "c_cfg_id": "40921c20-25d0-f011-8544-6045bd568278"
            },
            {
                "name": "Bản Tiêu Chuẩn",
                "id": "314a5b94-b8df-f011-8406-70a8a504f057",
                "code": "EM1V_2025_TG10V_20250102",
                "cfg_name": "Bản Tiêu chuẩn",
                "cfg_id": "583602e3-25d0-f011-8544-6045bd568278"
            }
        ],
        "ext_colors": [
            {
                "name": "Màu Trắng",
                "code": "CE18",
                "id": "16c1b316-9f30-f011-8c4d-6045bd594565",
                "c_id": "fd6f7063-a030-f011-8c4d-6045bd594565"
            },
            {
                "name": "Màu Xanh Lá Nhạt",
                "code": "CE15",
                "id": "b83375d3-3540-f011-877a-6045bd59e228",
                "c_id": "82701982-a030-f011-8c4d-6045bd594565"
            },
            {
                "name": "Màu Vàng",
                "code": "CE1V",
                "id": "2c6cae1c-9f30-f011-8c4d-6045bd594565"
            },
            {
                "name": "Màu Đỏ Ruby",
                "code": "CE13",
                "id": "99769418-fee1-f011-8406-70a8a5013371"
            }
        ],
        "int_colors": [
            {
                "name": "Màu Đen",
                "code": "CI11",
                "id": "f2ea7909-9f30-f011-8c4d-6045bd594565",
                "c_id": "282ff6cc-a030-f011-8c4d-6045bd594565"
            }
        ]
    },
    "Limo Green": {
        "shared_code": "EC1V_2025",
        "packages": [
            {
                "name": "MPV 7 (VF Limo)",
                "id": "667d1e9b-c260-f011-bec2-6045bd572ca9",
                "code": "EC1V_2025_SL1WV_20253010",
                "cfg_name": "MPV 7",
                "cfg_id": "71bb60df-be60-f011-bec2-6045bd572ca9",
                "c_cfg_id": "69728997-bf60-f011-bec2-6045bd572ca9"
            },
            {
                "name": "Limo Green",
                "id": "9342e99d-6302-f011-bae2-002248167dee",
                "code": "EC1V_2025_SL1VV_20251703",
                "cfg_name": "Limo Green",
                "cfg_id": "b943e905-5102-f011-bae2-002248167dee",
                "c_cfg_id": "1db2a4e9-6202-f011-bae2-002248167dee"
            }
        ],
        "ext_colors": [
            {
                "name": "Màu Trắng",
                "code": "CE18",
                "id": "1bcb9cd7-5a8c-f011-b4cc-000d3a864302",
                "c_id": "9a5613f8-c060-f011-bec2-6045bd572ca9"
            },
            {
                "name": "Màu Đen",
                "code": "CE11",
                "id": "0b08a7fb-d102-f011-bae2-6045bd572ca9",
                "c_id": "e6659965-5f02-f011-bae4-00224816cf50"
            },
            {
                "name": "Màu Bạc",
                "code": "CE12",
                "id": "fc17e201-d202-f011-bae2-6045bd572ca9",
                "c_id": "ea659965-5f02-f011-bae4-00224816cf50"
            },
            {
                "name": "Màu Đỏ Ruby",
                "code": "CE13",
                "id": "d5759418-fee1-f011-8406-70a8a5013371",
                "c_id": "d272fcdb-02e2-f011-8406-70a8a5013371"
            },
            {
                "name": "Màu Xanh Mai Linh",
                "code": "CE15",
                "id": "d6f6411e-b99a-f011-b41c-000d3a8119d2"
            }
        ],
        "int_colors": [
            {
                "name": "Màu Đen",
                "code": "CI11",
                "id": "002ae8de-9c10-f011-998a-002248ec75b4",
                "c_id": "ee659965-5f02-f011-bae4-00224816cf50"
            },
            {
                "name": "Màu Mocha Nâu",
                "code": "CI1M",
                "id": "d74101e7-c7bf-f011-bbd3-000d3a80e26b",
                "c_id": "0a163c9e-c160-f011-bec2-6045bd572ca9"
            }
        ]
    },
    "Lạc Hồng LX 900": {
        "shared_code": "EE1U_2025",
        "packages": [
            {
                "name": "Lạc Hồng LX 900",
                "id": "d605f92c-9579-f011-b4cc-002248eaff6e",
                "code": "EE1U_2025_NF1SV_20250108",
                "cfg_name": "LAC_HONG_LX_900"
            },
            {
                "name": "Lạc Hồng LX 900 Armored",
                "id": "727a0433-9579-f011-b4cc-002248eaff6e",
                "code": "EE1U_2025_NF1TV_20250108",
                "cfg_name": "LAC_HONG_LX_900_ARMORED"
            }
        ],
        "ext_colors": [
            {
                "name": "Màu Đen",
                "code": "CE11",
                "id": "39fca12e-366e-ec11-8941-000d3a801d3c"
            },
            {
                "name": "Màu Trắng",
                "code": "CE18",
                "id": "c711b17e-366e-ec11-8941-000d3a801a58"
            }
        ],
        "int_colors": [
            {
                "name": "Màu Nâu",
                "code": "CI1M",
                "id": "5b880511-376e-ec11-8942-000d3a8018a4"
            },
            {
                "name": "Màu Đen",
                "code": "CI11",
                "id": "59c90ea1-366e-ec11-8941-000d3a80acd3"
            }
        ]
    },
    "VF Wild": {
        "shared_code": "MP1C_2026",
        "packages": [
            {
                "name": "VF Wild Base Comfort",
                "id": "3259b1a4-b1b0-f111-aaad-70a8a5045bcf",
                "code": "MP1C_2026_HJ01V_150926",
                "cfg_name": "VF_WILD_BASE_Comfort"
            },
            {
                "name": "VF Wild High Premium",
                "id": "02c9da00-b2b0-f111-aaad-70a8a5045bcf",
                "code": "MP1C_2026_HJ03V_150926",
                "cfg_name": "VF_WILD_HIGH_Premium_2026"
            }
        ],
        "ext_colors": [
            {
                "name": "Màu Xám",
                "code": "CE14",
                "id": "9ea0718f-2c89-f011-b4cc-000d3a85b30e"
            },
            {
                "name": "Màu Đen",
                "code": "CE11",
                "id": "abe8ab61-2c89-f011-b4cc-000d3a85b30e"
            },
            {
                "name": "Màu Trắng",
                "code": "CE18",
                "id": "4d3285a1-3589-f011-b4cc-000d3a85b30e"
            }
        ],
        "int_colors": [
            {
                "name": "Màu Đen",
                "code": "CI11",
                "id": "6d9891ba-2c89-f011-b4cc-000d3a85b30e"
            }
        ]
    }
}

PRIORITY_MAP = {
    "Dự trữ": 3,
    "Tiêu chuẩn": 1,
    "Khẩn": 2
}

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
    return {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Prefer": 'odata.include-annotations="*"',
        "Referer": "https://vinfastdms.crm5.dynamics.com/main.aspx",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Cookie": cookie
    }

def test_dealer_connection(cookie):
    cookie = extract_clean_cookie(cookie)
    if not cookie:
        return False, "Chưa nhập Cookie"
    try:
        headers = get_dms_headers(cookie)
        url = f"{BASE_API_URL}/xts_purchaseorders"
        params = {"$top": "1", "$select": "xts_purchaseorderid"}
        r = requests.get(url, headers=headers, params=params, timeout=8)
        if r.status_code == 200:
            return True, "Kết nối thành công (200 OK)"
        elif r.status_code == 401:
            return False, "Cookie hết hạn (401 Unauthorized)"
        else:
            return False, f"Lỗi HTTP {r.status_code}"
    except Exception as e:
        return False, str(e)

def save_dealers(dealers_list):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(dealers_list, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        return False

class POCreatorApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("VinFast DMS - Công Cụ Tạo & Đẩy Đơn Hàng Mua Xe (Purchase Order Creator)")
        self.geometry("1100x750")
        self.minsize(980, 640)
        self.configure(bg="#0f172a")

        self.dealers = load_dealers()
        self.excel_data = []
        self.is_running = False

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
                pass
        t = threading.Thread(target=run, daemon=True)
        t.start()

    def on_cookie_synced(self, dealer_code):
        self.dealers = load_dealers()
        if hasattr(self, 'cb_dealer'):
            dealer_names = [f"{d.get('dealer_code')} - {d.get('name')}" for d in self.dealers]
            self.cb_dealer['values'] = dealer_names
        if hasattr(self, 'cookie_text_boxes') and dealer_code in self.cookie_text_boxes:
            for d in self.dealers:
                if d.get("dealer_code") == dealer_code:
                    self.cookie_text_boxes[dealer_code].delete("1.0", tk.END)
                    self.cookie_text_boxes[dealer_code].insert("1.0", d.get("cookie", ""))
                    if dealer_code in self.cookie_status_badges:
                        self.cookie_status_badges[dealer_code].config(text="🟢 Đã đồng bộ từ Chrome", fg="#10b981")
                    break
        messagebox.showinfo("Đồng Bộ Thành Công", f"⚡ Đã nhận và lưu Cookie cho đại lý [{dealer_code}] trực tiếp từ Chrome!\nBây giờ bạn có thể thao tác tạo đơn PO ngay.")


    def setup_styles(self):
        style = ttk.Style()
        style.theme_use("clam")

        style.configure(".", background="#0f172a", foreground="#f8fafc")
        style.configure("TNotebook", background="#0f172a", borderwidth=0)
        style.configure("TNotebook.Tab", background="#1e293b", foreground="#94a3b8", font=("Segoe UI", 10, "bold"), padding=[16, 8])
        style.map("TNotebook.Tab", background=[("selected", "#0284c7")], foreground=[("selected", "#ffffff")])

        style.configure("TFrame", background="#0f172a")
        style.configure("Card.TFrame", background="#1e293b", relief="flat")
        style.configure("TLabel", background="#0f172a", foreground="#cbd5e1", font=("Segoe UI", 10))
        style.configure("Card.TLabel", background="#1e293b", foreground="#cbd5e1", font=("Segoe UI", 10))
        style.configure("Title.TLabel", background="#0f172a", foreground="#38bdf8", font=("Segoe UI", 14, "bold"))
        style.configure("Header.TLabel", background="#1e293b", foreground="#38bdf8", font=("Segoe UI", 11, "bold"))

        # Cấu hình rõ ràng nền tối và chữ trắng sáng cho toàn bộ Combobox
        style.configure("TCombobox",
                        fieldbackground="#0f172a",
                        background="#334155",
                        foreground="#ffffff",
                        arrowcolor="#38bdf8",
                        bordercolor="#475569",
                        darkcolor="#0f172a",
                        lightcolor="#0f172a",
                        padding=[6, 4])
        style.map("TCombobox",
                  fieldbackground=[("readonly", "#0f172a"), ("focus", "#0f172a"), ("!disabled", "#0f172a")],
                  foreground=[("readonly", "#ffffff"), ("focus", "#ffffff"), ("!disabled", "#ffffff")],
                  selectbackground=[("readonly", "#0284c7")],
                  selectforeground=[("readonly", "#ffffff")])

        # Cấu hình danh sách dropdown sổ xuống (Popup listbox)
        self.option_add("*TCombobox*Listbox*Background", "#0f172a")
        self.option_add("*TCombobox*Listbox*Foreground", "#ffffff")
        self.option_add("*TCombobox*Listbox*selectBackground", "#0284c7")
        self.option_add("*TCombobox*Listbox*selectForeground", "#ffffff")
        self.option_add("*TCombobox*Listbox*font", ("Segoe UI", 10))

        # Cấu hình ô nhập Entry
        style.configure("TEntry",
                        fieldbackground="#0f172a",
                        foreground="#ffffff",
                        bordercolor="#475569",
                        darkcolor="#0f172a",
                        lightcolor="#0f172a",
                        insertcolor="#38bdf8",
                        padding=[6, 4])
        style.map("TEntry",
                  fieldbackground=[("focus", "#0f172a"), ("!disabled", "#0f172a")],
                  foreground=[("focus", "#ffffff"), ("!disabled", "#ffffff")])

        style.configure("Treeview", background="#1e293b", foreground="#f8fafc", fieldbackground="#1e293b", rowheight=28, font=("Segoe UI", 9))
        style.map("Treeview", background=[("selected", "#0284c7")], foreground=[("selected", "#ffffff")])
        style.configure("Treeview.Heading", background="#0f172a", foreground="#38bdf8", font=("Segoe UI", 9, "bold"), relief="flat")

    def create_widgets(self):
        banner = tk.Frame(self, bg="#1e293b", height=60, padx=20, pady=10)
        banner.pack(fill=tk.X, side=tk.TOP)

        title_lbl = tk.Label(banner, text="🚗 CÔNG CỤ TẠO & GỬI ĐƠN MUA HÀNG (PO) - VINFAST DMS", font=("Segoe UI", 13, "bold"), bg="#1e293b", fg="#38bdf8")
        title_lbl.pack(side=tk.LEFT)

        sub_lbl = tk.Label(banner, text="Chuẩn cấu trúc DMS CRM | Hỗ trợ Form nhập nhanh & Import Excel hàng loạt", font=("Segoe UI", 9), bg="#1e293b", fg="#94a3b8")
        sub_lbl.pack(side=tk.RIGHT, pady=4)

        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=15, pady=15)

        self.tab_form = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_form, text="  📝 Tạo Đơn Mua Hàng Lẻ (Form)  ")
        self.create_tab_form_ui()

        self.tab_excel = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_excel, text="  📊 Tạo Hàng Loạt Từ File Excel  ")
        self.create_tab_excel_ui()

        self.tab_config = ttk.Frame(self.notebook)
        self.notebook.add(self.tab_config, text="  ⚙️ Cấu Hình Đại Lý & Kết Nối  ")
        self.create_tab_config_ui()

    def create_tab_form_ui(self):
        main_box = ttk.Frame(self.tab_form)
        main_box.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        left_card = ttk.Frame(main_box, style="Card.TFrame", padding=16)
        left_card.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 10))

        ttk.Label(left_card, text="THÔNG TIN XE ĐẶT MUA (PO)", style="Header.TLabel").grid(row=0, column=0, columnspan=2, sticky="w", pady=(0, 10))

        ttk.Label(left_card, text="Showroom / Đại lý:", style="Card.TLabel").grid(row=1, column=0, sticky="w", pady=4)
        self.cb_dealer = ttk.Combobox(left_card, state="readonly", font=("Segoe UI", 10), width=32)
        dealer_names = [f"{d.get('dealer_code')} - {d.get('name')}" for d in self.dealers]
        self.cb_dealer['values'] = dealer_names
        if dealer_names:
            self.cb_dealer.current(0)
        self.cb_dealer.grid(row=1, column=1, sticky="ew", pady=4)

        ttk.Label(left_card, text="Dòng xe:", style="Card.TLabel").grid(row=2, column=0, sticky="w", pady=4)
        self.cb_model = ttk.Combobox(left_card, state="readonly", font=("Segoe UI", 10), width=32)
        model_list = [f"{v.get('shared_code', k)} - {k}" for k, v in DEFAULT_VEHICLES.items()]
        self.cb_model['values'] = model_list
        if model_list:
            self.cb_model.current(0)  # Mặc định EI13_1024 - VF 3
        self.cb_model.grid(row=2, column=1, sticky="ew", pady=4)
        self.cb_model.bind("<<ComboboxSelected>>", self.on_model_changed)

        ttk.Label(left_card, text="Phiên bản / Cấu hình:", style="Card.TLabel").grid(row=3, column=0, sticky="w", pady=4)
        self.cb_package = ttk.Combobox(left_card, state="readonly", font=("Segoe UI", 10), width=32)
        self.cb_package.grid(row=3, column=1, sticky="ew", pady=4)

        ttk.Label(left_card, text="Màu ngoại thất:", style="Card.TLabel").grid(row=4, column=0, sticky="w", pady=4)
        self.cb_ext_color = ttk.Combobox(left_card, state="readonly", font=("Segoe UI", 10), width=32)
        self.cb_ext_color.grid(row=4, column=1, sticky="ew", pady=4)

        ttk.Label(left_card, text="Màu nội thất:", style="Card.TLabel").grid(row=5, column=0, sticky="w", pady=4)
        self.cb_int_color = ttk.Combobox(left_card, state="readonly", font=("Segoe UI", 10), width=32)
        self.cb_int_color.grid(row=5, column=1, sticky="ew", pady=4)

        ttk.Label(left_card, text="Tùy chọn Pin:", style="Card.TLabel").grid(row=6, column=0, sticky="w", pady=4)
        self.var_battery = tk.StringVar(value="Có (Kèm Pin thuộc xe)")
        cb_battery = ttk.Combobox(left_card, textvariable=self.var_battery, values=["Có (Kèm Pin thuộc xe)", "Không (Thuê Pin)"], state="readonly", font=("Segoe UI", 10), width=32)
        cb_battery.grid(row=6, column=1, sticky="ew", pady=4)

        ttk.Label(left_card, text="Năm sản xuất:", style="Card.TLabel").grid(row=7, column=0, sticky="w", pady=4)
        self.var_year = tk.StringVar(value="2026")
        cb_year = ttk.Combobox(left_card, textvariable=self.var_year, values=["2026", "2025", "2024"], state="readonly", font=("Segoe UI", 10), width=32)
        cb_year.grid(row=7, column=1, sticky="ew", pady=4)

        ttk.Label(left_card, text="Mức độ ưu tiên:", style="Card.TLabel").grid(row=8, column=0, sticky="w", pady=4)
        self.var_priority = tk.StringVar(value="Dự trữ")
        cb_pri = ttk.Combobox(left_card, textvariable=self.var_priority, values=["Dự trữ", "Tiêu chuẩn", "Khẩn"], state="readonly", font=("Segoe UI", 10), width=32)
        cb_pri.grid(row=8, column=1, sticky="ew", pady=4)

        ttk.Label(left_card, text="Số lượng PO tạo:", style="Card.TLabel").grid(row=9, column=0, sticky="w", pady=4)
        self.var_qty = tk.StringVar(value="1")
        ent_qty = ttk.Entry(left_card, textvariable=self.var_qty, font=("Segoe UI", 10), width=34)
        ent_qty.grid(row=9, column=1, sticky="ew", pady=4)

        # ====== PHẦN KHO (THEO GIAO DIỆN DMS) ======
        sep_kho = tk.Frame(left_card, bg="#334155", height=1)
        sep_kho.grid(row=10, column=0, columnspan=2, sticky="ew", pady=(8, 8))
        ttk.Label(left_card, text="📦 THÔNG TIN KHO & GIAO HÀNG", style="Header.TLabel").grid(row=11, column=0, columnspan=2, sticky="w", pady=(0, 4))

        ttk.Label(left_card, text="Kho nhận xe:", style="Card.TLabel").grid(row=12, column=0, sticky="w", pady=4)
        self.var_warehouse = tk.StringVar(value="VHC - Xe Hơi (Mặc định)")
        self.cb_warehouse = ttk.Combobox(left_card, textvariable=self.var_warehouse, values=["VHC - Xe Hơi (Mặc định)", "PRT - Phụ tùng", "P01A - Kho Pin liền xe"], state="readonly", font=("Segoe UI", 10), width=32)
        self.cb_warehouse.grid(row=12, column=1, sticky="ew", pady=4)

        ttk.Label(left_card, text="Ship To (Nơi nhận):", style="Card.TLabel").grid(row=13, column=0, sticky="w", pady=4)
        self.var_shipto = tk.StringVar(value="Cùng Showroom đặt hàng")
        self.cb_shipto = ttk.Combobox(left_card, textvariable=self.var_shipto, values=["Cùng Showroom đặt hàng"], state="readonly", font=("Segoe UI", 10), width=32)
        self.cb_shipto.grid(row=13, column=1, sticky="ew", pady=4)

        # ====== PHẦN PAYMENT INFO (HÌNH THỨC THANH TOÁN) ======
        sep_pay = tk.Frame(left_card, bg="#334155", height=1)
        sep_pay.grid(row=14, column=0, columnspan=2, sticky="ew", pady=(8, 8))
        ttk.Label(left_card, text="💳 PAYMENT INFO (THANH TOÁN)", style="Header.TLabel").grid(row=15, column=0, columnspan=2, sticky="w", pady=(0, 4))

        ttk.Label(left_card, text="Hình thức thanh toán:", style="Card.TLabel").grid(row=16, column=0, sticky="w", pady=4)
        self.var_payment_method = tk.StringVar(value="Công nợ trả sau")
        self.cb_payment_method = ttk.Combobox(left_card, textvariable=self.var_payment_method, values=[
            "Công nợ trả sau",
            "Bảo lãnh thanh toán",
            "Tiền mặt",
            "Giải ngân phong tỏa"
        ], state="readonly", font=("Segoe UI", 10), width=34)
        self.cb_payment_method.grid(row=16, column=1, sticky="ew", pady=4)
        self.cb_payment_method.bind("<<ComboboxSelected>>", self.on_payment_method_changed)

        ttk.Label(left_card, text="Ngân hàng:", style="Card.TLabel").grid(row=17, column=0, sticky="w", pady=4)
        self.var_bank = tk.StringVar(value="--- (Không áp dụng) ---")
        self.ent_bank = ttk.Entry(left_card, textvariable=self.var_bank, font=("Segoe UI", 10), width=34, state="disabled")
        self.ent_bank.grid(row=17, column=1, sticky="ew", pady=4)

        ttk.Label(left_card, text="Số tiền thanh toán (VNĐ):", style="Card.TLabel").grid(row=18, column=0, sticky="w", pady=4)
        self.var_payment_amount = tk.StringVar(value="0")
        self.ent_payment_amount = ttk.Entry(left_card, textvariable=self.var_payment_amount, font=("Segoe UI", 10), width=34)
        self.ent_payment_amount.grid(row=18, column=1, sticky="ew", pady=4)

        ttk.Label(left_card, text="Chế độ gửi PO:", style="Card.TLabel").grid(row=19, column=0, sticky="w", pady=4)
        self.var_single_send_mode = tk.StringVar(value="Gửi ngay sau khi tạo (xts_status = 101)")
        cb_single_send = ttk.Combobox(left_card, textvariable=self.var_single_send_mode, values=[
            "Gửi ngay sau khi tạo (xts_status = 101)",
            "Không gửi (Lưu nháp - 1)"
        ], state="readonly", font=("Segoe UI", 10), width=34)
        cb_single_send.grid(row=19, column=1, sticky="ew", pady=4)

        self.btn_create_single = tk.Button(left_card, text="🚀 TIẾN HÀNH TẠO & ĐẨY PO LÊN DMS", bg="#0284c7", fg="white", font=("Segoe UI", 11, "bold"), relief="flat", padx=16, pady=10, cursor="hand2", command=self.start_create_single_po)
        self.btn_create_single.grid(row=20, column=0, columnspan=2, sticky="ew", pady=(10, 4))

        self.on_model_changed()
        self.on_payment_method_changed()

        right_card = ttk.Frame(main_box, style="Card.TFrame", padding=16)
        right_card.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

        ttk.Label(right_card, text="NHẬT KÝ & KẾT QUẢ TẠO PO", style="Header.TLabel").pack(anchor="w", pady=(0, 10))

        self.txt_log_single = tk.Text(right_card, bg="#090d16", fg="#f8fafc", font=("Consolas", 9), relief="flat", padx=10, pady=10, wrap=tk.WORD)
        self.txt_log_single.pack(fill=tk.BOTH, expand=True)

        self.log_single("Hệ thống đã sẵn sàng. Vui lòng chọn thông tin xe và bấm 'Tạo & Đẩy PO lên DMS'.")

    def on_model_changed(self, event=None):
        model_val = self.cb_model.get()
        model_name = None
        for k, v in DEFAULT_VEHICLES.items():
            sc = v.get("shared_code") or k
            if sc in model_val or k in model_val:
                model_name = k
                break
        if not model_name:
            model_name = "VF 3"

        info = DEFAULT_VEHICLES.get(model_name, {})

        pkgs = []
        for p in info.get("packages", []):
            code = p.get("code", "")
            parts = code.split("_")
            short_p = parts[2] if len(parts) >= 3 else (parts[1] if len(parts) >= 2 else code)
            name = p.get("name", "")
            pkgs.append(f"{short_p} - {name}" if short_p else name)
        self.cb_package['values'] = pkgs
        if pkgs:
            self.cb_package.current(0)

        ext_cols = []
        for c in info.get("ext_colors", []):
            if isinstance(c, dict):
                code = c.get("code", "")
                name = c.get("name", "").split(" (")[0]
                ext_cols.append(f"{code} - {name}" if code else name)
        self.cb_ext_color['values'] = ext_cols
        if ext_cols:
            self.cb_ext_color.current(0)

        int_cols = []
        for c in info.get("int_colors", []):
            if isinstance(c, dict):
                code = c.get("code", "")
                name = c.get("name", "").split(" (")[0]
                int_cols.append(f"{code} - {name}" if code else name)
        self.cb_int_color['values'] = int_cols
        if int_cols:
            self.cb_int_color.current(0)

    def on_payment_method_changed(self, event=None):
        method = self.var_payment_method.get()
        if "Financial Guarantee" in method or "Bảo lãnh" in method:
            self.var_bank.set("Theo hạn mức Showroom")
            self.ent_bank.config(state="normal")
            self.ent_payment_amount.config(state="normal")
        else:
            if "Deferred liability" in method or "Công nợ" in method:
                self.var_bank.set("--- (Không áp dụng) ---")
            else:
                self.var_bank.set("")
            self.ent_bank.config(state="disabled")
            self.var_payment_amount.set("0")
            self.ent_payment_amount.config(state="disabled")

    def log_single(self, text, tag=None):
        ts = datetime.now().strftime("%H:%M:%S")
        self.txt_log_single.insert(tk.END, f"[{ts}] {text}\n")
        self.txt_log_single.see(tk.END)

    def log_excel(self, text):
        ts = datetime.now().strftime("%H:%M:%S")
        self.txt_log_excel.insert(tk.END, f"[{ts}] {text}\n")
        self.txt_log_excel.see(tk.END)

    def create_tab_excel_ui(self):
        box = ttk.Frame(self.tab_excel, padding=12)
        box.pack(fill=tk.BOTH, expand=True)

        tb = ttk.Frame(box, style="Card.TFrame", padding=12)
        tb.pack(fill=tk.X, pady=(0, 10))

        btn_tmpl = tk.Button(tb, text="📥 Tải Excel Mẫu", bg="#334155", fg="#38bdf8", font=("Segoe UI", 9, "bold"), relief="flat", padx=10, pady=6, cursor="hand2", command=self.export_excel_template)
        btn_tmpl.pack(side=tk.LEFT, padx=(0, 6))

        btn_open = tk.Button(tb, text="📂 Chọn Excel Dữ Liệu", bg="#1e293b", fg="#f8fafc", font=("Segoe UI", 9, "bold"), relief="flat", padx=10, pady=6, cursor="hand2", command=self.import_excel_file)
        btn_open.pack(side=tk.LEFT, padx=(0, 6))

        btn_export_res = tk.Button(tb, text="📊 Xuất Kết Quả", bg="#0284c7", fg="#ffffff", font=("Segoe UI", 9, "bold"), relief="flat", padx=10, pady=6, cursor="hand2", command=self.export_batch_results_excel)
        btn_export_res.pack(side=tk.LEFT, padx=(0, 6))

        btn_del_batch = tk.Button(tb, text="🗑️ Xóa PO Trong Bảng", bg="#dc2626", fg="#ffffff", font=("Segoe UI", 9, "bold"), relief="flat", padx=10, pady=6, cursor="hand2", command=self.start_batch_delete_pos)
        btn_del_batch.pack(side=tk.LEFT, padx=(0, 6))

        btn_del_dialog = tk.Button(tb, text="📋 Nhập Tay Xóa PO", bg="#991b1b", fg="#ffffff", font=("Segoe UI", 9, "bold"), relief="flat", padx=10, pady=6, cursor="hand2", command=self.open_delete_pos_dialog)
        btn_del_dialog.pack(side=tk.LEFT, padx=(0, 6))

        btn_clear = tk.Button(tb, text="🗑️ Xóa Bảng", bg="#475569", fg="#ffffff", font=("Segoe UI", 9), relief="flat", padx=8, pady=6, cursor="hand2", command=self.clear_excel_table)
        btn_clear.pack(side=tk.LEFT, padx=(0, 8))

        lbl_send_mode = tk.Label(tb, text="Chế độ gửi:", font=("Segoe UI", 9, "bold"), bg="#1e293b", fg="#38bdf8")
        lbl_send_mode.pack(side=tk.LEFT, padx=(4, 2))

        self.var_batch_send_mode = tk.StringVar(value="Tạo xong hết mới gửi")
        cb_batch_send = ttk.Combobox(tb, textvariable=self.var_batch_send_mode, values=["Tạo xong hết mới gửi", "Tự động gửi từng đơn", "Không gửi (Lưu nháp)"], state="readonly", font=("Segoe UI", 9), width=22)
        cb_batch_send.pack(side=tk.LEFT, padx=(0, 10))

        self.lbl_excel_path = tk.Label(tb, text="Chưa chọn file", font=("Segoe UI", 9, "italic"), bg="#1e293b", fg="#94a3b8")
        self.lbl_excel_path.pack(side=tk.LEFT)

        self.btn_stop_excel = tk.Button(tb, text="🛑 DỪNG TẠO", bg="#ef4444", fg="white", font=("Segoe UI", 9, "bold"), relief="flat", padx=12, pady=6, cursor="hand2", state="disabled", command=self.stop_batch_create)
        self.btn_stop_excel.pack(side=tk.RIGHT, padx=(8, 0))

        self.btn_run_excel = tk.Button(tb, text="⚡ BẮT ĐẦU TẠO HÀNG LOẠT PO", bg="#10b981", fg="white", font=("Segoe UI", 10, "bold"), relief="flat", padx=16, pady=6, cursor="hand2", command=self.start_batch_create_po)
        self.btn_run_excel.pack(side=tk.RIGHT)

        # Split view: Top Table (Treeview), Bottom Execution Log
        paned = ttk.PanedWindow(box, orient=tk.VERTICAL)
        paned.pack(fill=tk.BOTH, expand=True)

        table_frame = ttk.Frame(paned)
        paned.add(table_frame, weight=3)

        cols = ("stt", "dealer", "model", "package", "ext_color", "int_color", "battery", "year", "priority", "payment_method", "payment_amount", "status", "result_po")
        self.tree_excel = ttk.Treeview(table_frame, columns=cols, show="headings", selectmode="browse")

        self.tree_excel.heading("stt", text="#")
        self.tree_excel.heading("dealer", text="Showroom")
        self.tree_excel.heading("model", text="Dòng xe")
        self.tree_excel.heading("package", text="Phiên bản")
        self.tree_excel.heading("ext_color", text="Ngoại thất")
        self.tree_excel.heading("int_color", text="Nội thất")
        self.tree_excel.heading("battery", text="Pin")
        self.tree_excel.heading("year", text="Năm SX")
        self.tree_excel.heading("priority", text="Ưu tiên")
        self.tree_excel.heading("payment_method", text="Thanh toán")
        self.tree_excel.heading("payment_amount", text="Số Tiền (VNĐ)")
        self.tree_excel.heading("status", text="Trạng thái")
        self.tree_excel.heading("result_po", text="Số PO Đã Tạo")

        self.tree_excel.column("stt", width=35, anchor="center")
        self.tree_excel.column("dealer", width=70, anchor="center")
        self.tree_excel.column("model", width=65, anchor="center")
        self.tree_excel.column("package", width=170, anchor="w")
        self.tree_excel.column("ext_color", width=80, anchor="center")
        self.tree_excel.column("int_color", width=75, anchor="center")
        self.tree_excel.column("battery", width=55, anchor="center")
        self.tree_excel.column("year", width=55, anchor="center")
        self.tree_excel.column("priority", width=65, anchor="center")
        self.tree_excel.column("payment_method", width=110, anchor="center")
        self.tree_excel.column("payment_amount", width=110, anchor="e")
        self.tree_excel.column("status", width=110, anchor="center")
        self.tree_excel.column("result_po", width=140, anchor="center")

        scroll_y = ttk.Scrollbar(table_frame, orient=tk.VERTICAL, command=self.tree_excel.yview)
        self.tree_excel.configure(yscrollcommand=scroll_y.set)
        scroll_y.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree_excel.pack(fill=tk.BOTH, expand=True)

        log_frame = ttk.Frame(paned, style="Card.TFrame")
        paned.add(log_frame, weight=2)

        tk.Label(log_frame, text="📜 NHẬT KÝ THỰC THI BATCH REAL-TIME", font=("Segoe UI", 9, "bold"), bg="#1e293b", fg="#38bdf8").pack(anchor="w", padx=8, pady=(4, 2))
        self.txt_log_excel = tk.Text(log_frame, bg="#090d16", fg="#f8fafc", font=("Consolas", 9), relief="flat", padx=8, pady=6, wrap=tk.WORD, height=8)
        self.txt_log_excel.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)
        self.log_excel("Sẵn sàng xử lý file Excel.")

        bottom_box = ttk.Frame(box, style="Card.TFrame", padding=10)
        bottom_box.pack(fill=tk.X, pady=(10, 0))

        self.lbl_excel_progress = tk.Label(bottom_box, text="Chưa nạp dữ liệu.", font=("Segoe UI", 9), bg="#1e293b", fg="#cbd5e1")
        self.lbl_excel_progress.pack(side=tk.LEFT)

        self.prog_bar = ttk.Progressbar(bottom_box, mode="determinate", length=300)
        self.prog_bar.pack(side=tk.RIGHT)

    def create_tab_config_ui(self):
        box = ttk.Frame(self.tab_config, padding=14)
        box.pack(fill=tk.BOTH, expand=True)

        card = ttk.Frame(box, style="Card.TFrame", padding=14)
        card.pack(fill=tk.BOTH, expand=True)

        top_bar = tk.Frame(card, bg="#1e293b")
        top_bar.pack(fill=tk.X, pady=(0, 8))

        ttk.Label(top_bar, text="QUẢN LÝ COOKIE & KIỂM TRA KẾT NỐI DMS", style="Header.TLabel").pack(side=tk.LEFT)

        btn_save_cfg = tk.Button(top_bar, text="💾 LƯU CẤU HÌNH COOKIE", bg="#10b981", fg="white", font=("Segoe UI", 9, "bold"), relief="flat", padx=16, pady=5, cursor="hand2", command=self.save_cookies_from_ui)
        btn_save_cfg.pack(side=tk.RIGHT)

        info_txt = "Dán chuỗi Cookie hoặc lệnh cURL vào ô của từng Showroom -> Bấm '⚡ Kiểm tra' -> Bấm 'Lưu cấu hình'."
        tk.Label(card, text=info_txt, bg="#1e293b", fg="#94a3b8", font=("Segoe UI", 9)).pack(anchor="w", pady=(0, 10))

        # Scrollable container for dealer list
        container = tk.Frame(card, bg="#1e293b")
        container.pack(fill=tk.BOTH, expand=True)

        canvas = tk.Canvas(container, bg="#1e293b", highlightthickness=0)
        scrollbar = ttk.Scrollbar(container, orient="vertical", command=canvas.yview)
        self.scroll_config_frame = tk.Frame(canvas, bg="#1e293b")

        self.scroll_config_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas.create_window((0, 0), window=self.scroll_config_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        self.cookie_text_boxes = {}
        self.cookie_status_badges = {}

        for d in self.dealers:
            code = d.get("dealer_code")
            name = d.get("name", "")

            f_row = tk.Frame(self.scroll_config_frame, bg="#0f172a", padx=12, pady=10, highlightbackground="#334155", highlightthickness=1)
            f_row.pack(fill=tk.X, pady=6, padx=4)

            h_row = tk.Frame(f_row, bg="#0f172a")
            h_row.pack(fill=tk.X, pady=(0, 6))

            tk.Label(h_row, text=f"Showroom: {code} ({name})", font=("Segoe UI", 10, "bold"), fg="#38bdf8", bg="#0f172a").pack(side=tk.LEFT)

            has_ck = bool(d.get("cookie", "").strip())
            badge = tk.Label(h_row, text="🟢 Đã có Cookie" if has_ck else "🔴 Chưa có Cookie", font=("Segoe UI", 9, "bold"), fg="#10b981" if has_ck else "#ef4444", bg="#0f172a")
            badge.pack(side=tk.RIGHT, padx=(10, 0))
            self.cookie_status_badges[code] = badge

            btn_test = tk.Button(h_row, text="⚡ Kiểm tra kết nối", font=("Segoe UI", 8, "bold"),
                                 bg="#0284c7", fg="#ffffff", activebackground="#0369a1",
                                 relief="flat", padx=10, pady=2, cursor="hand2",
                                 command=lambda c=code: self.test_connection_for_code(c))
            btn_test.pack(side=tk.RIGHT)

            txt = tk.Text(f_row, height=3, bg="#1e293b", fg="#ffffff", font=("Consolas", 9), relief="flat", insertbackground="#38bdf8", highlightbackground="#475569", highlightthickness=1)
            txt.pack(fill=tk.X)
            txt.insert("1.0", d.get("cookie", ""))
            self.cookie_text_boxes[code] = txt

    def test_connection_for_code(self, code):
        badge = self.cookie_status_badges.get(code)
        txt = self.cookie_text_boxes.get(code)
        if not txt or not badge:
            return

        raw = txt.get("1.0", tk.END).strip()
        clean = extract_clean_cookie(raw)
        if not clean:
            badge.config(text="🔴 Chưa nhập Cookie", fg="#ef4444")
            return

        badge.config(text="⏳ Đang kiểm tra...", fg="#38bdf8")

        def run_test():
            ok, msg = test_dealer_connection(clean)
            if ok:
                badge.config(text="🟢 Kết nối tốt (200 OK)", fg="#10b981")
            else:
                badge.config(text=f"🔴 {msg}", fg="#ef4444")

        threading.Thread(target=run_test, daemon=True).start()

    def save_cookies_from_ui(self):
        for d in self.dealers:
            code = d.get("dealer_code")
            if code in self.cookie_text_boxes:
                raw = self.cookie_text_boxes[code].get("1.0", tk.END).strip()
                clean = extract_clean_cookie(raw)
                d["cookie"] = clean

        if save_dealers(self.dealers):
            # Refresh dealer combobox values on tab 1
            dealer_names = [f"{d.get('dealer_code')} - {d.get('name')}" for d in self.dealers]
            self.cb_dealer['values'] = dealer_names
            messagebox.showinfo("Thành công", "Đã lưu cấu hình Cookie đại lý vào hệ thống thành công!")
        else:
            messagebox.showerror("Lỗi", "Không thể ghi đè file cấu hình dms_dealers_config.json!")

    def clear_excel_table(self):
        self.excel_data = []
        for item in self.tree_excel.get_children():
            self.tree_excel.delete(item)
        self.lbl_excel_path.config(text="Chưa chọn file")
        self.lbl_excel_progress.config(text="Đã xóa danh sách.")
        self.prog_bar['value'] = 0

    def stop_batch_create(self):
        if self.is_running:
            self.stop_requested = True
            self.log_excel("⚠️ Người dùng đã bấm DỪNG TẠO! Đang dừng tiến trình...")

    def export_excel_template(self):
        file_path = filedialog.asksaveasfilename(
            defaultextension=".xlsx",
            filetypes=[("Excel Files", "*.xlsx")],
            initialfile="Mau_Import_Tao_PO_DMS.xlsx",
            title="Lưu file Excel mẫu tạo PO"
        )
        if not file_path:
            return

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Danh_Sach_Tao_PO"

        headers = ["Mã_Đại_Lý", "Dòng_Xe", "Phiên_Bản_Hoặc_Mã_Cấu_Hình", "Màu_Ngoại_Thất", "Màu_Nội_Thất", "Kèm_Pin", "Năm_SX", "Mức_Ưu_Tiên", "Tự_Động_Gửi", "Hình_Thức_Thanh_Toán", "Số_Tiền_Thanh_Toán"]
        ws.append(headers)

        sample_rows = [
            ["N31913", "EI13_1024", "TI1BV", "CE18", "CI11", "Có", 2026, "Dự trữ", "Có", "Bảo lãnh thanh toán", 0],
            ["N31913", "EI23_2025", "VF 2", "CE18", "CI12", "Có", 2026, "Dự trữ", "Có", "Bảo lãnh thanh toán", 0],
            ["N31913", "EA15_2023", "GA1RV", "CE18", "CI11", "Có", 2026, "Khẩn", "Có", "Bảo lãnh thanh toán", 0],
            ["N31913", "EB15_2023", "HB14V", "CE11", "CI1M", "Có", 2026, "Tiêu chuẩn", "Có", "Công nợ trả sau", 0],
            ["N31913", "EB15_2020", "VF e34 Tiêu chuẩn", "CE18", "CI11", "Có", 2026, "Dự trữ", "Có", "Công nợ trả sau", 0],
            ["N31913", "EC15_2023", "GC15V", "CE14", "CI11", "Có", 2026, "Dự trữ", "Có", "Công nợ trả sau", 0],
            ["N31913", "PD1U_2023", "ND42V", "CE18", "CI1M", "Có", 2026, "Dự trữ", "Có", "Công nợ trả sau", 0],
            ["N31913", "PE1U_2023", "NE3MV", "CE11", "CI1M", "Có", 2026, "Dự trữ", "Có", "Công nợ trả sau", 0],
            ["N31913", "EM1V_2025", "Bản Nâng Cao", "CE18", "CI11", "Có", 2026, "Dự trữ", "Có", "Công nợ trả sau", 0]
        ]
        for r in sample_rows:
            ws.append(r)

        header_fill = PatternFill(start_color="0284C7", end_color="0284C7", fill_type="solid")
        header_font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
        for cell in ws[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")

        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 16)

        # Sheet tra cứu danh mục mã xe & phiên bản chuẩn DMS
        ws_ref = wb.create_sheet(title="DanhMuc_ThamChieu")

        models_list = []
        model_details = {}

        for model_name, cfg in DEFAULT_VEHICLES.items():
            sc = cfg.get("shared_code") or model_name
            if sc not in models_list:
                models_list.append(sc)

            pkgs = []
            for p in cfg.get("packages", []):
                code = p.get("code", "")
                parts = code.split("_")
                short_p = parts[2] if len(parts) >= 3 else (parts[1] if len(parts) >= 2 else code)
                if short_p and short_p not in pkgs:
                    pkgs.append(short_p)

            exts = []
            for c in cfg.get("ext_colors", []):
                if isinstance(c, dict):
                    c_code = c.get("code") or c.get("name")
                    if c_code and c_code not in exts:
                        exts.append(c_code)

            ints = []
            for c in cfg.get("int_colors", []):
                if isinstance(c, dict):
                    c_code = c.get("code") or c.get("name")
                    if c_code and c_code not in ints:
                        ints.append(c_code)

            model_details[sc] = {
                "name": model_name,
                "pkgs": pkgs,
                "exts": exts,
                "ints": ints
            }

        dealer_codes = [d.get("dealer_code") for d in self.dealers if d.get("dealer_code")] or ["N31913", "N31920", "N31911", "N31903"]

        ws_ref.cell(row=1, column=1, value="Mã Đại Lý")
        for r, d in enumerate(dealer_codes, 2):
            ws_ref.cell(row=r, column=1, value=d)

        ws_ref.cell(row=1, column=2, value="Dòng Xe (Shared Code)")
        for r, m in enumerate(models_list, 2):
            ws_ref.cell(row=r, column=2, value=m)

        ws_ref.cell(row=1, column=3, value="Tên Dòng Xe")
        for r, m in enumerate(models_list, 2):
            ws_ref.cell(row=r, column=3, value=model_details[m]["name"])

        col_idx = 4
        for sc, data in model_details.items():
            # Packages range
            pkg_col = openpyxl.utils.get_column_letter(col_idx)
            ws_ref.cell(row=1, column=col_idx, value=f"PKG_{sc}")
            for r, val in enumerate(data["pkgs"], 2):
                ws_ref.cell(row=r, column=col_idx, value=val)
            if data["pkgs"]:
                dn_pkg = DefinedName(f"PKG_{sc}", attr_text=f"DanhMuc_ThamChieu!${pkg_col}$2:${pkg_col}${1+len(data['pkgs'])}")
                wb.defined_names[f"PKG_{sc}"] = dn_pkg
            col_idx += 1

            # Ext Colors range
            ext_col = openpyxl.utils.get_column_letter(col_idx)
            ws_ref.cell(row=1, column=col_idx, value=f"EXT_{sc}")
            for r, val in enumerate(data["exts"], 2):
                ws_ref.cell(row=r, column=col_idx, value=val)
            if data["exts"]:
                dn_ext = DefinedName(f"EXT_{sc}", attr_text=f"DanhMuc_ThamChieu!${ext_col}$2:${ext_col}${1+len(data['exts'])}")
                wb.defined_names[f"EXT_{sc}"] = dn_ext
            col_idx += 1

            # Int Colors range
            int_col = openpyxl.utils.get_column_letter(col_idx)
            ws_ref.cell(row=1, column=col_idx, value=f"INT_{sc}")
            for r, val in enumerate(data["ints"], 2):
                ws_ref.cell(row=r, column=col_idx, value=val)
            if data["ints"]:
                dn_int = DefinedName(f"INT_{sc}", attr_text=f"DanhMuc_ThamChieu!${int_col}$2:${int_col}${1+len(data['ints'])}")
                wb.defined_names[f"INT_{sc}"] = dn_int
            col_idx += 1

        for cell in ws_ref[1]:
            cell.fill = PatternFill(start_color="334155", end_color="334155", fill_type="solid")
            cell.font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
            cell.alignment = Alignment(horizontal="center", vertical="center")

        # ===== THÊM CÁC LIST DROPDOWN (DATA VALIDATION) CHO FILE EXCEL =====
        # 1. Mã Đại Lý (A2:A500)
        dv_dealer = DataValidation(type="list", formula1=f"=DanhMuc_ThamChieu!$A$2:$A${1+len(dealer_codes)}", allow_blank=True)
        ws.add_data_validation(dv_dealer)
        dv_dealer.add("A2:A500")

        # 2. Dòng Xe (B2:B500)
        dv_model = DataValidation(type="list", formula1=f"=DanhMuc_ThamChieu!$B$2:$B${1+len(models_list)}", allow_blank=True)
        ws.add_data_validation(dv_model)
        dv_model.add("B2:B500")

        # 3. Phiên Bản theo Dòng Xe (C2:C500) -> Tự động phụ thuộc Dòng Xe đã chọn ở cột B
        dv_pkg = DataValidation(type="list", formula1='=INDIRECT("PKG_"&$B2)', allow_blank=True)
        ws.add_data_validation(dv_pkg)
        dv_pkg.add("C2:C500")

        # 4. Màu Ngoại Thất theo Dòng Xe (D2:D500) -> Tự động phụ thuộc Dòng Xe đã chọn ở cột B
        dv_ext = DataValidation(type="list", formula1='=INDIRECT("EXT_"&$B2)', allow_blank=True)
        ws.add_data_validation(dv_ext)
        dv_ext.add("D2:D500")

        # 5. Màu Nội Thất theo Dòng Xe (E2:E500) -> Tự động phụ thuộc Dòng Xe đã chọn ở cột B
        dv_int = DataValidation(type="list", formula1='=INDIRECT("INT_"&$B2)', allow_blank=True)
        ws.add_data_validation(dv_int)
        dv_int.add("E2:E500")

        # 6. Kèm Pin (F2:F500)
        dv_bat = DataValidation(type="list", formula1='"Có,Không"', allow_blank=True)
        ws.add_data_validation(dv_bat)
        dv_bat.add("F2:F500")

        # 7. Năm Sản Xuất (G2:G500)
        dv_yr = DataValidation(type="list", formula1='"2026,2025,2024"', allow_blank=True)
        ws.add_data_validation(dv_yr)
        dv_yr.add("G2:G500")

        # 8. Mức Ưu Tiên (H2:H500)
        dv_pri = DataValidation(type="list", formula1='"Dự trữ,Tiêu chuẩn,Khẩn"', allow_blank=True)
        ws.add_data_validation(dv_pri)
        dv_pri.add("H2:H500")

        # 9. Tự Động Gửi (I2:I500)
        dv_send = DataValidation(type="list", formula1='"Có,Không"', allow_blank=True)
        ws.add_data_validation(dv_send)
        dv_send.add("I2:I500")

        # 10. Hình Thức Thanh Toán (J2:J500)
        dv_pay = DataValidation(type="list", formula1='"Công nợ trả sau,Bảo lãnh thanh toán,Tiền mặt,Giải ngân phong tỏa"', allow_blank=True)
        ws.add_data_validation(dv_pay)
        dv_pay.add("J2:J500")

        wb.save(file_path)
        messagebox.showinfo("Thành công", f"Đã xuất file Excel mẫu có đầy đủ danh sách xổ xuống (Dropdowns) tại:\n{file_path}")

    def import_excel_file(self):
        file_path = filedialog.askopenfilename(
            filetypes=[("Excel Files", "*.xlsx;*.xls")],
            title="Chọn file Excel chứa danh sách xe tạo PO"
        )
        if not file_path:
            return

        try:
            wb = openpyxl.load_workbook(file_path, data_only=True)
            ws = wb.active
            rows = list(ws.iter_rows(values_only=True))
            if len(rows) < 2:
                messagebox.showwarning("Cảnh báo", "File Excel không có dữ liệu hàng nào!")
                return

            self.excel_data = []
            for item in self.tree_excel.get_children():
                self.tree_excel.delete(item)

            for idx, r in enumerate(rows[1:], 1):
                if not any(r):
                    continue
                dealer = str(r[0] or "N31913").strip()
                model = str(r[1] or "VF 5").strip()
                package = str(r[2] or "VF 5 PLUS").strip()
                ext_color = str(r[3] or "Màu Trắng").strip()
                int_color = str(r[4] or "Màu Đen").strip()
                battery = str(r[5] or "Có").strip()
                year = str(r[6] or "2026").strip()
                priority = str(r[7] or "Dự trữ").strip()
                auto_send = str(r[8] or "Có").strip()
                payment_method = str(r[9] if len(r) > 9 and r[9] is not None else "Công nợ trả sau").strip()

                raw_amt = r[10] if len(r) > 10 and r[10] is not None else 0
                try:
                    payment_amount = float(str(raw_amt).replace(",", "").strip() or 0)
                except Exception:
                    payment_amount = 0.0

                row_dict = {
                    "stt": idx,
                    "dealer": dealer,
                    "model": model,
                    "package": package,
                    "ext_color": ext_color,
                    "int_color": int_color,
                    "battery": battery,
                    "year": year,
                    "priority": priority,
                    "auto_send": auto_send,
                    "payment_method": payment_method,
                    "payment_amount": payment_amount,
                    "status": "Chờ tạo",
                    "result_po": "---",
                    "msg": ""
                }
                self.excel_data.append(row_dict)
                amt_str = f"{payment_amount:,.0f}" if payment_amount > 0 else "0"
                self.tree_excel.insert("", tk.END, iid=str(idx), values=(
                    idx, dealer, model, package, ext_color, int_color, battery, year, priority, payment_method, amt_str, "Chờ tạo", "---"
                ))

            self.lbl_excel_path.config(text=f"{os.path.basename(file_path)} ({len(self.excel_data)} xe)")
            self.lbl_excel_progress.config(text=f"Đã nạp {len(self.excel_data)} xe từ Excel. Sẵn sàng tạo.")
            self.log_excel(f"📂 Đã nạp thành công file: {os.path.basename(file_path)} với {len(self.excel_data)} xe.")
        except Exception as e:
            messagebox.showerror("Lỗi", f"Không thể đọc file Excel:\n{str(e)}")

    def export_batch_results_excel(self):
        if not self.excel_data:
            messagebox.showwarning("Chưa có dữ liệu", "Không có dữ liệu để xuất báo cáo!")
            return

        file_path = filedialog.asksaveasfilename(
            defaultextension=".xlsx",
            filetypes=[("Excel Files", "*.xlsx")],
            initialfile=f"Ket_Qua_Tao_PO_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
            title="Lưu báo cáo kết quả tạo PO Excel"
        )
        if not file_path:
            return

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Ket_Qua_Tao_PO"

        headers = ["STT", "Showroom", "Dòng_Xe", "Phiên_Bản", "Màu_Ngoại_Thất", "Màu_Nội_Thất", "Kèm_Pin", "Năm_SX", "Mức_Ưu_Tiên", "Thanh_Toán", "Số_Tiền_Thanh_Toán", "Trạng_Thái", "Số_PO_Đã_Tạo", "Chi_Tiết_Thông_Báo"]
        ws.append(headers)

        for r in self.excel_data:
            ws.append([
                r.get("stt"),
                r.get("dealer"),
                r.get("model"),
                r.get("package"),
                r.get("ext_color"),
                r.get("int_color"),
                r.get("battery"),
                r.get("year"),
                r.get("priority"),
                r.get("payment_method"),
                r.get("payment_amount", 0),
                r.get("status"),
                r.get("result_po"),
                r.get("msg", "")
            ])

        header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        header_font = Font(name="Segoe UI", size=10, bold=True, color="38BDF8")
        for cell in ws[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")

        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

        wb.save(file_path)
        messagebox.showinfo("Thành công", f"Đã xuất báo cáo kết quả tạo PO thành công tại:\n{file_path}")

    def start_create_single_po(self):
        if self.is_running:
            messagebox.showwarning("Đang xử lý", "Hệ thống đang thực hiện tạo PO, vui lòng chờ!")
            return

        dealer_str = self.cb_dealer.get()
        dealer_code = dealer_str.split(" - ")[0].strip() if dealer_str else "N31913"
        dealer_obj = next((d for d in self.dealers if d.get("dealer_code") == dealer_code), None)

        if not dealer_obj or not dealer_obj.get("cookie"):
            messagebox.showerror("Lỗi", f"Không tìm thấy Cookie kết nối của đại lý {dealer_code} trong dms_dealers_config.json!")
            return

        try:
            amt_val = float(self.var_payment_amount.get().replace(",", "").strip() or 0)
        except Exception:
            amt_val = 0.0

        try:
            po_count = max(1, int(float(self.var_qty.get() or 1)))
        except Exception:
            po_count = 1

        model_val = self.cb_model.get().split(" - ")[0].strip()
        pkg_val = self.cb_package.get().split(" - ")[0].strip()
        ext_val = self.cb_ext_color.get().split(" - ")[0].strip()
        int_val = self.cb_int_color.get().split(" - ")[0].strip()
        auto_send_val = "Gửi ngay" in self.var_single_send_mode.get()

        order_params = {
            "dealer": dealer_code,
            "cookie": dealer_obj.get("cookie"),
            "model": model_val,
            "package": pkg_val,
            "ext_color": ext_val,
            "int_color": int_val,
            "battery": "có" in self.var_battery.get().lower(),
            "year": self.var_year.get(),
            "priority": PRIORITY_MAP.get(self.var_priority.get(), 3),
            "qty": 1.0,
            "po_count": po_count,
            "warehouse": self.var_warehouse.get(),
            "payment_method": self.var_payment_method.get(),
            "payment_amount": amt_val,
            "auto_send": auto_send_val
        }

        self.is_running = True
        self.btn_create_single.config(state="disabled", text=f"⏳ ĐANG TẠO {po_count} PO LÊN VINFAST DMS...")
        threading.Thread(target=self._worker_create_single, args=(order_params,), daemon=True).start()

    def _worker_create_single(self, p):
        try:
            total_pos = p.get('po_count', 1)
            self.log_single(f"🚀 Bắt đầu tiến trình tạo {total_pos} PO cho Showroom {p['dealer']} (Song song)...")
            self.log_single(f"Chi tiết: Dòng {p['model']} | {p['package']} | {p['ext_color']} | {p['int_color']} | Pin: {'Có' if p['battery'] else 'Không'} | Năm {p['year']}")

            created_numbers = []
            failed_cnt = 0
            completed_cnt = 0
            lock = threading.Lock()

            def _create_one(i):
                nonlocal completed_cnt, failed_cnt
                success = False
                po_number = None
                msg = ""
                for attempt in range(1, 3):
                    try:
                        res = create_po_on_dms(p)
                        success, po_number, msg = res[0], res[1], res[2]
                        if success:
                            break
                        elif attempt < 2:
                            time.sleep(0.5)
                    except Exception as ex:
                        msg = str(ex)
                        if attempt < 2:
                            time.sleep(0.5)

                with lock:
                    completed_cnt += 1
                    if success:
                        created_numbers.append(po_number)
                        status_text = "ĐÃ GỬI" if p['auto_send'] else "LƯU NHÁP"
                        self.log_single(f"✅ [{completed_cnt}/{total_pos}] TẠO THÀNH CÔNG PO: {po_number} ({status_text})")
                    else:
                        failed_cnt += 1
                        self.log_single(f"❌ [{completed_cnt}/{total_pos}] TẠO THẤT BẠI PO #{i}: {msg}")

            if total_pos == 1:
                _create_one(1)
            else:
                max_w = min(total_pos, 5)
                with ThreadPoolExecutor(max_workers=max_w) as executor:
                    futures = [executor.submit(_create_one, i) for i in range(1, total_pos + 1)]
                    for f in as_completed(futures):
                        pass

            summary_msg = f"Đã hoàn thành tiến trình tạo {len(created_numbers)}/{total_pos} PO thành công!\n\n"
            if created_numbers:
                summary_msg += "Danh sách Số PO đã tạo:\n" + "\n".join(created_numbers[:10])
                if len(created_numbers) > 10:
                    summary_msg += f"\n... và {len(created_numbers)-10} PO khác."
            if failed_cnt > 0:
                summary_msg += f"\n\n(Số PO thất bại: {failed_cnt})"

            self.log_single(f"🎉 TỔNG KẾT: Tạo thành công {len(created_numbers)}/{total_pos} PO. Thất bại: {failed_cnt}")
            if failed_cnt == 0:
                messagebox.showinfo("Hoàn tất", summary_msg)
            else:
                messagebox.showwarning("Hoàn tất có lỗi", summary_msg)
        except Exception as e:
            self.log_single(f"❌ LỖI HỆ THỐNG: {str(e)}")
            messagebox.showerror("Lỗi ngoại lệ", str(e))
        finally:
            self.is_running = False
            self.btn_create_single.config(state="normal", text="🚀 TIẾN HÀNH TẠO & ĐẨY PO LÊN DMS")

    def start_batch_create_po(self):
        if self.is_running:
            messagebox.showwarning("Đang xử lý", "Hệ thống đang thực hiện tác vụ khác, vui lòng chờ!")
            return
        if not self.excel_data:
            messagebox.showwarning("Chưa có dữ liệu", "Vui lòng bấm 'Chọn File Excel Dữ Liệu' trước!")
            return

        if not messagebox.askyesno("Xác nhận", f"Bạn có chắc chắn muốn tạo {len(self.excel_data)} Đơn mua hàng (PO) lên VinFast DMS không?"):
            return

        self.is_running = True
        self.stop_requested = False
        self.btn_run_excel.config(state="disabled", text="⚙️ ĐANG XỬ LÝ HÀNG LOẠT...")
        self.btn_stop_excel.config(state="normal")
        threading.Thread(target=self._worker_batch_create, daemon=True).start()

    def _worker_batch_create(self):
        total = len(self.excel_data)
        success_cnt = 0
        error_cnt = 0

        batch_send_mode = getattr(self, "var_batch_send_mode", None)
        mode_val = batch_send_mode.get() if batch_send_mode else "Tạo xong hết mới gửi"

        if "Tạo xong hết mới gửi" in mode_val:
            should_batch_send_later = True
            should_auto_send_now = False
        elif "Tự động gửi từng đơn" in mode_val:
            should_batch_send_later = False
            should_auto_send_now = True
        else:
            should_batch_send_later = False
            should_auto_send_now = False

        self.prog_bar['maximum'] = total
        self.prog_bar['value'] = 0
        self.log_excel(f"🚀 BẮT ĐẦU TIẾN TRÌNH TẠO HÀNG LOẠT {total} PO LÊN VINFAST DMS (Chế độ song song 5 luồng - {mode_val})...")

        # Step 0: Pre-cache Dealer BU & Site to eliminate redundant lookup requests
        self.log_excel("⚡ Đang tối ưu hóa bộ nhớ tạm (Pre-cache GUIDs) cho các đại lý và sản phẩm...")
        unique_dealers = set(row['dealer'] for row in self.excel_data if row.get('dealer'))
        for d_code in unique_dealers:
            d_obj = next((d for d in self.dealers if d.get("dealer_code") == d_code), None)
            if not d_obj:
                d_obj = next((d for d in self.dealers if d.get("cookie")), None)
            if d_obj and d_obj.get("cookie"):
                try:
                    headers = get_dms_headers(d_obj.get("cookie"))
                    if d_code not in DMS_CACHE["bu"]:
                        r_bu = requests.get(f"{BASE_API_URL}/businessunits", headers=headers, params={"$filter": f"name eq '{d_code}'", "$select": "businessunitid,_parentbusinessunitid_value,name"}, timeout=8)
                        if r_bu.status_code == 200 and r_bu.json().get('value'):
                            bitem = r_bu.json()['value'][0]
                            DMS_CACHE["bu"][d_code] = (bitem['businessunitid'], bitem.get('_parentbusinessunitid_value') or "c46bad8c-5961-ea11-a811-000d3a85937e")
                    if d_code not in DMS_CACHE["site"]:
                        r_site = requests.get(f"{BASE_API_URL}/xts_sites", headers=headers, params={"$select": "xts_siteid,xts_name", "$top": "100"}, timeout=8)
                        if r_site.status_code == 200:
                            for s in r_site.json().get('value', []):
                                if d_code.upper() in str(s.get('xts_name', '')).upper():
                                    DMS_CACHE["site"][d_code] = s['xts_siteid']
                                    break
                except Exception:
                    pass

        self.log_excel(f"✅ Đã chuẩn bị xong dữ liệu Cache. Đang khởi chạy 5 luồng xử lý song song...")

        created_pos_to_send = []
        completed_count = 0
        lock = threading.Lock()

        def _process_item(item_info):
            nonlocal completed_count, success_cnt, error_cnt
            idx, row = item_info

            if getattr(self, "stop_requested", False):
                return

            dealer_code = row['dealer']
            dealer_obj = next((d for d in self.dealers if d.get("dealer_code") == dealer_code), None)
            if not dealer_obj:
                dealer_obj = next((d for d in self.dealers if d.get("cookie")), None)

            if not dealer_obj or not dealer_obj.get("cookie"):
                with lock:
                    row['status'] = "Thiếu Cookie"
                    row['msg'] = f"Không tìm thấy Cookie cho đại lý {dealer_code}"
                    self.tree_excel.set(str(idx), "status", "❌ Thiếu Cookie")
                    self.log_excel(f"❌ Dòng #{idx} ({row['model']} - {row['package']}): Lỗi thiếu Cookie kết nối đại lý {dealer_code}")
                    error_cnt += 1
                    completed_count += 1
                    self.prog_bar['value'] = completed_count
                return

            order_params = {
                "dealer": dealer_code,
                "cookie": dealer_obj.get("cookie"),
                "model": row['model'],
                "package": row['package'],
                "ext_color": row['ext_color'],
                "int_color": row['int_color'],
                "battery": str(row['battery']).lower() in ["có", "true", "1", "yes", "pin thuộc xe"],
                "year": str(row['year']),
                "priority": PRIORITY_MAP.get(row['priority'], 3),
                "payment_method": row.get('payment_method', 'Công nợ trả sau'),
                "payment_amount": row.get('payment_amount', 0),
                "qty": 1.0,
                "auto_send": should_auto_send_now
            }

            with lock:
                self.tree_excel.set(str(idx), "status", "⏳ Đang tạo...")
                self.log_excel(f"⏳ [{idx}/{total}] Đang tạo PO cho {dealer_code}: Dòng {row['model']} | {row['package']}...")

            # Retry mechanism (tối đa 2 lần thử)
            success = False
            po_number = None
            po_id = None
            msg = ""
            for attempt in range(1, 3):
                try:
                    res = create_po_on_dms(order_params)
                    success, po_number, msg = res[0], res[1], res[2]
                    po_id = res[3] if len(res) > 3 else None
                    if success:
                        break
                    elif attempt < 2:
                        time.sleep(0.5)
                except Exception as ex:
                    msg = str(ex)
                    if attempt < 2:
                        time.sleep(0.5)

            with lock:
                completed_count += 1
                self.prog_bar['value'] = completed_count
                self.lbl_excel_progress.config(text=f"Tiến độ ({completed_count}/{total}): Đã tạo xong PO #{idx}...")

                if success:
                    success_cnt += 1
                    row['status'] = "Đã tạo nháp" if should_batch_send_later else ("Đã gửi" if should_auto_send_now else "Lưu nháp")
                    row['result_po'] = po_number
                    row['msg'] = msg
                    status_badge = "📝 Đã tạo nháp" if should_batch_send_later else ("✅ Đã gửi" if should_auto_send_now else "📝 Lưu nháp")
                    self.tree_excel.set(str(idx), "status", status_badge)
                    self.tree_excel.set(str(idx), "result_po", po_number)
                    self.log_excel(f"✅ [{idx}/{total}] TẠO THÀNH CÔNG! Số PO: {po_number} ({msg})")
                    if should_batch_send_later and po_id:
                        created_pos_to_send.append({
                            "po_id": po_id,
                            "po_number": po_number,
                            "cookie": dealer_obj.get("cookie"),
                            "idx": idx
                        })
                else:
                    error_cnt += 1
                    row['status'] = f"Lỗi"
                    row['msg'] = msg
                    self.tree_excel.set(str(idx), "status", f"❌ {msg[:20]}")
                    self.log_excel(f"❌ [{idx}/{total}] TẠO THẤT BẠI: {msg}")

        # Execute creation using 5 parallel threads
        with ThreadPoolExecutor(max_workers=5) as executor:
            items = list(enumerate(self.excel_data, 1))
            futures = [executor.submit(_process_item, item) for item in items]
            for future in as_completed(futures):
                if getattr(self, "stop_requested", False):
                    break

        # Gửi hàng loạt PO song song nếu chọn chế độ "Tạo xong hết mới gửi"
        if should_batch_send_later and created_pos_to_send and not getattr(self, "stop_requested", False):
            self.log_excel(f"🚀 TẤT CẢ {len(created_pos_to_send)} PO ĐÃ TẠO NHÁP THÀNH CÔNG! BẮT ĐẦU GỬI HÀNG LOẠT SONG SONG (BULK SUBMIT)...")
            
            def _send_item(p_item):
                if getattr(self, "stop_requested", False):
                    return
                try:
                    headers = get_dms_headers(p_item["cookie"])
                    update_payload = {
                        "xts_status": 101,
                        "xts_handling": 1,
                        "itv_submitedtime": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                    }
                    r_send = requests.patch(f"{BASE_API_URL}/xts_purchaseorders({p_item['po_id']})", headers=headers, json=update_payload, timeout=12)
                    with lock:
                        if r_send.status_code in (200, 204):
                            self.log_excel(f"🚀 [{p_item['idx']}/{total}] ĐÃ GỬI THÀNH CÔNG PO: {p_item['po_number']}")
                            self.tree_excel.set(str(p_item['idx']), "status", "✅ Đã gửi")
                            self.excel_data[p_item['idx']-1]['status'] = "Đã gửi"
                        else:
                            self.log_excel(f"⚠️ Không thể gửi PO {p_item['po_number']}: HTTP {r_send.status_code}")
                except Exception as ex_send:
                    with lock:
                        self.log_excel(f"⚠️ Lỗi gửi PO {p_item['po_number']}: {str(ex_send)}")

            with ThreadPoolExecutor(max_workers=5) as send_executor:
                send_futures = [send_executor.submit(_send_item, p_item) for p_item in created_pos_to_send]
                for sf in as_completed(send_futures):
                    pass

        self.is_running = False
        self.stop_requested = False
        self.btn_run_excel.config(state="normal", text="⚡ BẮT ĐẦU TẠO HÀNG LOẠT PO")
        self.btn_stop_excel.config(state="disabled")
        self.lbl_excel_progress.config(text=f"Hoàn tất! Thành công: {success_cnt} | Thất bại: {error_cnt}")
        self.log_excel(f"🎉 TỔNG KẾT TIẾN TRÌNH BATCH: Thành công: {success_cnt} | Thất bại: {error_cnt}")
        messagebox.showinfo("Hoàn tất", f"Đã hoàn thành tạo hàng loạt PO!\n\n• Thành công: {success_cnt}\n• Thất bại: {error_cnt}\n\nBạn có thể bấm 'Xuất Báo Cáo Kết Quả Excel' để lưu kết quả.")

    def start_batch_delete_pos(self):
        if self.is_running:
            messagebox.showwarning("Đang xử lý", "Hệ thống đang thực hiện tác vụ khác, vui lòng chờ!")
            return

        target_items = []
        for idx, row in enumerate(self.excel_data, 1):
            po_num = row.get("result_po")
            if po_num and po_num != "---" and not str(po_num).startswith("❌") and not str(po_num).startswith("🗑️"):
                target_items.append((idx, row))

        if not target_items:
            messagebox.showwarning("Không có dữ liệu", "Không tìm thấy số PO đã tạo nào trong danh sách để xóa!\n\nBạn có thể sử dụng nút '📋 Nhập Tay Xóa PO' để xóa các số PO bất kỳ.")
            return

        if not messagebox.askyesno("Xác nhận XÓA HÀNG LOẠT PO", f"Bạn có chắc chắn muốn XÓA VĨNH VIỄN {len(target_items)} PO đã tạo khỏi hệ thống VinFast DMS không?\n\n⚠️ Thao tác này không thể hoàn tác!"):
            return

        self.is_running = True
        self.stop_requested = False
        self.btn_run_excel.config(state="disabled")
        self.btn_stop_excel.config(state="normal")

        def _worker_batch_delete():
            total = len(target_items)
            deleted_cnt = 0
            failed_cnt = 0

            self.prog_bar['maximum'] = total
            self.prog_bar['value'] = 0
            self.log_excel(f"🚀 BẮT ĐẦU TIẾN TRÌNH XÓA {total} PO ĐÃ TẠO TRÊN VINFAST DMS...")

            for i, (idx, row) in enumerate(target_items, 1):
                if getattr(self, "stop_requested", False):
                    self.log_excel(f"🛑 Tiến trình xóa đã dừng lại tại PO #{i-1}.")
                    break

                dealer_code = row['dealer']
                dealer_obj = next((d for d in self.dealers if d.get("dealer_code") == dealer_code), None)
                if not dealer_obj:
                    dealer_obj = next((d for d in self.dealers if d.get("cookie")), None)

                po_num = row['result_po']
                self.tree_excel.set(str(idx), "status", "⏳ Đang xóa...")
                self.log_excel(f"⏳ [{i}/{total}] Đang xóa PO {po_num} của Showroom {dealer_code}...")

                if not dealer_obj or not dealer_obj.get("cookie"):
                    self.tree_excel.set(str(idx), "status", "❌ Thiếu Cookie")
                    self.log_excel(f"❌ Không tìm thấy Cookie cho đại lý {dealer_code}")
                    failed_cnt += 1
                    continue

                ok, msg = delete_po_on_dms(dealer_obj.get("cookie"), po_num)
                if ok:
                    deleted_cnt += 1
                    row['status'] = "Đã xóa"
                    row['result_po'] = "🗑️ Đã xóa"
                    self.tree_excel.set(str(idx), "status", "🗑️ Đã xóa")
                    self.tree_excel.set(str(idx), "result_po", "🗑️ Đã xóa")
                    self.log_excel(f"✅ [{i}/{total}] {msg}")
                else:
                    failed_cnt += 1
                    self.tree_excel.set(str(idx), "status", "❌ Lỗi xóa")
                    self.log_excel(f"❌ [{i}/{total}] Lỗi xóa PO {po_num}: {msg}")

                self.prog_bar['value'] = i
                time.sleep(0.3)

            self.is_running = False
            self.stop_requested = False
            self.btn_run_excel.config(state="normal")
            self.btn_stop_excel.config(state="disabled")
            self.lbl_excel_progress.config(text=f"Hoàn tất xóa PO! Thành công: {deleted_cnt} | Thất bại: {failed_cnt}")
            self.log_excel(f"🎉 TỔNG KẾT TIẾN TRÌNH XÓA PO: Thành công: {deleted_cnt} | Thất bại: {failed_cnt}")
            messagebox.showinfo("Hoàn tất", f"Đã hoàn thành tiến trình xóa PO!\n\n• Thành công: {deleted_cnt}\n• Thất bại: {failed_cnt}")

        threading.Thread(target=_worker_batch_delete, daemon=True).start()

    def open_delete_pos_dialog(self):
        dialog = tk.Toplevel(self)
        dialog.title("🗑️ Công Cụ Xóa PO Đã Tạo Trực Tiếp Trên VinFast DMS")
        dialog.geometry("700x580")
        dialog.minsize(620, 480)
        dialog.configure(bg="#0f172a")

        top_f = tk.Frame(dialog, bg="#1e293b", padx=16, pady=12)
        top_f.pack(fill=tk.X)

        tk.Label(top_f, text="🗑️ CÔNG CỤ XÓA HÀNG LOẠT PO THEO SỐ ĐƠN (DMS API)", font=("Segoe UI", 11, "bold"), bg="#1e293b", fg="#ef4444").pack(anchor="w")
        tk.Label(top_f, text="Dán danh sách số đơn PO (ví dụ: N31913-PO-26-09-0032) vào ô bên dưới để xóa vĩnh viễn khỏi DMS.", font=("Segoe UI", 9), bg="#1e293b", fg="#94a3b8").pack(anchor="w", pady=(2, 0))

        content_f = tk.Frame(dialog, bg="#0f172a", padx=16, pady=12)
        content_f.pack(fill=tk.BOTH, expand=True)

        row1 = tk.Frame(content_f, bg="#0f172a")
        row1.pack(fill=tk.X, pady=(0, 8))

        tk.Label(row1, text="Chọn Showroom / Đại lý:", font=("Segoe UI", 10, "bold"), bg="#0f172a", fg="#38bdf8").pack(side=tk.LEFT, padx=(0, 8))
        cb_dlg_dealer = ttk.Combobox(row1, state="readonly", font=("Segoe UI", 10), width=32)
        dealer_names = [f"{d.get('dealer_code')} - {d.get('name')}" for d in self.dealers]
        cb_dlg_dealer['values'] = dealer_names
        if dealer_names:
            cb_dlg_dealer.current(0)
        cb_dlg_dealer.pack(side=tk.LEFT)

        tk.Label(content_f, text="Nhập / Dán danh sách Số PO cần xóa (Mỗi PO một dòng hoặc cách nhau bởi dấu phẩy):", font=("Segoe UI", 9, "bold"), bg="#0f172a", fg="#cbd5e1").pack(anchor="w", pady=(4, 4))

        txt_pos = tk.Text(content_f, bg="#1e293b", fg="#ffffff", font=("Consolas", 10), relief="flat", padx=10, pady=8, height=8, insertbackground="#38bdf8")
        txt_pos.pack(fill=tk.X, pady=(0, 10))

        btn_box = tk.Frame(content_f, bg="#0f172a")
        btn_box.pack(fill=tk.X, pady=(0, 10))

        btn_run_del = tk.Button(btn_box, text="🛑 BẮT ĐẦU XÓA TẤT CẢ PO ĐÃ NHẬP", bg="#ef4444", fg="white", font=("Segoe UI", 10, "bold"), relief="flat", padx=16, pady=8, cursor="hand2")
        btn_run_del.pack(side=tk.LEFT)

        tk.Label(content_f, text="📜 Nhật ký thực thi xóa:", font=("Segoe UI", 9, "bold"), bg="#0f172a", fg="#38bdf8").pack(anchor="w", pady=(4, 2))

        txt_log_del = tk.Text(content_f, bg="#090d16", fg="#f8fafc", font=("Consolas", 9), relief="flat", padx=8, pady=6, wrap=tk.WORD, height=8)
        txt_log_del.pack(fill=tk.BOTH, expand=True)

        def log_dlg(msg):
            ts = datetime.now().strftime("%H:%M:%S")
            txt_log_del.insert(tk.END, f"[{ts}] {msg}\n")
            txt_log_del.see(tk.END)

        def start_dlg_deletion():
            raw_text = txt_pos.get("1.0", tk.END).strip()
            if not raw_text:
                messagebox.showwarning("Chưa nhập PO", "Vui lòng nhập hoặc dán ít nhất 1 số PO cần xóa!", parent=dialog)
                return

            po_list = [p.strip() for p in re.split(r"[\n,\s;]+", raw_text) if p.strip()]
            if not po_list:
                messagebox.showwarning("Không hợp lệ", "Danh sách số PO không hợp lệ!", parent=dialog)
                return

            dealer_str = cb_dlg_dealer.get()
            dealer_code = dealer_str.split(" - ")[0].strip() if dealer_str else "N31913"
            dealer_obj = next((d for d in self.dealers if d.get("dealer_code") == dealer_code), None)

            if not dealer_obj or not dealer_obj.get("cookie"):
                messagebox.showerror("Lỗi Cookie", f"Không tìm thấy Cookie kết nối của đại lý {dealer_code}!", parent=dialog)
                return

            if not messagebox.askyesno("Xác nhận XÓA VĨNH VIỄN", f"Bạn có chắc chắn muốn xóa {len(po_list)} PO khỏi VinFast DMS không?\n\nShowroom: {dealer_code}\nSố lượng: {len(po_list)} PO", parent=dialog):
                return

            btn_run_del.config(state="disabled", text="⏳ ĐANG THỰC HIỆN XÓA PO...")

            def _worker_dlg_del():
                deleted_cnt = 0
                failed_cnt = 0
                cookie = dealer_obj.get("cookie")

                log_dlg(f"🚀 Bắt đầu xóa {len(po_list)} PO cho đại lý {dealer_code}...")
                for idx, po_num in enumerate(po_list, 1):
                    log_dlg(f"⏳ [{idx}/{len(po_list)}] Đang xóa PO: {po_num}...")
                    ok, msg = delete_po_on_dms(cookie, po_num)
                    if ok:
                        deleted_cnt += 1
                        log_dlg(f"✅ [{idx}/{len(po_list)}] {msg}")
                    else:
                        failed_cnt += 1
                        log_dlg(f"❌ [{idx}/{len(po_list)}] {msg}")
                    time.sleep(0.3)

                log_dlg(f"🎉 TỔNG KẾT XÓA PO: Thành công: {deleted_cnt} | Thất bại: {failed_cnt}")
                messagebox.showinfo("Hoàn tất xóa PO", f"Đã hoàn thành tiến trình xóa PO!\n\n• Thành công: {deleted_cnt}\n• Thất bại: {failed_cnt}", parent=dialog)
                btn_run_del.config(state="normal", text="🛑 BẮT ĐẦU XÓA TẤT CẢ PO ĐÃ NHẬP")

            threading.Thread(target=_worker_dlg_del, daemon=True).start()

        btn_run_del.config(command=start_dlg_deletion)

def create_po_on_dms(p):
    headers = get_dms_headers(p['cookie'])
    dealer_code = p['dealer']

    # 1. Look up Showroom BU with Caching
    if dealer_code in DMS_CACHE["bu"]:
        bu_id, parent_bu_id = DMS_CACHE["bu"][dealer_code]
    else:
        r_bu = requests.get(f"{BASE_API_URL}/businessunits", headers=headers, params={"$filter": f"name eq '{dealer_code}'", "$select": "businessunitid,_parentbusinessunitid_value,name"}, timeout=12)
        if r_bu.status_code != 200 or not r_bu.json().get('value'):
            return False, None, f"Không tìm thấy Business Unit của showroom {dealer_code}", None
        bu_item = r_bu.json()['value'][0]
        bu_id = bu_item['businessunitid']
        parent_bu_id = bu_item.get('_parentbusinessunitid_value') or "c46bad8c-5961-ea11-a811-000d3a85937e"
        DMS_CACHE["bu"][dealer_code] = (bu_id, parent_bu_id)

    # 2. Look up Showroom Site with Caching
    if dealer_code in DMS_CACHE["site"]:
        site_id = DMS_CACHE["site"][dealer_code]
    else:
        site_id = None
        r_site = requests.get(f"{BASE_API_URL}/xts_sites", headers=headers, params={"$select": "xts_siteid,xts_name", "$top": "100"}, timeout=12)
        if r_site.status_code == 200:
            for s in r_site.json().get('value', []):
                if dealer_code.upper() in str(s.get('xts_name', '')).upper():
                    site_id = s['xts_siteid']
                    break
        if not site_id:
            return False, None, f"Không tìm thấy Site kho của showroom {dealer_code}", None
        DMS_CACHE["site"][dealer_code] = site_id

    # 3. Look up Vehicle Warehouse ({dealer_code}_VHC) with Caching
    wh_key = f"{dealer_code}_VHC"
    if wh_key in DMS_CACHE.setdefault("warehouse", {}):
        warehouse_id = DMS_CACHE["warehouse"][wh_key]
    else:
        warehouse_id = None
        try:
            r_wh = requests.get(f"{BASE_API_URL}/xts_warehouses", headers=headers, params={"$filter": f"xts_warehouse eq '{wh_key}' and statecode eq 0", "$select": "xts_warehouseid"}, timeout=10)
            if r_wh.status_code == 200 and r_wh.json().get('value'):
                warehouse_id = r_wh.json()['value'][0]['xts_warehouseid']
                DMS_CACHE["warehouse"][wh_key] = warehouse_id
        except Exception:
            pass

    # Fixed Standard Identifiers on DMS
    vendor_id = "6ce4c6f8-409e-ef11-8a6b-6045bd5754ce"   # VinFast
    tax_id = "7f957c74-be62-ea11-a811-000d3a851c32"      # VAT 10% (xts_consumptiontax)
    currency_id = "e74cbe4f-a1ed-e911-a811-000d3aa399d6" # VNĐ (transactioncurrency)
    unit_id = "c87e4534-b711-ea11-a812-000d3aa39843"     # Xe / Unit (xts_uom)
    prpotype_id = "cedfe2b4-ff61-ea11-a811-000d3a851103" # ZVOR Normal Order
    vfplant_id = "9e15f6b3-8370-f111-ab0f-000d3a85f947"  # Kho 6868 NewCo Car

    # Year with Caching
    year_str = str(p.get('year', '2026'))
    if year_str in DMS_CACHE["year"]:
        year_id = DMS_CACHE["year"][year_str]
    else:
        r_yr = requests.get(f"{BASE_API_URL}/xts_commons", headers=headers, params={"$filter": f"xts_common eq '{year_str}' and xts_category eq 101", "$select": "xts_commonid"}, timeout=10)
        if r_yr.status_code == 200 and r_yr.json().get('value'):
            year_id = r_yr.json()['value'][0]['xts_commonid']
        else:
            year_id = "d1c0e351-ccea-f011-8406-7ced8dfee127"
        DMS_CACHE["year"][year_str] = year_id

    # 4. Vehicle model lookup
    raw_model = str(p['model']).strip()
    norm_model = normalize_vietnamese(raw_model)
    model_name = None

    for k, v in DEFAULT_VEHICLES.items():
        sc = v.get("shared_code", "")
        if raw_model.upper() == k.upper() or (sc and raw_model.upper() == sc.upper()):
            model_name = k
            break
        if (sc and sc.lower() in raw_model.lower()) or (normalize_vietnamese(k) in norm_model or norm_model in normalize_vietnamese(k)):
            model_name = k
            break

    if not model_name:
        for k, v in DEFAULT_VEHICLES.items():
            if any(pkg.get("code") and (raw_model.lower() in pkg["code"].lower() or pkg["code"].lower() in raw_model.lower()) for pkg in v.get("packages", [])):
                model_name = k
                break

    if not model_name:
        return False, None, f"Không tìm thấy dòng xe '{raw_model}' trong danh mục VinFast DMS!", None

    model_cfg = DEFAULT_VEHICLES.get(model_name, {})
    shared_code = model_cfg.get("shared_code") or raw_model

    # Dynamic lookup xts_productid using BU company code & xts_locking
    company = dealer_code[:4] if len(dealer_code) >= 4 else "N319"
    locking_key = f"{company}{shared_code}"

    if locking_key in DMS_CACHE["product"]:
        product_id = DMS_CACHE["product"][locking_key]
    else:
        product_id = None
        try:
            r_prod = requests.get(f"{BASE_API_URL}/xts_products", headers=headers, params={"$filter": f"xts_locking eq '{locking_key}' and statecode eq 0", "$select": "xts_productid"}, timeout=10)
            if r_prod.status_code == 200 and r_prod.json().get('value'):
                product_id = r_prod.json()['value'][0]['xts_productid']
        except Exception:
            pass
        if not product_id:
            try:
                r_prod = requests.get(f"{BASE_API_URL}/xts_products", headers=headers, params={"$filter": f"xts_product eq '{shared_code}' and statecode eq 0", "$select": "xts_productid"}, timeout=10)
                if r_prod.status_code == 200 and r_prod.json().get('value'):
                    product_id = r_prod.json()['value'][0]['xts_productid']
            except Exception:
                pass
        if not product_id:
            return False, None, f"Không tìm thấy mã sản phẩm (Product) {shared_code} cho đại lý {dealer_code} trên DMS!", None
        DMS_CACHE["product"][locking_key] = product_id

    # 5. Match package
    pkg_str = str(p.get('package', '')).strip()
    norm_pkg = normalize_vietnamese(pkg_str)
    pkg_match = None

    for pkg in model_cfg.get("packages", []):
        code = pkg.get("code", "")
        if not code:
            continue
        if pkg_str.lower() in code.lower() or code.lower() in pkg_str.lower():
            pkg_match = pkg
            break
        parts = code.split("_")
        if len(parts) >= 2 and pkg_str.upper() == parts[1].upper():
            pkg_match = pkg
            break

    if not pkg_match:
        pkg_match = next((pkg for pkg in model_cfg.get("packages", []) if normalize_vietnamese(pkg["name"]) in norm_pkg or norm_pkg in normalize_vietnamese(pkg["name"])), None)

    if pkg_match:
        pkg_id = pkg_match["id"]
    elif model_cfg.get("packages"):
        pkg_match = model_cfg["packages"][0]
        pkg_id = pkg_match["id"]
    else:
        return False, None, f"Không tìm thấy phiên bản xe '{pkg_str}' cho dòng {model_name}!", None

    # 6. Match exterior color
    ext_col_str = str(p.get('ext_color', '')).strip()
    norm_ext = normalize_vietnamese(ext_col_str)
    ext_col_match = None

    for c in model_cfg.get("ext_colors", []):
        if not isinstance(c, dict):
            continue
        c_code = c.get("code", "")
        c_name = c.get("name", "")
        if c_code and (ext_col_str.upper() == c_code.upper() or c_code.lower() in ext_col_str.lower()):
            ext_col_match = c
            break
        if normalize_vietnamese(c_name) in norm_ext or norm_ext in normalize_vietnamese(c_name):
            ext_col_match = c
            break

    if not ext_col_match:
        ext_upper = ext_col_str.upper()
        for c in model_cfg.get("ext_colors", []):
            c_name = c.get("name", "")
            if ("CE18" in ext_upper and ("trang" in normalize_vietnamese(c_name) or "white" in c_name.lower())) or                ("CE11" in ext_upper and ("den" in normalize_vietnamese(c_name) or "black" in c_name.lower())) or                ("CE1V" in ext_upper and ("xam" in normalize_vietnamese(c_name) or "grey" in c_name.lower())) or                ("CE1U" in ext_upper and ("vang" in normalize_vietnamese(c_name) or "yellow" in c_name.lower())) or                ("181U" in ext_upper and "noc trang" in normalize_vietnamese(c_name)) or                ("CE13" in ext_upper and ("do" in normalize_vietnamese(c_name) or "red" in c_name.lower())) or                ("CE1W" in ext_upper and ("xanh" in normalize_vietnamese(c_name) or "mint" in c_name.lower())) or                ("1821" in ext_upper and ("hong" in normalize_vietnamese(c_name) or "pink" in c_name.lower())):
                ext_col_match = c
                break

    if ext_col_match:
        ext_col_id = ext_col_match["id"]
    elif model_cfg.get("ext_colors") and isinstance(model_cfg["ext_colors"][0], dict):
        ext_col_match = model_cfg["ext_colors"][0]
        ext_col_id = ext_col_match["id"]
    else:
        return False, None, f"Không tìm thấy màu ngoại thất '{ext_col_str}' cho xe {model_name}!", None

    # 7. Match interior color
    int_col_str = str(p.get('int_color', '')).strip()
    norm_int = normalize_vietnamese(int_col_str)
    int_col_match = None

    for c in model_cfg.get("int_colors", []):
        if not isinstance(c, dict):
            continue
        c_code = c.get("code", "")
        c_name = c.get("name", "")
        if c_code and (int_col_str.upper() == c_code.upper() or c_code.lower() in int_col_str.lower()):
            int_col_match = c
            break
        if normalize_vietnamese(c_name) in norm_int or norm_int in normalize_vietnamese(c_name):
            int_col_match = c
            break

    if not int_col_match:
        int_upper = int_col_str.upper()
        for c in model_cfg.get("int_colors", []):
            c_name = c.get("name", "")
            if ("CI11" in int_upper and ("den" in normalize_vietnamese(c_name) or "black" in c_name.lower())) or                ("CI1M" in int_upper and ("nau" in normalize_vietnamese(c_name) or "mocha" in c_name.lower())) or                ("CI12" in int_upper and ("xam" in normalize_vietnamese(c_name) or "grey" in c_name.lower())) or                ("CI13" in int_upper and ("be" in normalize_vietnamese(c_name) or "beige" in c_name.lower())):
                int_col_match = c
                break

    if int_col_match:
        int_col_id = int_col_match["id"]
    elif model_cfg.get("int_colors") and isinstance(model_cfg["int_colors"][0], dict):
        int_col_match = model_cfg["int_colors"][0]
        int_col_id = int_col_match["id"]
    else:
        return False, None, f"Không tìm thấy màu nội thất '{int_col_str}' cho xe {model_name}!", None

    # Payment Method & Amount
    pm_str = p.get('payment_method', '')
    if "Deferred liability" in pm_str or "Công nợ" in pm_str:
        method_code = 4
    elif "Financial Guarantee" in pm_str or "Bảo lãnh" in pm_str:
        method_code = 2
    elif "Cash" in pm_str or "Tiền mặt" in pm_str:
        method_code = 1
    elif "Unblocking" in pm_str or "Giải ngân" in pm_str:
        method_code = 3
    else:
        method_code = 4

    payment_amt = float(p.get('payment_amount', 0) or 0)
    priority_val = p.get('priority', 3)
    today_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT00:00:00Z") if hasattr(datetime, "UTC") else datetime.utcnow().strftime("%Y-%m-%dT00:00:00Z")

    # Step 1: Create PO Header
    header_payload = {
        "xts_businessunitid@odata.bind": f"/businessunits({bu_id})",
        "xts_parentbusinessunitid@odata.bind": f"/businessunits({parent_bu_id})",
        "xts_siteid@odata.bind": f"/xts_sites({site_id})",
        "itv_shipto@odata.bind": f"/businessunits({bu_id})",
        "xts_vendorid@odata.bind": f"/xts_vendors({vendor_id})",
        "xts_prpotypeid@odata.bind": f"/xts_purchaserequisitionpurchaseordertypes({prpotype_id})",
        "xvf_vfplantid@odata.bind": f"/xvf_vfplants({vfplant_id})",
        "transactioncurrencyid@odata.bind": f"/transactioncurrencies({currency_id})",
        "xts_transactiondate": today_iso,
        "xvf_requesteddeliverydate": today_iso,
        "xvf_deliverypriority": priority_val,
        "xvf_vfdivision": 20,
        "itv_methodofpayment": method_code,
        "xts_status": 1,
        "xts_handling": 1
    }

    # Với Bảo lãnh thanh toán, chỉ điền số tiền bảo lãnh nếu người dùng chỉ định > 0
    if method_code == 2 and payment_amt > 0:
        header_payload["itv_financialguaranteeamount"] = payment_amt

    url_create_po = f"{BASE_API_URL}/xts_purchaseorders"
    r_create = requests.post(url_create_po, headers=headers, json=header_payload, timeout=20)

    if r_create.status_code not in (200, 201, 204):
        return False, None, f"Lỗi tạo PO Header: {r_create.text}", None

    entity_url = r_create.headers.get("OData-EntityId")
    if entity_url:
        po_id = entity_url.split("(")[1].split(")")[0]
    else:
        r_latest = requests.get(f"{BASE_API_URL}/xts_purchaseorders", headers=headers, params={"$filter": f"_xts_businessunitid_value eq {bu_id}", "$orderby": "createdon desc", "$top": "1"}, timeout=10)
        po_id = r_latest.json()['value'][0]['xts_purchaseorderid']

    # Step 2: Create PO Line
    line_payload = {
        "xts_purchaseorderid@odata.bind": f"/xts_purchaseorders({po_id})",
        "xts_businessunitid@odata.bind": f"/businessunits({bu_id})",
        "xts_parentbusinessunitid@odata.bind": f"/businessunits({parent_bu_id})",
        "xts_siteid@odata.bind": f"/xts_sites({site_id})",
        "transactioncurrencyid@odata.bind": f"/transactioncurrencies({currency_id})",
        "xts_purchaseunitid@odata.bind": f"/xts_uoms({unit_id})",
        "xts_inventoryunitid@odata.bind": f"/xts_uoms({unit_id})",
        "xts_productid@odata.bind": f"/xts_products({product_id})",
        "xvf_vehiclepackageid@odata.bind": f"/xvf_vehiclepackages({pkg_id})",
        "xvf_manufacturingyearid@odata.bind": f"/xts_commons({year_id})",
        "xts_consumptiontax1id@odata.bind": f"/xts_consumptiontaxes({tax_id})",
        "xts_productexteriorcolorid@odata.bind": f"/xts_productexteriorcolors({ext_col_id})",
        "xts_productinteriorcolorid@odata.bind": f"/xts_productinteriorcolors({int_col_id})",
        "xts_quantityorder": p['qty'],
        "itv_batteryembedded": p['battery'],
        "xvf_deliverypriority": priority_val,
        "xvf_pricetype": 1,
        "xts_purchasefor": 5
    }

    if warehouse_id:
        line_payload["xts_warehouseid@odata.bind"] = f"/xts_warehouses({warehouse_id})"

    url_create_line = f"{BASE_API_URL}/xts_purchaseorderdetails"
    r_line = requests.post(url_create_line, headers=headers, json=line_payload, timeout=20)
    if r_line.status_code not in (200, 201, 204):
        # Thu hồi PO Header vừa tạo nếu tạo Line lỗi
        try:
            requests.delete(f"{BASE_API_URL}/xts_purchaseorders({po_id})", headers=headers, timeout=5)
        except Exception:
            pass
        return False, None, f"Lỗi tạo chi tiết xe PO Line: {r_line.text}", None

    line_entity_url = r_line.headers.get("OData-EntityId")
    if line_entity_url:
        line_id = line_entity_url.split("(")[1].split(")")[0]
        patch_line = {}
        if pkg_match and pkg_match.get("cfg_name"):
            patch_line["xvf_configurationname"] = pkg_match["cfg_name"]
        elif pkg_match and pkg_match.get("name"):
            patch_line["xvf_configurationname"] = pkg_match["name"]

        if ext_col_match and isinstance(ext_col_match, dict):
            clean_ext_name = ext_col_match["name"].split(" (")[0]
            patch_line["xvf_exteriorcolorname"] = clean_ext_name
            if ext_col_match.get("c_id"):
                patch_line["xvf_characteristicexteriorcolorid@odata.bind"] = f"/xvf_vehiclecharacteristicvalues({ext_col_match['c_id']})"

        if int_col_match and isinstance(int_col_match, dict):
            clean_int_name = int_col_match["name"].split(" (")[0]
            patch_line["xvf_interiorcolorname"] = clean_int_name
            if int_col_match.get("c_id"):
                patch_line["xvf_characteristicinteriorcolorid@odata.bind"] = f"/xvf_vehiclecharacteristicvalues({int_col_match['c_id']})"

        if pkg_match and pkg_match.get("cfg_id"):
            patch_line["xts_productconfigurationid@odata.bind"] = f"/xts_productconfigurations({pkg_match['cfg_id']})"
        if pkg_match and pkg_match.get("c_cfg_id"):
            patch_line["xvf_characteristicconfigurationid@odata.bind"] = f"/xvf_vehiclecharacteristicvalues({pkg_match['c_cfg_id']})"

        if patch_line:
            try:
                requests.patch(f"{BASE_API_URL}/xts_purchaseorderdetails({line_id})", headers=headers, json=patch_line, timeout=10)
            except Exception:
                pass

    # Step 3: Fetch PO summary info from DMS
    r_get_po = requests.get(f"{BASE_API_URL}/xts_purchaseorders({po_id})", headers=headers, timeout=10)
    po_data = r_get_po.json() if r_get_po.status_code == 200 else {}
    po_number = po_data.get("xts_purchaseordernumber") or f"PO-{po_id[:8]}"
    grand_total = po_data.get("xts_grandtotal", 0)

    # Step 4: Send PO if auto_send requested
    if p.get("auto_send"):
        try:
            update_payload = {
                "xts_status": 101,
                "xts_handling": 1,
                "itv_submitedtime": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            }
            requests.patch(f"{BASE_API_URL}/xts_purchaseorders({po_id})", headers=headers, json=update_payload, timeout=10)
        except Exception:
            pass

    return True, po_number, f"Thành công! Tổng giá trị: {grand_total:,.0f} VNĐ", po_id

def delete_po_on_dms(cookie, po_identifier):
    if not cookie:
        return False, "Thiếu Cookie kết nối đại lý"
    po_str = str(po_identifier).strip()
    if not po_str or po_str == "---":
        return False, "Mã/Số PO không hợp lệ"
    
    headers = get_dms_headers(cookie)
    
    try:
        # Check if input is GUID or PO Number
        is_guid = len(po_str) == 36 and "-" in po_str and not po_str.startswith("N319")
        if is_guid:
            po_id = po_str
            po_num_display = f"PO-{po_id[:8]}"
        else:
            url_search = f"{BASE_API_URL}/xts_purchaseorders"
            params = {
                "$filter": f"xts_purchaseordernumber eq '{po_str}'",
                "$select": "xts_purchaseorderid,xts_purchaseordernumber,xts_status"
            }
            r_search = requests.get(url_search, headers=headers, params=params, timeout=12)
            if r_search.status_code != 200:
                return False, f"Lỗi tra cứu: HTTP {r_search.status_code}"
            val = r_search.json().get('value', [])
            if not val:
                return False, f"Không tìm thấy PO {po_str} trên hệ thống DMS"
            po_item = val[0]
            po_id = po_item['xts_purchaseorderid']
            po_num_display = po_item.get('xts_purchaseordernumber') or po_str
            status = po_item.get('xts_status')

            # Reset status to Draft (1) if it was submitted/sent (101)
            if status != 1:
                try:
                    requests.patch(f"{BASE_API_URL}/xts_purchaseorders({po_id})", headers=headers, json={"xts_status": 1, "xts_handling": 1}, timeout=10)
                except Exception:
                    pass

        # Delete PO Lines
        r_lines = requests.get(f"{BASE_API_URL}/xts_purchaseorderdetails", headers=headers, params={"$filter": f"_xts_purchaseorderid_value eq {po_id}", "$select": "xts_purchaseorderdetailid"}, timeout=10)
        if r_lines.status_code == 200:
            for line in r_lines.json().get('value', []):
                line_id = line['xts_purchaseorderdetailid']
                requests.delete(f"{BASE_API_URL}/xts_purchaseorderdetails({line_id})", headers=headers, timeout=10)

        # Delete PO Header
        r_del = requests.delete(f"{BASE_API_URL}/xts_purchaseorders({po_id})", headers=headers, timeout=12)
        if r_del.status_code in (200, 204):
            return True, f"Đã xóa thành công PO: {po_num_display}"
        else:
            return False, f"Lỗi xóa PO Header: HTTP {r_del.status_code}"
    except Exception as e:
        return False, str(e)

if __name__ == "__main__":
    app = POCreatorApp()
    app.mainloop()
