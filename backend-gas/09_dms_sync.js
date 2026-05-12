/**
 * 09_dms_sync.js - Đồng bộ tự động 24/7 từ DMS VinFast sang Supabase
 * Chạy trực tiếp trên máy chủ đám mây Google Apps Script (GAS) hoàn toàn miễn phí.
 */

/**
 * Hiển thị hộp thoại nhắc nhở người dùng dán Bearer Token vào Google Sheets
 */
function saveDmsToken() {
  var ui = SpreadsheetApp.getUi();
  var result = ui.prompt(
    '🔑 CẬP NHẬT MÃ KẾT NỐI DMS (BEARER TOKEN)',
    'Vui lòng dán đoạn mã Bearer Token bạn đã sao chép từ Bookmarklet vào ô bên dưới:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (result.getSelectedButton() == ui.Button.OK) {
    var token = result.getResponseText().trim();
    if (token.startsWith("Bearer ")) {
      token = token.substring(7);
    }
    
    if (token.length > 50) {
      PropertiesService.getScriptProperties().setProperty('DMS_BEARER_TOKEN', token);
      ui.alert('✅ Thành công', 'Đã lưu trữ mã kết nối DMS của bạn một cách bảo mật vào hệ thống!', ui.ButtonSet.OK);
    } else {
      ui.alert('❌ Lỗi', 'Mã kết nối không hợp lệ hoặc quá ngắn. Vui lòng thử lại!', ui.ButtonSet.OK);
    }
  }
}

/**
 * Lấy Bearer Token đã lưu trữ từ PropertiesService
 */
function getDmsToken() {
  return PropertiesService.getScriptProperties().getProperty('DMS_BEARER_TOKEN');
}

/**
 * Gửi yêu cầu API đến DMS VinFast
 */
function fetchDmsApi(endpoint, method, payload) {
  var token = getDmsToken();
  if (!token) {
    throw new Error("Chưa cấu hình mã kết nối DMS Bearer Token! Vui lòng chọn menu 'Cập nhật Mã kết nối DMS' trước.");
  }
  
  var headers = {
    "Authorization": "Bearer " + token,
    "Accept": "application/json",
    "Content-Type": "application/json; charset=utf-8",
    "OData-MaxVersion": "4.0",
    "OData-Version": "4.0"
  };
  
  var options = {
    "method": method || "get",
    "headers": headers,
    "muteHttpExceptions": true
  };
  
  if (payload) {
    options.payload = JSON.stringify(payload);
  }
  
  var response = UrlFetchApp.fetch(endpoint, options);
  var code = response.getResponseCode();
  
  if (code === 401) {
    throw new Error("Mã kết nối DMS đã hết hạn! Vui lòng bấm lấy mã kết nối mới từ Bookmarklet và cập nhật lại.");
  }
  
  return response;
}

/**
 * Luồng chạy 1: Đồng bộ vị trí GPS mỗi 30 phút
 */
function syncDmsGpsToSupabase() {
  try {
    Logger.log("📍 Đang bắt đầu đồng bộ định vị GPS...");
    
    // 1. Lấy danh sách số VIN cần định vị từ bảng khoxe của Supabase
    var supabaseUrl = SUPABASE_URL + "/rest/v1/khoxe?select=vin";
    var supRes = UrlFetchApp.fetch(supabaseUrl, {
      method: "get",
      headers: {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": "Bearer " + SUPABASE_SERVICE_KEY
      }
    });
    
    var cars = JSON.parse(supRes.getContentText());
    if (!Array.isArray(cars) || cars.length === 0) {
      Logger.log("Không có số VIN nào cần quét định vị.");
      return;
    }
    
    var vins = cars.map(function(c) { return c.vin; }).filter(Boolean);
    Logger.log("Tìm thấy " + vins.length + " xe cần quét định vị.");
    
    var telemetryData = [];
    var batchSize = 10; // Quét từng nhóm 10 xe một để tránh quá tải
    
    for (var i = 0; i < vins.length; i += batchSize) {
      var batchVins = vins.slice(i, i + batchSize);
      
      batchVins.forEach(function(vin) {
        try {
          var payload = {
            "itv_requestObject": JSON.stringify({
              "data": [{ "vinCode": vin }],
              "isUpdate": false
            })
          };
          
          var dmsRes = fetchDmsApi(
            "https://vinfastdms.crm5.dynamics.com/api/data/v9.2/itv_trackingvehicleposition",
            "post",
            payload
          );
          
          if (dmsRes.getResponseCode() === 200) {
            var dmsData = JSON.parse(dmsRes.getContentText());
            if (dmsData && dmsData.itv_responseObject) {
              var responseObj = JSON.parse(dmsData.itv_responseObject);
              if (responseObj && responseObj.data && responseObj.data.length > 0) {
                var carGps = responseObj.data[0];
                if (carGps.latitude && carGps.longitude) {
                  telemetryData.push({
                    "vin": vin,
                    "latitude": parseFloat(carGps.latitude),
                    "longitude": parseFloat(carGps.longitude),
                    "timestamp": new Date().toISOString()
                  });
                }
              }
            }
          }
        } catch (carErr) {
          Logger.log("Lỗi quét định vị VIN " + vin + ": " + carErr.message);
        }
      });
      
      Utilities.sleep(1000); // Tránh spam quá nhanh
    }
    
    // 2. Gửi tọa độ quét được lên Supabase bảng car_telemetry
    if (telemetryData.length > 0) {
      var uploadUrl = SUPABASE_URL + "/rest/v1/car_telemetry";
      var uploadRes = UrlFetchApp.fetch(uploadUrl, {
        method: "post",
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": "Bearer " + SUPABASE_SERVICE_KEY,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates"
        },
        payload: JSON.stringify(telemetryData)
      });
      Logger.log("Đã tải thành công " + telemetryData.length + " bản ghi tọa độ lên Supabase!");
    }
  } catch (e) {
    Logger.log("Lỗi đồng bộ GPS: " + e.message);
  }
}

/**
 * Luồng chạy 2: Đồng bộ Đơn hàng & Kho xe mỗi 4 tiếng
 */
function syncDmsDataToSupabase() {
  try {
    Logger.log("📋 Đang bắt đầu đồng bộ Đơn hàng & Kho xe...");
    
    // 1. Đồng bộ Đơn hàng (Sales Orders)
    try {
      var dmsOrdersRes = fetchDmsApi(
        "https://vinfastdms.crm5.dynamics.com/api/data/v9.2/xts_newvehiclesalesorders?$filter=statecode eq 0&$select=xts_newvehiclesalesorderid,xts_customernumber,xts_salesorderdate,xts_salesorderstatus,xts_chassisnumber",
        "get"
      );
      
      if (dmsOrdersRes.getResponseCode() === 200) {
        var rawOrders = JSON.parse(dmsOrdersRes.getContentText()).value || [];
        var mappedOrders = rawOrders.map(function(order) {
          return {
            "so_don_hang_ban": order.xts_newvehiclesalesorderid,
            "ten_khach_hang": order.xts_customernumber || "",
            "ngay_lap": order.xts_salesorderdate || null,
            "trang_thai": order.xts_salesorderstatus || "",
            "vin": order.xts_chassisnumber || ""
          };
        });
        
        if (mappedOrders.length > 0) {
          UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/donhanghienhuu?on_conflict=so_don_hang_ban", {
            method: "post",
            headers: {
              "apikey": SUPABASE_SERVICE_KEY,
              "Authorization": "Bearer " + SUPABASE_SERVICE_KEY,
              "Content-Type": "application/json",
              "Prefer": "resolution=merge-duplicates"
            },
            payload: JSON.stringify(mappedOrders)
          });
          Logger.log("Đã đồng bộ thành công " + mappedOrders.length + " Đơn hàng lên Supabase!");
        }
      }
    } catch (orderErr) {
      Logger.log("Lỗi đồng bộ đơn hàng: " + orderErr.message);
    }
    
    // 2. Đồng bộ Kho xe (Inventory)
    try {
      var dmsInvRes = fetchDmsApi(
        "https://vinfastdms.crm5.dynamics.com/api/data/v9.2/xts_inventorynewvehicles?$select=xts_chassisnumber,xts_enginename,xts_productdescription",
        "get"
      );
      
      if (dmsInvRes.getResponseCode() === 200) {
        var rawInv = JSON.parse(dmsInvRes.getContentText()).value || [];
        var mappedInv = rawInv.map(function(item) {
          return {
            "vin": item.xts_chassisnumber || "",
            "so_may": item.xts_enginename || "",
            "dong_xe": item.xts_productdescription || "",
            "timestamp": new Date().toISOString()
          };
        }).filter(function(item) { return item.vin.length === 17; });
        
        if (mappedInv.length > 0) {
          UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/thongtinxe?on_conflict=vin", {
            method: "post",
            headers: {
              "apikey": SUPABASE_SERVICE_KEY,
              "Authorization": "Bearer " + SUPABASE_SERVICE_KEY,
              "Content-Type": "application/json",
              "Prefer": "resolution=merge-duplicates"
            },
            payload: JSON.stringify(mappedInv)
          });
          Logger.log("Đã đồng bộ thành công " + mappedInv.length + " Xe trong kho lên Supabase!");
        }
      }
    } catch (invErr) {
      Logger.log("Lỗi đồng bộ kho xe: " + invErr.message);
    }
    
  } catch (e) {
    Logger.log("Lỗi đồng bộ toàn bộ dữ liệu: " + e.message);
  }
}

/**
 * Tự động tạo lập lịch (Trigger) chạy ngầm trên đám mây của Google
 */
function createSyncTriggers() {
  // Xóa các trigger cũ nếu có để tránh lặp trùng
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var funcName = triggers[i].getHandlerFunction();
    if (funcName === "syncDmsGpsToSupabase" || funcName === "syncDmsDataToSupabase") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Tạo trigger lặp định kỳ mỗi 30 phút cho định vị GPS
  ScriptApp.newTrigger("syncDmsGpsToSupabase")
           .timeBased()
           .everyMinutes(30)
           .create();
           
  // Tạo trigger lặp định kỳ mỗi 4 tiếng cho Đơn hàng & Kho xe
  ScriptApp.newTrigger("syncDmsDataToSupabase")
           .timeBased()
           .everyHours(4)
           .create();
           
  SpreadsheetApp.getUi().alert("🚀 Hoàn tất", "Đã khởi tạo thành công lịch trình tự động đám mây 24/7 của Google!", SpreadsheetApp.getUi().ButtonSet.OK);
}
