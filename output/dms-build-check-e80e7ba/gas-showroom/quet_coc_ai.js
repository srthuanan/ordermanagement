//=================================================================================
// TÍNH NĂNG: TẢI ẢNH BIÊN BẢN COC & AI GEMINI QUÉT ĐỒNG BỘ TỰ ĐỘNG
// (CHẠY TRỰC TIẾP TỪ BROWSER - BẢO TOÀN TUYỆT ĐỐI KHÔNG GHI ĐÈ)
//=================================================================================

var SB_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co";
var SB_ANON = "sb_publishable_0lT3OnREc0Qg1R9s672KBg_aDeBTdJX";
var SB_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU";

function moHopThoaiQuetCoc() {
  var htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <base target="_top">
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 16px;
        color: #1e293b;
        background-color: #f8fafc;
      }
      .card {
        background: #ffffff;
        border-radius: 12px;
        padding: 18px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        border: 1px solid #e2e8f0;
      }
      h3 {
        margin-top: 0;
        color: #0f172a;
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .upload-area {
        border: 2px dashed #94a3b8;
        border-radius: 10px;
        padding: 24px 16px;
        text-align: center;
        background: #f1f5f9;
        cursor: pointer;
        transition: all 0.2s;
        margin: 14px 0;
      }
      .upload-area:hover, .upload-area.dragover {
        border-color: #2563eb;
        background: #eff6ff;
      }
      .upload-icon {
        font-size: 32px;
        margin-bottom: 8px;
      }
      .tip-text {
        font-size: 12px;
        color: #64748b;
        margin-top: 6px;
      }
      #preview {
        max-width: 100%;
        max-height: 180px;
        border-radius: 8px;
        margin-top: 10px;
        display: none;
        object-fit: contain;
        border: 1px solid #cbd5e1;
      }
      .btn {
        background: #1e293b;
        color: #ffffff;
        border: none;
        padding: 11px 18px;
        border-radius: 8px;
        font-weight: bold;
        font-size: 13px;
        cursor: pointer;
        width: 100%;
        transition: 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .btn:hover {
        background: #0f172a;
      }
      .btn:disabled {
        background: #94a3b8;
        cursor: not-allowed;
      }
      #statusBox {
        margin-top: 14px;
        padding: 12px;
        border-radius: 8px;
        font-size: 13px;
        display: none;
        line-height: 1.5;
        max-height: 220px;
        overflow-y: auto;
      }
      .status-loading {
        background: #e0f2fe;
        color: #0369a1;
        border: 1px solid #bae6fd;
      }
      .status-success {
        background: #dcfce7;
        color: #15803d;
        border: 1px solid #bbf7d0;
      }
      .status-error {
        background: #fee2e2;
        color: #b91c1c;
        border: 1px solid #fecaca;
      }
      .vin-tag {
        display: inline-block;
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: monospace;
        font-weight: bold;
        margin: 2px;
      }
      .vin-tag-skip {
        display: inline-block;
        background: #fef3c7;
        border: 1px solid #fcd34d;
        color: #92400e;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: monospace;
        font-weight: bold;
        margin: 2px;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h3>📸 AI Quét Biên Bản Bàn Giao COC</h3>
      <p style="font-size: 13px; color: #475569; margin: 4px 0 10px 0;">
        Tải ảnh hoặc bấm <b>Ctrl + V</b> để dán ảnh trực tiếp từ Zalo. AI sẽ tự động đọc số VIN và cập nhật ngày COC về hôm nay.
        <br><span style="color: #b91c1c; font-size: 12px;">🛡️ <b>Bảo toàn dữ liệu</b>: Tuyệt đối không ghi đè lên các xe đã có ngày COC về từ trước.</span>
      </p>

      <div class="upload-area" id="dropZone" onclick="document.getElementById('fileInput').click()">
        <div class="upload-icon">📁</div>
        <div style="font-weight: bold; font-size: 14px;">Bấm để chọn ảnh hoặc kéo thả vào đây</div>
        <div class="tip-text">Hỗ trợ dán trực tiếp (Ctrl + V) ảnh chụp màn hình / ảnh Zalo</div>
        <input type="file" id="fileInput" accept="image/*" style="display: none;" onchange="handleFileSelect(event)">
        <img id="preview" alt="Xem trước ảnh">
      </div>

      <button id="btnScan" class="btn" onclick="startScan()" disabled>
        <span>🚀 Bắt Đầu Quét & Đồng Bộ Tự Động</span>
      </button>

      <div id="statusBox"></div>
    </div>

    <script>
      const SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co";
      const SUPABASE_ANON = "sb_publishable_0lT3OnREc0Qg1R9s672KBg_aDeBTdJX";
      const SUPABASE_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU";

      let currentBase64 = null;
      let currentMime = 'image/jpeg';

      window.addEventListener('paste', function(e) {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
            const blob = items[i].getAsFile();
            readImageBlob(blob);
            break;
          }
        }
      });

      const dropZone = document.getElementById('dropZone');
      ['dragenter', 'dragover'].forEach(name => {
        dropZone.addEventListener(name, (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
      });
      ['dragleave', 'drop'].forEach(name => {
        dropZone.addEventListener(name, (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); });
      });
      dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files[0] && files[0].type.startsWith('image/')) {
          readImageBlob(files[0]);
        }
      });

      function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) readImageBlob(file);
      }

      function readImageBlob(file) {
        currentMime = file.type || 'image/jpeg';
        const reader = new FileReader();
        reader.onload = function(e) {
          const dataUrl = e.target.result;
          currentBase64 = dataUrl.split(',')[1];
          const preview = document.getElementById('preview');
          preview.src = dataUrl;
          preview.style.display = 'block';
          document.getElementById('btnScan').disabled = false;
          showStatus('', '');
        };
        reader.readAsDataURL(file);
      }

      function showStatus(text, type) {
        const box = document.getElementById('statusBox');
        if (!text) {
          box.style.display = 'none';
          return;
        }
        box.className = 'status-' + type;
        box.innerHTML = text;
        box.style.display = 'block';
      }

      async function startScan() {
        if (!currentBase64) return;
        const btn = document.getElementById('btnScan');
        btn.disabled = true;
        btn.innerText = '⏳ AI Đang Quét & Đồng Bộ... Vui lòng chờ';
        showStatus('🤖 Đang gửi ảnh tới AI Gemini để trích xuất số VIN (Gọi trực tiếp qua Edge Function)...', 'loading');

        try {
          // BƯỚC 1: Gọi Edge Function scan-pdf trực tiếp từ Browser
          const resp = await fetch(SUPABASE_URL + "/functions/v1/scan-pdf", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": SUPABASE_ANON,
              "Authorization": "Bearer " + SUPABASE_ANON
            },
            body: JSON.stringify({
              files: [{ base64Data: currentBase64, mimeType: currentMime }],
              action: "scan-coc-receipt"
            })
          });

          const resJson = await resp.json();
          if (!resJson.success || !resJson.data || !resJson.data.danh_sach_xe) {
            throw new Error(resJson.error || "AI không tìm thấy số khung xe nào trong ảnh biên bản!");
          }

          const rawList = resJson.data.danh_sach_xe;
          const vins = [];
          for (let item of rawList) {
            if (item.so_khung) {
              const clean = item.so_khung.trim().toUpperCase();
              if (!vins.includes(clean)) vins.push(clean);
            }
          }

          if (vins.length === 0) {
            throw new Error("Không bóc tách được số VIN hợp lệ từ biên bản!");
          }

          showStatus('⚡ Đã tìm thấy ' + vins.length + ' số VIN! Đang đồng bộ Google Sheet & Supabase...', 'loading');

          // BƯỚC 2: Gọi Apps Script để cập nhật Google Sheet RÚT COC
          google.script.run
            .withSuccessHandler(async function(resSheet) {
              if (!resSheet || !resSheet.success) {
                btn.disabled = false;
                btn.innerText = '🚀 Bắt Đầu Quét & Đồng Bộ Tự Động';
                showStatus('❌ Lỗi cập nhật Sheet: ' + (resSheet ? resSheet.error : 'Không rõ'), 'error');
                return;
              }

              // BƯỚC 3: Đồng bộ vào Supabase các xe chưa có ngày về
              const targetDate = resSheet.targetDate;
              for (let v of vins) {
                try {
                  // Chỉ PATCH nếu xe chưa có ngay_coc_ve
                  const chk = await fetch(SUPABASE_URL + "/rest/v1/yeucauxhd?vin=eq." + encodeURIComponent(v) + "&select=ngay_coc_ve", {
                    headers: { "apikey": SUPABASE_SERVICE, "Authorization": "Bearer " + SUPABASE_SERVICE }
                  });
                  const chkData = await chk.json();
                  if (chkData && chkData[0] && chkData[0].ngay_coc_ve) {
                    continue; // Đã có -> Bỏ qua
                  }

                  // Cập nhật yeucauxhd, donhang, khoxe
                  await fetch(SUPABASE_URL + "/rest/v1/yeucauxhd?vin=eq." + encodeURIComponent(v), {
                    method: "PATCH",
                    headers: { "apikey": SUPABASE_SERVICE, "Authorization": "Bearer " + SUPABASE_SERVICE, "Content-Type": "application/json" },
                    body: JSON.stringify({ ngay_coc_ve: targetDate, ghi_chu_admin: "[COC về: " + targetDate + "]" })
                  });
                  await fetch(SUPABASE_URL + "/rest/v1/donhang?vin=eq." + encodeURIComponent(v), {
                    method: "PATCH",
                    headers: { "apikey": SUPABASE_SERVICE, "Authorization": "Bearer " + SUPABASE_SERVICE, "Content-Type": "application/json" },
                    body: JSON.stringify({ ngay_coc_ve: targetDate })
                  });
                } catch (eSb) {
                  console.error("Lỗi sync Supabase xe " + v, eSb);
                }
              }

              // HIỂN THỊ KẾT QUẢ CUỐI CÙNG
              btn.disabled = false;
              btn.innerText = '🚀 Bắt Đầu Quét & Đồng Bộ Tự Động';

              let updatedHtml = (resSheet.updatedRows && resSheet.updatedRows.length > 0)
                ? resSheet.updatedRows.map(u => '<span class="vin-tag">' + u.vin + '</span>').join(' ')
                : '<i>Không có xe mới cần cập nhật.</i>';

              let skippedHtml = (resSheet.skippedRows && resSheet.skippedRows.length > 0)
                ? resSheet.skippedRows.map(s => '<span class="vin-tag-skip">' + s.vin + ' (' + s.existingDate + ')</span>').join(' ')
                : '';

              let html = '<b>🎉 Quét & Đồng Bộ Thành Công!</b><br>' +
                         '📅 Ngày ghi nhận mới: <b>' + targetDate + '</b><br><br>' +
                         '✅ <b>Cập nhật mới (' + (resSheet.updatedRows ? resSheet.updatedRows.length : 0) + ' xe):</b><br>' + updatedHtml;

              if (skippedHtml) {
                html += '<br><br>🛡️ <b>Đã có ngày về từ trước - Giữ nguyên không ghi đè (' + resSheet.skippedRows.length + ' xe):</b><br>' + skippedHtml;
              }

              showStatus(html, 'success');
            })
            .withFailureHandler(function(errSheet) {
              btn.disabled = false;
              btn.innerText = '🚀 Bắt Đầu Quét & Đồng Bộ Tự Động';
              showStatus('❌ Lỗi cập nhật Sheet: ' + errSheet.message, 'error');
            })
            .capNhatCocTheoDanhSachVin(vins);

        } catch (err) {
          btn.disabled = false;
          btn.innerText = '🚀 Bắt Đầu Quét & Đồng Bộ Tự Động';
          showStatus('❌ ' + err.message, 'error');
        }
      }
    </script>
  </body>
  </html>
  `;

  var htmlOutput = HtmlService.createHtmlOutput(htmlContent)
    .setWidth(540)
    .setHeight(580);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, '📸 AI Quét Biên Bản COC & Đồng Bộ');
}

/**
 * Hàm Apps Script cập nhật Google Sheet RÚT COC theo danh sách VIN (Tuyệt đối không ghi đè)
 */
function capNhatCocTheoDanhSachVin(vins) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('RÚT COC');
    if (!sheet) return { success: false, error: 'Sheet RÚT COC không tồn tại' };

    var today = new Date();
    var todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), "dd/MM/yyyy");

    var maxR = Math.max(sheet.getLastRow(), 150);
    var vinVals = sheet.getRange(3, 5, maxR - 2, 1).getValues();
    var cocVals = sheet.getRange(3, 15, maxR - 2, 1).getValues();

    var updatedRows = [];
    var skippedRows = [];

    for (var r = 0; r < vinVals.length; r++) {
      var rowVin = String(vinVals[r][0] || '').trim().toUpperCase();
      if (!rowVin) continue;

      if (vins.indexOf(rowVin) !== -1) {
        var rowIdx = r + 3;
        var existingCoc = String(cocVals[r][0] || '').trim();

        // 🛑 NẾU ĐÃ CÓ NGÀY COC VỀ -> TUYỆT ĐỐI BỎ QUA, KHÔNG GHI ĐÈ!
        if (existingCoc !== '') {
          skippedRows.push({ row: rowIdx, vin: rowVin, existingDate: existingCoc });
          continue;
        }

        // Cập nhật Cột O (Ngày COC về) & Cột M (Trạng thái)
        sheet.getRange(rowIdx, 15).setValue(todayStr);
        sheet.getRange(rowIdx, 13).setValue("✅ Đã có COC");
        updatedRows.push({ row: rowIdx, vin: rowVin });
      }
    }

    SpreadsheetApp.flush();
    return {
      success: true,
      targetDate: todayStr,
      updatedRows: updatedRows,
      skippedRows: skippedRows
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}
