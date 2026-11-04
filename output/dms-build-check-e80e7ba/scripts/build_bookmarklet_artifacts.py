# -*- coding: utf-8 -*-
import urllib.parse

def main():
    with open("scripts/bookmarklet_dms_bulk_testdrive.js", "r", encoding="utf-8") as f:
        js_code = f.read()

    # Nén bỏ comment 1 dòng và khoảng trắng dư thừa
    lines = []
    for line in js_code.splitlines():
        trimmed = line.strip()
        if not trimmed or trimmed.startswith("//"):
            continue
        lines.append(trimmed)
    
    compact_code = " ".join(lines)
    # Bookmarklet URL
    bookmarklet_url = "javascript:" + urllib.parse.quote(compact_code)

    with open("scripts/bookmarklet_dms_bulk_testdrive_oneliner.txt", "w", encoding="utf-8") as f:
        f.write(compact_code)

    # Cập nhật cai_dat_bookmarklet_nhap_lai_thu.html
    html_content = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Cài Đặt Tool Nhập Hàng Loạt Lịch Lái Thử VinFast DMS</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #090d16;
      color: #f1f5f9;
      padding: 40px 20px;
      display: flex;
      justify-content: center;
    }}
    .card {{
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 16px;
      padding: 30px;
      max-width: 650px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
    }}
    h1 {{
      font-size: 20px;
      color: #38bdf8;
      margin-top: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }}
    .badge {{
      display: inline-block;
      background: #0284c7;
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      margin-bottom: 15px;
    }}
    .button-drag {{
      display: inline-block;
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 14px;
      box-shadow: 0 4px 15px rgba(2, 132, 199, 0.4);
      cursor: grab;
      margin: 15px 0;
      border: 1px solid #38bdf8;
    }}
    .button-drag:hover {{
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(2, 132, 199, 0.6);
    }}
    pre {{
      background: #0b1120;
      border: 1px solid #1e293b;
      padding: 12px;
      border-radius: 8px;
      font-size: 11px;
      overflow-x: auto;
      color: #94a3b8;
      max-height: 120px;
    }}
    .step {{
      background: #1e293b;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 12px;
    }}
    .step-num {{
      color: #38bdf8;
      font-weight: 800;
      margin-right: 6px;
    }}
    .copy-btn {{
      background: #334155;
      color: #f8fafc;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      margin-top: 6px;
    }}
    .copy-btn:hover {{
      background: #475569;
    }}
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">PHIÊN BẢN CHUẨN XÁC 100% (STATUS 204)</span>
    <h1>🚗 Tool Nhập Hàng Loạt Lịch Lái Thử DMS</h1>
    <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
      Tự động nhận diện và chọn sẵn sự kiện <strong>N31913-TDE-1026-0001 (Thu xăng đổi điện)</strong>, nguồn lực xe lái thử chuẩn Thuận An và hỗ trợ dán danh sách hàng chục khách hàng từ Excel để nhập tự động 1-chạm.
    </p>

    <div class="step">
      <div><span class="step-num">CÁCH 1:</span> <strong>Kéo thả nút này lên thanh Dấu trang (Bookmark Bar) của trình duyệt</strong></div>
      <div style="text-align: center;">
        <a class="button-drag" href="{bookmarklet_url}">🚗 DMS Nhập Lái Thử</a>
      </div>
      <div style="font-size: 11px; color: #64748b; text-align: center;">(Bấm giữ chuột và kéo thả nút xanh lên thanh bookmark của Chrome/Edge)</div>
    </div>

    <div class="step">
      <div><span class="step-num">CÁCH 2:</span> <strong>Copy mã dán thẳng vào Console (F12) trên trang DMS</strong></div>
      <pre id="code-box">{compact_code}</pre>
      <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('code-box').innerText); alert('Đã copy mã! Hãy sang tab VinFast DMS, bấm F12 -> Console -> Dán (Ctrl+V) -> Enter.');">📋 Copy toàn bộ mã</button>
    </div>
  </div>
</body>
</html>
"""
    with open("scripts/cai_dat_bookmarklet_nhap_lai_thu.html", "w", encoding="utf-8") as f:
        f.write(html_content)

    print("Đã tạo xong bookmarklet_dms_bulk_testdrive_oneliner.txt và cai_dat_bookmarklet_nhap_lai_thu.html thành công!")

if __name__ == "__main__":
    main()
