import http.server
import socketserver
import socket
import json
import re
import time
import os
import urllib.parse
import urllib.request

PORT = 8989
RICOH_IP = "192.168.10.239"

def fetch_ricoh_jobs():
    """Truy vấn thời gian thực từ máy in Ricoh qua Telnet msh"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(6)
        s.connect((RICOH_IP, 23))

        def read_until(prompt, timeout=5):
            buf = b""
            start = time.time()
            while time.time() - start < timeout:
                try:
                    chunk = s.recv(1024)
                    if not chunk: break
                    i = 0
                    clean = bytearray()
                    while i < len(chunk):
                        if chunk[i] == 255 and i + 2 < len(chunk):
                            cmd = chunk[i+1]
                            opt = chunk[i+2]
                            if cmd == 253: s.sendall(bytes([255, 252, opt]))
                            elif cmd == 251: s.sendall(bytes([255, 254, opt]))
                            i += 3
                        else:
                            clean.append(chunk[i])
                            i += 1
                    buf += bytes(clean)
                    text = buf.decode("utf-8", errors="ignore")
                    if prompt in text: return text
                except socket.timeout: pass
            return buf.decode("utf-8", errors="ignore")

        read_until("login:")
        s.sendall(b"admin\r\n")
        read_until("Password:")
        s.sendall(b"\r\n")
        read_until("msh>")

        s.sendall(b"prnlog\r\n")
        raw_list = read_until("msh>", timeout=5)
        
        lines = raw_list.splitlines()
        job_ids = []
        for line in lines:
            match = re.match(r"^\s*(\d+)\s+([A-Za-z0-9_-]+)\s+(\d+)\s+([A-Za-z]+)\s+([\d/ :]+)", line)
            if match:
                job_ids.append(match.group(1))

        jobs = []
        for jid in job_ids:
            s.sendall(f"prnlog {jid}\r\n".encode())
            detail = read_until("msh>", timeout=2.5)
            
            user = "Không rõ"
            jobname = "Không có tên"
            pages = 1
            t_str = ""
            result = "Hoàn tất"
            
            for dline in detail.splitlines():
                if dline.startswith("User:"): user = dline.replace("User:", "").strip()
                elif dline.startswith("JobName:"): jobname = dline.replace("JobName:", "").strip()
                elif dline.startswith("Page:"): 
                    try: pages = int(dline.replace("Page:", "").strip())
                    except: pages = 1
                elif dline.startswith("Time:"): t_str = dline.replace("Time:", "").strip()
                elif dline.startswith("Result:"):
                    res_raw = dline.replace("Result:", "").strip()
                    if res_raw.lower() == "finished": result = "Hoàn tất"
                    elif res_raw.lower() == "canceled": result = "Đã hủy"
                    else: result = res_raw
            
            jobs.append({
                "id": jid,
                "user": user or "Không rõ",
                "document": jobname or "Tài liệu",
                "pages": pages,
                "time": t_str,
                "result": result
            })

        s.sendall(b"logout\r\n")
        s.close()
        jobs.reverse()
        return jobs
    except Exception as e:
        print("Lỗi fetch Ricoh:", e)
        return []

def get_printer_hardware_status():
    """Kiểm tra chi tiết trạng thái kẹt giấy, hết giấy, hộp mực và hướng dẫn xử lý"""
    status_info = {
        "online": True,
        "overall_status": "OK",
        "alerts": [],
        "trays": [],
        "toner": "OK",
        "jam": False,
        "door_open": False
    }

    try:
        url = f"http://{RICOH_IP}/web/guest/en/websys/webArch/topPage.cgi"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            content = resp.read().decode("utf-8", errors="ignore")

        if "deviceStPjam16.gif" in content or "Paper Misfeed" in content:
            status_info["jam"] = True
            status_info["alerts"].append({
                "type": "danger",
                "title": "🚨 KẸT GIẤY TRONG MÁY IN (Paper Misfeed)",
                "desc": "Máy in đang bị kẹt giấy trên đường dẫn hoặc cụm sấy.",
                "guide": "Mở nắp hông bên phải máy in (Nắp B), xoay bánh xe màu xanh theo chiều kim đồng hồ để nhẹ nhàng rút tờ giấy kẹt ra ngoài rồi đóng chặt nắp lại."
            })

        if "deviceStDoor" in content or "Cover Open" in content or "Door Open" in content:
            status_info["door_open"] = True
            status_info["alerts"].append({
                "type": "danger",
                "title": "🚪 NẮP MÁY IN ĐANG MỞ (Cover Open)",
                "desc": "Có một cửa hoặc nắp máy in chưa được đóng khít hoàn toàn.",
                "guide": "Kiểm tra và đẩy đóng chặt nắp trước (khu vực nạp mực) và nắp hông bên phải của máy in."
            })

        if "Toner Near End" in content:
            status_info["toner"] = "Sắp hết"
            status_info["alerts"].append({
                "type": "warning",
                "title": "⚠️ MỰC ĐEN SẮP HẾT (Toner Near End)",
                "desc": "Hộp mực đen còn khoảng 10-15%. Máy vẫn in được.",
                "guide": "Chuẩn bị sẵn 01 hộp mực Ricoh MP 5055 để thay thế kịp thời khi hết."
            })
        elif "deviceStToner" in content and "Toner End" in content:
            status_info["toner"] = "Hết mực"
            status_info["alerts"].append({
                "type": "danger",
                "title": "❌ HẾT MỰC IN (Toner Empty)",
                "desc": "Hộp mực đen đã cạn, máy in tạm dừng nhận lệnh in.",
                "guide": "Mở nắp trước máy in, gạt chốt khóa xanh sang trái, rút ống mực cũ và lắp ống mực Ricoh MP 5055 mới vào."
            })

        url_status = f"http://{RICOH_IP}/web/guest/en/websys/webArch/getStatus.cgi"
        req_status = urllib.request.Request(url_status, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req_status, timeout=3) as resp_st:
            content_st = resp_st.read().decode("utf-8", errors="ignore")

        tray_matches = re.findall(r"No Paper:\s*Tray\s*(\d+)", content_st, re.IGNORECASE)
        for t_num in set(tray_matches):
            status_info["alerts"].append({
                "type": "warning",
                "title": f"⚠️ HẾT GIẤY Ở KHAY SỐ {t_num} (Tray {t_num})",
                "desc": f"Khay số {t_num} đang rỗng khiến máy in hiện đèn vàng cảnh báo.",
                "guide": f"Kéo khay số {t_num} ra và nạp thêm một xấp giấy A4 vào (Các máy khác vẫn có thể in bình thường từ các khay còn giấy)."
            })

        trays = [
            {"id": 1, "name": "Khay 1", "size": "A4", "status": "Hết giấy" if "1" in tray_matches else "Sẵn sàng"},
            {"id": 2, "name": "Khay 2", "size": "A4", "status": "Hết giấy" if "2" in tray_matches else "Sẵn sàng"},
            {"id": 3, "name": "Khay 3", "size": "A5", "status": "Hết giấy" if "3" in tray_matches else "Sẵn sàng"},
            {"id": 4, "name": "Khay 4", "size": "A4", "status": "Hết giấy" if "4" in tray_matches else "Sẵn sàng"},
            {"id": 5, "name": "Khay tay", "size": "Bypass", "status": "Trống" if "bypass" in content_st.lower() and "no paper" in content_st.lower() else "Sẵn sàng"}
        ]
        status_info["trays"] = trays

        if status_info["alerts"]:
            has_danger = any(a["type"] == "danger" for a in status_info["alerts"])
            status_info["overall_status"] = "ERROR" if has_danger else "WARNING"

    except Exception as e:
        status_info["online"] = False
        status_info["overall_status"] = "OFFLINE"
        status_info["alerts"].append({
            "type": "danger",
            "title": "🔌 MẤT KẾT NỐI VỚI MÁY IN (Offline)",
            "desc": f"Không thể kết nối đến máy in tại IP {RICOH_IP}: {e}",
            "guide": "Kiểm tra máy in đã bật công tắc nguồn chưa, kiểm tra dây cáp mạng LAN cắm sau máy in có sáng đèn tín hiệu không."
        })

    return status_info

HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trung Tâm Giám Sát & Báo Lỗi In Ấn - RICOH MP 5055</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-primary: #0a0e17;
            --bg-card: rgba(18, 26, 43, 0.75);
            --bg-hover: rgba(30, 41, 67, 0.85);
            --border: rgba(255, 255, 255, 0.08);
            --border-highlight: rgba(14, 165, 233, 0.4);
            --accent-cyan: #0ea5e9;
            --accent-blue: #38bdf8;
            --accent-emerald: #10b981;
            --accent-amber: #f59e0b;
            --accent-rose: #f43f5e;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
            background-color: var(--bg-primary);
            background-image: 
                radial-gradient(at 10% 20%, rgba(14, 165, 233, 0.12) 0px, transparent 40%),
                radial-gradient(at 90% 80%, rgba(56, 189, 248, 0.08) 0px, transparent 40%);
            background-attachment: fixed;
            color: var(--text-primary);
            min-height: 100vh;
            padding: 24px 28px;
        }

        .container { max-width: 1440px; margin: 0 auto; }

        /* Header */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--border);
            margin-bottom: 24px;
        }

        .header-left { display: flex; align-items: center; gap: 16px; }

        .logo-badge {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 24px rgba(14, 165, 233, 0.35);
        }

        .logo-badge svg { width: 26px; height: 26px; fill: #ffffff; }

        .title-block h1 {
            font-size: 21px;
            font-weight: 800;
            letter-spacing: -0.5px;
            background: linear-gradient(to right, #ffffff, #cbd5e1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .title-block p { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }

        .header-actions { display: flex; gap: 12px; align-items: center; }

        .btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 9px 16px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            border: none;
        }

        .btn-primary {
            background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
            color: #ffffff;
            box-shadow: 0 4px 14px rgba(14, 165, 233, 0.3);
        }

        .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(14, 165, 233, 0.45);
        }

        .btn-secondary {
            background: rgba(255, 255, 255, 0.06);
            color: var(--text-primary);
            border: 1px solid var(--border);
        }

        .btn-secondary:hover { background: rgba(255, 255, 255, 0.1); }

        /* Hardware Alert Banner */
        .alerts-section {
            margin-bottom: 24px;
        }

        .alert-card {
            border-radius: 16px;
            padding: 18px 22px;
            margin-bottom: 12px;
            display: flex;
            align-items: flex-start;
            gap: 16px;
            border: 1px solid transparent;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
            animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-8px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .alert-card.warning {
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(180, 83, 9, 0.06) 100%);
            border-color: rgba(245, 158, 11, 0.35);
        }

        .alert-card.danger {
            background: linear-gradient(135deg, rgba(244, 63, 94, 0.14) 0%, rgba(159, 18, 57, 0.06) 100%);
            border-color: rgba(244, 63, 94, 0.4);
        }

        .alert-card.success {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 95, 70, 0.06) 100%);
            border-color: rgba(16, 185, 129, 0.35);
        }

        .alert-icon {
            font-size: 26px;
            line-height: 1;
            flex-shrink: 0;
            margin-top: 2px;
        }

        .alert-body { flex: 1; }

        .alert-title {
            font-size: 15.5px;
            font-weight: 800;
            margin-bottom: 4px;
        }

        .alert-card.warning .alert-title { color: #fbbf24; }
        .alert-card.danger .alert-title { color: #fb7185; }
        .alert-card.success .alert-title { color: #34d399; }

        .alert-desc {
            font-size: 13px;
            color: var(--text-secondary);
            margin-bottom: 8px;
        }

        .alert-guide {
            background: rgba(0, 0, 0, 0.25);
            border-left: 3px solid;
            padding: 8px 14px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .alert-card.warning .alert-guide { border-left-color: var(--accent-amber); }
        .alert-card.danger .alert-guide { border-left-color: var(--accent-rose); }
        .alert-card.success .alert-guide { border-left-color: var(--accent-emerald); }

        /* Tray Status Bar */
        .tray-bar {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 12px;
            margin-bottom: 24px;
        }

        .tray-item {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 12px 14px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            transition: all 0.2s;
        }

        .tray-item:hover { border-color: var(--border-highlight); }

        .tray-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .tray-name {
            font-size: 12px;
            font-weight: 700;
            color: var(--text-secondary);
            text-transform: uppercase;
        }

        .tray-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }

        .dot-ready { background-color: #10b981; box-shadow: 0 0 8px #10b981; }
        .dot-empty { background-color: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
        .dot-danger { background-color: #f43f5e; box-shadow: 0 0 8px #f43f5e; }

        .tray-size { font-size: 16px; font-weight: 800; color: #ffffff; }

        .tray-status-text { font-size: 11.5px; font-weight: 600; }
        .text-ready { color: #34d399; }
        .text-empty { color: #fbbf24; }

        /* KPI Cards */
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 24px;
        }

        .kpi-card {
            background: var(--bg-card);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 18px 20px;
        }

        .kpi-label {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .kpi-value {
            font-size: 30px;
            font-weight: 800;
            color: #ffffff;
            margin: 6px 0 2px;
            letter-spacing: -0.5px;
        }

        .kpi-sub { font-size: 11.5px; color: var(--text-muted); }

        /* Main Grid */
        .main-grid {
            display: grid;
            grid-template-columns: 2.85fr 1.15fr;
            gap: 24px;
        }

        .panel {
            background: var(--bg-card);
            backdrop-filter: blur(14px);
            border: 1px solid var(--border);
            border-radius: 18px;
            padding: 22px;
        }

        .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 18px;
        }

        .panel-title {
            font-size: 15.5px;
            font-weight: 700;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .search-box { position: relative; width: 320px; }

        .search-box input {
            width: 100%;
            padding: 9px 14px 9px 36px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border);
            border-radius: 10px;
            color: #ffffff;
            font-size: 13px;
            outline: none;
            transition: all 0.2s;
        }

        .search-box input:focus {
            border-color: var(--accent-cyan);
            background: rgba(255, 255, 255, 0.08);
            box-shadow: 0 0 12px rgba(14, 165, 233, 0.2);
        }

        .search-box svg {
            position: absolute;
            left: 11px;
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            height: 16px;
            fill: var(--text-muted);
        }

        /* Table */
        .table-wrap {
            overflow-x: auto;
            border-radius: 12px;
            border: 1px solid var(--border);
        }

        table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }

        th {
            background: rgba(255, 255, 255, 0.04);
            color: var(--text-secondary);
            font-weight: 600;
            padding: 12px 16px;
            border-bottom: 1px solid var(--border);
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
        }

        td { padding: 13px 16px; border-bottom: 1px solid var(--border); color: var(--text-primary); }

        tr:last-child td { border-bottom: none; }
        tr:hover td { background-color: var(--bg-hover); }

        .badge-user {
            display: inline-flex;
            align-items: center;
            padding: 4px 10px;
            border-radius: 6px;
            background: rgba(14, 165, 233, 0.12);
            color: #38bdf8;
            font-weight: 700;
            font-size: 12px;
        }

        .badge-pages {
            font-weight: 800;
            color: #f1f5f9;
            background: rgba(255, 255, 255, 0.08);
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 12px;
        }

        .badge-success {
            color: #34d399;
            background: rgba(16, 185, 129, 0.12);
            padding: 3px 8px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 11.5px;
        }

        .doc-title {
            font-weight: 600;
            color: #ffffff;
            max-width: 400px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* Leaderboard */
        .leaderboard-list { display: flex; flex-direction: column; gap: 10px; }

        .leader-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 14px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border);
            border-radius: 12px;
        }

        .leader-left { display: flex; align-items: center; gap: 12px; }

        .leader-rank {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.08);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11.5px;
            font-weight: 800;
            color: var(--text-secondary);
        }

        .rank-1 { background: #eab308; color: #000; }
        .rank-2 { background: #94a3b8; color: #000; }
        .rank-3 { background: #b45309; color: #fff; }

        .leader-name { font-weight: 700; font-size: 13.5px; color: #ffffff; }
        .leader-pages { font-weight: 800; font-size: 14px; color: var(--accent-cyan); text-align: right; }
        .leader-jobs { font-size: 11px; color: var(--text-muted); text-align: right; }

        .spinner {
            width: 30px;
            height: 30px;
            border: 3px solid rgba(255,255,255,0.1);
            border-top-color: var(--accent-cyan);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 10px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <header class="header">
            <div class="header-left">
                <div class="logo-badge">
                    <svg viewBox="0 0 24 24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
                </div>
                <div class="title-block">
                    <h1>TRUNG TÂM GIÁM SÁT & BÁO LỖI MÁY IN SHOWROOM</h1>
                    <p>RICOH MP 5055 • IP: 192.168.10.239 • Tự động chẩn đoán lỗi phần cứng & giải pháp xử lý</p>
                </div>
            </div>
            <div class="header-actions">
                <button class="btn btn-secondary" onclick="exportExcel()">
                    <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                    Xuất File Excel
                </button>
                <button class="btn btn-primary" onclick="loadAll()">
                    <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                    Quét Lỗi & Làm Mới
                </button>
            </div>
        </header>

        <!-- Hardware Alerts Section (Cảnh báo & Hướng dẫn xử lý lỗi) -->
        <section class="alerts-section" id="alertsContainer">
            <!-- Dynamic alerts inserted here -->
        </section>

        <!-- Tray & Hardware Status Bar (Trạng thái các khay giấy & Hộp mực) -->
        <section class="tray-bar" id="trayBarContainer">
            <!-- Trays inserted here -->
        </section>

        <!-- KPI Cards -->
        <section class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-label">Tổng Lệnh In Đã Quét</div>
                <div class="kpi-value" id="kpi-total-jobs">--</div>
                <div class="kpi-sub">Bộ nhớ máy in Ricoh MP 5055</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Tổng Số Trang Giấy</div>
                <div class="kpi-value" id="kpi-total-pages" style="color: var(--accent-cyan)">--</div>
                <div class="kpi-sub">Số trang A4 tiêu thụ</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Thiết Bị In Nhiều Nhất</div>
                <div class="kpi-value" id="kpi-top-user" style="font-size:22px; color: #38bdf8;">--</div>
                <div class="kpi-sub" id="kpi-top-pages">-- trang</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Tổng Bộ Đếm Ricoh (Counter)</div>
                <div class="kpi-value" style="color: #10b981;">402,527</div>
                <div class="kpi-sub">Tổng tích lũy toàn showroom</div>
            </div>
        </section>

        <!-- Main Layout -->
        <div class="main-grid">
            <!-- Left: Table of Jobs -->
            <div class="panel">
                <div class="panel-header">
                    <div class="panel-title">
                        <span>Lịch Sử In Ấn Chi Tiết Từng TVBH</span>
                    </div>
                    <div class="search-box">
                        <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                        <input type="text" id="searchInput" placeholder="Tìm tên TVBH, số hợp đồng, tài liệu..." onkeyup="filterTable()">
                    </div>
                </div>

                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 70px;">MÃ JOB</th>
                                <th style="width: 140px;">THIẾT BỊ / TVBH</th>
                                <th>TÊN TÀI LIỆU ĐÃ IN</th>
                                <th style="width: 90px; text-align: center;">SỐ TRANG</th>
                                <th style="width: 130px;">THỜI GIAN</th>
                                <th style="width: 95px;">TRẠNG THÁI</th>
                            </tr>
                        </thead>
                        <tbody id="jobsTableBody">
                            <tr><td colspan="6" style="text-align:center;padding:30px;"><div class="spinner"></div>Đang tải dữ liệu...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Right: Leaderboard -->
            <div class="panel">
                <div class="panel-header">
                    <div class="panel-title">Xếp Hạng Tiêu Thụ Giấy In</div>
                </div>
                <div class="leaderboard-list" id="leaderboardBody"></div>
            </div>
        </div>
    </div>

    <script>
        let allJobs = [];

        async function loadAll() {
            loadStatus();
            loadJobs();
        }

        async function loadStatus() {
            try {
                const res = await fetch('/api/status');
                const st = await res.json();
                renderStatus(st);
            } catch (e) {
                console.error("Lỗi tải status:", e);
            }
        }

        function renderStatus(st) {
            const container = document.getElementById('alertsContainer');
            if (!st.alerts || st.alerts.length === 0) {
                container.innerHTML = `
                    <div class="alert-card success">
                        <div class="alert-icon">✅</div>
                        <div class="alert-body">
                            <div class="alert-title">MÁY IN HOẠT ĐỘNG HOÀN HẢO (All Systems Normal)</div>
                            <div class="alert-desc">Không có lỗi kẹt giấy, nắp máy đã đóng kín, mực in đầy đủ và sẵn sàng nhận lệnh in.</div>
                            <div class="alert-guide">👉 Bạn và các TVBH có thể in tài liệu bình thường.</div>
                        </div>
                    </div>
                `;
            } else {
                container.innerHTML = st.alerts.map(a => `
                    <div class="alert-card ${a.type}">
                        <div class="alert-icon">${a.type === 'danger' ? '🚨' : '⚠️'}</div>
                        <div class="alert-body">
                            <div class="alert-title">${a.title}</div>
                            <div class="alert-desc">${a.desc}</div>
                            <div class="alert-guide">👉 HƯỚNG DẪN XỬ LÝ: ${a.guide}</div>
                        </div>
                    </div>
                `).join('');
            }

            // Render Tray Bar
            const trayContainer = document.getElementById('trayBarContainer');
            if (st.trays) {
                let html = st.trays.map(t => {
                    const isReady = t.status === 'Sẵn sàng';
                    return `
                        <div class="tray-item">
                            <div class="tray-header">
                                <span class="tray-name">${t.name}</span>
                                <span class="tray-dot ${isReady ? 'dot-ready' : 'dot-empty'}"></span>
                            </div>
                            <div class="tray-size">${t.size}</div>
                            <div class="tray-status-text ${isReady ? 'text-ready' : 'text-empty'}">${t.status}</div>
                        </div>
                    `;
                }).join('');

                // Thêm ô Mực in
                html += `
                    <div class="tray-item">
                        <div class="tray-header">
                            <span class="tray-name">Hộp Mực Đen</span>
                            <span class="tray-dot dot-ready"></span>
                        </div>
                        <div class="tray-size">Toner</div>
                        <div class="tray-status-text text-ready">Đủ mực (${st.toner})</div>
                    </div>
                `;
                trayContainer.innerHTML = html;
            }
        }

        async function loadJobs() {
            const tbody = document.getElementById('jobsTableBody');
            try {
                const res = await fetch('/api/jobs');
                const data = await res.json();
                allJobs = data.jobs || [];
                renderJobs(allJobs);
            } catch (err) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#ef4444;padding:30px;">Lỗi kết nối máy in: ${err.message}</td></tr>`;
            }
        }

        function renderJobs(jobs) {
            const tbody = document.getElementById('jobsTableBody');
            if (jobs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">Không có lệnh in nào.</td></tr>`;
                return;
            }

            let totalPages = 0;
            const userMap = {};

            tbody.innerHTML = jobs.map(j => {
                totalPages += (j.pages || 0);
                userMap[j.user] = (userMap[j.user] || 0) + (j.pages || 0);

                return `
                    <tr>
                        <td style="font-weight:700; color:var(--text-muted);">${j.id}</td>
                        <td><span class="badge-user">${j.user}</span></td>
                        <td><div class="doc-title" title="${j.document}">${j.document}</div></td>
                        <td style="text-align:center;"><span class="badge-pages">${j.pages} trang</span></td>
                        <td style="color:var(--text-secondary); font-size:12.5px;">${j.time}</td>
                        <td><span class="badge-success">${j.result}</span></td>
                    </tr>
                `;
            }).join('');

            document.getElementById('kpi-total-jobs').innerText = jobs.length;
            document.getElementById('kpi-total-pages').innerText = totalPages;

            const sortedUsers = Object.keys(userMap).map(u => ({ user: u, pages: userMap[u] }))
                .sort((a, b) => b.pages - a.pages);

            if (sortedUsers.length > 0) {
                document.getElementById('kpi-top-user').innerText = sortedUsers[0].user;
                document.getElementById('kpi-top-pages').innerText = `${sortedUsers[0].pages} trang`;
            }

            const leadBody = document.getElementById('leaderboardBody');
            leadBody.innerHTML = sortedUsers.map((u, idx) => {
                const rankClass = idx === 0 ? 'rank-1' : (idx === 1 ? 'rank-2' : (idx === 2 ? 'rank-3' : ''));
                return `
                    <div class="leader-item">
                        <div class="leader-left">
                            <div class="leader-rank ${rankClass}">${idx + 1}</div>
                            <div class="leader-name">${u.user}</div>
                        </div>
                        <div class="leader-stats">
                            <div class="leader-pages">${u.pages} trang</div>
                            <div class="leader-jobs">${Math.round((u.pages/totalPages)*100 || 0)}% tổng in</div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function filterTable() {
            const q = document.getElementById('searchInput').value.toLowerCase().trim();
            const filtered = allJobs.filter(j => 
                j.user.toLowerCase().includes(q) || 
                j.document.toLowerCase().includes(q) || 
                j.id.includes(q)
            );
            renderJobs(filtered);
        }

        function exportExcel() {
            window.location.href = '/api/export';
        }

        loadAll();
        setInterval(loadAll, 15000);
    </script>
</body>
</html>
"""

class RequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        try:
            parsed = urllib.parse.urlparse(self.path)
            if parsed.path == "/" or parsed.path == "/index.html":
                data = HTML_TEMPLATE.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Connection", "close")
                self.end_headers()
                self.wfile.write(data)
            elif parsed.path == "/api/jobs":
                jobs = fetch_ricoh_jobs()
                data = json.dumps({"jobs": jobs}, ensure_ascii=False).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Connection", "close")
                self.end_headers()
                self.wfile.write(data)
            elif parsed.path == "/api/status":
                st = get_printer_hardware_status()
                data = json.dumps(st, ensure_ascii=False).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Connection", "close")
                self.end_headers()
                self.wfile.write(data)
            elif parsed.path == "/api/export":
                jobs = fetch_ricoh_jobs()
                csv_content = "\ufeffMã Job,Thiết Bị / TVBH,Số Trang,Thời Gian,Trạng Thái,Tên Tài Liệu\n"
                for j in jobs:
                    doc = j["document"].replace('"', '""')
                    csv_content += f'"{j["id"]}","{j["user"]}","{j["pages"]}","{j["time"]}","{j["result"]}","{doc}"\n'
                data = csv_content.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/csv; charset=utf-8")
                self.send_header("Content-Disposition", "attachment; filename=Bao_Cao_In_An_Ricoh.csv")
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Connection", "close")
                self.end_headers()
                self.wfile.write(data)
            else:
                self.send_response(404)
                self.send_header("Connection", "close")
                self.end_headers()
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            pass

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

def start_server():
    server = ThreadedHTTPServer(("0.0.0.0", PORT), RequestHandler)
    print(f"Trung tâm giám sát & báo lỗi in ấn đã chạy tại: http://localhost:{PORT}")
    server.serve_forever()

if __name__ == "__main__":
    start_server()

