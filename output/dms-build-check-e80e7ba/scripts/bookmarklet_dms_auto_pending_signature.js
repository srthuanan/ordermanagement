// Bookmarklet: Tự động đối soát DMS VSO & ARI ➔ Chuyển đơn sang Chờ ký hóa đơn
// Chạy trực tiếp trên trình duyệt đang mở tab VinFast DMS (Dynamics 365)
(function () {
  var _Xrm = window.Xrm || (window.parent && window.parent.Xrm) || (window.top && window.top.Xrm);
  if (!_Xrm || !_Xrm.WebApi) {
    try {
      for (var i = 0; i < window.frames.length; i++) {
        if (window.frames[i].Xrm && window.frames[i].Xrm.WebApi) {
          _Xrm = window.frames[i].Xrm;
          break;
        }
      }
    } catch (e) {}
  }
  if (!_Xrm || !_Xrm.WebApi) {
    alert('⚠️ Vui lòng mở trang VinFast DMS (CRM Dynamics 365) trước khi bấm Bookmarklet này!');
    return;
  }

  var sbUrl = 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
  var sbKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU';
  var sbHeaders = {
    'apikey': sbKey,
    'Authorization': 'Bearer ' + sbKey,
    'Content-Type': 'application/json'
  };

  var oldBox = document.getElementById('dms-ari-checker-box');
  if (oldBox) oldBox.remove();

  var box = document.createElement('div');
  box.id = 'dms-ari-checker-box';
  box.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483647;width:460px;background:#0f172a;color:#f8fafc;padding:20px;border-radius:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.5;border:1px solid rgba(56,189,248,0.3);';
  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid #334155;padding-bottom:10px;">
      <strong style="font-size:14px;color:#38bdf8;display:flex;align-items:center;gap:6px;">
        ⚡ ĐỐI SOÁT DMS VSO ➔ ARI (CHỜ KÝ HÓA ĐƠN)
      </strong>
      <button id="btn-close-ari-box" style="background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;line-height:1;">✕</button>
    </div>
    <div id="ari-main-status" style="margin-bottom:12px;">
      <div style="color:#fbbf24;">⏳ Đang tải danh sách đơn 'Đã phê duyệt' từ Web...</div>
      <div style="width:100%;height:6px;background:#334155;border-radius:3px;overflow:hidden;margin-top:8px;">
        <div id="ari-pbar" style="width:15%;height:100%;background:#38bdf8;transition:width 0.3s;"></div>
      </div>
    </div>
    <div id="ari-sub-log" style="font-size:12px;color:#94a3b8;max-height:200px;overflow-y:auto;background:#090d16;padding:12px;border-radius:10px;border:1px solid #1e293b;display:none;display:flex;flex-direction:column;gap:6px;">
    </div>
  `;
  document.body.appendChild(box);

  var btnClose = document.getElementById('btn-close-ari-box');
  if (btnClose) btnClose.onclick = function () { box.remove(); };

  var mainStatus = document.getElementById('ari-main-status');
  var pbar = document.getElementById('ari-pbar');
  var subLog = document.getElementById('ari-sub-log');

  (async function () {
    try {
      // 1. Lấy danh sách các đơn đang ở trạng thái 'Đã phê duyệt' trên Supabase
      var res = await fetch(sbUrl + '/rest/v1/donhang?select=so_don_hang,ten_khach_hang,vin,ket_qua,ngay_xuat_hoa_don&ket_qua=eq.Đã phê duyệt', {
        headers: sbHeaders
      });
      if (!res.ok) throw new Error('Không thể đọc dữ liệu Supabase: ' + (await res.text()));
      var approvedOrders = await res.json();

      if (!approvedOrders || approvedOrders.length === 0) {
        pbar.style.width = '100%';
        pbar.style.background = '#10b981';
        mainStatus.innerHTML = '<div style="color:#10b981;font-weight:bold;">✅ Hiện không có đơn hàng nào ở trạng thái "Đã phê duyệt".</div><div style="color:#94a3b8;font-size:12px;margin-top:4px;">Tất cả đơn đều đã được xử lý hoặc chưa tới bước này.</div>';
        return;
      }

      var total = approvedOrders.length;
      pbar.style.width = '30%';
      mainStatus.innerHTML = '<div style="color:#38bdf8;">🔍 Đang tra cứu ' + total + ' đơn hàng trên DMS...</div><div style="width:100%;height:6px;background:#334155;border-radius:3px;overflow:hidden;margin-top:8px;"><div id="ari-pbar" style="width:30%;height:100%;background:#38bdf8;transition:width 0.3s;"></div></div>';
      
      subLog.style.display = 'flex';
      var transitionedCount = 0;

      for (var i = 0; i < approvedOrders.length; i++) {
        var ord = approvedOrders[i];
        var soDonHang = (ord.so_don_hang || '').trim();
        var tenKhach = (ord.ten_khach_hang || 'N/A').trim();
        
        var pct = Math.round(30 + ((i + 1) / total) * 60);
        var pbarEl = document.getElementById('ari-pbar');
        if (pbarEl) pbarEl.style.width = pct + '%';

        subLog.innerHTML += '<div>⏳ [' + (i + 1) + '/' + total + '] <b>' + soDonHang + '</b> (' + tenKhach + ')</div>';
        subLog.scrollTop = subLog.scrollHeight;

        try {
          // Tra cứu VSO trên DMS
          var vsoRes = await _Xrm.WebApi.retrieveMultipleRecords(
            'xts_newvehiclesalesorder',
            "?$filter=xts_newvehiclesalesordernumber eq '" + soDonHang + "'&$select=xts_newvehiclesalesorderid,xts_status,xvf_sapinvoicenumber,xvf_sapinvoicedate,xts_salesdate"
          );

          if (!vsoRes || !vsoRes.entities || vsoRes.entities.length === 0) {
            subLog.innerHTML += '<div style="color:#64748b;padding-left:12px;">↳ Chưa có trên DMS</div>';
            continue;
          }

          var vso = vsoRes.entities[0];
          var vsoId = vso.xts_newvehiclesalesorderid;
          var vsoStatus = vso.xts_status;
          var sapInv = vso.xvf_sapinvoicenumber || '';
          var sapDate = vso.xvf_sapinvoicedate || vso.xts_salesdate || '';

          // Kiểm tra VSO có trạng thái Hóa đơn (7=Invoiced, 10=Processing) hoặc có số HĐ SAP
          var isVsoInvoiced = (vsoStatus === 7 || vsoStatus === 10 || !!sapInv || !!sapDate);
          if (!isVsoInvoiced) {
            subLog.innerHTML += '<div style="color:#f59e0b;padding-left:12px;">↳ VSO chưa xuất HĐ (Status: ' + vsoStatus + ')</div>';
            continue;
          }

          // Tra cứu ARI liên kết với VSO
          var ariRes = await _Xrm.WebApi.retrieveMultipleRecords(
            'xts_accountreceivableinvoice',
            "?$filter=_xts_newvehiclesalesorderid_value eq " + vsoId + "&$select=xts_accountreceivableinvoice,xts_status,statecode,createdon&$orderby=createdon desc&$top=1"
          );

          if (!ariRes || !ariRes.entities || ariRes.entities.length === 0) {
            subLog.innerHTML += '<div style="color:#f59e0b;padding-left:12px;">↳ VSO có HĐ nhưng chưa sinh mã ARI</div>';
            continue;
          }

          var ari = ariRes.entities[0];
          var ariNo = (ari.xts_accountreceivableinvoice || '').trim();
          var ariStatus = ari.xts_status;
          var stateCode = ari.statecode;

          // ARI phát hành: xts_status = 2 (Released) hoặc có mã ARI và statecode = 0
          var isAriReleased = (ariStatus === 2 || (!!ariNo && stateCode === 0));
          if (!isAriReleased || !ariNo) {
            subLog.innerHTML += '<div style="color:#f59e0b;padding-left:12px;">↳ ARI chưa phát hành (' + (ariNo || 'Chưa mã') + ')</div>';
            continue;
          }

          // Thỏa mãn 100% điều kiện: VSO có HĐ & ARI đã phát hành!
          var invDate = ari.createdon || new Date().toISOString();

          // Gọi Supabase RPC chuyển sang 'Chờ ký hóa đơn'
          var rpcRes = await fetch(sbUrl + '/rest/v1/rpc/rpc_mark_as_pending_signature', {
            method: 'POST',
            headers: sbHeaders,
            body: JSON.stringify({
              p_order_numbers: [soDonHang],
              p_ngay_xuat_hoa_don: invDate,
              p_actor_email: 'dms_live@vinfast.vn',
              p_actor_name: 'DMS Live Scanner'
            })
          });

          if (rpcRes.ok) {
            transitionedCount++;
            // Ghi chú mã ARI và timestamp chính xác vào yeucauxhd & donhang
            fetch(sbUrl + '/rest/v1/yeucauxhd?so_don_hang=eq.' + encodeURIComponent(soDonHang), {
              method: 'PATCH',
              headers: sbHeaders,
              body: JSON.stringify({ ghi_chu_admin: '[DMS Auto] VSO Hóa đơn, ARI: ' + ariNo, ngay_xuat_hoa_don: invDate })
            }).catch(function(){});
            fetch(sbUrl + '/rest/v1/donhang?so_don_hang=eq.' + encodeURIComponent(soDonHang), {
              method: 'PATCH',
              headers: sbHeaders,
              body: JSON.stringify({ ghi_chu: '[DMS Auto] VSO Hóa đơn, ARI: ' + ariNo, ngay_xuat_hoa_don: invDate })
            }).catch(function(){});

            subLog.innerHTML += '<div style="color:#10b981;padding-left:12px;font-weight:bold;">🎉 ĐÃ CHUYỂN CHỜ KÝ! (ARI: ' + ariNo + ')</div>';
          } else {
            subLog.innerHTML += '<div style="color:#ef4444;padding-left:12px;">❌ Lỗi cập nhật: ' + (await rpcRes.text()) + '</div>';
          }

        } catch (errLoop) {
          subLog.innerHTML += '<div style="color:#ef4444;padding-left:12px;">❌ Lỗi đọc DMS: ' + errLoop.message + '</div>';
        }
      }

      var finalBar = document.getElementById('ari-pbar');
      if (finalBar) {
        finalBar.style.width = '100%';
        finalBar.style.background = '#10b981';
      }
      mainStatus.innerHTML = `
        <div style="color:#10b981;font-weight:bold;font-size:14px;">
          🎉 Hoàn tất đối soát: Đã chuyển ${transitionedCount}/${total} đơn sang Chờ ký!
        </div>
        <div style="color:#94a3b8;font-size:12px;margin-top:4px;">
          Các đơn đã sinh ARI phát hành đều đã tự động cập nhật lên Web.
        </div>
      `;

    } catch (errMain) {
      mainStatus.innerHTML = '<div style="color:#ef4444;font-weight:bold;">❌ Lỗi: ' + errMain.message + '</div>';
    }
  })();
})();
