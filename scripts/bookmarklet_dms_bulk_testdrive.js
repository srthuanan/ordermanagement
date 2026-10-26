// ======================================================================================
// BOOKMARKLET: VINFAST DMS - NHẬP HÀNG LOẠT LỊCH LÁI THỬ (TEST DRIVE BULK IMPORTER)
// Thực thể: Đăng ký Nguồn lực có thể đặt trước (Bookable Resource Booking)
// TỰ ĐỘNG CHỌN SỰ KIỆN TEST DRIVE EVENT & BẺ KHÓA THÀNH CÔNG STATUS 204
// ======================================================================================

(async function () {
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
    alert("⚠️ Vui lòng mở trang VinFast DMS (CRM Dynamics 365) trước khi bấm công cụ này!");
    return;
  }

  var fc = null;
  try {
    if (_Xrm.Page && _Xrm.Page.getAttribute) fc = _Xrm.Page;
    else if (_Xrm.Utility && _Xrm.Utility.getPageContext) fc = _Xrm.Utility.getPageContext().getFormContext();
  } catch (e) {}

  console.log("⚡ [VinFast DMS Tool] Đang khởi động công cụ Nhập Lịch Lái Thử...");

  function formatLocalDate(d) {
    var year = d.getFullYear();
    var month = ("0" + (d.getMonth() + 1)).slice(-2);
    var day = ("0" + d.getDate()).slice(-2);
    return year + "-" + month + "-" + day;
  }

  function formatLocalTime(d) {
    return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }

  // 1. CẤU HÌNH XE LÁI THỬ THUẬN AN
  var currentResource = fc && fc.getAttribute("resource") ? fc.getAttribute("resource").getValue() : null;
  var resourceId = "fa65fb33-1484-f111-ab0e-000d3a8213ad"; // Xe B012 - VF 2 xe lái thử 01
  var resourceName = "B012 - VF 2 xe lái thử 01";

  if (currentResource && currentResource[0]) {
    resourceId = currentResource[0].id.replace(/[{}]/g, "");
    resourceName = currentResource[0].name;
  }

  // 2. CẤU HÌNH SỰ KIỆN TEST DRIVE EVENT (CHUẨN XÁC N31913-TDE-1026-0001)
  var defaultEventId = "bb96eb15-85cf-f111-a05b-00224817239a"; // N31913-TDE-1026-0001
  var defaultEventCode = "N31913-TDE-1026-0001";
  var defaultEventName = "Thu xăng đổi điện";

  // 3. CÁC THÔNG SỐ KHÓA CHUẨN XÁC ĐÃ ĐƯỢC MÁY CHỦ VINFAST PHÊ DUYỆT (STATUS 204)
  var targetModelId = "e92552f3-647b-f111-ab0f-002248ee5474"; // Model VF 2 chuẩn của Thuận An
  var targetEventCommonId = "cbdf98e1-53ca-ed11-b596-002248ebf467"; // Sự kiện Test Drive chung
  var targetBuId = "360e2f16-ba9d-ef11-8a6b-6045bd5754c8";   // Showroom Thuận An N31913
  var targetStatusId = "026bdcef-9257-4c10-9e49-c92539b883d6"; // Committed
  var targetRequirementId = "97d66c26-1ead-ed11-83ff-000d3a85cb76"; // Test Drive Event Car
  var targetModelText = "VF 2";
  var targetVfDivision = 20;
  var targetState = 960810000;
  var targetExternalData = '{"type":"Test_Drive_Event_Car_2023","surveyname":"Test_Drive_Event_Car_2023","toonline":false}';

  // 4. TỰ ĐỘNG ĐIỀN FORM HIỆN TẠI NẾU ĐANG MỞ FORM TRÊN DMS (ĐỂ HẾT BÁO ĐỎ)
  try {
    if (fc) {
      // Tự điền Test Drive Event N31913-TDE-1026-0001 vào form để xóa cảnh báo đỏ bắt buộc!
      if (fc.getAttribute("itv_testdriveeventid")) {
        fc.getAttribute("itv_testdriveeventid").setValue([{
          id: defaultEventId,
          name: defaultEventCode,
          entityType: "itv_testdriveevent"
        }]);
        try { fc.getAttribute("itv_testdriveeventid").fireOnChange(); } catch(e){}
        console.log("✅ Đã tự động điền Test Drive Event N31913-TDE-1026-0001 vào form hiện tại!");
      }

      // Tự điền Xe lái thử nếu đang trống
      if (fc.getAttribute("resource") && !fc.getAttribute("resource").getValue()) {
        fc.getAttribute("resource").setValue([{
          id: resourceId,
          name: resourceName,
          entityType: "bookableresource"
        }]);
        try { fc.getAttribute("resource").fireOnChange(); } catch(e){}
      }

      // Tự điền Model xe nếu đang trống
      if (fc.getAttribute("itv_vehiclemodel") && !fc.getAttribute("itv_vehiclemodel").getValue()) {
        fc.getAttribute("itv_vehiclemodel").setValue([{
          id: targetModelId,
          name: targetModelText,
          entityType: "xts_vehiclemodel"
        }]);
        try { fc.getAttribute("itv_vehiclemodel").fireOnChange(); } catch(e){}
      }
    }
  } catch (errFill) {
    console.warn("Lưu ý khi tự điền form hiện tại:", errFill);
  }

  var today = new Date();
  var dateStr = formatLocalDate(today);

  // Xóa modal cũ nếu có
  var oldBox = document.getElementById("vf-bulk-testdrive-box");
  if (oldBox) oldBox.remove();

  // Tạo Modal Giao Diện Hiện Đại
  var box = document.createElement("div");
  box.id = "vf-bulk-testdrive-box";
  box.style.cssText = `
    position: fixed;
    top: 25px;
    right: 25px;
    z-index: 2147483647;
    width: 710px;
    max-height: 92vh;
    background: #090d16;
    color: #f8fafc;
    border-radius: 18px;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(56, 189, 248, 0.4);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    line-height: 1.5;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    backdrop-filter: blur(25px);
  `;

  box.innerHTML = `
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 15px 20px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; cursor: move;" id="vf-modal-header">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="background: #0284c7; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 0 12px rgba(2, 132, 199, 0.5);">🚗</div>
        <div>
          <div style="font-weight: 800; font-size: 15px; color: #38bdf8; letter-spacing: 0.3px;">VINFAST DMS ⚡ NHẬP HÀNG LOẠT LỊCH LÁI THỬ</div>
          <div style="font-size: 11px; color: #4ade80;">✓ Đã liên kết Test Drive Event: ${defaultEventCode}</div>
        </div>
      </div>
      <button id="vf-btn-close" style="background: #1e293b; border: 1px solid #475569; color: #cbd5e1; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;">✕</button>
    </div>

    <div style="padding: 16px 20px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 12px;">

      <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 12px 14px;">
        <div style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; display: flex; justify-content: space-between;">
          <span>📋 THÔNG TIN CẤU HÌNH XE & SỰ KIỆN:</span>
          <span style="color: #4ade80;">✓ Khối Ô tô: 20 | Thuận An N31913</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; margin-bottom: 8px;">
          <div style="background: #090d16; padding: 8px 10px; border-radius: 8px; border: 1px solid #1e293b;">
            <span style="color: #64748b; font-size: 11px;">Xe lái thử nguồn lực:</span><br>
            <strong style="color: #f1f5f9; font-size: 12px;">${resourceName}</strong>
          </div>
          <div style="background: #090d16; padding: 8px 10px; border-radius: 8px; border: 1px solid #1e293b;">
            <span style="color: #64748b; font-size: 11px;">Dòng xe khớp máy chủ:</span><br>
            <strong style="color: #38bdf8; font-size: 12px;">${targetModelText} (Chuẩn Thuận An)</strong>
          </div>
        </div>

        <div style="background: #090d16; padding: 8px 10px; border-radius: 8px; border: 1px solid #1e293b;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="color: #64748b; font-size: 11px;">Sự kiện lái thử (Test Drive Event):</span>
            <span style="color: #4ade80; font-size: 11px; font-weight: 600;">✓ Bắt buộc trên DMS</span>
          </div>
          <select id="vf-sel-event" style="width: 100%; box-sizing: border-box; background: #1e293b; border: 1px solid #334155; color: #38bdf8; font-weight: 600; padding: 6px 10px; border-radius: 6px; font-size: 12px; outline: none;">
            <option value="${defaultEventId}" selected>${defaultEventCode} - ${defaultEventName}</option>
          </select>
        </div>
      </div>

      <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;">
        <div style="font-size: 11px; font-weight: 700; color: #fbbf24; text-transform: uppercase; letter-spacing: 0.5px;">⏰ CẤU HÌNH THỜI GIAN LÁI THỬ (HÔM NAY):</div>
        <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 10px;">
          <div>
            <label style="color: #94a3b8; font-size: 11px; display: block; margin-bottom: 3px;">Ngày lái thử</label>
            <input type="date" id="vf-in-date" value="${dateStr}" style="width: 100%; box-sizing: border-box; background: #1e293b; border: 1px solid #334155; color: #f8fafc; padding: 6px 10px; border-radius: 8px; font-size: 12px; outline: none;">
          </div>
          <div>
            <label style="color: #94a3b8; font-size: 11px; display: block; margin-bottom: 3px;">Giờ bắt đầu ca 1</label>
            <input type="time" id="vf-in-time" value="14:00" style="width: 100%; box-sizing: border-box; background: #1e293b; border: 1px solid #334155; color: #f8fafc; padding: 6px 10px; border-radius: 8px; font-size: 12px; outline: none;">
          </div>
          <div>
            <label style="color: #94a3b8; font-size: 11px; display: block; margin-bottom: 3px;">Khoảng thời gian (Duration)</label>
            <select id="vf-in-dur" style="width: 100%; box-sizing: border-box; background: #1e293b; border: 1px solid #334155; color: #f8fafc; padding: 6px 10px; border-radius: 8px; font-size: 12px; outline: none;">
              <option value="15" selected>15 phút</option>
              <option value="20">20 phút</option>
              <option value="30">30 phút</option>
              <option value="45">45 phút</option>
              <option value="60">60 phút</option>
              <option value="0">Cùng chung khung giờ</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
          <label style="font-weight: 700; color: #e2e8f0; font-size: 12px;">DÁN DỮ LIỆU TỪ EXCEL (HỌ TÊN, SỐ ĐIỆN THOẠI, CMND/CCCD, EMAIL):</label>
          <span style="font-size: 11px; color: #38bdf8; cursor: pointer; text-decoration: underline;" id="vf-btn-demo">Dán danh sách mẫu</span>
        </div>
        <textarea id="vf-txt-data" rows="4" placeholder="Copy các cột trong Excel rồi bấm Ctrl+V vào đây...&#10;Định dạng hỗ trợ: [Họ và tên] [Tab] [Số điện thoại] [Tab] [CMND/CCCD] [Tab] [Email (nếu có)]" style="width: 100%; box-sizing: border-box; background: #0b1120; border: 1px solid #334155; color: #f8fafc; padding: 10px; border-radius: 10px; font-family: monospace; font-size: 12px; line-height: 1.5; resize: vertical; outline: none;"></textarea>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center;">
        <button id="vf-btn-inspect" style="background: #1e293b; border: 1px solid #475569; color: #e2e8f0; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer;">🔍 Xem trước danh sách</button>
        <span id="vf-txt-summary" style="font-size: 12px; color: #94a3b8;">Chưa nạp dữ liệu</span>
      </div>

      <div id="vf-table-box" style="display: none; max-height: 160px; overflow-y: auto; background: #0b1120; border: 1px solid #1e293b; border-radius: 10px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
          <thead>
            <tr style="background: #1e293b; color: #94a3b8; position: sticky; top: 0;">
              <th style="padding: 6px 8px; border-bottom: 1px solid #334155;">#</th>
              <th style="padding: 6px 8px; border-bottom: 1px solid #334155;">Họ và tên</th>
              <th style="padding: 6px 8px; border-bottom: 1px solid #334155;">Số điện thoại</th>
              <th style="padding: 6px 8px; border-bottom: 1px solid #334155;">CMND/CCCD</th>
              <th style="padding: 6px 8px; border-bottom: 1px solid #334155;">Khung giờ (15p)</th>
              <th style="padding: 6px 8px; border-bottom: 1px solid #334155;">Trạng thái</th>
            </tr>
          </thead>
          <tbody id="vf-tbody-rows"></tbody>
        </table>
      </div>

      <div id="vf-pbar-box" style="display: none;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; margin-bottom: 3px;">
          <span id="vf-pbar-lbl">Đang nhập dữ liệu vào VinFast DMS...</span>
          <span id="vf-pbar-num">0%</span>
        </div>
        <div style="width: 100%; height: 6px; background: #1e293b; border-radius: 3px; overflow: hidden;">
          <div id="vf-pbar-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #0284c7, #38bdf8); transition: width 0.2s;"></div>
        </div>
      </div>

    </div>

    <div style="background: #0f172a; padding: 12px 20px; border-top: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 11px; color: #64748b;">VinFast Showroom Thuận An</span>
      <button id="vf-btn-execute" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; border: none; padding: 8px 22px; border-radius: 9px; font-weight: 700; font-size: 13px; cursor: pointer; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4);">🚀 BẮT ĐẦU NHẬP HÀNG LOẠT VÀO DMS</button>
    </div>
  `;

  document.body.appendChild(box);

  // Truy vấn thêm các sự kiện Test Drive Event khác nếu có trong CRM
  try {
    _Xrm.WebApi.retrieveMultipleRecords("itv_testdriveevent", "?$filter=statecode eq 0&$orderby=createdon desc&$top=10").then(function (results) {
      if (results && results.entities && results.entities.length > 0) {
        var sel = document.getElementById("vf-sel-event");
        if (sel) {
          sel.innerHTML = "";
          results.entities.forEach(function (ev, idx) {
            var opt = document.createElement("option");
            opt.value = ev.itv_testdriveeventid;
            opt.textContent = (ev.itv_code || "Sự kiện") + " - " + (ev.itv_name || "");
            if (ev.itv_code === defaultEventCode || idx === 0) opt.selected = true;
            sel.appendChild(opt);
          });
        }
      }
    }).catch(function(e){ console.warn("Lấy thêm events:", e); });
  } catch (e) {}

  var btnClose = document.getElementById("vf-btn-close");
  btnClose.onclick = function () { box.remove(); };

  var header = document.getElementById("vf-modal-header");
  var isDragging = false, startX, startY, origLeft, origTop;
  header.onmousedown = function (e) {
    if (e.target === btnClose) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    var rect = box.getBoundingClientRect();
    origLeft = rect.left;
    origTop = rect.top;
    box.style.right = "auto";
    box.style.left = origLeft + "px";
    box.style.top = origTop + "px";
  };
  window.onmousemove = function (e) {
    if (!isDragging) return;
    box.style.left = (origLeft + e.clientX - startX) + "px";
    box.style.top = (origTop + e.clientY - startY) + "px";
  };
  window.onmouseup = function () { isDragging = false; };

  document.getElementById("vf-btn-demo").onclick = function () {
    document.getElementById("vf-txt-data").value =
      "Nguyễn Văn Vũ\t0975182330\t560489017902\n" +
      "Trần Thị Mai Anh\t0912345678\t079198005678\n" +
      "Lê Hoàng Phúc\t0908889999\t079092003456\n" +
      "Phạm Quốc Bảo\t0933221100\t";
    parseInputRows();
  };

  var customerList = [];

  function parseInputRows() {
    var raw = document.getElementById("vf-txt-data").value.trim();
    if (!raw) {
      alert("Vui lòng dán danh sách khách hàng từ Excel vào trước!");
      return;
    }

    var baseDate = document.getElementById("vf-in-date").value;
    var baseTime = document.getElementById("vf-in-time").value;
    var duration = parseInt(document.getElementById("vf-in-dur").value, 10);

    var dParts = baseDate.split("-");
    var tParts = baseTime.split(":");
    var startDT = new Date(parseInt(dParts[0], 10), parseInt(dParts[1], 10) - 1, parseInt(dParts[2], 10), parseInt(tParts[0], 10), parseInt(tParts[1], 10), 0);

    var lines = raw.split("\n");
    customerList = [];
    var currentSlot = new Date(startDT.getTime());

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;

      var parts = line.split("\t");
      if (parts.length < 2) parts = line.split(",");
      if (parts.length < 2) parts = line.split(";");

      var name = (parts[0] || "").trim();
      var phone = (parts[1] || "").trim().replace(/[^0-9]/g, "");
      var cccd = (parts[2] || "").trim();
      var email = (parts[3] || "").trim();

      if (phone.length > 11 && cccd.length >= 9 && cccd.length <= 11) {
        var temp = phone; phone = cccd; cccd = temp;
      }
      if (phone.length === 9 && phone.charAt(0) !== "0") phone = "0" + phone;
      if (!email || email.indexOf("@") === -1) email = "null@gmail.com";

      var sTime = new Date(currentSlot.getTime());
      var eTime;
      if (duration > 0) {
        eTime = new Date(currentSlot.getTime() + duration * 60 * 1000);
        currentSlot = new Date(eTime.getTime());
      } else {
        eTime = new Date(currentSlot.getTime() + 15 * 60 * 1000);
      }

      customerList.push({
        idx: i + 1,
        name: name,
        phone: phone,
        cccd: cccd,
        email: email,
        startTime: sTime,
        endTime: eTime,
        duration: duration || 15
      });
    }

    renderTableRows();
  }

  function renderTableRows() {
    var tbody = document.getElementById("vf-tbody-rows");
    tbody.innerHTML = "";

    document.getElementById("vf-table-box").style.display = "block";
    document.getElementById("vf-txt-summary").innerHTML = `<strong style="color: #38bdf8;">${customerList.length}</strong> khách hàng đã sẵn sàng`;

    customerList.forEach(function (c) {
      var tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid #1e293b";

      var timeStr = formatLocalTime(c.startTime) + " - " + formatLocalTime(c.endTime);

      tr.innerHTML = `
        <td style="padding: 6px 8px; color: #64748b;">${c.idx}</td>
        <td style="padding: 6px 8px; font-weight: 600; color: #f1f5f9;">${c.name}</td>
        <td style="padding: 6px 8px; color: #cbd5e1; font-family: monospace;">${c.phone}</td>
        <td style="padding: 6px 8px; color: #94a3b8; font-family: monospace;">${c.cccd || "---"}</td>
        <td style="padding: 6px 8px; color: #fbbf24;">${timeStr}</td>
        <td style="padding: 6px 8px; color: #94a3b8;" id="vf-row-status-${c.idx}">Chờ...</td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById("vf-btn-inspect").onclick = parseInputRows;

  var isProcessing = false;

  document.getElementById("vf-btn-execute").onclick = async function () {
    if (isProcessing) return;
    if (customerList.length === 0) {
      parseInputRows();
      if (customerList.length === 0) return;
    }

    var selectedEventEl = document.getElementById("vf-sel-event");
    var activeEventId = selectedEventEl ? selectedEventEl.value : defaultEventId;
    var activeEventText = selectedEventEl && selectedEventEl.options[selectedEventEl.selectedIndex] ? selectedEventEl.options[selectedEventEl.selectedIndex].text : defaultEventCode;

    if (!confirm(`Xác nhận bắt đầu nhập ${customerList.length} lịch lái thử vào hệ thống VinFast DMS?\n\n- Sự kiện: ${activeEventText}\n- Xe lái thử: ${resourceName}\n- Dòng xe: ${targetModelText}\n- Ngày lái thử: ${document.getElementById("vf-in-date").value}`)) {
      return;
    }

    isProcessing = true;
    var btnExec = document.getElementById("vf-btn-execute");
    btnExec.disabled = true;
    btnExec.style.opacity = "0.5";
    btnExec.innerText = "⏳ Đang nhập dữ liệu...";

    var pbox = document.getElementById("vf-pbar-box");
    var pfill = document.getElementById("vf-pbar-fill");
    var plbl = document.getElementById("vf-pbar-lbl");
    var pnum = document.getElementById("vf-pbar-num");
    pbox.style.display = "block";

    var successCount = 0;
    var failCount = 0;

    for (var i = 0; i < customerList.length; i++) {
      var item = customerList[i];
      var statusEl = document.getElementById("vf-row-status-" + item.idx);
      if (statusEl) statusEl.innerHTML = `<span style="color: #38bdf8;">Đang tạo...</span>`;

      plbl.innerText = `Đang xử lý ${i + 1}/${customerList.length}: ${item.name}...`;
      var pct = Math.round(((i + 1) / customerList.length) * 100);
      pfill.style.width = pct + "%";
      pnum.innerText = pct + "%";

      try {
        var payload = {
          "name": item.name + " - Lái thử " + targetModelText,
          "starttime": item.startTime.toISOString(),
          "endtime": item.endTime.toISOString(),
          "duration": item.duration,
          "itv_name": item.name,
          "itv_phone": item.phone,
          "itv_email": item.email || "null@gmail.com",
          "itv_vfdivision": targetVfDivision,
          "itv_vehiclemodeltext": targetModelText,
          "itv_state": targetState,
          "bookingtype": 1,
          "statuscode": 1,
          "msdyn_effort": 1,
          "msdyn_bookingmethod": 690970003,
          "itv_externaldata": targetExternalData,
          "Resource@odata.bind": `/bookableresources(${resourceId})`,
          "BookingStatus@odata.bind": `/bookingstatuses(${targetStatusId})`,
          "msdyn_ResourceRequirement@odata.bind": `/msdyn_resourcerequirements(${targetRequirementId})`,
          "itv_testdriveeventname@odata.bind": `/xts_commons(${targetEventCommonId})`,
          "itv_testdriveeventid@odata.bind": `/itv_testdriveevents(${activeEventId})`,
          "itv_vehiclemodel@odata.bind": `/xts_vehiclemodels(${targetModelId})`,
          "itv_businessunit@odata.bind": `/businessunits(${targetBuId})`
        };

        console.log(`[Khách ${i + 1}] Gửi Payload Bẻ Khóa Kèm Test Drive Event:`, payload);

        var res = await _Xrm.WebApi.createRecord("bookableresourcebooking", payload);

        successCount++;
        if (statusEl) statusEl.innerHTML = `<strong style="color: #4ade80;">✅ Thành công</strong>`;
      } catch (err) {
        console.error(`[Khách ${i + 1}] Lỗi tạo bản ghi:`, err);
        var fullError = err.message || (err.error ? err.error.message : JSON.stringify(err));
        failCount++;
        if (statusEl) {
          var safeErr = (fullError || "Lỗi không xác định").replace(/'/g, "\\'").replace(/"/g, "&quot;");
          statusEl.innerHTML = `<strong style="color: #f87171; cursor: pointer;" onclick="alert('Chi tiết lỗi DMS:\\n' + this.getAttribute('data-err'));" data-err="${safeErr}" title="Bấm xem chi tiết lỗi">❌ Lỗi (Bấm xem)</strong>`;
        }
      }

      await new Promise(r => setTimeout(r, 200));
    }

    isProcessing = false;
    btnExec.disabled = false;
    btnExec.style.opacity = "1";
    btnExec.innerText = "🚀 NHẬP ĐỢT KHÁC";

    plbl.innerHTML = `Hoàn tất: <strong style="color: #4ade80;">${successCount} thành công</strong>, <strong style="color: #f87171;">${failCount} lỗi</strong>`;

    if (failCount > 0) {
      alert(`ĐÃ HOÀN TẤT!\n\n- Thành công: ${successCount} khách\n- Lỗi: ${failCount} khách\n\nAnh/chị bấm vào chữ "❌ Lỗi (Bấm xem)" để xem thông báo chi tiết!`);
    } else {
      alert(`🎉 ĐÃ HOÀN TẤT NHẬP HÀNG LOẠT!\n\n- Thành công: ${successCount} khách\n\nAnh/chị có thể bấm F5 hoặc Tải lại trang Lập lịch trình để xem danh sách xe mới tạo!`);
    }
  };

  console.log("✅ Đã khởi tạo công cụ Nhập hàng loạt Lịch Lái thử VinFast DMS kèm tự động chọn Test Drive Event chuẩn 100%!");
})();
