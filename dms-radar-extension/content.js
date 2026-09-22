(function () {
  'use strict';

  console.log('[DMS Auto Sync] Tiện ích mở rộng đã được kích hoạt trên DMS.');

  const COOLDOWN_MINUTES = 15; // Giãn cách 15 phút giữa 2 lần chạy để tránh lặp khi chuyển trang
  const STORAGE_KEY = 'vf_dms_last_silent_sync';

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

  function initAutoSync(xrm) {
    var lastRun = localStorage.getItem(STORAGE_KEY);
    if (lastRun) {
      var diffMinutes = (Date.now() - parseInt(lastRun, 10)) / (1000 * 60);
      if (diffMinutes < COOLDOWN_MINUTES) {
        console.log('[DMS Auto Sync] Đã đồng bộ gần đây (' + Math.round(diffMinutes) + ' phút trước). Tạm nghỉ.');
        return;
      }
    }
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    runSync(xrm);
  }

  async function runSync(xrm) {
    var sbUrl = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
    var sbKey = process.env.VITE_SUPABASE_ANON_KEY || "";
    var sbHeaders = {
      'apikey': sbKey,
      'Authorization': 'Bearer ' + sbKey,
      'Content-Type': 'application/json'
    };

    try {
      console.log('[DMS Auto Sync] Đang chạy ngầm đồng bộ kho xe...');

      // 1. Tải kho xe thực tế
      var khoRes = await fetch(sbUrl + '/rest/v1/khoxe?select=id,vin,so_may,ma_dms&trang_thai=not.is.null', { headers: sbHeaders });
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
          var res = await xrm.WebApi.retrieveMultipleRecords('xts_inventorynewvehicle', '?$select=xts_chassisnumber,xts_enginenumber,_xts_siteid_value,_xts_lastvehicleorderid_value,modifiedon&$filter=' + filter);
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
        if (!recs || recs.length === 0) return; // Chưa lên DMS -> giữ nguyên

        // Bất kỳ dòng nào có số đơn hàng cuối cùng -> ĐÃ XUẤT HÓA ĐƠN
        if (recs.some(function (it) { return !!it._xts_lastvehicleorderid_value; })) {
          soldVins.push(vin);
        } else {
          var best = recs.find(function (it) { return !!it.xts_enginenumber; }) || recs[0];
          var siteFormatted = best['_xts_siteid_value@OData.Community.Display.V1.FormattedValue'];
          var dmsVal = siteFormatted ? siteFormatted.split(' ')[0] : (best._xts_siteid_value || '');
          var engVal = best.xts_enginenumber ? String(best.xts_enginenumber).trim() : '';

          if (dmsVal || engVal) {
            updateList.push({
              vin: vin,
              ma_dms: dmsVal || c.ma_dms || null,
              so_may: engVal || c.so_may || null
            });
          }
        }
      });

      // Gỡ xe XHĐ khỏi khoxe (ngầm, an toàn)
      if (soldVins.length > 0) {
        await fetch(sbUrl + '/rest/v1/rpc/rpc_auto_remove_sold_cars', {
          method: 'POST',
          headers: sbHeaders,
          body: JSON.stringify({ p_sold_vins: soldVins, p_actor_name: 'DMS Extension Silent' })
        });
      }

      // Cập nhật mã DMS và số máy
      if (updateList.length > 0) {
        await fetch(sbUrl + '/rest/v1/rpc/rpc_sync_dms_metadata', {
          method: 'POST',
          headers: sbHeaders,
          body: JSON.stringify({ p_cars: updateList })
        });
      }

      console.log('[DMS Auto Sync] Kho xe xong: Cập nhật ' + updateList.length + ' xe, Gỡ ' + soldVins.length + ' xe XHĐ.');

      // 3. Tải và nạp xe chưa XHĐ vào thongtinxe
      runThongtinxeSync(xrm, sbUrl, sbHeaders);

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

            nonSoldCars.push({
              vin: vin,
              so_may: String(best.xts_enginenumber || '').trim(),
              mo_ta: String(best.xts_productdescription || '').trim(),
              khu_vuc: String(best['_xts_siteid_value@OData.Community.Display.V1.FormattedValue'] || best._xts_siteid_value || '').trim(),
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
})();
