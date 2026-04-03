"""
Script đẩy tất cả file PDF từ Supabase Storage sang Google Drive.
Sử dụng Google Apps Script (GAS) web app làm trung gian → KHÔNG cần credentials.json!

Cách chạy:
  python upload_pdfs_to_drive.py

Yêu cầu:  pip install requests python-dotenv
"""

import os
import sys
import time
import json
import requests
from urllib.parse import quote
from dotenv import load_dotenv

# ─── CONFIG ───────────────────────────────────────────────────────────────────
load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "https://jwvgxqrkjlbewvpkvucj.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv(
    "SUPABASE_SERVICE_KEY",
    os.getenv("VITE_SUPABASE_SERVICE_KEY", "")
)
BUCKET_NAME = "yeucauxhd-files"

# GAS Web App URL (dùng làm trung gian để upload lên Drive)
GAS_URL = "https://script.google.com/macros/s/AKfycbxPTJ-TuiuxX7KX07Wrj37fE0BkhBHssT2ndv1NLRfWRjuotoTo2-k74zyGlvHRHkWizQ/exec"


# ─── SUPABASE STORAGE HELPERS ─────────────────────────────────────────────────

def supabase_headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }


def list_all_files_in_bucket(prefix=""):
    """Liệt kê tất cả file trong bucket (đệ quy qua các folder)."""
    all_files = []
    _list_recursive(prefix, all_files)
    return all_files


def _list_recursive(prefix, result_list):
    """Đệ quy liệt kê file và folder."""
    url = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET_NAME}"
    payload = {
        "prefix": prefix,
        "limit": 1000,
        "offset": 0,
        "sortBy": {"column": "name", "order": "asc"},
    }
    resp = requests.post(url, headers=supabase_headers(), json=payload)

    if resp.status_code != 200:
        print(f"  ⚠ Lỗi khi list prefix='{prefix}': {resp.status_code} {resp.text}")
        return

    items = resp.json()
    for item in items:
        item_name = item.get("name", "")
        item_id = item.get("id")  # folder thì id = None
        full_path = f"{prefix}/{item_name}" if prefix else item_name

        if item_id is None:
            # Đây là folder → đệ quy vào
            _list_recursive(full_path, result_list)
        else:
            # Đây là file
            result_list.append({
                "name": item_name,
                "path": full_path,
                "metadata": item.get("metadata", {}),
            })


def get_public_url(file_path):
    """Tạo public URL cho file trên Supabase Storage."""
    encoded_path = quote(file_path, safe="/")
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{encoded_path}"


# ─── GAS DRIVE UPLOAD ────────────────────────────────────────────────────────

def upload_via_gas(public_url, file_name, sub_folder="", max_retries=3):
    """
    Gọi GAS web app để fetch PDF từ Supabase URL và lưu vào Google Drive.
    GAS sẽ tự fetch file → lưu Drive → trả về link.
    """
    params = {
        "action": "fetchSupabasePdfToDrive",
        "pdfUrl": public_url,
        "fileName": file_name,
        "subFolder": sub_folder,
    }

    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.post(
                GAS_URL,
                params=params,
                timeout=120,  # GAS có thể mất vài giây để fetch + save
                allow_redirects=True,
            )

            if resp.status_code == 200:
                try:
                    data = resp.json()
                    return data
                except json.JSONDecodeError:
                    # GAS đôi khi trả về HTML (redirect page)
                    if "Moved Temporarily" in resp.text or "REDIRECT" in resp.text:
                        if attempt < max_retries:
                            time.sleep(2)
                            continue
                    return {"status": "ERROR", "message": f"Response không phải JSON: {resp.text[:200]}"}
            else:
                if attempt < max_retries:
                    time.sleep(2)
                    continue
                return {"status": "ERROR", "message": f"HTTP {resp.status_code}"}

        except requests.exceptions.Timeout:
            if attempt < max_retries:
                print(f"    ⏳ Timeout, thử lại ({attempt}/{max_retries})...")
                time.sleep(3)
                continue
            return {"status": "ERROR", "message": "Timeout sau nhiều lần thử"}

        except requests.exceptions.RequestException as e:
            if attempt < max_retries:
                time.sleep(2)
                continue
            return {"status": "ERROR", "message": str(e)}

    return {"status": "ERROR", "message": "Hết số lần thử"}


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  📄 SUPABASE → GOOGLE DRIVE (via GAS)")
    print("  Không cần credentials.json!")
    print("=" * 60)

    # 1. Liệt kê tất cả file trên Supabase Storage
    print(f"\n📋 Đang liệt kê file trong bucket '{BUCKET_NAME}'...")
    all_files = list_all_files_in_bucket()

    # Filter chỉ lấy PDF
    pdf_files = [f for f in all_files if f["name"].lower().endswith(".pdf")]
    total_size = sum(f.get("metadata", {}).get("size", 0) for f in pdf_files)

    print(f"  ✓ Tìm thấy {len(pdf_files)} file PDF ({total_size / 1024 / 1024:.1f} MB)")
    print(f"  ✓ Tổng file: {len(all_files)}")

    if not pdf_files:
        print("\n⚠ Không tìm thấy file PDF nào trong bucket!")
        return

    # 2. Upload từng file qua GAS
    success_count = 0
    skip_count = 0
    fail_count = 0
    failed_files = []

    for i, pdf in enumerate(pdf_files, 1):
        file_path = pdf["path"]
        file_name = pdf["name"]
        file_size = pdf.get("metadata", {}).get("size", 0)

        # Xác định sub-folder (phần đầu tiên của path, thường là số đơn hàng)
        path_parts = file_path.split("/")
        sub_folder = path_parts[0] if len(path_parts) > 1 else ""

        print(f"\n[{i}/{len(pdf_files)}] {file_path} ({file_size / 1024:.0f} KB)")

        # Tạo public URL
        public_url = get_public_url(file_path)

        # Upload qua GAS
        print(f"  ⬆ Đang upload qua GAS...")
        result = upload_via_gas(public_url, file_name, sub_folder)

        status = result.get("status", "ERROR")
        message = result.get("message", "")

        if status == "SUCCESS":
            drive_url = result.get("driveUrl", "")
            print(f"  ✓ Thành công! {drive_url}")
            success_count += 1
        elif status == "SKIPPED":
            print(f"  ⏭ Đã tồn tại trên Drive, bỏ qua")
            skip_count += 1
        else:
            print(f"  ✗ Lỗi: {message}")
            fail_count += 1
            failed_files.append(file_path)

        # Rate limiting - GAS cần thời gian nghỉ
        if i < len(pdf_files):
            time.sleep(1.5)

    # 3. Summary
    print("\n" + "=" * 60)
    print(f"  📊 KẾT QUẢ")
    print(f"     ✓ Upload thành công: {success_count}")
    print(f"     ⏭ Đã tồn tại (bỏ qua): {skip_count}")
    print(f"     ✗ Thất bại: {fail_count}")
    print(f"     📄 Tổng PDF: {len(pdf_files)}")
    print("=" * 60)

    if failed_files:
        print("\n❌ Các file thất bại:")
        for f in failed_files:
            print(f"   • {f}")
        print("\nBạn có thể chạy lại script - các file đã upload sẽ được bỏ qua tự động.")


if __name__ == "__main__":
    main()
