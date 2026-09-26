"""
Tự động đồng bộ và đẩy file PDF gốc của mọi phiếu CyberSoft (DNX, TD4) lên Supabase Storage.
Chạy ngầm trên máy tính văn phòng có cài đặt phần mềm CyberSoft ERP (D:\\CyberSoft).

Cách dùng:
- Chạy liên tục (mỗi 3 phút quét 1 lần):
    python scripts/watch_and_sync_cyber_pdfs.py
- Chạy 1 lần rồi thoát:
    python scripts/watch_and_sync_cyber_pdfs.py --once
"""
import sys
import os
import time
import argparse
from datetime import datetime

# Đảm bảo import được module từ thư mục scripts
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
if PROJECT_DIR not in sys.path:
    sys.path.insert(0, PROJECT_DIR)

from scripts.sync_thuan_an_allocations import (
    sync_missing_cyber_voucher_pdfs,
    sync_cyber_voucher_tickets_to_supabase,
    cleanup_old_cyber_pdfs_from_supabase
)

_cycle_count = 0

def run_sync_cycle(limit=60, max_export=30, cleanup_days=30):
    global _cycle_count
    _cycle_count += 1
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n=======================================================", file=sys.stderr)
    print(f"[{now_str}] 🚀 Bắt đầu chu kỳ quét phiếu mới từ CyberSoft...", file=sys.stderr)
    print(f"=======================================================", file=sys.stderr)
    
    # 1. Đồng bộ dữ liệu phiếu vào bảng cyber_voucher_tickets trên Supabase
    try:
        res_vouchers = sync_cyber_voucher_tickets_to_supabase(params={"limit": limit})
        print(f"[{now_str}] 📋 Đồng bộ metadata: {res_vouchers.get('updated', 0)} phiếu được cập nhật.", file=sys.stderr)
    except Exception as ex:
        print(f"[{now_str}] ⚠️ Lỗi cập nhật metadata: {ex}", file=sys.stderr)

    # 2. Quét và kết xuất các file PDF còn thiếu đẩy lên Supabase Storage
    try:
        res_pdfs = sync_missing_cyber_voucher_pdfs(limit=limit, max_export=max_export)
        scanned = res_pdfs.get('scanned', 0)
        missing = res_pdfs.get('missing_found', 0)
        exported = res_pdfs.get('exported', 0)
        print(f"[{now_str}] 📄 Kết quả kiểm tra PDF: Đã quét {scanned} phiếu | Thiếu {missing} | Đã xuất thành công {exported} phiếu lên Cloud.", file=sys.stderr)
    except Exception as ex:
        print(f"[{now_str}] ❌ Lỗi kết xuất PDF: {ex}", file=sys.stderr)

    # 3. Tự động dọn dẹp các file PDF cũ quá hạn trên Supabase Storage (chạy định kỳ mỗi 50 chu kỳ ~ 12-15 phút)
    if _cycle_count % 50 == 1:
        try:
            res_clean = cleanup_old_cyber_pdfs_from_supabase(max_days=cleanup_days)
            deleted = res_clean.get("deleted_count", 0)
            if deleted > 0:
                print(f"[{now_str}] 🧹 Tự động dọn dẹp: Đã xóa {deleted} file PDF cũ hơn {cleanup_days} ngày trên Supabase Storage.", file=sys.stderr)
            else:
                print(f"[{now_str}] 🧹 Kiểm tra dọn dẹp: Không có file PDF nào cũ hơn {cleanup_days} ngày.", file=sys.stderr)
        except Exception as ex_clean:
            print(f"[{now_str}] ⚠️ Lỗi dọn dẹp file cũ: {ex_clean}", file=sys.stderr)

    print(f"[{now_str}] ✅ Chu kỳ hoàn tất!\n", file=sys.stderr)

def main():
    parser = argparse.ArgumentParser(description="CyberSoft Voucher PDF Auto-Sync Watcher")
    parser.add_argument("--once", action="store_true", help="Chạy một lần rồi thoát thay vì lặp vô tận")
    parser.add_argument("--interval", type=int, default=15, help="Thời gian chờ giữa các lần quét (giây, mặc định 15s)")
    parser.add_argument("--limit", type=int, default=30, help="Số lượng phiếu gần nhất cần quét (mặc định 30)")
    parser.add_argument("--max-export", type=int, default=10, help="Số lượng phiếu tối đa kết xuất trong một lần quét (mặc định 10)")
    parser.add_argument("--cleanup-days", type=int, default=30, help="Số ngày tối đa giữ file PDF trên Supabase Storage trước khi tự xóa dọn dẹp (mặc định 30 ngày)")
    args = parser.parse_args()

    print("==================================================================", file=sys.stderr)
    print("   CYBERSOFT VOUCHER PDF AUTO-SYNC DAEMON (THUẬN AN / VẠN ĐÀO)   ", file=sys.stderr)
    print("==================================================================", file=sys.stderr)
    print(f"Interval: {args.interval}s | Quét: {args.limit} phiếu gần nhất | Tối đa xuất: {args.max_export} phiếu/lần\n", file=sys.stderr)

    if args.once:
        run_sync_cycle(limit=args.limit, max_export=args.max_export, cleanup_days=args.cleanup_days)
        return

    while True:
        try:
            run_sync_cycle(limit=args.limit, max_export=args.max_export, cleanup_days=args.cleanup_days)
        except KeyboardInterrupt:
            print("\n[Watcher] ⏹️ Đã dừng tiến trình theo yêu cầu người dùng.", file=sys.stderr)
            break
        except Exception as e:
            print(f"[Watcher Exception]: {e}", file=sys.stderr)

        print(f"[Watcher] ⏳ Đang chờ {args.interval} giây cho chu kỳ tiếp theo... (Bấm Ctrl+C để dừng)", file=sys.stderr)
        try:
            time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\n[Watcher] ⏹️ Đã dừng tiến trình theo yêu cầu người dùng.", file=sys.stderr)
            break

if __name__ == "__main__":
    main()
