import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "https://jwvgxqrkjlbewvpkvucj.supabase.co")
SUPABASE_KEY = os.environ.get(
    "VITE_SUPABASE_SERVICE_KEY",
    os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY") or "sb_publishable_0lT3OnREc0Qg1R9s672KBg_aDeBTdJX"
)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

# Bảng tra cứu chuẩn VinFast DMS
DMS_MAP = {
    ("VF 3", "PLUS"): "TI1BV",
    ("VF 3", "ECO"): "TI1CV",
    ("VF 3", "BASE"): "GI10V",
    ("VF 5", "PLUS"): "GA1RV",
    ("VF 5", "ECO"): "GA1KV",
    ("VF 6", "PLUS"): "JB12V",
    ("VF 6", "ECO"): "JB10V",
    ("VF 6", "BASE"): "JB10V",
    ("VF 7", "PLUS"): "GC12V",
    ("VF 7", "ECO"): "HC1BV",
    ("VF 7", "BASE"): "HC1BV",
    ("VF 8", "PLUS"): "ND32V",
    ("VF 8", "ECO"): "ND31V",
    ("VF 8", "BASE"): "HC11V",
    ("VF 9", "PLUS"): "NE3MV",
    ("VF 9", "ECO"): "NE3LV",
    ("EC VAN", "BASE"): "TG10V",
    ("EC VAN", "PLUS"): "TG11V",
    ("EC VAN", "SLIDING"): "TG12V",
    ("LIMO", "LIMO"): "SL1VV",
    ("LIMO", "MPV7"): "SL1WV",
    ("VF 2", "ECO"): "TH14V",
    ("VF 2", "MINIO"): "TH13V",
    ("VF E34", "BASE"): "GK1DI",
}

def normalize_model(m):
    if not m: return ""
    m = m.strip().upper()
    if "VF3" in m or "VF 3" in m: return "VF 3"
    if "VF5" in m or "VF 5" in m: return "VF 5"
    if "VF6" in m or "VF 6" in m: return "VF 6"
    if "VF7" in m or "VF 7" in m: return "VF 7"
    if "VF8" in m or "VF 8" in m: return "VF 8"
    if "VF9" in m or "VF 9" in m: return "VF 9"
    if "VAN" in m: return "EC VAN"
    if "LIMO" in m: return "LIMO"
    if "MINIO" in m or "VF2" in m or "VF 2" in m: return "VF 2"
    if "E34" in m: return "VF E34"
    return m

def normalize_ver(v):
    if not v: return "PLUS"
    v = v.strip().upper()
    if "SLIDING" in v or "TRUOT" in v: return "SLIDING"
    if "ECO" in v: return "ECO"
    if "BASE" in v or "TIEU CHUAN" in v or "STD" in v: return "BASE"
    if "MPV" in v or "7 CHO" in v: return "MPV7"
    if "LIMO" in v: return "LIMO"
    if "MINIO" in v: return "MINIO"
    return "PLUS"

def resolve_code(dong_xe, phien_ban, raw_code):
    if raw_code and len(raw_code.strip()) in [5, 6]:
        return raw_code.strip().upper()
    
    # Bóc từ ngoặc đơn nếu có
    if phien_ban and "(" in phien_ban and ")" in phien_ban:
        import re
        m = re.search(r'\(([A-Z0-9]{4,6})\)', phien_ban.upper())
        if m:
            return m.group(1)
            
    m_norm = normalize_model(dong_xe)
    v_norm = normalize_ver(phien_ban)
    return DMS_MAP.get((m_norm, v_norm)) or DMS_MAP.get((m_norm, "PLUS")) or ""

def backfill():
    print("🚀 Đang kiểm tra danh sách kho xe trên Supabase...")
    res = requests.get(f"{SUPABASE_URL}/rest/v1/khoxe?select=id,vin,dong_xe,phien_ban,ma_phien_ban", headers=HEADERS)
    if res.status_code != 200:
        print("❌ Lỗi lấy kho xe:", res.text)
        return

    cars = res.json()
    print(f"📊 Tổng số xe trong kho: {len(cars)}")

    need_updates = []
    for c in cars:
        cur_code = (c.get("ma_phien_ban") or "").strip()
        expected_code = resolve_code(c.get("dong_xe"), c.get("phien_ban"), cur_code)
        if expected_code and expected_code != cur_code:
            need_updates.append((c.get("vin"), expected_code, c.get("dong_xe"), c.get("phien_ban")))

    print(f"🔍 Có {len(need_updates)} xe cần bổ sung/chuẩn hóa mã phiên bản DMS.")
    if not need_updates:
        print("✅ Tất cả xe trong kho đã có mã phiên bản chuẩn!")
        return

    success_cnt = 0
    for vin, code, dx, pb in need_updates:
        patch_res = requests.patch(
            f"{SUPABASE_URL}/rest/v1/khoxe?vin=eq.{vin}",
            headers=HEADERS,
            json={"ma_phien_ban": code}
        )
        if patch_res.status_code in [200, 204]:
            success_cnt += 1
            print(f"  + VIN {vin}: {dx} {pb} -> [{code}]")
        else:
            print(f"  x Lỗi update {vin}: {patch_res.text}")

    print(f"\n🎉 Hoàn tất cập nhật mã phiên bản cho {success_cnt}/{len(need_updates)} xe trong kho Supabase!")

if __name__ == "__main__":
    backfill()
