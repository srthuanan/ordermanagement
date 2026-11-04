import os
import requests
import json
import urllib.request
from dotenv import load_dotenv

load_dotenv()
token = os.environ.get('SUPABASE_ACCESS_TOKEN')
ref = 'jwvgxqrkjlbewvpkvucj'
GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzC8Zf7QdBuFdTV_-8COtDLuUAtFZoQ6pkNy9XF-b1tz6Z7puV1dorjhj-Fmf-zdC7Dvg/exec"

def run_query(sql):
    resp = requests.post(
        f"https://api.supabase.com/v1/projects/{ref}/database/query",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"query": sql},
        timeout=30
    )
    if resp.status_code >= 400:
        raise Exception(f"HTTP {resp.status_code}: {resp.text}")
    return resp.json()

def get_coc_rows_from_sheet():
    """Lấy danh sách tất cả các xe đã có ngày COC về từ Google Sheet RÚT COC."""
    js_code = """
    (function() {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName('RÚT COC');
      if (!sheet) return { success: false, error: 'Sheet not found' };
      var maxR = sheet.getLastRow();
      if (maxR < 3) return { success: true, rows: [] };
      
      // Col 5: VIN (E), Col 15: Ngày COC về (O)
      var vins = sheet.getRange(3, 5, maxR - 2, 1).getDisplayValues();
      var cocDates = sheet.getRange(3, 15, maxR - 2, 1).getDisplayValues();
      var result = [];
      
      for (var i = 0; i < vins.length; i++) {
        var v = String(vins[i][0] || '').trim().toUpperCase();
        var d = String(cocDates[i][0] || '').trim();
        if (v && d && v.length >= 10) {
          result.push({ vin: v, date: d });
        }
      }
      return { success: true, rows: result };
    })()
    """
    req = urllib.request.Request(
        GAS_WEBAPP_URL,
        data=json.dumps({"action": "EXECUTE_SCRIPT", "code": js_code}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        payload = res.get("data", {}) if isinstance(res.get("data"), dict) else res
        if payload.get("success"):
            return payload.get("rows", [])
    return []

if __name__ == "__main__":
    print("=== 1. Thêm cột ngay_coc_ve vào các bảng ===")
    sql_alter = """
    ALTER TABLE public.donhang ADD COLUMN IF NOT EXISTS ngay_coc_ve text;
    ALTER TABLE public.yeucauxhd ADD COLUMN IF NOT EXISTS ngay_coc_ve text;
    ALTER TABLE public.archived_orders ADD COLUMN IF NOT EXISTS ngay_coc_ve text;
    ALTER TABLE public.khoxe ADD COLUMN IF NOT EXISTS ngay_coc_ve text;
    ALTER TABLE public.thongtinxe ADD COLUMN IF NOT EXISTS ngay_coc_ve text;
    """
    res = run_query(sql_alter)
    print("Kết quả migration bảng:", res)

    print("\n=== 2. Lấy dữ liệu COC đã có từ Google Sheet RÚT COC ===")
    rows = get_coc_rows_from_sheet()
    print(f"Tìm thấy {len(rows)} xe đã có Ngày COC về trên Google Sheet:")
    for r in rows:
        print(f"  - VIN: {r['vin']} -> Ngày COC: {r['date']}")

    print("\n=== 3. Đồng bộ vào Supabase (donhang, yeucauxhd, archived_orders, khoxe) ===")
    updated_dh = 0
    updated_yêu = 0
    updated_arc = 0
    updated_kho = 0

    for r in rows:
        vin = r['vin']
        coc_date = r['date']
        
        # Format chuẩn chuỗi ngày dd/mm/yyyy
        # Bổ sung tag [COC về: dd/mm/yyyy] vào ghi_chu_admin nếu chưa có
        sql_sync = f"""
        UPDATE public.donhang 
        SET ngay_coc_ve = '{coc_date}' 
        WHERE upper(trim(vin)) = '{vin}';

        UPDATE public.yeucauxhd 
        SET ngay_coc_ve = '{coc_date}',
            ghi_chu_admin = CASE 
                WHEN ghi_chu_admin IS NULL OR ghi_chu_admin = '' THEN '[COC về: {coc_date}]'
                WHEN ghi_chu_admin LIKE '%COC về%' THEN ghi_chu_admin
                ELSE trim(ghi_chu_admin) || ' | [COC về: {coc_date}]'
            END
        WHERE upper(trim(vin)) = '{vin}';

        UPDATE public.archived_orders 
        SET ngay_coc_ve = '{coc_date}' 
        WHERE upper(trim(vin)) = '{vin}';

        UPDATE public.khoxe 
        SET ngay_coc_ve = '{coc_date}' 
        WHERE upper(trim(vin)) = '{vin}';
        """
        run_query(sql_sync)

    print("\n✅ Hoàn tất migration và đồng bộ toàn bộ dữ liệu COC về Supabase thành công!")

    print("\n=== 4. Khởi động lại tiến trình Zalo COC Watcher với tính năng mới ===")
    import subprocess
    pid_file = os.path.join(os.path.dirname(__file__), "zalo_coc_watcher.pid")
    if os.path.exists(pid_file):
        try:
            with open(pid_file, "r") as f:
                old_pid = int(f.read().strip())
            os.system(f"taskkill /PID {old_pid} /F >nul 2>&1")
        except Exception:
            pass
    pythonw = r"C:\Users\Pham Thanh Nhan\AppData\Local\Programs\Python\Python312\pythonw.exe"
    script = os.path.join(os.path.dirname(__file__), "zalo_coc_watcher.py")
    subprocess.Popen([pythonw, script], creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP)
    print("✅ Đã khởi động lại tiến trình Zalo COC Watcher chạy ngầm thành công!")
