import json
import time
import os
import argparse
from playwright.sync_api import sync_playwright

CONFIG_FILE = "dms_dealers_config.json"
DMS_URL = "https://vinfastdms.crm5.dynamics.com/"

def auto_login_dms(username, password, dealer_code="N31913", headless=True):
    """
    Tự động đăng nhập VinFast DMS qua Microsoft Azure AD (OAuth2/Dynamics 365)
    và trích xuất chuỗi Cookie kết nối OData API.
    """
    print(f"🚀 [PLAYWRIGHT] Đang khởi chạy trình duyệt ngầm để đăng nhập DMS (Đại lý {dealer_code})...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        try:
            print(f"🔗 Đang mở trang đăng nhập VinFast DMS: {DMS_URL}")
            page.goto(DMS_URL, timeout=45000, wait_until="domcontentloaded")
            time.sleep(2)

            # Step 1: Điền Username / Email Microsoft
            print("👤 Đang nhập Tên tài khoản / Email...")
            email_input = page.wait_for_selector('input[type="email"], input[name="loginfmt"]', timeout=15000)
            if email_input:
                email_input.fill(username)
                page.click('input[type="submit"], #idSIButton9')
                time.sleep(2)

            # Step 2: Điền Password
            print("🔑 Đang nhập Mật khẩu...")
            pass_input = page.wait_for_selector('input[type="password"], input[name="passwd"]', timeout=15000)
            if pass_input:
                pass_input.fill(password)
                page.click('input[type="submit"], #idSIButton9')
                time.sleep(3)

            # Step 3: Xử lý hỏi "Stay signed in?" (Duy trì đăng nhập)
            try:
                stay_signed_btn = page.wait_for_selector('input[type="submit"], #idSIButton9', timeout=5000)
                if stay_signed_btn:
                    print("🔘 Xác nhận duy trì đăng nhập (Stay signed in)...")
                    stay_signed_btn.click()
                    time.sleep(3)
            except Exception:
                pass

            # Step 4: Chờ chuyển hướng tới trang chủ VinFast DMS
            print("⏳ Đang chờ hệ thống VinFast DMS phê duyệt phiên làm việc...")
            page.wait_for_url(lambda url: "vinfastdms.crm5.dynamics.com" in url, timeout=30000)
            time.sleep(3)

            # Step 5: Trích xuất Cookies
            cookies = context.cookies()
            cookie_pairs = [f"{c['name']}={c['value']}" for c in cookies]
            cookie_string = "; ".join(cookie_pairs)

            if "CrmOwinAuth" in cookie_string or "ARRAffinity" in cookie_string:
                print(f"✅ ĐĂNG NHẬP THÀNH CÔNG! Đã trích xuất Cookie dài {len(cookie_string)} ký tự.")
                
                # Cập nhật Cookie vào dms_dealers_config.json
                update_dealer_cookie(dealer_code, cookie_string)
                browser.close()
                return True, cookie_string, f"Đăng nhập tự động thành công cho đại lý {dealer_code}"
            else:
                browser.close()
                return False, None, "Không tìm thấy Token CrmOwinAuth trong Cookie sau khi đăng nhập."

        except Exception as e:
            browser.close()
            err_msg = f"❌ Lỗi tự động đăng nhập DMS: {str(e)}"
            print(err_msg)
            return False, None, err_msg

def update_dealer_cookie(dealer_code, new_cookie):
    """Cập nhật Cookie mới vào file dms_dealers_config.json"""
    dealers = []
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                dealers = json.load(f)
        except Exception:
            dealers = []

    updated = False
    for d in dealers:
        if d.get("dealer_code") == dealer_code:
            d["cookie"] = new_cookie
            updated = True
            break

    if not updated:
        dealers.append({
            "dealer_code": dealer_code,
            "name": f"VinFast Showroom {dealer_code}",
            "cookie": new_cookie
        })

    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(dealers, f, indent=2, ensure_ascii=False)

    print(f"💾 Đã lưu Cookie mới của đại lý {dealer_code} vào file {CONFIG_FILE}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Tự động đăng nhập VinFast DMS lấy Cookie OData")
    parser.add_argument("--user", required=True, help="Email đăng nhập DMS")
    parser.add_argument("--pass", dest="password", required=True, help="Mật khẩu DMS")
    parser.add_argument("--dealer", default="N31913", help="Mã đại lý (vd: N31913)")
    parser.add_argument("--gui", action="store_true", help="Hiện giao diện trình duyệt khi chạy")

    args = parser.parse_args()
    success, cookie, msg = auto_login_dms(args.user, args.password, args.dealer, headless=not args.gui)
    if success:
        print(f"\n🎉 KẾT QUẢ: Thành công!\nCookie: {cookie[:100]}...")
    else:
        print(f"\n❌ KẾT QUẢ THẤT BẠI: {msg}")
