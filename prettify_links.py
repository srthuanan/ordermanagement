import os
import requests
import re
from dotenv import load_dotenv

load_dotenv()

# Config
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "https://jwvgxqrkjlbewvpkvucj.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

def get_headers():
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

def format_drive_link(url, label):
    """Chuyển link Drive sang định dạng HYPERLINK tải ngay"""
    if not url or "drive.google.com" not in url:
        return url
        
    # Tìm File ID linh hoạt cho cả link cũ (/d/) và link mới (id=)
    match = re.search(r'/d/([^/&?"]+)', url) or re.search(r'id=([^/&?"]+)', url)
    if not match:
        return url
        
    file_id = match.group(1)
    direct_url = f"https://drive.google.com/uc?export=download&id={file_id}"
    return f'=HYPERLINK("{direct_url}";"📄 {label}")'

def main():
    print("✨ ĐANG LÀM ĐẸP DỮ LIỆU DRIVE TRÊN SUPABASE & SHEETS...")
    
    # 1. Lấy toàn bộ dữ liệu đơn hàng đã chuyển Drive
    query_url = f"{SUPABASE_URL}/rest/v1/yeucauxhd?select=so_don_hang,url_hop_dong,url_de_nghi_xhd,url_hoa_don_da_xuat&or=(url_hop_dong.ilike.*drive.google.com*,url_de_nghi_xhd.ilike.*drive.google.com*,url_hoa_don_da_xuat.ilike.*drive.google.com*)"
    
    resp = requests.get(query_url, headers=get_headers())
    if resp.status_code != 200:
        print(f"Lỗi truy vấn: {resp.text}")
        return
        
    orders = resp.json()
    print(f"Tìm thấy {len(orders)} đơn hàng cần được làm đẹp link.")

    for i, order in enumerate(orders, 1):
        so_don_hang = order['so_don_hang']
        updates = {}
        
        # Format từng cột
        if order.get('url_hop_dong'):
            updates['url_hop_dong'] = format_drive_link(order['url_hop_dong'], "Hợp đồng")
            
        if order.get('url_de_nghi_xhd'):
            updates['url_de_nghi_xhd'] = format_drive_link(order['url_de_nghi_xhd'], "Đề nghị")
            
        if order.get('url_hoa_don_da_xuat'):
            updates['url_hoa_don_da_xuat'] = format_drive_link(order['url_hoa_don_da_xuat'], "Hóa đơn")

        # Kiểm tra xem có gì thực sự cần update không (tránh update lại cái đã đẹp)
        needs_update = False
        for k, v in updates.items():
            if v != order[k]:
                needs_update = True
                break
        
        if needs_update:
            print(f"[{i}/{len(orders)}] Đang làm đẹp đơn: {so_don_hang}")
            up_url = f"{SUPABASE_URL}/rest/v1/yeucauxhd?so_don_hang=eq.{so_don_hang}"
            requests.patch(up_url, headers=get_headers(), json=updates)
        else:
            print(f"[{i}/{len(orders)}] Đơn {so_don_hang} đã đẹp sẵn, bỏ qua.")

    print("\n✅ HOÀN TẤT 'LÀM ĐẸP' DỮ LIỆU!")
    print("Link trên bảng Google Sheets sẽ sớm được cập nhật về định dạng dễ nhìn và tải ngay.")

if __name__ == "__main__":
    main()
