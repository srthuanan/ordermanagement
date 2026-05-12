import os
import sys
import time
import json
import requests
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

# Cấu hình đường dẫn Profile Chrome dành riêng cho Automation để không bị trùng khóa file
AUTOMATION_PROFILE_DIR = os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\User Data DMS Automation")

# Cấu hình Supabase
SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"

def write_log(message):
    try:
        log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "autopilot_sync.log")
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(f"[{timestamp}] {message}\n")
    except Exception:
        pass

def get_chrome_options(headless=True):
    chrome_options = Options()
    chrome_options.add_argument(f"--user-data-dir={AUTOMATION_PROFILE_DIR}")
    chrome_options.add_argument("--profile-directory=Default")
    
    if headless:
        chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--disable-gpu")
        
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("useAutomationExtension", False)
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    
    return chrome_options

def run_login():
    """
    Chế độ đăng nhập: Mở trình duyệt có giao diện để người dùng đăng nhập và vượt MFA
    """
    print("============================================================")
    print("🔑 KHỞI ĐỘNG CHẾ ĐỘ ĐĂNG NHẬP DMS VINFAST")
    print("============================================================")
    print("👉 Trình duyệt Chrome riêng biệt sẽ hiện lên.")
    print("👉 Hãy đăng nhập tài khoản DMS và hoàn tất xác minh MFA trên điện thoại.")
    print("👉 Khi đăng nhập thành công vào trang chủ DMS, hãy quay lại đây nhấn Enter.")
    print("============================================================")
    
    options = get_chrome_options(headless=False)
    driver = webdriver.Chrome(options=options)
    
    try:
        driver.get("https://vinfastdms.crm5.dynamics.com/")
        input("\n[!] BẤM ENTER TẠI ĐÂY KHI BẠN ĐÃ ĐĂNG NHẬP THÀNH CÔNG VÀO DMS...")
        print("💾 Đã lưu phiên đăng nhập thành công! Đang đóng trình duyệt...")
    finally:
        driver.quit()

def execute_dms_sync(mode="full"):
    """
    Chế độ chạy ngầm: Tải ngầm trang DMS, thực thi JavaScript để lấy dữ liệu và đẩy Supabase
    """
    print(f"⚡ Đang chạy ngầm đồng bộ DMS (Chế độ: {mode.upper()})...")
    write_log(f"⚡ BẮT ĐẦU ĐỒNG BỘ AUTOPILOT (Chế độ: {mode.upper()})")
    
    options = get_chrome_options(headless=True)
    driver = webdriver.Chrome(options=options)
    
    try:
        driver.get("https://vinfastdms.crm5.dynamics.com/")
        time.sleep(12)  # Đợi 12 giây để trang và Xrm.WebApi tải xong hoàn toàn
        
        # Kiểm tra xem có đang ở trang đăng nhập không
        current_url = driver.current_url
        if "login" in current_url or "microsoft" in current_url:
            err_msg = "❌ Lỗi: Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập! Vui lòng mở Menu chọn số 1 để đăng nhập lại."
            print(err_msg)
            write_log(err_msg)
            return
            
        print("✅ Đã kết nối thành công vào DMS VinFast ẩn danh!")
        
        # Thực thi mã JavaScript để đồng bộ trực tiếp ngay trên phiên đăng nhập trình duyệt
        if mode == "gps_only" or mode == "full":
            sync_gps_via_browser(driver)
            
        if mode == "full":
            sync_data_via_browser(driver)
            
        write_log("🎉 Hoàn thành phiên đồng bộ autopilot thành công!")
            
    except Exception as e:
        err_msg = f"❌ Lỗi đồng bộ ngầm: {str(e)}"
        print(err_msg)
        write_log(err_msg)
    finally:
        driver.quit()

def sync_gps_via_browser(driver):
    """
    Quét tọa độ GPS thông qua Xrm.WebApi của trình duyệt và gửi lên Supabase
    """
    print("📍 Đang quét vị trí GPS ngầm...")
    
    # 1. Lấy danh sách số VIN cần quét từ Supabase
    try:
        res = requests.get(
            f"{SUPABASE_URL}/rest/v1/khoxe?select=vin",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
        )
        cars = res.json()
        vins = [c["vin"] for c in cars if c.get("vin")]
    except Exception as e:
        print(f"❌ Không thể lấy danh sách số VIN từ Supabase: {str(e)}")
        return
        
    if not vins:
        print("Không có số VIN nào cần quét.")
        return
        
    print(f"Tìm thấy {len(vins)} xe cần quét tọa độ GPS.")
    
    # 2. Thực hiện quét tọa độ GPS bằng cách gọi API của VinFast trực tiếp trong console Chrome
    js_code = """
    var callback = arguments[arguments.length - 1];
    var vins = arguments[0];
    var results = [];
    var limit = 15; // Quét đồng thời 15 xe một lúc để siêu nhanh
    var activeCount = 0;
    var index = 0;
    var finished = false;

    function scanVin(vin) {
        return new Promise(function(resolve) {
            var payload = {
                "itv_requestObject": JSON.stringify({
                    "data": [{"vinCode": vin}],
                    "isUpdate": false
                })
            };
            var req = new XMLHttpRequest();
            req.open("POST", "/api/data/v9.2/itv_trackingvehicleposition", true);
            req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
            req.setRequestHeader("Accept", "application/json");
            req.timeout = 10000; // Timeout 10s cho mỗi yêu cầu cá nhân
            req.onreadystatechange = function () {
                if (this.readyState === 4) {
                    if (this.status === 200) {
                        try {
                            var resData = JSON.parse(this.responseText);
                            var responseObj = JSON.parse(resData.itv_responseObject);
                            if (responseObj && responseObj.Lat && responseObj.Long) {
                                results.push({
                                    "vin": vin,
                                    "lat": parseFloat(responseObj.Lat),
                                    "lng": parseFloat(responseObj.Long),
                                    "updated_at": new Date().toISOString()
                                });
                            }
                        } catch (e) {}
                    }
                    resolve();
                }
            };
            req.ontimeout = function() { resolve(); };
            req.onerror = function() { resolve(); };
            req.send(JSON.stringify(payload));
        });
    }

    function next() {
        if (finished) return;
        if (index >= vins.length && activeCount === 0) {
            finished = true;
            callback(results);
            return;
        }
        while (activeCount < limit && index < vins.length) {
            var vin = vins[index++];
            activeCount++;
            scanVin(vin).then(function() {
                activeCount--;
                next();
            });
        }
    }
    next();
    """
    
    try:
        driver.set_script_timeout(60)
        telemetry_data = driver.execute_async_script(js_code, vins)
        
        if telemetry_data:
            # Gửi lên Supabase
            requests.post(
                f"{SUPABASE_URL}/rest/v1/car_telemetry",
                headers={
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "resolution=merge-duplicates"
                },
                json=telemetry_data
            )
            print(f"✅ Đã quét và cập nhật thành công {len(telemetry_data)} tọa độ xe lên Supabase!")
            write_log(f"📍 Đã quét và cập nhật thành công {len(telemetry_data)} vị trí GPS.")
        else:
            print("Không quét được tọa độ mới nào.")
            write_log("⚠️ Không quét được tọa độ GPS mới nào.")
    except Exception as e:
        err_msg = f"❌ Lỗi thực thi quét GPS trong trình duyệt: {str(e)}"
        print(err_msg)
        write_log(err_msg)

def sync_data_via_browser(driver):
    """
    Lấy dữ liệu Đơn hàng và Kho xe bằng Xrm.WebApi trực tiếp trong trình duyệt và gửi lên Supabase
    """
    print("📋 Đang đồng bộ Đơn hàng & Kho xe ngầm...")
    
    js_code = """
    var callback = arguments[arguments.length - 1];
    var data = { orders: [], inventory: [] };
    
    function getLookupName(item, field) {
        if (!item) return "";
        var f = field.toLowerCase();
        for (var k in item) {
            if (item.hasOwnProperty(k)) {
                var kl = k.toLowerCase();
                if (kl.indexOf(f) !== -1 && kl.indexOf('@odata.community.display.v1.formattedvalue') !== -1) {
                    return item[k];
                }
            }
        }
        for (var k in item) {
            if (item.hasOwnProperty(k)) {
                var kl = k.toLowerCase();
                if (kl.indexOf(f) !== -1 && kl.indexOf('_value') !== -1) {
                    return item[k];
                }
            }
        }
        return item[field] || "";
    }

    function isOpenStatus(status) {
        if (!status) return true;
        var s = status.toLowerCase();
        var openKeywords = ["mở", "open", "mới", "new", "draft", "nháp", "active", "hoạt động"];
        for (var i = 0; i < openKeywords.length; i++) {
            if (s.indexOf(openKeywords[i]) !== -1) return true;
        }
        return false;
    }

    // 1. Lấy đơn hàng bằng Xrm.WebApi
    Xrm.WebApi.retrieveMultipleRecords("xts_newvehiclesalesorder", "?$filter=statecode eq 0").then(
        function success(result) {
            data.orders = result.entities.filter(function(item) {
                var statusText = item["xts_status@OData.Community.Display.V1.FormattedValue"] || item["statuscode@OData.Community.Display.V1.FormattedValue"] || "";
                return isOpenStatus(statusText);
            }).map(function(item) {
                return {
                    new_vehicle_sales_order_id: item.xts_newvehiclesalesorderid || "",
                    kiem_tra_tong_cho_hang: "",
                    ngay_sua_doi: item.modifiedon || null,
                    ngay_giao_dich: item.xts_transactiondate ? new Date(item.xts_transactiondate).toISOString().split('T')[0] : null,
                    tu_van_ban_hang: getLookupName(item, "xts_salespersonid") || getLookupName(item, "ownerid") || "",
                    so_don_hang_ban: item.xts_newvehiclesalesordernumber || "",
                    so_bao_gia_xe: getLookupName(item, "xts_newvehiclesalesquoteid") || "",
                    ngay_xuat_hoa_don: item.xvf_sapinvoicedate ? new Date(item.xvf_sapinvoicedate).toISOString().split('T')[0] : (item.xts_salesdate ? new Date(item.xts_salesdate).toISOString().split('T')[0] : (item.xts_deliverydate ? new Date(item.xts_deliverydate).toISOString().split('T')[0] : null)),
                    khach_hang_tiem_nang: getLookupName(item, "xts_potentialcustomerid") || item.xts_potentiallookupname || item.xts_potentialcustomerdescription || "",
                    promotion: getLookupName(item, "xvf_promotionid") || item.itv_promotiondetail || "",
                    ma_khach_hang: item.xts_customernumber || "",
                    mo_ta_san_pham: item.xts_productdescription || getLookupName(item, "xts_productid") || "",
                    ten_phien_ban: getLookupName(item, "xvf_characteristicconfiguration") || getLookupName(item, "xts_productconfigurationid") || getLookupName(item, "xts_productid") || "",
                    loai_tran: getLookupName(item, "itv_characteristicceilingid") || "",
                    mau_ngoai_that: item.xvf_exteriorcolor || getLookupName(item, "xts_productexteriorcolorid") || "",
                    mau_noi_that: item.xvf_interiorcolor || getLookupName(item, "xts_productinteriorcolorid") || "",
                    ma_phien_ban: getLookupName(item, "xvf_vehiclepackage") || getLookupName(item, "xts_productconfigurationid") || "",
                    ma_mau_ngoai_that: getLookupName(item, "xts_productexteriorcolorid") || getLookupName(item, "xvf_characteristicexteriorcolor") || "",
                    ma_mau_noi_that: getLookupName(item, "xts_productinteriorcolorid") || getLookupName(item, "xvf_characteristicinteriorcolor") || "",
                    trang_thai: item["xts_status@OData.Community.Display.V1.FormattedValue"] || item["statuscode@OData.Community.Display.V1.FormattedValue"] || "",
                    pre_customer: getLookupName(item, "itv_customerpreorderid") || getLookupName(item, "itv_leadid") || "",
                    so_vin: getLookupName(item, "xts_chassisid") || item.xts_chassisnumber || item.itv_vinnumber || "",
                    accessory_serial: getLookupName(item, "xts_stockid") || "",
                    ma_san_pham: getLookupName(item, "xts_productid") || "",
                    so_ton_kho: getLookupName(item, "xts_stockid") || "",
                    so_tien_thuc_sau_thue: item.xts_netamountaftertax || item.xvf_grandtotal || 0,
                    don_hang_goc: getLookupName(item, "xts_originalnewvehiclesalesorderreferenceid") || getLookupName(item, "itv_originalvso") || "",
                    chi_nhanh: getLookupName(item, "xts_businessunitid") || getLookupName(item, "xts_siteid") || ""
                };
            });
            
            // 2. Lấy kho xe bằng Xrm.WebApi
            Xrm.WebApi.retrieveMultipleRecords("xts_inventorynewvehicle", "").then(
                function success(invResult) {
                    var soldVins = {};
                    invResult.entities.forEach(function(item) {
                        if (item._xts_lastvehicleorderid_value) {
                            var v = String(item.xts_chassisnumber || "").trim().toUpperCase();
                            if (v) soldVins[v] = true;
                        }
                    });

                    data.inventory = invResult.entities.filter(function(item) {
                        var vin = String(item.xts_chassisnumber || "").trim().toUpperCase();
                        return vin && vin.length === 17 && !soldVins[vin];
                    }).map(function(item) {
                        return {
                            vin: String(item.xts_chassisnumber || "").trim().toUpperCase(),
                            so_may: String(item.xts_enginenumber || ""),
                            mo_ta: String(item.xts_productdescription || ""),
                            khu_vuc: String(item["_xts_siteid_value@OData.Community.Display.V1.FormattedValue"] || ""),
                            phien_ban: String(item["_xts_configurationid_value@OData.Community.Display.V1.FormattedValue"] || ""),
                            ngoai_that: String(item["_xts_vehicleexteriorcolorid_value@OData.Community.Display.V1.FormattedValue"] || ""),
                            noi_that: String(item["_xts_vehicleinteriorcolorid_value@OData.Community.Display.V1.FormattedValue"] || ""),
                            nam_san_xuat: item.xts_productionyear ? parseInt(item.xts_productionyear) : null,
                            inventory_id: "",
                            check_sum: "",
                            so_ton_kho: "",
                            so_tham_chieu: "",
                            ma_san_pham: "",
                            so_don_hang_cuoi: ""
                        };
                    });
                    
                    callback(data);
                },
                function(error) { callback(data); }
            );
        },
        function(error) { callback(data); }
    );
    """
    
    try:
        driver.set_script_timeout(60)
        synced_data = driver.execute_async_script(js_code)
        
        if synced_data:
            # 1. Đẩy đơn hàng lên Supabase
            orders = synced_data.get("orders", [])
            if orders:
                requests.post(
                    f"{SUPABASE_URL}/rest/v1/donhanghienhuu?on_conflict=so_don_hang_ban",
                    headers={
                        "apikey": SUPABASE_KEY,
                        "Authorization": f"Bearer {SUPABASE_KEY}",
                        "Content-Type": "application/json",
                        "Prefer": "resolution=merge-duplicates, return=minimal"
                    },
                    json=orders
                )
                print(f"✅ Đã đồng bộ thành công {len(orders)} Đơn hàng lên Supabase!")
                write_log(f"📋 Đã đồng bộ thành công {len(orders)} Đơn hàng lên Supabase.")
            else:
                print("Không tìm thấy Đơn hàng mở nào mới.")
                write_log("⚠️ Không tìm thấy Đơn hàng mở nào mới.")
                
            # 2. Đẩy kho xe lên Supabase
            inventory = synced_data.get("inventory", [])
            if inventory:
                requests.post(
                    f"{SUPABASE_URL}/rest/v1/thongtinxe?on_conflict=vin",
                    headers={
                        "apikey": SUPABASE_KEY,
                        "Authorization": f"Bearer {SUPABASE_KEY}",
                        "Content-Type": "application/json",
                        "Prefer": "resolution=merge-duplicates, return=minimal"
                    },
                    json=inventory
                )
                print(f"✅ Đã đồng bộ thành công {len(inventory)} Xe trong kho lên Supabase!")
                write_log(f"📋 Đã đồng bộ thành công {len(inventory)} Xe trong kho lên Supabase.")
            else:
                print("Không tìm thấy Xe chưa bán nào mới.")
                write_log("⚠️ Không tìm thấy Xe chưa bán nào mới.")
    except Exception as e:
        err_msg = f"❌ Lỗi thực thi lấy dữ liệu trong trình duyệt: {str(e)}"
        print(err_msg)
        write_log(err_msg)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Sử dụng:")
        print("  python win_dms_autopilot.py --login      để đăng nhập lần đầu")
        print("  python win_dms_autopilot.py --gps-only   để quét GPS ngầm")
        print("  python win_dms_autopilot.py --sync       để quét toàn diện ngầm (GPS + Đơn hàng + Kho)")
        sys.exit(1)
        
    mode_arg = sys.argv[1]
    
    if mode_arg == "--login":
        run_login()
    elif mode_arg == "--gps-only":
        execute_dms_sync(mode="gps_only")
    elif mode_arg == "--sync":
        execute_dms_sync(mode="full")
    else:
        print("Tham số không hợp lệ.")
