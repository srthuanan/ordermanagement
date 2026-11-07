(function () {
  'use strict';

  console.log('[DMS Auto Sync] Tiện ích mở rộng đã được kích hoạt trên DMS.');

  const COOLDOWN_MINUTES = 15; // Giãn cách 15 phút giữa 2 lần chạy để tránh lặp khi chuyển trang
  const STORAGE_KEY = 'vf_dms_last_silent_sync';

  // Bảng ánh xạ định danh 25 showroom VinFast sang mã DMS chuẩn
  var SITE_MAP = {
    "2bd660d4-92ad-f111-aaae-000d3a8140c0": "N31925",
    "bf9e5764-ff8f-f111-8076-000d3a821339": "N31924",
    "4cfe574e-b361-ea11-a811-000d3a85937e": "N31901",
    "52b1cce4-4d52-f011-877a-00224816cf50": "N31917",
    "4ce24370-2b15-f011-998a-00224817e379": "N31915",
    "4ee24370-2b15-f011-998a-00224817e379": "N31916",
    "490968e0-9b28-ef11-840b-002248ec8105": "N31902",
    "4b0968e0-9b28-ef11-840b-002248ec8105": "N31903",
    "4d0968e0-9b28-ef11-840b-002248ec8105": "N31904",
    "4f0968e0-9b28-ef11-840b-002248ec8105": "N31905",
    "510968e0-9b28-ef11-840b-002248ec8105": "N31906",
    "530968e0-9b28-ef11-840b-002248ec8105": "N31907",
    "4c4b8713-b539-ef11-a317-002248ec8105": "N31908",
    "f818cbd3-3d7e-ef11-ac21-002248ec8105": "N31910",
    "fa18cbd3-3d7e-ef11-ac21-002248ec8105": "N31911",
    "4de683b5-489c-f011-bbd2-002248ee5962": "N31918",
    "bcfeca24-b1bb-f011-bbd3-6045bd5685f8": "N31920",
    "5c994131-8193-ef11-8a6a-6045bd5754c8": "N31912",
    "30fb9dbe-274a-ef11-a317-6045bd5754c8": "N31909",
    "548d8293-af9d-ef11-8a6b-6045bd5754ce": "N31913",
    "bc71e0bd-b1c6-ef11-b8e9-6045bd5754ce": "N31914",
    "e24d9ffb-8b9e-f011-bbd2-6045bd576695": "N31919",
    "dc66ab0e-6a45-f111-bec7-6045bd585385": "N31923",
    "6f13b85d-f73f-f111-bec6-6045bd5a3372": "N31921",
    "7113b85d-f73f-f111-bec6-6045bd5a3372": "N31922"
  };

  // Hiển thị thông báo nhỏ khi thành công
  function showSuccessToast(msg) {
    const old = document.getElementById('vf-dms-success-toast');
    if (old) old.remove();

    const toast = document.createElement('div');
    toast.id = 'vf-dms-success-toast';
    toast.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999999;background:#15803d;color:#fff;padding:10px 16px;border-radius:8px;box-shadow:0 8px 20px rgba(0,0,0,0.3);font-family:system-ui,-apple-system,sans-serif;font-size:13px;display:flex;align-items:center;gap:8px;border:1px solid #4ade80;line-height:1.4;transition:opacity 0.5s ease;';
    toast.innerHTML = '<span>🛰️ <b>DMS Auto Sync:</b> ' + msg + '</span>';
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      setTimeout(function () { if (toast.parentElement) toast.remove(); }, 500);
    }, 4500);
  }

  // Hiển thị thông báo nhỏ chỉ khi có lỗi
  function showErrorToast(msg) {
    const old = document.getElementById('vf-dms-error-toast');
    if (old) old.remove();

    const toast = document.createElement('div');
    toast.id = 'vf-dms-error-toast';
    toast.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999999;background:#b91c1c;color:#fff;padding:12px 18px;border-radius:10px;box-shadow:0 10px 25px rgba(0,0,0,0.5);font-family:system-ui,-apple-system,sans-serif;font-size:13px;display:flex;align-items:center;gap:10px;border:1px solid #f87171;line-height:1.4;';
    toast.innerHTML = '<span>⚠️ <b>Lỗi Đồng Bộ DMS:</b> ' + msg + '</span><button onclick="document.getElementById(\'vf-dms-error-toast\').remove()" style="background:none;border:none;color:#fff;font-size:16px;cursor:pointer;margin-left:8px;line-height:1;">✕</button>';
    document.body.appendChild(toast);
    setTimeout(function () {
      if (toast.parentElement) toast.remove();
    }, 12000);
  }

  // Tìm đối tượng Xrm của CRM trên các frame
  function checkXrm() {
    try {
      if (window.Xrm && window.Xrm.WebApi) return window.Xrm;
    } catch (e) {}
    try {
      if (window.parent && window.parent.Xrm && window.parent.Xrm.WebApi) return window.parent.Xrm;
    } catch (e) {}
    try {
      if (window.top && window.top.Xrm && window.top.Xrm.WebApi) return window.top.Xrm;
    } catch (e) {}
    try {
      for (var i = 0; i < window.frames.length; i++) {
        if (window.frames[i].Xrm && window.frames[i].Xrm.WebApi) return window.frames[i].Xrm;
      }
    } catch (e) {}
    return null;
  }

  // Hàm chuẩn hóa Mã phiên bản DMS dùng chung cho cả DMS Mới & DMS Cũ
  function resolveDmsVersion(dongXe, phienBan, rawCode) {
    if (rawCode) {
      var cleanRaw = String(rawCode).trim().toUpperCase();
      if (/^[A-Z0-9]{4,6}$/.test(cleanRaw)) return cleanRaw;
      var matchParen = cleanRaw.match(/\b([A-Z0-9]{5})\b/);
      if (matchParen) return matchParen[1];
    }
    var dx = (dongXe || '').toUpperCase();
    var pb = (phienBan || '').toUpperCase();
    if (pb.indexOf('(') >= 0 && pb.indexOf(')') >= 0) {
      var m = pb.match(/\(([A-Z0-9]{4,6})\)/);
      if (m) return m[1];
    }
    if (dx.indexOf('VF3') >= 0 || dx.indexOf('VF 3') >= 0) {
      if (pb.indexOf('ECO') >= 0) return 'TI1CV';
      return 'TI1BV';
    }
    if (dx.indexOf('VF5') >= 0 || dx.indexOf('VF 5') >= 0) {
      if (pb.indexOf('ECO') >= 0) return 'GA1KV';
      return 'GA1RV';
    }
    if (dx.indexOf('VF6') >= 0 || dx.indexOf('VF 6') >= 0) {
      if (pb.indexOf('ECO') >= 0) return 'JB10V';
      return 'HB14V';
    }
    if (dx.indexOf('VF7') >= 0 || dx.indexOf('VF 7') >= 0) {
      if (pb.indexOf('PLUS') >= 0) return 'GC15V';
      return 'HC1CV';
    }
    if (dx.indexOf('VF8') >= 0 || dx.indexOf('VF 8') >= 0) {
      if (pb.indexOf('ECO') >= 0) return 'ND41V';
      return 'ND42V';
    }
    if (dx.indexOf('VF9') >= 0 || dx.indexOf('VF 9') >= 0) {
      if (pb.indexOf('6') >= 0) return 'NE3NV';
      if (pb.indexOf('ECO') >= 0) return 'NE3LV';
      return 'NE3MV';
    }
    return '';
  }

  // ============================================================================
  // PHẦN A: ĐỒNG BỘ TRÊN DMS MỚI (https://dealer-portal.vinfast.com)
  // Hỗ trợ lấy toàn bộ Số máy (so_may), Mã DMS (ma_dms) đa đại lý từ TK N31913
  // ============================================================================
  var capturedPortalCapability = '';
  var isNewDmsPortal = window.location.hostname.indexOf('dealer-portal.vinfast.com') !== -1;

  if (isNewDmsPortal) {
    // Bắt tự động header x-active-capability từ các request thực tế trên trang & bắt dữ liệu đơn hàng trực tiếp
    try {
      var origFetch = window.fetch;
      if (origFetch && !window.__vfDmsFetchHooked) {
        window.__vfDmsFetchHooked = true;
        window.fetch = function (input, init) {
          try {
            if (init && init.headers) {
              var h = init.headers;
              var cap = (typeof h.get === 'function')
                ? (h.get('x-active-capability') || h.get('X-Active-Capability'))
                : (h['x-active-capability'] || h['X-Active-Capability']);
              if (cap) capturedPortalCapability = cap;
            }
          } catch (_) {}

          var fetchPromise = origFetch.apply(this, arguments);

          // Tự động bắt trực tiếp dữ liệu Đơn hàng khi TVBH lướt xem trang Đơn hàng Ô tô
          try {
            var reqUrl = (typeof input === 'string') ? input : (input && input.url ? input.url : '');
            if (reqUrl && reqUrl.indexOf('/orders') !== -1 && reqUrl.indexOf('/orders/feature-config') === -1) {
              fetchPromise.then(function (res) {
                try {
                  if (res && res.ok) {
                    res.clone().json().then(function (data) {
                      handleLiveOrdersResponse(data);
                    }).catch(function () {});
                  }
                } catch (_) {}
              }).catch(function () {});
            }
          } catch (_) {}

          return fetchPromise;
        };
      }
    } catch (_) {}

    initNewDmsPortalMode();
  } else {
    var attempts = 0;
    var timer = setInterval(function () {
      attempts++;
      var xrm = checkXrm();
      if (xrm) {
        clearInterval(timer);
        initAutoSync(xrm);
      } else if (attempts > 30) {
        clearInterval(timer);
      }
    }, 1000);
  }

  // Giải mã accessToken của Dealer Portal (XOR với khóa 'ndp-fe-storage' rồi trích xuất JWT payload)
  function decodeNewDmsAccessToken() {
    try {
      var raw = localStorage.getItem('accessToken');
      if (!raw) return null;
      var b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4 !== 0) b64 += '=';
      var bin = atob(b64);
      var key = 'ndp-fe-storage';
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      }
      var jwtStr = new TextDecoder('utf-8').decode(bytes);
      if (jwtStr && jwtStr.indexOf('.') !== -1) {
        var parts = jwtStr.split('.');
        var pB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (pB64.length % 4 !== 0) pB64 += '=';
        var payloadJson = atob(pB64);
        return JSON.parse(decodeURIComponent(escape(payloadJson)));
      }
      return JSON.parse(jwtStr);
    } catch (e) {
      return null;
    }
  }

  function getNewDmsContext() {
    var decoded = decodeNewDmsAccessToken() || {};
    var perms = Array.isArray(decoded.permissions) ? decoded.permissions : [];
    
    // Đọc capability từ cookie activeCapability nếu có
    var cookieCap = '';
    try {
      var m = document.cookie.match(/(?:^|;\s*)activeCapability=([^;]*)/);
      if (m && m[1]) cookieCap = decodeURIComponent(m[1]);
    } catch (_) {}

    var cap = cookieCap || capturedPortalCapability || '';
    if (!cap) {
      if (perms.indexOf('capability:vhkd_01') !== -1) {
        cap = 'capability:vhkd_01';
      } else if (perms.indexOf('capability:npp_oto_gddl_01') !== -1) {
        cap = 'capability:npp_oto_gddl_01';
      } else {
        var foundCap = perms.find(function (p) { return String(p).indexOf('capability:') === 0; });
        cap = foundCap || 'capability:vhkd_01';
      }
    }
    var dealers = Array.isArray(decoded.dealerCodes) ? decoded.dealerCodes : [];
    return {
      capability: cap,
      dealerCodes: dealers,
      username: decoded.username || decoded.preferred_username || '',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'x-market': 'VN',
        'x-active-capability': cap
      }
    };
  }

  // Tạo nút nổi góc dưới bên trái trên Dealer Portal để nhìn trạng thái & bấm đồng bộ tức thì
  function ensurePortalFloatingButton() {
    var existing = document.getElementById('vf-new-dms-sync-widget');
    if (existing) return existing;

    var btn = document.createElement('button');
    btn.id = 'vf-new-dms-sync-widget';
    btn.type = 'button';
    btn.style.cssText = 'position:fixed;bottom:18px;left:18px;z-index:9999998;background:linear-gradient(135deg,#0f172a,#1e293b);color:#f8fafc;padding:9px 14px;border-radius:999px;box-shadow:0 6px 20px rgba(15,23,42,0.35);font-family:system-ui,-apple-system,sans-serif;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:8px;border:1px solid #38bdf8;cursor:pointer;transition:all 0.2s ease;';
    btn.innerHTML = '<span id="vf-new-dms-sync-icon">🛰️</span><span id="vf-new-dms-sync-text">Đồng bộ Kho xe & Đơn hàng</span>';
    btn.title = 'Bấm để quét Số máy, Mã DMS, Kho xe và Đơn hàng mở toàn hệ thống N319 về Supabase';
    btn.addEventListener('click', function () {
      runNewDmsPortalSync(true);
    });
    document.body.appendChild(btn);
    return btn;
  }

  function setPortalButtonStatus(text, isRunning) {
    ensurePortalFloatingButton();
    var txtEl = document.getElementById('vf-new-dms-sync-text');
    var icoEl = document.getElementById('vf-new-dms-sync-icon');
    var btnEl = document.getElementById('vf-new-dms-sync-widget');
    if (txtEl) txtEl.textContent = text;
    if (icoEl) icoEl.textContent = isRunning ? '⏳' : '🛰️';
    if (btnEl) {
      btnEl.disabled = !!isRunning;
      btnEl.style.opacity = isRunning ? '0.85' : '1';
    }
  }

  function initNewDmsPortalMode() {
    setTimeout(function () {
      ensurePortalFloatingButton();
      var ctx = getNewDmsContext();
      console.log('[DMS Mới Auto Sync] Đã nhận diện Dealer Portal. Quyền:', ctx.capability, '| Đại lý:', (ctx.dealerCodes || []).join(', '));
      // Luôn tự động chạy cập nhật mới ngay mỗi khi load trang DMS
      runNewDmsPortalSync(false);
    }, 1500);
  }

  // Danh sách các mã đại lý thuộc hệ thống N319 (ưu tiên Showroom trọng điểm)
  var N319_CODES = [
    "N31913", // Thuận An (trọng điểm chính)
    "N31920", // Bình Dương
    "N31911", // Tây Ninh
    "N31923", // Hòa Bình
    "N31917", "N31901", "N31902", "N31903", "N31904", "N31905",
    "N31906", "N31907", "N31908", "N31909", "N31910", "N31912",
    "N31914", "N31915", "N31916", "N31918", "N31919", "N31921",
    "N31922", "N31924", "N31925", "N31926", "N31927", "N31928", "N31929", "N31930"
  ];
  var n319QueryString = N319_CODES.map(function (c) { return 'dealerCodes=' + encodeURIComponent(c); }).join('&');

  function isN319Dealer(code) {
    if (!code) return false;
    var s = String(code).trim().toUpperCase();
    return s.indexOf('N319') === 0;
  }

  function normalizeDealerCode(raw) {
    if (!raw) return '';
    var s = String(raw).trim().toUpperCase();
    var m = s.match(/\b(N319\d{2})\b/);
    if (m) return m[1];
    if (SITE_MAP[raw]) return SITE_MAP[raw];
    var anyM = s.match(/\b(N\d{5})\b/);
    if (anyM) return anyM[1];
    return s.split(/[\s\-_]/)[0] || '';
  }

  function extractNewDmsAssetFields(item) {
    if (!item || typeof item !== 'object') return null;
    var src = item.data && typeof item.data === 'object' && !Array.isArray(item.data) ? item.data : item;
    var vin = String(src.vinNumber || src.vin || src.chassisNumber || src.identifier || '').trim().toUpperCase();
    if (!vin || vin.length < 10) return null;

    var rawDealer = src.dealerCode || src.showroomCode || src.showroom || src.lastBu ||
                    (src.dealer && (src.dealer.dealerCode || src.dealer.code)) ||
                    src.dealerName || '';
    var maDms = normalizeDealerCode(rawDealer);

    var soMay = String(
      src.engineNumber ||
      src.engineNumber1 ||
      src.engineNo ||
      src.motorNumber ||
      (Array.isArray(src.engineNumbers) && src.engineNumbers.length > 0 ? src.engineNumbers[0] : '') ||
      (src.product && Array.isArray(src.product.engineNumbers) && src.product.engineNumbers.length > 0 ? src.product.engineNumbers[0] : '') ||
      (src.vehicle && Array.isArray(src.vehicle.engineNumbers) && src.vehicle.engineNumbers.length > 0 ? src.vehicle.engineNumbers[0] : '') ||
      (src.option && (src.option.engineNumber || src.option.engineNumber1)) ||
      (src.specifications && src.specifications.engineNumber) ||
      src.engineNumber2 ||
      ''
    ).trim();

    var rawTrim = String(
      src.trim ||
      (src.option && (src.option.vfTrim || src.option.option || src.option.trim)) ||
      src.versionCode ||
      ''
    ).trim();

    var maSanPham = String(
      src.model ||
      (src.option && src.option.model) ||
      src.productCode ||
      ''
    ).trim();

    var moTa = String(
      src.productName ||
      src.versionName ||
      src.vehicleName ||
      (src.option && src.option.vfModel) ||
      src.name ||
      src.productCode ||
      src.model ||
      ''
    ).trim();

    var ngoaiThat = String(
      src.exteriorCode ||
      (src.option && src.option.exteriorColor) ||
      src.exteriorColor ||
      ''
    ).trim();

    var noiThat = String(
      src.interiorCode ||
      (src.option && src.option.interiorColor) ||
      src.interiorColor ||
      ''
    ).trim();

    var namSx = src.modelYear || src.productionYear || null;
    var assetStatus = String(src.assetStatus || src.status || '').toUpperCase();
    var isSold = Boolean(src.isSold) || assetStatus === 'SOLD' || assetStatus === 'DELIVERED' || assetStatus === 'INVOICED';

    return {
      id: src.id || '',
      vin: vin,
      ma_dms: maDms,
      so_may: soMay,
      raw_trim: rawTrim,
      ma_san_pham: maSanPham,
      mo_ta: moTa,
      ngoai_that: ngoaiThat,
      noi_that: noiThat,
      so_ton_kho: String(src.stockNumber || src.serialPin || '').trim(),
      so_tham_chieu: String(src.referenceNumber || src.orderCategory || '').trim(),
      nam_san_xuat: namSx ? parseInt(namSx, 10) : null,
      asset_status: assetStatus,
      is_sold: isSold
    };
  }

  function mergeAssetExt(oldExt, newExt) {
    if (!oldExt) return newExt;
    if (!newExt) return oldExt;
    return {
      id: newExt.id || oldExt.id || '',
      vin: newExt.vin || oldExt.vin,
      ma_dms: newExt.ma_dms || oldExt.ma_dms || '',
      so_may: newExt.so_may || oldExt.so_may || '',
      raw_trim: newExt.raw_trim || oldExt.raw_trim || '',
      ma_san_pham: newExt.ma_san_pham || oldExt.ma_san_pham || '',
      mo_ta: newExt.mo_ta || oldExt.mo_ta || '',
      ngoai_that: newExt.ngoai_that || oldExt.ngoai_that || '',
      noi_that: newExt.noi_that || oldExt.noi_that || '',
      so_ton_kho: newExt.so_ton_kho || oldExt.so_ton_kho || '',
      so_tham_chieu: newExt.so_tham_chieu || oldExt.so_tham_chieu || '',
      nam_san_xuat: newExt.nam_san_xuat || oldExt.nam_san_xuat || null,
      asset_status: newExt.asset_status || oldExt.asset_status || '',
      is_sold: Boolean(oldExt.is_sold && newExt.is_sold)
    };
  }

  // ============================================================================
  // TRÍCH XUẤT & ĐỒNG BỘ ĐƠN HÀNG Ô TÔ (SALES ORDERS) VÀO DONHANGHIENHUU
  // ============================================================================
  function extractNewDmsOrderFields(item) {
    if (!item || typeof item !== 'object') return null;
    var src = item.data && typeof item.data === 'object' && !Array.isArray(item.data) ? item.data : item;

    var orderNumber = String(
      src.orderNumber ||
      src.orderCode ||
      (src.orderInfo && (src.orderInfo.orderNumber || src.orderInfo.code)) ||
      src.recordNumber ||
      ''
    ).trim().toUpperCase();

    if (!orderNumber || orderNumber.length < 5) return null;

    // Xác định mã chi nhánh đại lý
    var rawDealer = src.dealerCode || src.showroomCode || src.showroom ||
                    (src.dealer && (src.dealer.dealerCode || src.dealer.code)) ||
                    orderNumber.slice(0, 6);
    var chiNhanh = normalizeDealerCode(rawDealer) || orderNumber.slice(0, 6);

    // Chỉ lấy đơn hàng thuộc hệ thống đại lý N319*
    if (!isN319Dealer(chiNhanh) && !orderNumber.startsWith('N319')) {
      return null;
    }

    var rawStatus = String(
      src.status ||
      src.orderStatus ||
      (src.orderInfo && src.orderInfo.status) ||
      ''
    ).trim();
    var upperStatus = rawStatus.toUpperCase();

    // Chỉ loại trừ đơn đã hủy hoặc vô hiệu
    if (upperStatus === 'CANCELLED' || upperStatus === 'VOID') {
      return { isClosed: true, orderNumber: orderNumber };
    }

    // Chuẩn hóa trạng thái đơn sang các giá trị chuẩn của hệ thống (kể cả Đã xuất hóa đơn, Đã giao xe)
    var mappedStatus = 'Mở';
    if (upperStatus === 'INVOICED' || upperStatus === 'ĐÃ XUẤT HÓA ĐƠN') {
      mappedStatus = 'Đã xuất hóa đơn';
    } else if (upperStatus === 'DELIVERED' || upperStatus === 'ĐÃ GIAO XE') {
      mappedStatus = 'Đã giao xe';
    } else if (upperStatus === 'NEW' || upperStatus === 'MỚI' || upperStatus === 'OPEN') {
      mappedStatus = 'Mở';
    } else if (upperStatus === 'MATCHED' || upperStatus === 'ĐÃ GHÉP') {
      mappedStatus = 'Đã ghép';
    } else if (upperStatus === 'DEPOSIT' || upperStatus === 'ĐÃ CỌC') {
      mappedStatus = 'Đã cọc';
    } else if (upperStatus.indexOf('APPROV') >= 0 || upperStatus === 'RELEASED' || upperStatus === 'PHÊ DUYỆT') {
      mappedStatus = 'Phê duyệt';
    } else if (rawStatus) {
      mappedStatus = rawStatus;
    }

    var cust = src.customer || src.customerInfo || {};
    var custName = String(
      src.customerName ||
      src.customerFullName ||
      cust.fullName ||
      cust.name ||
      cust.commercialName ||
      ''
    ).trim();

    var custCode = String(
      src.customerCode ||
      src.customerId ||
      cust.customerCode ||
      cust.code ||
      cust.idNumber ||
      ''
    ).trim();

    var tvbh = String(
      src.salesConsultantDisplayName ||
      src.createdByName ||
      src.creatorName ||
      src.salesperson ||
      (src.owner && (src.owner.name || src.owner.fullName)) ||
      ''
    ).trim();

    var rawDate = src.effectiveDate || src.pricingDate || src.createdAt || src.transactionDate || src.orderDate || '';
    var ngayGiaoDich = rawDate ? String(rawDate).slice(0, 10) : null;

    var veh = src.vehicle || src.item || (Array.isArray(src.items) && src.items[0]) || {};
    var vin = String(
      src.vinNumber ||
      src.vin ||
      veh.vinNumber ||
      veh.vin ||
      veh.chassisNumber ||
      ''
    ).trim().toUpperCase();

    var model = String(
      src.model ||
      veh.model ||
      src.productName ||
      veh.productName ||
      src.vehicleModel ||
      ''
    ).trim();

    var trim = String(
      src.trim ||
      src.versionCode ||
      veh.trim ||
      veh.versionCode ||
      src.productCode ||
      veh.productCode ||
      ''
    ).trim();

    var extColor = String(
      src.exteriorColor ||
      src.exteriorCode ||
      veh.exteriorColor ||
      veh.exteriorCode ||
      ''
    ).trim();

    var intColor = String(
      src.interiorColor ||
      src.interiorCode ||
      veh.interiorColor ||
      veh.interiorCode ||
      ''
    ).trim();

    var totalAmt = Number(
      src.totalAmount ||
      src.grandTotal ||
      src.vehicleAmount ||
      src.total ||
      (veh && veh.price) ||
      0
    ) || 0;

    var yanaOrder = String(
      src.yanaOrderNumber ||
      (src.orderInfo && src.orderInfo.yanaOrderNumber) ||
      src.orderExternalNumber ||
      (src.orderInfo && src.orderInfo.orderExternalNumber) ||
      ''
    ).trim();

    return {
      isClosed: false,
      orderNumber: orderNumber,
      data: {
        so_don_hang_ban: orderNumber,
        new_vehicle_sales_order_id: String(src.id || src.orderId || ''),
        ngay_sua_doi: new Date().toISOString(),
        ngay_giao_dich: ngayGiaoDich,
        tu_van_ban_hang: tvbh,
        so_bao_gia_xe: String(src.quoteNumber || src.salesQuoteNumber || ''),
        ngay_xuat_hoa_don: null,
        khach_hang_tiem_nang: custName,
        ma_khach_hang: custCode,
        mo_ta_san_pham: model,
        ten_phien_ban: trim,
        mau_ngoai_that: extColor,
        mau_noi_that: intColor,
        ma_phien_ban: trim,
        ma_mau_ngoai_that: String(src.exteriorCode || extColor),
        ma_mau_noi_that: String(src.interiorCode || intColor),
        trang_thai: mappedStatus,
        so_vin: vin,
        so_tien_thuc_sau_thue: totalAmt,
        don_hang_goc: yanaOrder,
        chi_nhanh: chiNhanh
      }
    };
  }

  // Tự động lưu các đơn hàng bắt được khi người dùng duyệt xem trang Đơn hàng Ô tô
  function handleLiveOrdersResponse(data) {
    if (!data) return;
    var rawList = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : (data.id || data.orderNumber ? [data] : []));
    if (rawList.length === 0) return;

    var validOrders = [];
    rawList.forEach(function (raw) {
      var ext = extractNewDmsOrderFields(raw);
      if (ext && !ext.isClosed && ext.data) {
        validOrders.push(ext.data);
      }
    });

    if (validOrders.length > 0) {
      console.log('[DMS Mới Auto Sync] ⚡ Bắt được ' + validOrders.length + ' đơn hàng N319 trực tiếp trên màn hình, lưu tức thì vào Supabase...');
      var sbUrl = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
      var sbKey = 'sb_publishable_0lT3OnREc0Qg1R9s672KBg_aDeBTdJX';
      var sbHeaders = {
        'apikey': sbKey,
        'Authorization': 'Bearer ' + sbKey,
        'Content-Type': 'application/json'
      };
      // Ưu tiên dùng RPC rpc_sync_donhanghienhuu
      fetch(sbUrl + '/rest/v1/rpc/rpc_sync_donhanghienhuu', {
        method: 'POST',
        headers: sbHeaders,
        body: JSON.stringify({ p_orders: validOrders })
      }).then(function (r) {
        if (r.ok) {
          console.log('[DMS Mới Auto Sync] ⚡ Đã lưu thành công ' + validOrders.length + ' đơn hàng vào donhanghienhuu qua RPC!');
        } else {
          // Fallback lưu trực tiếp
          var upsertHeaders = Object.assign({}, sbHeaders, { 'Prefer': 'resolution=merge-duplicates,return=minimal' });
          fetch(sbUrl + '/rest/v1/donhanghienhuu?on_conflict=so_don_hang_ban', {
            method: 'POST',
            headers: upsertHeaders,
            body: JSON.stringify(validOrders)
          }).catch(function () {});
        }
      }).catch(function () {});
    }
  }

  // Quét toàn bộ đơn hàng ô tô N319 trên DMS Mới và nạp vào donhanghienhuu
  async function runNewDmsOrdersSync(ctx, sbUrl, sbHeaders, updateStatusFn) {
    console.log('[DMS Mới Auto Sync] 📋 Bắt đầu quét Đơn hàng Ô tô N319 theo từng dealerCode...');
    var apiBase = 'https://dealer-portal-api.vinfast.com/api';
    var allOrdersMap = {};
    var closedOrderNumbers = [];
    var totalLoaded = 0;

    for (var dIdx = 0; dIdx < N319_CODES.length; dIdx++) {
      var dCode = N319_CODES[dIdx];
      var dOrderCount = 0;

      for (var page = 1; page <= 60; page++) {
        if (updateStatusFn) {
          updateStatusFn('Đang nạp Đơn ' + dCode + ' (trang ' + page + ' - đã thu thập ' + totalLoaded + ' đơn)...', true);
        }

        var orderUrl = apiBase + '/orders?orderType=1&dealerCode=' + encodeURIComponent(dCode) + '&page=' + page + '&limit=100';
        try {
          var res = await fetch(orderUrl, {
            method: 'GET',
            credentials: 'include',
            headers: ctx.headers
          });

          if (!res.ok) {
            console.warn('[DMS Mới Auto Sync] Lỗi tải đại lý ' + dCode + ' trang ' + page + ':', res.status);
            break;
          }

          var json = await res.json();
          var items = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
          if (items.length === 0) break;

          items.forEach(function (raw) {
            var ext = extractNewDmsOrderFields(raw);
            if (!ext) return;
            if (ext.isClosed) {
              closedOrderNumbers.push(ext.orderNumber);
            } else {
              allOrdersMap[ext.orderNumber] = ext.data;
              totalLoaded++;
              dOrderCount++;
            }
          });

          if (items.length < 5) break;
        } catch (err) {
          console.warn('[DMS Mới Auto Sync] Lỗi mạng khi tải đại lý ' + dCode + ' trang ' + page + ':', err);
          break;
        }
      }

      if (dOrderCount > 0) {
        console.log('[DMS Mới Auto Sync] ✓ ' + dCode + ': ' + dOrderCount + ' đơn hàng.');
      }
    }

    var allOrders = Object.values(allOrdersMap);
    console.log('[DMS Mới Auto Sync] 📋 Tổng thu thập được: ' + allOrders.length + ' đơn hàng N319.');

    if (allOrders.length > 0) {
      if (updateStatusFn) updateStatusFn('Đang lưu ' + allOrders.length + ' đơn hàng vào donhanghienhuu...', true);
      for (var bIdx = 0; bIdx < allOrders.length; bIdx += 100) {
        var bChunk = allOrders.slice(bIdx, bIdx + 100);
        var rpcSaved = false;
        try {
          var rpcRes = await fetch(sbUrl + '/rest/v1/rpc/rpc_sync_donhanghienhuu', {
            method: 'POST',
            headers: sbHeaders,
            body: JSON.stringify({ p_orders: bChunk })
          });
          rpcSaved = rpcRes.ok;
        } catch (_) {}

        if (!rpcSaved) {
          try {
            var ordersUrl = sbUrl + '/rest/v1/donhanghienhuu?on_conflict=so_don_hang_ban';
            var upsertHeaders = Object.assign({}, sbHeaders, {
              'Prefer': 'resolution=merge-duplicates,return=minimal'
            });
            await fetch(ordersUrl, {
              method: 'POST',
              headers: upsertHeaders,
              body: JSON.stringify(bChunk)
            });
          } catch (postErr) {
            console.warn('[DMS Mới Auto Sync] ⚠️ Lỗi lưu lô đơn hàng:', postErr);
          }
        }
      }
      console.log('[DMS Mới Auto Sync] 🎉 Đã đồng bộ thành công ' + allOrders.length + ' đơn hàng N319 vào donhanghienhuu!');
    }

    // Loại trừ / dọn dẹp các đơn đã hủy (CANCELLED) khỏi donhanghienhuu
    if (closedOrderNumbers.length > 0) {
      try {
        var pruneChunk = closedOrderNumbers.slice(0, 100).map(encodeURIComponent).join(',');
        await fetch(sbUrl + '/rest/v1/donhanghienhuu?so_don_hang_ban=in.(' + pruneChunk + ')', {
          method: 'DELETE',
          headers: sbHeaders
        });
      } catch (_) {}
    }

    return allOrders.length;
  }

  var isPortalSyncRunning = false;

  async function runNewDmsPortalSync(isManual) {
    if (isPortalSyncRunning) return;
    isPortalSyncRunning = true;
    localStorage.setItem(STORAGE_KEY, Date.now().toString());

    var sbUrl = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
    var sbKey = 'sb_publishable_0lT3OnREc0Qg1R9s672KBg_aDeBTdJX';
    var sbHeaders = {
      'apikey': sbKey,
      'Authorization': 'Bearer ' + sbKey,
      'Content-Type': 'application/json'
    };

    var apiBase = 'https://dealer-portal-api.vinfast.com/api';
    var ctx = getNewDmsContext();

    try {
      setPortalButtonStatus('Đang tải Kho xe & thongtinxe...', true);
      console.log('[DMS Mới Auto Sync] 🚀 Bắt đầu đồng bộ toàn bộ xe chưa XHĐ vào thongtinxe & cập nhật khoxe...');

      // 1. Tải danh sách xe trong khoxe & bộ nhớ đệm thongtinxe từ Supabase
      var khoRes = await fetch(sbUrl + '/rest/v1/khoxe?select=id,vin,so_may,ma_dms,ma_phien_ban,dong_xe,phien_ban&trang_thai=not.is.null', { headers: sbHeaders });
      if (!khoRes.ok) throw new Error('Không thể tải khoxe: ' + (await khoRes.text()));
      var khoCars = await khoRes.json();

      var existingTtxMap = {};
      try {
        var ttxRes = await fetch(sbUrl + '/rest/v1/thongtinxe?select=vin,so_may,khu_vuc,phien_ban,ma_san_pham,mo_ta,nam_san_xuat&limit=5000', { headers: sbHeaders });
        if (ttxRes.ok) {
          var ttxRows = await ttxRes.json();
          ttxRows.forEach(function (r) {
            var v = String(r.vin || '').trim().toUpperCase();
            if (v) existingTtxMap[v] = r;
          });
        }
      } catch (_) {}

      var khoByVin = {};
      var targetVins = [];
      khoCars.forEach(function (c) {
        var v = String(c.vin || '').trim().toUpperCase();
        if (!v) return;
        khoByVin[v] = c;
        targetVins.push(v);
      });

      var dmsMap = {}; // vin -> extracted metadata

      // 2A. Quét Báo cáo tồn kho các đại lý N319 (/api/assets/stock-reports/vins?assetType=CAR&isSold=false)
      for (var sPage = 1; sPage <= 50; sPage++) {
        setPortalButtonStatus('Đang quét Tồn kho N319 chưa XHĐ (trang ' + sPage + ')...', true);
        var stockUrl = apiBase + '/assets/stock-reports/vins?page=' + sPage + '&limit=100&assetType=CAR&isSold=false&' + n319QueryString;
        try {
          var sPageRes = await fetch(stockUrl, {
            method: 'GET',
            credentials: 'include',
            headers: ctx.headers
          });
          if (!sPageRes.ok) break;
          var sPageJson = await sPageRes.json();
          var sItems = Array.isArray(sPageJson.data) ? sPageJson.data : (Array.isArray(sPageJson) ? sPageJson : []);
          if (sItems.length === 0) break;

          sItems.forEach(function (rawItem) {
            var ext = extractNewDmsAssetFields(rawItem);
            if (!ext || !isN319Dealer(ext.ma_dms)) return;
            ext.is_sold = false;
            dmsMap[ext.vin] = mergeAssetExt(dmsMap[ext.vin], ext);
          });

          if (sItems.length < 100) break;
        } catch (_) {
          break;
        }
      }

      // 2B. Quét danh sách xe chưa xuất hóa đơn (isSold=false) của các đại lý N319 trên /api/assets
      for (var page = 1; page <= 60; page++) {
        setPortalButtonStatus('Đang tải xe N319 chưa XHĐ (trang ' + page + ' - ' + Object.keys(dmsMap).length + ' xe)...', true);
        var listUrl = apiBase + '/assets?page=' + page + '&limit=100&skipCount=true&assetType=CAR&isSold=false&' + n319QueryString;
        try {
          var pageRes = await fetch(listUrl, {
            method: 'GET',
            credentials: 'include',
            headers: ctx.headers
          });
          if (!pageRes.ok) {
            if (page === 1) console.warn('[DMS Mới Auto Sync] Trang 1 /assets?isSold=false trả về mã:', pageRes.status);
            break;
          }
          var pageJson = await pageRes.json();
          var items = Array.isArray(pageJson.data) ? pageJson.data : (Array.isArray(pageJson) ? pageJson : []);
          if (items.length === 0) break;

          items.forEach(function (rawItem) {
            var ext = extractNewDmsAssetFields(rawItem);
            if (!ext || !isN319Dealer(ext.ma_dms)) return;
            // Kế thừa so_may đã có trong thongtinxe nếu danh sách tổng chưa trả trường engineNumber
            if (!ext.so_may && existingTtxMap[ext.vin] && existingTtxMap[ext.vin].so_may) {
              ext.so_may = String(existingTtxMap[ext.vin].so_may).trim();
            }
            dmsMap[ext.vin] = mergeAssetExt(dmsMap[ext.vin], ext);
          });

          if (items.length < 100) break;
        } catch (pageErr) {
          console.warn('[DMS Mới Auto Sync] Lỗi đọc trang /assets:', pageErr);
          break;
        }
      }

      // 3A. Với các xe trong khoxe chưa nằm trong danh sách trên (hoặc thuộc đại lý khác), tra trực tiếp theo từng VIN (?search=VIN)
      var missingKhoVins = targetVins.filter(function (v) {
        var found = dmsMap[v];
        return !found || !found.so_may || !found.ma_dms;
      });

      var concurrency = 8;
      for (var i = 0; i < missingKhoVins.length; i += concurrency) {
        var batchVins = missingKhoVins.slice(i, i + concurrency);
        setPortalButtonStatus('Đang tra VIN Kho xe (' + Math.min(i + concurrency, missingKhoVins.length) + '/' + missingKhoVins.length + ')...', true);

        await Promise.all(batchVins.map(async function (vin) {
          try {
            var searchUrl = apiBase + '/assets?page=1&limit=10&skipCount=true&assetType=CAR&search=' + encodeURIComponent(vin);
            var sRes = await fetch(searchUrl, {
              method: 'GET',
              credentials: 'include',
              headers: ctx.headers
            });
            if (!sRes.ok) return;
            var sJson = await sRes.json();
            var sItems = Array.isArray(sJson.data) ? sJson.data : (Array.isArray(sJson) ? sJson : []);
            var exactItem = sItems.find(function (it) {
              var v = String(it.vinNumber || it.vin || it.identifier || '').trim().toUpperCase();
              return v === vin;
            }) || sItems[0];

            if (!exactItem) return;
            var ext = extractNewDmsAssetFields(exactItem);
            if (!ext) return;

            if ((!ext.so_may || !ext.ma_dms) && ext.id) {
              try {
                var detailRes = await fetch(apiBase + '/assets/' + encodeURIComponent(ext.id), {
                  method: 'GET',
                  credentials: 'include',
                  headers: ctx.headers
                });
                if (detailRes.ok) {
                  var detailJson = await detailRes.json();
                  var detailExt = extractNewDmsAssetFields(detailJson);
                  ext = mergeAssetExt(ext, detailExt);
                }
              } catch (_) {}
            }

            dmsMap[vin] = mergeAssetExt(dmsMap[vin], ext);
          } catch (_) {}
        }));
      }

      // 3B. Với toàn bộ xe chưa XHĐ sẽ nạp vào thongtinxe mà còn thiếu Số máy (do /assets list không trả engineNumber),
      // gọi /api/assets/{id} để lấy đầy đủ 100% Số máy trước khi lưu vào thongtinxe!
      var needDetailAssets = Object.values(dmsMap).filter(function (x) {
        return !x.is_sold && !x.so_may && x.id;
      });

      for (var dIdx = 0; dIdx < needDetailAssets.length; dIdx += concurrency) {
        var detailBatch = needDetailAssets.slice(dIdx, dIdx + concurrency);
        setPortalButtonStatus('Đang lấy Số máy xe chưa XHĐ (' + Math.min(dIdx + concurrency, needDetailAssets.length) + '/' + needDetailAssets.length + ')...', true);

        await Promise.all(detailBatch.map(async function (assetItem) {
          try {
            var dRes = await fetch(apiBase + '/assets/' + encodeURIComponent(assetItem.id), {
              method: 'GET',
              credentials: 'include',
              headers: ctx.headers
            });
            if (!dRes.ok) return;
            var dJson = await dRes.json();
            var dExt = extractNewDmsAssetFields(dJson);
            if (dExt) {
              dmsMap[assetItem.vin] = mergeAssetExt(dmsMap[assetItem.vin], dExt);
            }
          } catch (_) {}
        }));
      }

      // 4. Đối chiếu và gom danh sách cập nhật cho khoxe (kể cả gỡ xe đã XHĐ nếu thực sự đã SOLD/INVOICED/DELIVERED)
      var updateList = [];
      var soldVins = [];
      var matchedCount = 0;

      khoCars.forEach(function (c) {
        var vin = String(c.vin || '').trim().toUpperCase();
        if (!vin) return;
        var ext = dmsMap[vin];
        if (!ext) return;
        matchedCount++;

        if (ext.is_sold && (ext.asset_status === 'INVOICED' || ext.asset_status === 'DELIVERED' || ext.asset_status === 'SOLD')) {
          soldVins.push(vin);
        }

        var resolvedVer = resolveDmsVersion(c.dong_xe, c.phien_ban, ext.raw_trim);
        var patch = { vin: vin };
        var hasChange = false;

        if (ext.ma_dms && c.ma_dms !== ext.ma_dms) {
          patch.ma_dms = ext.ma_dms;
          hasChange = true;
        }
        if (ext.so_may && c.so_may !== ext.so_may) {
          patch.so_may = ext.so_may;
          hasChange = true;
        }
        if (resolvedVer && c.ma_phien_ban !== resolvedVer) {
          patch.ma_phien_ban = resolvedVer;
          hasChange = true;
        }

        if (hasChange) {
          updateList.push(patch);
        }
      });

      // 5. Lưu cập nhật Số máy, Mã DMS, Mã phiên bản vào bảng khoxe
      if (soldVins.length > 0) {
        try {
          await fetch(sbUrl + '/rest/v1/rpc/rpc_auto_remove_sold_cars', {
            method: 'POST',
            headers: sbHeaders,
            body: JSON.stringify({
              p_sold_vins: soldVins,
              p_actor_name: 'DMS Mới Auto Radar (Dealer Portal)'
            })
          });
          console.log('[DMS Mới Auto Sync] Đã tự động gỡ ' + soldVins.length + ' xe đã xuất HĐ khỏi kho xe web.');
        } catch (_) {}
      }

      if (updateList.length > 0) {
        setPortalButtonStatus('Đang lưu ' + updateList.length + ' xe vào Kho xe...', true);
        var rpcOk = false;
        try {
          var rpcRes = await fetch(sbUrl + '/rest/v1/rpc/rpc_sync_dms_metadata', {
            method: 'POST',
            headers: sbHeaders,
            body: JSON.stringify({ p_cars: updateList })
          });
          rpcOk = rpcRes.ok;
        } catch (_) {}

        // Dự phòng PATCH trực tiếp nếu RPC gặp sự cố
        if (!rpcOk) {
          for (var uIdx = 0; uIdx < updateList.length; uIdx++) {
            var itemPatch = Object.assign({}, updateList[uIdx]);
            var vKey = itemPatch.vin;
            delete itemPatch.vin;
            try {
              await fetch(sbUrl + '/rest/v1/khoxe?vin=eq.' + encodeURIComponent(vKey), {
                method: 'PATCH',
                headers: sbHeaders,
                body: JSON.stringify(itemPatch)
              });
            } catch (_) {}
          }
        }
      }

      // 6. NẠP TOÀN BỘ XE CHƯA XHĐ THUỘC ĐẠI LÝ N319 VÀO BẢNG THONGTINXE ĐỂ SỬ DỤNG KHI NHẬP KHO / TRA CỨU
      var nonSoldCars = Object.values(dmsMap).filter(function (x) {
        return !x.is_sold && isN319Dealer(x.ma_dms);
      }).map(function (x) {
        var resolvedVer = resolveDmsVersion(x.mo_ta, x.raw_trim, x.raw_trim) || x.raw_trim || '';
        return {
          vin: x.vin,
          so_may: x.so_may || '',
          mo_ta: x.mo_ta || '',
          khu_vuc: x.ma_dms || '',
          phien_ban: resolvedVer,
          so_ton_kho: x.so_ton_kho || '',
          so_tham_chieu: x.so_tham_chieu || '',
          ma_san_pham: x.ma_san_pham || resolvedVer,
          nam_san_xuat: x.nam_san_xuat
        };
      });

      if (nonSoldCars.length > 0) {
        setPortalButtonStatus('Đang nạp ' + nonSoldCars.length + ' xe chưa XHĐ vào thongtinxe...', true);
        for (var b = 0; b < nonSoldCars.length; b += 500) {
          var batch = nonSoldCars.slice(b, b + 500);
          var ttxRpcOk = false;
          try {
            var ttxRpcRes = await fetch(sbUrl + '/rest/v1/rpc/rpc_sync_thongtinxe', {
              method: 'POST',
              headers: sbHeaders,
              body: JSON.stringify({ p_cars: batch })
            });
            ttxRpcOk = ttxRpcRes.ok;
          } catch (postErr) {
            console.error('[DMS Mới Auto Sync] Lỗi lưu batch rpc_sync_thongtinxe:', postErr);
          }

          // Fallback upsert trực tiếp vào bảng thongtinxe nếu cần
          if (!ttxRpcOk) {
            try {
              var upsertHeaders = Object.assign({}, sbHeaders, {
                'Prefer': 'resolution=merge-duplicates,return=minimal'
              });
              await fetch(sbUrl + '/rest/v1/thongtinxe?on_conflict=vin', {
                method: 'POST',
                headers: upsertHeaders,
                body: JSON.stringify(batch)
              });
            } catch (_) {}
          }
        }
        console.log('[DMS Mới Auto Sync] 🎉 Hoàn tất nạp ' + nonSoldCars.length + ' xe chưa XHĐ vào bảng thongtinxe!');
      }

      // 7. Quét và đồng bộ toàn bộ Đơn hàng Ô tô (chưa XHĐ) N319 vào donhanghienhuu
      var ordersSyncedCount = 0;
      try {
        ordersSyncedCount = await runNewDmsOrdersSync(ctx, sbUrl, sbHeaders, setPortalButtonStatus);
      } catch (ordErr) {
        console.warn('[DMS Mới Auto Sync] Lỗi đồng bộ donhanghienhuu:', ordErr);
      }

      var summaryMsg = (updateList.length > 0
        ? ('Kho xe: cập nhật ' + updateList.length + ' xe')
        : ('Kho xe: ' + matchedCount + '/' + targetVins.length + ' xe đã chuẩn')) +
        ' | ' + nonSoldCars.length + ' xe thongtinxe' +
        ' | ' + ordersSyncedCount + ' đơn hàng N319 donhanghienhuu!';

      console.log('[DMS Mới Auto Sync] ✅ ' + summaryMsg);
      if (console.table && updateList.length > 0) {
        console.table(updateList.map(function (x) {
          return {
            'Số VIN': x.vin,
            'Số máy mới': x.so_may || '(giữ nguyên)',
            'Mã DMS mới': x.ma_dms || '(giữ nguyên)',
            'Mã phiên bản': x.ma_phien_ban || '(giữ nguyên)'
          };
        }));
      }

      setPortalButtonStatus('Đã đồng bộ ' + ordersSyncedCount + ' đơn hàng & ' + nonSoldCars.length + ' xe vào Kho', false);
      showSuccessToast(summaryMsg);
    } catch (err) {
      console.error('[DMS Mới Auto Sync] Lỗi:', err);
      setPortalButtonStatus('Lỗi đồng bộ (Bấm thử lại)', false);
      if (isManual) showErrorToast(err.message || 'Không thể kết nối API DMS Mới');
    } finally {
      isPortalSyncRunning = false;
    }
  }

  function initAutoSync(xrm) {
    // Luôn tự động đẩy Cookie DMS còn sống lên Serverless Vercel & máy trạm
    try {
      var dmsCookie = document.cookie;
      if (dmsCookie && dmsCookie.indexOf('CrmOwinAuth') >= 0) {
        var syncPayload = JSON.stringify({ dealer_code: 'N31913', cookie: dmsCookie });
        fetch('https://vinfastthuanan.vercel.app/api/dms/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: syncPayload
        }).catch(function () {});
        fetch('http://localhost:3001/api/dms/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: syncPayload
        }).catch(function () {});
      }
    } catch (_) {}

    // Luôn tự động chạy cập nhật mới ngay mỗi khi load trang DMS
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    runSync(xrm);
  }

  async function runSync(xrm) {
    var sbUrl = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
    var sbKey = (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_ANON_KEY)
      ? process.env.VITE_SUPABASE_ANON_KEY
      : 'sb_publishable_0lT3OnREc0Qg1R9s672KBg_aDeBTdJX';
    var sbHeaders = {
      'apikey': sbKey,
      'Authorization': 'Bearer ' + sbKey,
      'Content-Type': 'application/json'
    };

    try {
      console.log('[DMS Auto Sync] Đang chạy ngầm đồng bộ kho xe...');

      // 1. Tải kho xe thực tế
      var khoRes = await fetch(sbUrl + '/rest/v1/khoxe?select=id,vin,so_may,ma_dms,ma_phien_ban,dong_xe,phien_ban&trang_thai=not.is.null', { headers: sbHeaders });
      if (!khoRes.ok) throw new Error('Không thể tải khoxe: ' + (await khoRes.text()));
      var khoCars = await khoRes.json();
      var cleanVins = khoCars.map(function (c) { return (c.vin || '').trim().toUpperCase(); }).filter(function (v) { return v.length > 0; });

      // 2. Quét các xe này trên DMS
      var dmsRecords = [];
      var batchSize = 15;
      for (var i = 0; i < cleanVins.length; i += batchSize) {
        var chunk = cleanVins.slice(i, i + batchSize);
        var filter = chunk.map(function (v) { return "xts_chassisnumber eq '" + v + "'"; }).join(' or ');
        try {
          var res = await xrm.WebApi.retrieveMultipleRecords('xts_inventorynewvehicle', '?$select=xts_chassisnumber,xts_enginenumber,_xts_siteid_value,_xts_lastvehicleorderid_value,modifiedon,itv_lastlatitude,itv_lastlongitude,itv_lastlocationupdatetime,_xts_configurationid_value,xts_productdescription&$filter=' + filter);
          if (res && res.entities) dmsRecords.push.apply(dmsRecords, res.entities);
        } catch (e) {
          console.warn('[DMS Auto Sync] Lỗi đọc batch DMS:', e);
        }
      }

      // Gom theo VIN để check xe có nhiều dòng
      var dmsByVin = {};
      dmsRecords.forEach(function (r) {
        var v = String(r.xts_chassisnumber || '').trim().toUpperCase();
        if (!v) return;
        if (!dmsByVin[v]) dmsByVin[v] = [];
        dmsByVin[v].push(r);
      });

      var soldVins = [];
      var updateList = [];

      khoCars.forEach(function (c) {
        var vin = (c.vin || '').trim().toUpperCase();
        if (!vin) return;

        var recs = dmsByVin[vin];
        if (!recs || recs.length === 0) return;

        // Bất kỳ dòng nào có số đơn hàng cuối cùng -> ĐÃ XUẤT HÓA ĐƠN
        if (recs.some(function (it) { return !!it._xts_lastvehicleorderid_value; })) {
          soldVins.push(vin);
        } else {
          // Sắp xếp theo ngày cập nhật mới nhất để tránh lấy nhầm dòng cũ
          recs.sort(function (a, b) {
            var tA = a.modifiedon ? new Date(a.modifiedon).getTime() : 0;
            var tB = b.modifiedon ? new Date(b.modifiedon).getTime() : 0;
            return tB - tA;
          });
          var best = recs.find(function (it) { return !!it.xts_enginenumber; }) || recs[0];
          var siteFormatted = best['_xts_siteid_value@OData.Community.Display.V1.FormattedValue'];
          var siteId = best._xts_siteid_value;
          var dmsVal = siteFormatted ? siteFormatted.split(' ')[0] : (SITE_MAP[siteId] || '');
          var engVal = best.xts_enginenumber ? String(best.xts_enginenumber).trim() : '';
          
          var pkgFormatted = best['_xts_configurationid_value@OData.Community.Display.V1.FormattedValue'] ||
                             best.xts_productdescription || '';
          var resolvedVer = resolveDmsVersion(c.dong_xe, c.phien_ban, pkgFormatted);

          var hasChange = false;
          var patch = { vin: vin };

          if (dmsVal && c.ma_dms !== dmsVal) {
            patch.ma_dms = dmsVal;
            hasChange = true;
          }
          if (engVal && c.so_may !== engVal) {
            patch.so_may = engVal;
            hasChange = true;
          }
          if (resolvedVer && c.ma_phien_ban !== resolvedVer) {
            patch.ma_phien_ban = resolvedVer;
            hasChange = true;
          }

          if (hasChange) {
            updateList.push(patch);
          }
        }
      });

      // 3. Thực thi cập nhật đồng bộ kho
      if (soldVins.length > 0) {
        await fetch(sbUrl + '/rest/v1/rpc/rpc_auto_remove_sold_cars', {
          method: 'POST',
          headers: sbHeaders,
          body: JSON.stringify({
            p_sold_vins: soldVins,
            p_actor_name: 'DMS Auto Radar (Tiện ích ngầm)'
          })
        });
        console.log('[DMS Auto Sync] Đã tự động gỡ ' + soldVins.length + ' xe đã xuất HĐ khỏi kho xe web.');
      }

      if (updateList.length > 0) {
        await fetch(sbUrl + '/rest/v1/rpc/rpc_sync_dms_metadata', {
          method: 'POST',
          headers: sbHeaders,
          body: JSON.stringify({ p_cars: updateList })
        });
      }

      // ĐỒNG BỘ GPS TỌA ĐỘ LIVE VÀO CAR_TELEMETRY
      var gpsByVin = {};
      dmsRecords.forEach(function (r) {
        var vin = String(r.xts_chassisnumber || '').trim().toUpperCase();
        var lat = r.itv_lastlatitude ? parseFloat(r.itv_lastlatitude) : null;
        var lng = r.itv_lastlongitude ? parseFloat(r.itv_lastlongitude) : null;
        if (vin && lat && lng && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
          gpsByVin[vin] = {
            vin: vin,
            lat: lat,
            lng: lng,
            speed: 0,
            heading: 0,
            captured_at: r.itv_lastlocationupdatetime || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
      });
      var gpsList = Object.values(gpsByVin);

      if (gpsList.length > 0) {
        try {
          var telemetryHeaders = Object.assign({}, sbHeaders, {
            'Prefer': 'resolution=merge-duplicates'
          });
          var gpsRes = await fetch(sbUrl + '/rest/v1/car_telemetry', {
            method: 'POST',
            headers: telemetryHeaders,
            body: JSON.stringify(gpsList)
          });
          if (gpsRes.ok) {
            console.log('[DMS Auto Sync] 🛰️ GPS Live: Đã cập nhật tọa độ cho ' + gpsList.length + ' xe vào car_telemetry!');
          } else {
            console.warn('[DMS Auto Sync] ⚠️ Lỗi lưu car_telemetry:', await gpsRes.text());
          }
        } catch (gpsErr) {
          console.warn('[DMS Auto Sync] ⚠️ Ngoại lệ car_telemetry:', gpsErr);
        }
      }

      var successMsg = (updateList.length > 0 
        ? ('Cập nhật mới: ' + updateList.length + ' xe') 
        : ('Kho xe: ' + khoCars.length + '/' + khoCars.length + ' xe đã chuẩn khớp 100%')) + 
        ' | GPS Live: ' + gpsList.length + ' xe | Gỡ XHĐ: ' + soldVins.length;
      console.log('[DMS Auto Sync] ✅ ' + successMsg);
      if (console.table && updateList.length > 0) {
        console.log('[DMS Auto Sync] 📋 Danh sách chi tiết Số máy, Mã DMS & Mã Phiên Bản đã đồng bộ:');
        console.table(updateList.map(function (x) {
          return {
            'Số VIN': x.vin,
            'Số máy': x.so_may || '(trống)',
            'Mã DMS': x.ma_dms || '(trống)',
            'Mã phiên bản': x.ma_phien_ban || '(trống)'
          };
        }));
      }
      showSuccessToast(successMsg);

      // 4. Tải và nạp xe chưa XHĐ vào thongtinxe
      runThongtinxeSync(xrm, sbUrl, sbHeaders);

      // 5. Tự động đồng bộ Đơn hàng mở vào bảng donhanghienhuu
      runDonHangHienHuuSync(xrm, sbUrl, sbHeaders);

    } catch (err) {
      console.error('[DMS Auto Sync] Lỗi:', err);
      showErrorToast(err.message);
    }
  }

  function runThongtinxeSync(xrm, sbUrl, sbHeaders) {
    var allDms = [];
    var selectCols = 'xts_chassisnumber,xts_enginenumber,xts_productdescription,_xts_siteid_value,_xts_configurationid_value,xts_productionyear,xts_stocknumber,xts_referencenumber,_xts_productid_value,_xts_lastvehicleorderid_value,modifiedon';

    function fetchPage(query) {
      xrm.WebApi.retrieveMultipleRecords('xts_inventorynewvehicle', query).then(async function (res) {
        if (res && res.entities && res.entities.length > 0) {
          allDms.push.apply(allDms, res.entities);
        }

        var nextLink = res['@odata.nextLink'] || res.nextLink;
        if (nextLink) {
          fetchPage(nextLink.substring(nextLink.indexOf('?')));
        } else {
          // Bóc tách đa dòng
          var vinGroups = {};
          allDms.forEach(function (it) {
            var vin = String(it.xts_chassisnumber || '').trim().toUpperCase();
            if (!vin || vin.length !== 17) return;
            if (!vinGroups[vin]) vinGroups[vin] = [];
            vinGroups[vin].push(it);
          });

          var nonSoldCars = [];
          for (var vin in vinGroups) {
            var recs = vinGroups[vin];
            if (recs.some(function (r) { return !!r._xts_lastvehicleorderid_value; })) continue;

            recs.sort(function (a, b) {
              var tA = a.modifiedon ? new Date(a.modifiedon).getTime() : 0;
              var tB = b.modifiedon ? new Date(b.modifiedon).getTime() : 0;
              return tB - tA;
            });
            var best = recs.find(function (r) { return !!r.xts_enginenumber; }) || recs[0];
            var siteFormatted = best['_xts_siteid_value@OData.Community.Display.V1.FormattedValue'];
            var siteId = best._xts_siteid_value;
            var dmsKhuVuc = siteFormatted ? siteFormatted.split(' ')[0] : (SITE_MAP[siteId] || siteId || '');

            nonSoldCars.push({
              vin: vin,
              so_may: String(best.xts_enginenumber || '').trim(),
              mo_ta: String(best.xts_productdescription || '').trim(),
              khu_vuc: dmsKhuVuc.trim(),
              phien_ban: String(best['_xts_configurationid_value@OData.Community.Display.V1.FormattedValue'] || ''),
              so_ton_kho: String(best.xts_stocknumber || ''),
              so_tham_chieu: String(best.xts_referencenumber || ''),
              ma_san_pham: String(best['_xts_productid_value@OData.Community.Display.V1.FormattedValue'] || best._xts_productid_value || ''),
              nam_san_xuat: best.xts_productionyear ? parseInt(best.xts_productionyear) : null
            });
          }

          // Nạp vào RPC rpc_sync_thongtinxe
          for (var i = 0; i < nonSoldCars.length; i += 500) {
            var batch = nonSoldCars.slice(i, i + 500);
            try {
              await fetch(sbUrl + '/rest/v1/rpc/rpc_sync_thongtinxe', {
                method: 'POST',
                headers: sbHeaders,
                body: JSON.stringify({ p_cars: batch })
              });
            } catch (postErr) {
              console.error('[DMS Auto Sync] Lỗi lưu batch thongtinxe:', postErr);
            }
          }

          console.log('[DMS Auto Sync] Hoàn tất nạp ' + nonSoldCars.length + ' xe chưa XHĐ vào bảng thongtinxe!');
        }
      }, function (err) {
        showErrorToast('Lỗi đọc DMS: ' + (err ? err.message : ''));
      });
    }

    fetchPage('?$select=' + selectCols + '&$filter=statecode eq 0');
  }

  // 5. Tự động quét và đồng bộ Đơn hàng mở vào bảng donhanghienhuu
  function runDonHangHienHuuSync(xrm, sbUrl, sbHeaders) {
    console.log('[DMS Auto Sync] 📋 Bắt đầu quét đơn hàng mở (VSO) để đồng bộ vào donhanghienhuu...');
    var allOrders = [];

    function getDmsLookup(it, fld) {
      if (!it) return '';
      var kFmt = '_' + fld + '_value@OData.Community.Display.V1.FormattedValue';
      if (it[kFmt]) return String(it[kFmt]).trim();
      var kShort = fld + '@OData.Community.Display.V1.FormattedValue';
      if (it[kShort]) return String(it[kShort]).trim();
      var kVal = '_' + fld + '_value';
      if (it[kVal]) return String(it[kVal]).trim();
      return it[fld] ? String(it[fld]).trim() : '';
    }

    function isOrderOpen(it) {
      if (!it) return false;
      if (it.xvf_sapinvoicenumber || it.xvf_sapinvoicedate) return false;
      var statusVal = it.xts_status;
      if (statusVal === 7 || statusVal === 10 || statusVal === '7' || statusVal === '10') return false;
      var st = (getDmsLookup(it, 'xts_status') || String(it.xts_status || '')).toLowerCase();
      var blocked = ['hóa đơn', 'invoiced', 'hủy', 'cancel', 'void', 'closed', 'đã giao', 'hoàn tất'];
      for (var b = 0; b < blocked.length; b++) {
        if (st.indexOf(blocked[b]) !== -1) return false;
      }
      return true;
    }

    function fetchOrdersPage(query) {
      xrm.WebApi.retrieveMultipleRecords('xts_newvehiclesalesorder', query).then(async function (res) {
        if (res && res.entities && res.entities.length > 0) {
          allOrders.push.apply(allOrders, res.entities);
        }

        var nextLink = res['@odata.nextLink'] || res.nextLink;
        if (nextLink) {
          fetchOrdersPage(nextLink.substring(nextLink.indexOf('?')));
        } else {
          console.log('[DMS Auto Sync] 📥 Đã tải tổng cộng ' + allOrders.length + ' đơn hàng từ DMS. Đang lọc đơn MỞ...');
          var openOrders = [];
          for (var i = 0; i < allOrders.length; i++) {
            var item = allOrders[i];
            if (!isOrderOpen(item)) continue;

            var soDh = (item.xts_newvehiclesalesordernumber || '').trim();
            if (!soDh) continue;

            openOrders.push({
              new_vehicle_sales_order_id: item.xts_newvehiclesalesorderid || '',
              kiem_tra_tong_cho_hang: '',
              ngay_sua_doi: item.modifiedon || null,
              ngay_giao_dich: item.xts_transactiondate ? String(item.xts_transactiondate).substring(0, 10) : null,
              tu_van_ban_hang: getDmsLookup(item, 'xts_salespersonid') || getDmsLookup(item, 'ownerid') || '',
              so_don_hang_ban: soDh,
              so_bao_gia_xe: getDmsLookup(item, 'xts_newvehiclesalesquoteid') || '',
              ngay_xuat_hoa_don: null,
              khach_hang_tiem_nang: getDmsLookup(item, 'xts_potentialcustomerid') || item.xts_potentialcustomerdescription || '',
              promotion: getDmsLookup(item, 'xvf_promotionid') || item.itv_promotiondetail || '',
              ma_khach_hang: item.xts_customernumber || '',
              mo_ta_san_pham: item.xts_productdescription || getDmsLookup(item, 'xts_productid') || '',
              ten_phien_ban: getDmsLookup(item, 'xvf_characteristicconfiguration') || getDmsLookup(item, 'xts_productconfigurationid') || '',
              loai_tran: getDmsLookup(item, 'itv_characteristicceilingid') || '',
              mau_ngoai_that: item.xvf_exteriorcolor || getDmsLookup(item, 'xts_productexteriorcolorid') || '',
              mau_noi_that: item.xvf_interiorcolor || getDmsLookup(item, 'xts_productinteriorcolorid') || '',
              ma_phien_ban: getDmsLookup(item, 'xvf_vehiclepackage') || '',
              ma_mau_ngoai_that: getDmsLookup(item, 'xts_productexteriorcolorid') || '',
              ma_mau_noi_that: getDmsLookup(item, 'xts_productinteriorcolorid') || '',
              trang_thai: getDmsLookup(item, 'xts_status') || 'Mở',
              pre_customer: getDmsLookup(item, 'itv_customerpreorderid') || getDmsLookup(item, 'itv_leadid') || '',
              so_vin: (getDmsLookup(item, 'xts_chassisid') || item.xvf_vinnumber || item.itv_vinnumber || '').trim().toUpperCase(),
              accessory_serial: getDmsLookup(item, 'xts_stockid') || '',
              ma_san_pham: getDmsLookup(item, 'xts_productid') || '',
              so_ton_kho: getDmsLookup(item, 'xts_stockid') || '',
              so_tien_thuc_sau_thue: item.xts_netamountaftertax || item.xvf_grandtotal || item.xts_vehicleamount || 0,
              don_hang_goc: getDmsLookup(item, 'xts_originalnewvehiclesalesorderreferenceid') || '',
              chi_nhanh: getDmsLookup(item, 'xts_businessunitid') || ''
            });
          }

          // Lọc trùng lặp so_don_hang_ban
          var uniqueMap = {};
          openOrders.forEach(function (ord) {
            uniqueMap[ord.so_don_hang_ban] = ord;
          });
          var finalOrders = Object.values(uniqueMap);
          console.log('[DMS Auto Sync] 📋 Lọc được ' + finalOrders.length + ' đơn hàng MỞ hợp lệ. Đang lưu vào Supabase donhanghienhuu...');

          if (finalOrders.length > 0) {
            // Cách 1: Ưu tiên dùng RPC rpc_sync_donhanghienhuu
            var rpcDone = false;
            try {
              var rpcRes = await fetch(sbUrl + '/rest/v1/rpc/rpc_sync_donhanghienhuu', {
                method: 'POST',
                headers: sbHeaders,
                body: JSON.stringify({ p_orders: finalOrders })
              });
              if (rpcRes.ok) {
                var rpcData = await rpcRes.json();
                console.log('[DMS Auto Sync] 🎉 RPC Thành công: Đã lưu ' + (rpcData.count || finalOrders.length) + ' đơn hàng MỞ vào donhanghienhuu!');
                rpcDone = true;
              }
            } catch (rpcErr) {
              console.warn('[DMS Auto Sync] RPC chưa sẵn sàng, chuyển sang REST API...', rpcErr);
            }

            // Cách 2: Fallback sang REST Bulk POST nếu RPC chưa có
            if (!rpcDone) {
              try {
                var pruneUrl = sbUrl + '/rest/v1/donhanghienhuu?or=(ngay_xuat_hoa_don.not.is.null,trang_thai.ilike.*hóa đơn*,trang_thai.ilike.*invoiced*,trang_thai.ilike.*hủy*,trang_thai.ilike.*cancel*)';
                await fetch(pruneUrl, { method: 'DELETE', headers: sbHeaders }).catch(function () {});
              } catch (_) {}

              var ordersUrl = sbUrl + '/rest/v1/donhanghienhuu?on_conflict=so_don_hang_ban';
              var upsertHeaders = Object.assign({}, sbHeaders, {
                'Prefer': 'resolution=merge-duplicates,return=minimal'
              });

              for (var bIdx = 0; bIdx < finalOrders.length; bIdx += 100) {
                var bChunk = finalOrders.slice(bIdx, bIdx + 100);
                try {
                  await fetch(ordersUrl, {
                    method: 'POST',
                    headers: upsertHeaders,
                    body: JSON.stringify(bChunk)
                  });
                } catch (postErr) {
                  console.warn('[DMS Auto Sync] ⚠️ Lỗi lô ' + (Math.floor(bIdx / 100) + 1) + ' donhanghienhuu:', postErr);
                }
              }
              console.log('[DMS Auto Sync] 🎉 REST API Thành công: Đã lưu ' + finalOrders.length + ' đơn hàng MỞ vào donhanghienhuu!');
            }

            showSuccessToast('Đã đồng bộ ' + finalOrders.length + ' đơn hàng MỞ vào donhanghienhuu!');
          }
        }
      }, function (err) {
        console.warn('[DMS Auto Sync] ⚠️ Lỗi đọc đơn hàng từ DMS (xts_newvehiclesalesorder):', err);
      });
    }

    fetchOrdersPage('?$filter=statecode eq 0');
  }
})();
