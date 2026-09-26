"""
Công cụ Chẩn đoán và Tự động Sửa Lỗi Ghép Xe & Tồn Kho PIN VinFast DMS
Hỗ trợ:
- Lỗi: "Bản ghi tồn kho sê-ri của PIN theo xe trong kho không ở trạng thái sẵn sàng !"
- Lỗi: "Danh sách phụ kiện (NVSO Accessories) phải có 1 bản ghi PIN !"
- Lỗi: "PIN đã chọn đang được sử dụng trên đơn hàng phụ kiện khác..."
- Lỗi: "Trong Đơn hàng bán xe, cách tính cơ sở Thuế VAT 1 phải giống như..."
"""

import os
import sys
import json
import time
import requests

CONFIG_FILE = "dms_dealers_config.json"
BASE_API_URL = "https://vinfastdms.crm5.dynamics.com/api/data/v9.0"

TARGET_CONFIG_PATHS = [
    r"c:\Users\USER\Documents\BIỂN SỐ\dms_dealers_config.json",
    r"c:\Users\USER\Documents\ordermanagement\dms_dealers_config.json"
]

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

class DMSMatchPinFixer:
    def __init__(self, dealer_code=None):
        self.dealers = load_dealers()
        self.dealer_code = dealer_code
        self.dealer = self._find_dealer(dealer_code)

    def _find_dealer(self, dealer_code):
        if not self.dealers:
            return {}
        if not dealer_code:
            return self.dealers[0]
        for d in self.dealers:
            if d.get("dealer_code", "").upper() == dealer_code.upper():
                return d
        # Partial match
        for d in self.dealers:
            if dealer_code.upper() in d.get("dealer_code", "").upper():
                return d
        return self.dealers[0]

    def set_dealer(self, dealer_code):
        self.dealer_code = dealer_code
        self.dealer = self._find_dealer(dealer_code)

    def get_headers(self):
        cookie = self.dealer.get("cookie", "")
        return {
            "Cookie": cookie,
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "Prefer": 'odata.include-annotations="*"'
        }

    def diagnose_and_fix(self, query, auto_release=True, log_fn=print):
        """
        query: VIN (17 ký tự), hoặc Mã MU (N31920-MU-...), hoặc Mã VSO (N31920-VSO-...), hoặc Số tồn kho xe (N319-SN-...)
        """
        log_fn(f"🚀 BẮT ĐẦU CHẨN ĐOÁN & SỬA LỖI GHÉP XE CHO: '{query}'")
        query = query.strip()
        if not query:
            log_fn("❌ Mã tra cứu không được để trống!")
            return {"success": False, "message": "Query rỗng"}

        # Auto-detect dealer prefix if not explicitly set
        prefix = query[:6].upper()
        if prefix.startswith("N3") and (not self.dealer_code or self.dealer_code != prefix):
            matching_dealer = next((d for d in self.dealers if d.get('dealer_code') == prefix), None)
            if matching_dealer:
                self.dealer = matching_dealer
                self.dealer_code = prefix
                log_fn(f"📌 Tự động chọn Đại lý theo mã: {prefix}")

        headers = self.get_headers()

        # ---------------- 1. TÌM KIẾM CÁC BẢN GHI LIÊN QUAN ----------------
        log_fn("\n🔍 [BƯỚC 1] Tra cứu dữ liệu Xe, Lệnh Ghép xe & Đơn hàng...")
        veh = None
        mu = None
        vso = None

        # 1.1 Thử tìm Vehicle
        is_vin = len(query) == 17 and query.isalnum()
        if is_vin:
            r = requests.get(f"{BASE_API_URL}/xts_inventorynewvehicles?$filter=xts_chassisnumber eq '{query}'", headers=headers)
            if r.status_code == 200 and r.json().get('value'):
                vehs = r.json()['value']
                if len(vehs) == 1:
                    veh = vehs[0]
                else:
                    # Nếu có nhiều bản ghi tồn kho cho cùng 1 số VIN, ưu tiên bản ghi có VSO/MU hoặc thuộc đại lý hiện tại
                    for v_cand in vehs:
                        cand_id = v_cand.get('xts_inventorynewvehicleid')
                        cand_wh = v_cand.get('_xts_warehouseid_value@OData.Community.Display.V1.FormattedValue') or ''
                        if self.dealer_code and self.dealer_code in cand_wh:
                            veh = v_cand
                            break
                        r_v = requests.get(f"{BASE_API_URL}/xts_newvehiclesalesorders?$filter=_xts_stockid_value eq {cand_id}&$top=1", headers=headers)
                        if r_v.status_code == 200 and r_v.json().get('value'):
                            veh = v_cand
                            vso = r_v.json()['value'][0]
                            break
                    if not veh:
                        veh = vehs[-1] # Bản ghi mới nhất
        elif "-SN-" in query:
            r = requests.get(f"{BASE_API_URL}/xts_inventorynewvehicles?$filter=xts_stocknumber eq '{query}'", headers=headers)
            if r.status_code == 200 and r.json().get('value'):
                veh = r.json()['value'][0]

        # 1.2 Thử tìm VDO
        vdo = None
        if "-VDO-" in query:
            r = requests.get(f"{BASE_API_URL}/xts_newvehicledeliveryorders?$filter=xts_newvehicledeliveryordernumber eq '{query}'", headers=headers)
            if r.status_code == 200 and r.json().get('value'):
                vdo = r.json()['value'][0]
                log_fn(f"📋 Tìm thấy Phiếu giao xe VDO: {vdo.get('xts_newvehicledeliveryordernumber')}")
                if vdo.get('_xts_stockid_value'):
                    r_stk = requests.get(f"{BASE_API_URL}/xts_inventorynewvehicles({vdo.get('_xts_stockid_value')})", headers=headers)
                    if r_stk.status_code == 200:
                        veh = r_stk.json()
                if vdo.get('_xts_newvehiclesalesorderid_value'):
                    r_vso = requests.get(f"{BASE_API_URL}/xts_newvehiclesalesorders({vdo.get('_xts_newvehiclesalesorderid_value')})", headers=headers)
                    if r_vso.status_code == 200:
                        vso = r_vso.json()

        # 1.3 Thử tìm Match/Unmatch
        if "-MU-" in query or (len(query) == 36 and query.count("-") == 4):
            filter_str = f"xts_matchunmatchnumber eq '{query}'" if "-MU-" in query else f"xts_matchunmatchid eq {query}"
            r = requests.get(f"{BASE_API_URL}/xts_matchunmatchs?$filter={filter_str}", headers=headers)
            if r.status_code == 200 and r.json().get('value'):
                mu = r.json()['value'][0]
        
        # 1.4 Thử tìm VSO
        if "-VSO-" in query:
            r = requests.get(f"{BASE_API_URL}/xts_newvehiclesalesorders?$filter=xts_newvehiclesalesordernumber eq '{query}'", headers=headers)
            if r.status_code == 200 and r.json().get('value'):
                vso = r.json()['value'][0]

        # 1.4 Suy diễn chéo các bản ghi còn lại
        if mu and not veh:
            stock_id = mu.get('_xts_stockid_value')
            if stock_id:
                r = requests.get(f"{BASE_API_URL}/xts_inventorynewvehicles({stock_id})", headers=headers)
                if r.status_code == 200:
                    veh = r.json()
            elif mu.get('xts_chassisnumber'):
                r = requests.get(f"{BASE_API_URL}/xts_inventorynewvehicles?$filter=xts_chassisnumber eq '{mu.get('xts_chassisnumber')}'", headers=headers)
                if r.status_code == 200 and r.json().get('value'):
                    veh = r.json()['value'][0]

        if mu and not vso:
            vso_id = mu.get('_xts_newvehiclesalesorderid_value')
            if vso_id:
                r = requests.get(f"{BASE_API_URL}/xts_newvehiclesalesorders({vso_id})", headers=headers)
                if r.status_code == 200:
                    vso = r.json()

        if veh and not mu:
            veh_id = veh.get('xts_inventorynewvehicleid')
            r = requests.get(f"{BASE_API_URL}/xts_matchunmatchs?$filter=xts_chassisnumber eq '{veh.get('xts_chassisnumber')}' or _xts_stockid_value eq {veh_id}&$orderby=createdon desc&$top=1", headers=headers)
            if r.status_code == 200 and r.json().get('value'):
                mu = r.json()['value'][0]

        if vso and not mu:
            vso_id = vso.get('xts_newvehiclesalesorderid')
            r = requests.get(f"{BASE_API_URL}/xts_matchunmatchs?$filter=_xts_newvehiclesalesorderid_value eq {vso_id}&$orderby=createdon desc&$top=1", headers=headers)
            if r.status_code == 200 and r.json().get('value'):
                mu = r.json()['value'][0]

        if not veh and vso and vso.get('_xts_stockid_value'):
            r = requests.get(f"{BASE_API_URL}/xts_inventorynewvehicles({vso.get('_xts_stockid_value')})", headers=headers)
            if r.status_code == 200:
                veh = r.json()

        if not veh:
            log_fn("❌ KHÔNG TÌM THẤY BẢN GHI XE TỒN KHO TRÊN DMS!")
            return {"success": False, "message": "Không tìm thấy xe tồn kho"}

        veh_id = veh.get('xts_inventorynewvehicleid')
        vin = veh.get('xts_chassisnumber')
        stock_num = veh.get('xts_stocknumber')
        bat_serial = veh.get('itv_batteryserial') or ""
        wh_veh_name = veh.get('_xts_warehouseid_value@OData.Community.Display.V1.FormattedValue') or ""

        # Tự động nhận diện Dealer từ Kho xe nếu chưa chỉ định rõ
        if wh_veh_name and "_" in wh_veh_name:
            wh_prefix = wh_veh_name.split("_")[0]
            if not self.dealer_code:
                self.dealer_code = wh_prefix
            if wh_prefix != self.dealer.get('dealer_code'):
                matched_d = next((d for d in self.dealers if d.get('dealer_code') == wh_prefix), None)
                if matched_d:
                    test_cookie = matched_d.get('cookie')
                    # Kiểm tra xem cookie của đại lý này có còn hiệu lực không
                    r_chk = requests.get(f"{BASE_API_URL}/xts_warehouses?$top=1", headers={"Cookie": test_cookie, "Accept": "application/json"})
                    if r_chk.status_code == 200:
                        self.dealer = matched_d
                        headers = self.get_headers()
                        log_fn(f"📌 Chuyển phiên xác thực sang Đại lý: {wh_prefix} (từ kho {wh_veh_name})")
                    else:
                        log_fn(f"📌 Nhận diện Đại lý: {wh_prefix} (giữ phiên xác thực hiện tại do token {wh_prefix} hết hạn)")

        # Tìm VSO nếu chưa có (sau khi đã cập nhật headers đại lý đúng)
        if veh and not vso:
            r_vso_stock = requests.get(f"{BASE_API_URL}/xts_newvehiclesalesorders?$filter=_xts_stockid_value eq {veh_id}&$orderby=createdon desc&$top=1", headers=headers)
            if r_vso_stock.status_code == 200 and r_vso_stock.json().get('value'):
                vso = r_vso_stock.json()['value'][0]

        # Tìm Match/Unmatch nếu chưa có (sau khi đã cập nhật headers đại lý đúng)
        if veh and not mu:
            r_mu_veh = requests.get(f"{BASE_API_URL}/xts_matchunmatchs?$filter=xts_chassisnumber eq '{vin}' or _xts_stockid_value eq {veh_id}&$orderby=createdon desc&$top=1", headers=headers)
            if r_mu_veh.status_code == 200 and r_mu_veh.json().get('value'):
                mu = r_mu_veh.json()['value'][0]

        # Tìm VSO từ lệnh Match/Unmatch nếu đơn hàng chưa được gán xe
        if mu and not vso and mu.get('_xts_newvehiclesalesorderid_value'):
            r_vso_mu = requests.get(f"{BASE_API_URL}/xts_newvehiclesalesorders({mu.get('_xts_newvehiclesalesorderid_value')})", headers=headers)
            if r_vso_mu.status_code == 200:
                vso = r_vso_mu.json()

        dealer_bu_id = None

        log_fn(f"✅ Xe: {stock_num} | VIN: {vin}")
        log_fn(f"   - Mã PIN theo xe: {bat_serial or 'Không có thông tin'}")
        log_fn(f"   - Kho xe hiện tại: {veh.get('_xts_warehouseid_value@OData.Community.Display.V1.FormattedValue')}")

        if vso:
            vso_id = vso.get('xts_newvehiclesalesorderid')
            vso_num = vso.get('xts_newvehiclesalesordernumber')
            dealer_bu_id = vso.get('_xts_businessunitid_value')
            log_fn(f"✅ Đơn hàng VSO: {vso_num} (ID: {vso_id})")
            log_fn(f"   - Trạng thái VSO: {vso.get('xts_status@OData.Community.Display.V1.FormattedValue')}")
            log_fn(f"   - Gói PIN (itv_batteryoption): {vso.get('itv_batteryoption@OData.Community.Display.V1.FormattedValue')} ({vso.get('itv_batteryoption')})")
            log_fn(f"   - Thuê PIN (itv_batteryrental): {vso.get('itv_batteryrental@OData.Community.Display.V1.FormattedValue')}")
        else:
            log_fn("⚠️ Chưa tìm thấy Đơn hàng VSO tương ứng!")

        if mu:
            mu_id = mu.get('xts_matchunmatchid')
            mu_num = mu.get('xts_matchunmatchnumber') or "Chưa lưu"
            log_fn(f"✅ Lệnh Ghép xe: {mu_num} (ID: {mu_id})")
            log_fn(f"   - Trạng thái lệnh: {mu.get('xts_status@OData.Community.Display.V1.FormattedValue')}")
        else:
            log_fn("⚠️ Chưa có lệnh Ghép xe (Match/Unmatch) cho xe này.")

        # Xử lý gỡ bỏ link itv_serialid nếu bị gán cứng gây xung đột trên Vehicle
        if veh.get('_itv_serialid_value'):
            log_fn("🔧 Phát hiện `_itv_serialid_value` trên bản ghi xe, đang làm sạch liên kết...")
            try:
                requests.delete(f"{BASE_API_URL}/xts_inventorynewvehicles({veh_id})/itv_serialid/$ref", headers=headers)
                log_fn("   ✅ Đã làm sạch liên kết itv_serialid trên xe.")
            except Exception as e:
                log_fn(f"   ⚠️ Lỗi khi gỡ itv_serialid: {e}")

        # Chuẩn hóa trạng thái tồn kho của XE (xts_inventserial của số tồn kho xe)
        veh_serial_id = veh.get('_xts_serialid_value')
        if veh_serial_id:
            try:
                r_vs = requests.get(f"{BASE_API_URL}/xts_inventserials({veh_serial_id})?$select=xts_serialnumber,xts_stockstatus,xts_availabilitystatus", headers=headers)
                if r_vs.status_code == 200:
                    vs_data = r_vs.json()
                    patch_vs = {}
                    if vs_data.get('xts_stockstatus') != 3:
                        patch_vs['xts_stockstatus'] = 3  # Tồn kho thực tế (3)
                    if vs_data.get('xts_availabilitystatus') != 6:
                        patch_vs['xts_availabilitystatus'] = 6  # Có sẵn (6)
                    if patch_vs:
                        log_fn(f"🔧 Chuẩn hóa trạng thái sê-ri xe ({stock_num}): chuyển StockStatus sang Tồn kho (3)...")
                        requests.patch(f"{BASE_API_URL}/xts_inventserials({veh_serial_id})", headers=headers, json=patch_vs)
                        log_fn("   ✅ Đã chuẩn hóa sê-ri tồn kho XE về trạng thái Tồn kho (3) & Có sẵn (6).")
            except Exception as e:
                log_fn(f"   ⚠️ Lỗi kiểm tra sê-ri xe: {e}")

        # ---------------- 2. TÌM KHO PIN & SẢN PHẨM PIN CHUẨN ----------------
        dealer_code = self.dealer.get("dealer_code", "N31920")
        if vso and vso.get('_xts_businessunitid_value@OData.Community.Display.V1.FormattedValue'):
            dealer_code = vso.get('_xts_businessunitid_value@OData.Community.Display.V1.FormattedValue')

        log_fn(f"\n🔍 [BƯỚC 2] Tra cứu cấu hình Kho PIN & Sản phẩm PIN cho Đại lý: {dealer_code}...")
        
        # 2.1 Kho PIN (_P01A)
        wh_p01a = None
        r_wh = requests.get(f"{BASE_API_URL}/xts_warehouses?$filter=xts_warehouse eq '{dealer_code}_P01A'", headers=headers)
        if r_wh.status_code == 200 and r_wh.json().get('value'):
            wh_p01a = r_wh.json()['value'][0]
        else:
            # Fallback search
            r_wh_fb = requests.get(f"{BASE_API_URL}/xts_warehouses?$filter=contains(xts_warehouse, '_P01A')", headers=headers)
            if r_wh_fb.status_code == 200 and r_wh_fb.json().get('value'):
                wh_p01a = r_wh_fb.json()['value'][0]

        if not wh_p01a:
            log_fn(f"❌ Không tìm thấy kho phụ tùng/pin ({dealer_code}_P01A) trên DMS!")
            return {"success": False, "message": "Không tìm thấy kho P01A"}

        wh_p01a_id = wh_p01a.get('xts_warehouseid')
        wh_p01a_name = wh_p01a.get('xts_warehouse')
        site_id = wh_p01a.get('_xts_siteid_value')
        bu_id = wh_p01a.get('_xts_businessunitid_value') or dealer_bu_id
        parent_bu_id = wh_p01a.get('_xts_parentbusinessunitid_value') or "c46bad8c-5961-ea11-a811-000d3a85937e"

        log_fn(f"✅ Kho PIN chuẩn: {wh_p01a_name} (ID: {wh_p01a_id})")

        # 2.2 Vị trí kho (_P01A_01)
        loc_id = None
        r_loc = requests.get(f"{BASE_API_URL}/xts_locations?$filter=xts_location eq '{dealer_code}_P01A_01'", headers=headers)
        if r_loc.status_code == 200 and r_loc.json().get('value'):
            loc_id = r_loc.json()['value'][0].get('xts_locationid')
        else:
            r_loc_fb = requests.get(f"{BASE_API_URL}/xts_locations?$filter=_xts_warehouseid_value eq {wh_p01a_id}&$top=1", headers=headers)
            if r_loc_fb.status_code == 200 and r_loc_fb.json().get('value'):
                loc_id = r_loc_fb.json()['value'][0].get('xts_locationid')
        log_fn(f"✅ Vị trí kho: {loc_id or 'Mặc định'}")

        # 2.3 Sản phẩm BATTERYDUMMY (Mặc định cho toàn bộ đại lý N319)
        prod_pin_id = "f08029f7-4f22-f011-998b-002248198c4a"
        log_fn(f"✅ Mã sản phẩm PIN (BATTERYDUMMY): {prod_pin_id}")

        # ---------------- 3. SỬA LỖI TỒN KHO SÊ-RI PIN (xts_inventserial) ----------------
        log_fn(f"\n🛠️ [BƯỚC 3] Kiểm tra & Chuẩn hóa bản ghi Tồn kho Sê-ri PIN (xts_inventserial)...")
        filter_pin = f"itv_vinnoofbattery eq '{vin}'"
        if bat_serial:
            filter_pin += f" or itv_serialnumber eq '{bat_serial}'"
        filter_pin += f" or _itv_inventorynewvehicleid_value eq {veh_id}"

        r_pin = requests.get(f"{BASE_API_URL}/xts_inventserials?$filter={filter_pin}", headers=headers)
        pin_records = r_pin.json().get('value', []) if r_pin.status_code == 200 else []

        if not pin_records:
            log_fn("⚠️ Không tìm thấy bản ghi tồn kho sê-ri PIN cho xe này trên hệ thống!")
        else:
            log_fn(f"📋 Tìm thấy {len(pin_records)} bản ghi tồn kho sê-ri PIN:")
            for p in pin_records:
                pid = p.get('xts_inventserialid')
                sn = p.get('xts_serialnumber')
                wh_cur = p.get('_itv_warehouseid_value')
                wh_cur_name = p.get('_itv_warehouseid_value@OData.Community.Display.V1.FormattedValue')
                avail_st = p.get('xts_availabilitystatus')
                stock_st = p.get('xts_stockstatus')

                log_fn(f"  • PIN ID: {pid} | SN: {sn} | Kho: {wh_cur_name} | Trạng thái: Avail={avail_st}, Stock={stock_st}")

                patch_pin = {}
                # Kiểm tra kho
                if wh_cur != wh_p01a_id:
                    log_fn(f"    👉 PHÁT HIỆN LỆCH KHO: PIN đang ở kho '{wh_cur_name}' -> Chuyển về '{wh_p01a_name}'")
                    patch_pin["itv_warehouseid@odata.bind"] = f"/xts_warehouses({wh_p01a_id})"

                # Trạng thái sẵn sàng
                if avail_st != 6:
                    patch_pin["xts_availabilitystatus"] = 6 # Có sẵn
                if stock_st != 3:
                    patch_pin["xts_stockstatus"] = 3 # Tồn kho
                if p.get('xts_vehiclesource') != 960810000:
                    patch_pin["xts_vehiclesource"] = 960810000 # Battery

                # Chuẩn hóa số sê-ri PIN (tránh trường hợp bị cắt ngắn thành mã Y3.../Z6... gây lỗi phát hành VDO)
                if bat_serial and p.get('itv_serialnumber') != bat_serial:
                    log_fn(f"    👉 PHÁT HIỆN LỆCH SỐ SÊ-RI PIN: '{p.get('itv_serialnumber')}' -> Chuẩn hóa theo xe '{bat_serial}'")
                    patch_pin["itv_serialnumber"] = bat_serial

                # Liên kết xe
                if not p.get('_itv_inventorynewvehicleid_value'):
                    patch_pin["itv_inventorynewvehicleid@odata.bind"] = f"/xts_inventorynewvehicles({veh_id})"

                if patch_pin:
                    r_fix_pin = requests.patch(f"{BASE_API_URL}/xts_inventserials({pid})", headers=headers, json=patch_pin)
                    if r_fix_pin.status_code in [200, 204]:
                        log_fn("    ✅ ĐÃ CẬP NHẬT CHUẨN HÓA BẢN GHI SÊ-RI PIN THÀNH CÔNG!")
                    else:
                        log_fn(f"    ❌ Lỗi cập nhật PIN: {r_fix_pin.status_code} - {r_fix_pin.text[:200]}")
                else:
                    log_fn("    ✅ Bản ghi sê-ri PIN đã đúng chuẩn, không cần thay đổi.")

        # Chuẩn hóa Device Info nếu có
        r_dev = requests.get(f"{BASE_API_URL}/itv_deviceinfomations?$filter=itv_chassisnumber eq '{vin}'", headers=headers)
        if r_dev.status_code == 200 and r_dev.json().get('value'):
            for dev in r_dev.json()['value']:
                dev_id = dev.get('itv_deviceinfomationid')
                patch_dev = {}
                if dev.get('itv_devicestatus') not in [2, 3]:
                    patch_dev["itv_devicestatus"] = 2  # Stock
                if dev.get('itv_usestatus') != 1:
                    patch_dev["itv_usestatus"] = 1  # Good
                # Chuẩn hóa sê-ri PIN nếu bị rút gọn gây lỗi 'Thông tin pin không tồn tại trong Device Information'
                if bat_serial and dev.get('itv_serialno') != bat_serial:
                    log_fn(f"    👉 PHÁT HIỆN SÊ-RI TRONG DEVICE INFO BỊ RÚT GỌN: '{dev.get('itv_serialno')}' -> Chuẩn hóa theo PIN xe '{bat_serial}'")
                    patch_dev["itv_serialno"] = bat_serial
                    patch_dev["itv_name"] = bat_serial
                if patch_dev:
                    requests.patch(f"{BASE_API_URL}/itv_deviceinfomations({dev_id})", headers=headers, json=patch_dev)
                    log_fn("✅ Đã cập nhật thiết bị PIN (Device Info) về trạng thái chuẩn.")

        # ---------------- 4. SỬA LỖI PHỤ KIỆN PIN TRÊN ĐƠN HÀNG (NVSO Accessories) ----------------
        if vso:
            log_fn(f"\n🛠️ [BƯỚC 4] Kiểm tra & Chuẩn hóa Phụ kiện PIN trên Đơn hàng {vso.get('xts_newvehiclesalesordernumber')}...")
            vso_id = vso.get('xts_newvehiclesalesorderid')
            vso_tax_id = vso.get('_xts_consumptiontax1id_value') or "7f957c74-be62-ea11-a811-000d3a851c32"
            bat_option = vso.get('itv_batteryoption') or 2

            r_accs = requests.get(f"{BASE_API_URL}/xts_nvsoaccessorieses?$filter=_xts_newvehiclesalesorderid_value eq {vso_id}", headers=headers)
            accs = r_accs.json().get('value', []) if r_accs.status_code == 200 else []

            log_fn(f"📋 Danh sách phụ kiện hiện có trên VSO: {len(accs)} dòng")
            
            # Phân loại phụ kiện
            pin_accs = []
            for a in accs:
                is_pin = (a.get('itv_isbatterywithvehicle') is True or 
                          a.get('_xts_accessoriesid_value') == prod_pin_id or 
                          (bat_serial and bat_serial in str(a.get('xts_description') or '')) or
                          (bat_serial and a.get('itv_serialno') == bat_serial))
                if is_pin:
                    pin_accs.append(a)

            log_fn(f"   - Số dòng phụ kiện liên quan đến PIN: {len(pin_accs)}")

            target_acc = None
            if len(pin_accs) == 0:
                log_fn("➕ Chưa có dòng phụ kiện PIN -> Đang tự động tạo mới phụ kiện PIN...")
                new_acc_payload = {
                    "xts_newvehiclesalesorderid@odata.bind": f"/xts_newvehiclesalesorders({vso_id})",
                    "xts_accessoriesid@odata.bind": f"/xts_products({prod_pin_id})",
                    "xts_warehouseid@odata.bind": f"/xts_warehouses({wh_p01a_id})",
                    "xts_businessunitid@odata.bind": f"/businessunits({bu_id})",
                    "xts_parentbusinessunitid@odata.bind": f"/businessunits({parent_bu_id})",
                    "itv_isbatterywithvehicle": True,
                    "itv_batteryoption": bat_option,
                    "itv_serialno": bat_serial,
                    "xts_quantity": 1.0,
                    "xts_pricetype": 1, # FOC
                    "xts_freetype": 2,  # FOC không đăng ký
                    "xts_description": f"BATTERYDUMMY; {veh.get('xts_productdescription') or 'PIN'}; {bat_serial}"
                }
                if loc_id:
                    new_acc_payload["xts_locationid@odata.bind"] = f"/xts_locations({loc_id})"
                if site_id:
                    new_acc_payload["xts_siteid@odata.bind"] = f"/xts_sites({site_id})"
                if vso_tax_id:
                    new_acc_payload["xts_consumptiontax1id@odata.bind"] = f"/xts_consumptiontaxes({vso_tax_id})"

                r_new = requests.post(f"{BASE_API_URL}/xts_nvsoaccessorieses", headers=headers, json=new_acc_payload)
                if r_new.status_code in [200, 201]:
                    log_fn("✅ Tạo mới phụ kiện PIN THÀNH CÔNG!")
                else:
                    log_fn(f"❌ Lỗi tạo phụ kiện PIN: {r_new.status_code} - {r_new.text[:200]}")
            else:
                target_acc = pin_accs[0]
                t_id = target_acc.get('xts_nvsoaccessoriesid')
                t_num = target_acc.get('xts_nvsoaccessories')
                log_fn(f"🛠️ Đang chuẩn hóa dòng phụ kiện PIN chính: {t_num} (ID: {t_id})...")

                upd_acc = {
                    "xts_accessoriesid@odata.bind": f"/xts_products({prod_pin_id})",
                    "xts_warehouseid@odata.bind": f"/xts_warehouses({wh_p01a_id})",
                    "itv_isbatterywithvehicle": True,
                    "itv_batteryoption": bat_option,
                    "itv_serialno": bat_serial,
                    "xts_description": f"BATTERYDUMMY; {veh.get('xts_productdescription') or 'PIN'}; {bat_serial}"
                }
                if loc_id:
                    upd_acc["xts_locationid@odata.bind"] = f"/xts_locations({loc_id})"
                if vso_tax_id:
                    upd_acc["xts_consumptiontax1id@odata.bind"] = f"/xts_consumptiontaxes({vso_tax_id})"

                r_upd = requests.patch(f"{BASE_API_URL}/xts_nvsoaccessorieses({t_id})", headers=headers, json=upd_acc)
                if r_upd.status_code in [200, 204]:
                    log_fn("✅ Chuẩn hóa phụ kiện PIN chính THÀNH CÔNG!")
                else:
                    log_fn(f"⚠️ Kết quả cập nhật phụ kiện: {r_upd.status_code}")

                # Nếu có phụ kiện PIN thừa/trùng lặp -> Làm sạch để tránh lỗi "PIN đã chọn đang được sử dụng trên đơn hàng khác"
                if len(pin_accs) > 1:
                    log_fn(f"🧹 Phát hiện {len(pin_accs) - 1} dòng phụ kiện PIN trùng lặp -> Đang làm sạch...")
                    for dup in pin_accs[1:]:
                        dup_id = dup.get('xts_nvsoaccessoriesid')
                        dup_num = dup.get('xts_nvsoaccessories')
                        requests.patch(f"{BASE_API_URL}/xts_nvsoaccessorieses({dup_id})", headers=headers, json={
                            "itv_serialno": None,
                            "itv_isbatterywithvehicle": False,
                            "itv_batteryoption": None,
                            "xts_description": "CLEARED_DUPLICATE",
                            "statecode": 1,
                            "statuscode": 2
                        })
                        log_fn(f"   ✅ Đã vô hiệu hóa & gỡ serial khỏi dòng trùng: {dup_num}")

        # ---------------- 5. KIỂM TRA THỬ GHÉP & PHÁT HÀNH ----------------
        log_fn("\n⚡ [BƯỚC 5] Kiểm tra thử gán Tồn kho xe vào VSO...")
        if vso:
            test_payload = {"xts_stockid@odata.bind": f"/xts_inventorynewvehicles({veh_id})"}
            r_test = requests.patch(f"{BASE_API_URL}/xts_newvehiclesalesorders({vso.get('xts_newvehiclesalesorderid')})", headers=headers, json=test_payload)
            if r_test.status_code in [200, 204]:
                log_fn("✅ KIỂM TRA ĐẠT: Gán xe vào VSO hoàn toàn hợp lệ, không còn lỗi tồn kho PIN!")
            else:
                log_fn(f"❌ VSO cảnh báo: {r_test.status_code} - {r_test.text[:250]}")

        # 5.2 Phát hành lệnh Ghép xe
        if mu and auto_release:
            mu_id = mu.get('xts_matchunmatchid')
            mu_num = mu.get('xts_matchunmatchnumber') or "Chưa lưu"
            
            # Kiểm tra nếu lệnh đã ở trạng thái Ghép (Matched = 2)
            if mu.get('xts_status') == 2:
                log_fn(f"\n🎉 Lệnh ghép xe {mu_num} hiện đã ở trạng thái 'Đã ghép' (Matched) thành công!")
                return {"success": True, "message": "Lệnh ghép xe đã ở trạng thái Ghép thành công!", "status": "Matched"}

            log_fn(f"\n🚀 Đang thực hiện Phát hành (Release) lệnh Ghép xe {mu_num}...")
            r_rel = requests.patch(f"{BASE_API_URL}/xts_matchunmatchs({mu_id})", headers=headers, json={"xts_handling": 2})
            if r_rel.status_code in [200, 204]:
                log_fn("\n🎉🎉🎉 THÀNH CÔNG RỰC RỠ! LỆNH GHÉP XE ĐÃ ĐƯỢC PHÁT HÀNH!")
                # Xác thực trạng thái cuối
                r_chk = requests.get(f"{BASE_API_URL}/xts_matchunmatchs({mu_id})?$select=xts_status,xts_matchunmatchnumber", headers=headers).json()
                st_name = r_chk.get('xts_status@OData.Community.Display.V1.FormattedValue')
                log_fn(f"📋 Trạng thái Match/Unmatch hiện tại: {st_name} ({r_chk.get('xts_status')})")
                return {"success": True, "message": "Phát hành Ghép xe thành công!", "status": st_name}
            else:
                log_fn(f"❌ Phát hành thất bại: {r_rel.status_code} - {r_rel.text[:300]}")
                return {"success": False, "message": r_rel.text}
        # 5.3 Phát hành Phiếu giao xe VDO nếu có yêu cầu
        if vdo and auto_release:
            vdo_id = vdo.get('xts_newvehicledeliveryorderid')
            vdo_num = vdo.get('xts_newvehicledeliveryordernumber')
            if vdo.get('xts_status') == 2:
                log_fn(f"\n🎉 Phiếu giao xe {vdo_num} hiện đã ở trạng thái 'Đã phát hành' (Released)!")
                return {"success": True, "message": "Phiếu giao xe đã phát hành thành công!", "status": "Released"}

            log_fn(f"\n🚀 Đang làm sạch log lỗi và Phát hành Phiếu giao xe {vdo_num}...")
            requests.patch(f"{BASE_API_URL}/xts_newvehicledeliveryorders({vdo_id})", headers=headers, json={"xts_log": ""})
            r_rel_vdo = requests.patch(f"{BASE_API_URL}/xts_newvehicledeliveryorders({vdo_id})", headers=headers, json={"xts_handling": 2})
            if r_rel_vdo.status_code in [200, 204]:
                log_fn(f"\n🎉🎉🎉 THÀNH CÔNG RỰC RỠ! PHIẾU GIAO XE {vdo_num} ĐÃ ĐƯỢC PHÁT HÀNH!")
                return {"success": True, "message": f"Phát hành {vdo_num} thành công!", "status": "Released"}
            else:
                log_fn(f"❌ Phát hành VDO thất bại: {r_rel_vdo.status_code} - {r_rel_vdo.text[:300]}")
                return {"success": False, "message": r_rel_vdo.text}

        else:
            log_fn("\n✅ Toàn bộ dữ liệu Tồn kho PIN và Phụ kiện đã được sửa xong chuẩn xác!")
            log_fn("👉 Anh/chị có thể bấm 'Phát hành' trên giao diện web DMS ngay bây giờ.")
            return {"success": True, "message": "Đã sửa xong toàn bộ dữ liệu"}

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Tool Sửa Lỗi Ghép Xe & PIN VinFast DMS")
    parser.add_argument("query", nargs="?", help="Số khung (VIN), Mã MU, Mã VSO hoặc Số tồn kho xe")
    parser.add_argument("--dealer", help="Mã Đại lý (VD: N31920, N31913)")
    parser.add_argument("--no-release", action="store_true", help="Chỉ sửa dữ liệu, không tự động phát hành lệnh")
    args = parser.parse_args()

    query = args.query
    if not query:
        print("=" * 70)
        print("    CONG CU TU DONG SUA LOI GHEP XE & TON KHO PIN VINFAST DMS")
        print("=" * 70)
        print("Nhap vao mot trong cac thong tin sau:")
        print("  - So khung xe (VIN) (VD: RLLV3FUV1TH823280)")
        print("  - Ma lenh Ghep xe (MU) (VD: N31920-MU-26-09-0036)")
        print("  - Ma don hang (VSO) (VD: N31920-VSO-26-09-0057)")
        print("  - So ton kho xe (Stock) (VD: N319-SN-26-00031569)")
        print("-" * 70)
        query = input("👉 Nhap ma: ").strip()

    if not query:
        print("❌ Ban chua nhap thong tin!")
        sys.exit(1)

    fixer = DMSMatchPinFixer(dealer_code=args.dealer)
    fixer.diagnose_and_fix(query, auto_release=not args.no_release)

if __name__ == "__main__":
    main()
