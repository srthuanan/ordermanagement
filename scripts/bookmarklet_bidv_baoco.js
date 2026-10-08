/**
 * bookmarklet_bidv_baoco.js - Tiện ích 1-Click Check Tiền & Tự Động Xuất Giấy Báo Có BIDV sang Zalo
 * Chuẩn 100% từng pixel theo mẫu Giấy Báo Có thật của BIDV iBank
 */
(function () {
  if (!window.location.hostname.includes('bidv.vn')) {
    alert('⚠️ Vui lòng mở trang Lịch sử giao dịch BIDV iBank trước khi bấm nút này!');
    return;
  }

  var oldPanel = document.getElementById('bidv-baoco-panel');
  if (oldPanel) oldPanel.remove();

  var stk = '8603427888';
  var tenTk = 'CTTNHH MINH DAO PHAT';
  var userIn = '5030641VANNT';

  try {
    var bodyText = document.body.innerText;
    var stkMatch = bodyText.match(/Số tài khoản[:\s]+(\d+)/i);
    if (stkMatch) stk = stkMatch[1];
  } catch (e) {}

  function findTransactionRows() {
    var rows = [];
    var allRows = document.querySelectorAll('table tr');
    allRows.forEach(function (tr) {
      var cells = tr.querySelectorAll('td');
      if (cells.length >= 6) {
        var ref = cells[0].innerText.trim();
        var date = cells[1].innerText.trim();
        var debit = cells[2].innerText.trim().replace(/\s/g, '');
        var credit = cells[3].innerText.trim().replace(/\s/g, '');
        var balance = cells[4].innerText.trim();
        var desc = cells[5].innerText.trim();

        if (credit && credit !== '0' && credit !== '' && date.includes('/')) {
          rows.push({
            tr: tr,
            ref: ref,
            date: date,
            amount: credit,
            balance: balance,
            desc: desc
          });
        }
      }
    });
    return rows;
  }

  var transList = findTransactionRows();

  // Logo BIDV chuẩn xác lấy trực tiếp từ ảnh thật (Hoa mai trên, chữ BIDV dưới)
  var LOGO_B64 = "data:image/png;base64,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";

  function generateBaocoImage(item, callback) {
    var canvas = document.createElement('canvas');
    var scale = 2; // Độ nét cao 2x
    var w = 943;
    var h = 634;
    canvas.width = w * scale;
    canvas.height = h * scale;
    var ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // 1. Nền trắng
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    // 2. Khung viền ngoài: X=50, Y=48 -> X=904, Y=605
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(50, 48, 854, 557);

    // 3. Đường kẻ ngang phân tách header: Y=150, X=50 -> 904
    ctx.beginPath();
    ctx.moveTo(50, 150);
    ctx.lineTo(904, 150);
    ctx.stroke();

    // 4. Tiêu đề: GIẤY BÁO CÓ & Ngày in
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px "Times New Roman", Times, serif';
    ctx.textAlign = 'center';
    ctx.fillText('GIẤY BÁO CÓ', 500, 93);

    var now = new Date();
    var pad = function(n) { return n < 10 ? '0' + n : n; };
    var nowStr = pad(now.getDate()) + '/' + pad(now.getMonth() + 1) + '/' + now.getFullYear() + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
    ctx.font = '13px "Times New Roman", Times, serif';
    ctx.textAlign = 'right';
    ctx.fillText('Ngày in: ' + nowStr, 868, 140);

    // 5. Phần thông tin tài khoản (Y=150 -> 286)
    ctx.textAlign = 'left';
    ctx.font = '14px "Times New Roman", Times, serif';
    ctx.fillText('Số tài khoản ' + stk, 101, 178);
    ctx.fillText('Tên tài khoản ' + tenTk, 101, 201);

    // Khung chữ nhật bao quanh "Kính gửi: ..." (X=101, Y=209, W=400, H=63)
    ctx.strokeRect(101, 209, 400, 63);
    ctx.font = 'bold 14px "Times New Roman", Times, serif';
    ctx.fillText('Kính gửi: ' + tenTk, 107, 230);

    // Cột bên phải
    ctx.font = '13.5px "Times New Roman", Times, serif';
    ctx.fillText('Số tài khoản cũ', 508, 178);
    ctx.fillText('Ngân hàng chúng tôi xin trân trọng thông báo: Tài', 508, 222);
    ctx.fillText('khoản của Quý khách hàng đã được ghi CÓ với nội', 508, 242);
    ctx.fillText('dung sau:', 508, 262);

    // 6. Bảng chi tiết: X=101->868 (W=767), Y=286->541 (H=255)
    ctx.strokeRect(101, 286, 767, 255);

    // Đường kẻ ngang tiêu đề bảng: Y=319
    ctx.beginPath();
    ctx.moveTo(101, 319);
    ctx.lineTo(868, 319);
    ctx.stroke();

    // Các đường kẻ dọc cột
    ctx.beginPath();
    ctx.moveTo(203, 286); ctx.lineTo(203, 541);
    ctx.moveTo(421, 286); ctx.lineTo(421, 541);
    ctx.moveTo(501, 286); ctx.lineTo(501, 541);
    ctx.stroke();

    // Tiêu đề cột
    ctx.font = 'bold 13px "Times New Roman", Times, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Ngày hiệu lực', 152, 307);
    ctx.fillText('Số tiền', 312, 307);
    ctx.fillText('Loại tiền', 461, 307);
    ctx.fillText('Diễn giải', 684, 307);

    // Dữ liệu dòng:
    // Cột 1: Ngày hiệu lực (Ngày + Giờ)
    ctx.font = '14px "Times New Roman", Times, serif';
    var dateParts = item.date.split(' ');
    if (dateParts.length >= 2) {
      ctx.fillText(dateParts[0], 152, 385);
      ctx.fillText(dateParts[1], 152, 405);
    } else {
      ctx.fillText(item.date, 152, 395);
    }

    // Cột 2: Số tiền (chữ thường chuẩn y hệt ngân hàng)
    ctx.fillText(item.amount, 312, 395);

    // Cột 3: Loại tiền
    ctx.fillText('VND', 461, 395);

    // Cột 4: Diễn giải (wrap text)
    ctx.textAlign = 'left';
    ctx.font = '13.5px "Times New Roman", Times, serif';
    var descWords = item.desc.split(' ');
    var descLines = [];
    var curLine = '';
    var maxDescW = 345;

    for (var d = 0; d < descWords.length; d++) {
      var testL = curLine ? (curLine + ' ' + descWords[d]) : descWords[d];
      if (ctx.measureText(testL).width < maxDescW) {
        curLine = testL;
      } else {
        descLines.push(curLine);
        curLine = descWords[d];
      }
    }
    if (curLine) descLines.push(curLine);

    var yDesc = 360;
    for (var l = 0; l < descLines.length; l++) {
      ctx.fillText(descLines[l], 508, yDesc + (l * 20));
    }

    // 7. Footer: Dưới đáy bảng bên phải
    ctx.font = '12px "Times New Roman", Times, serif';
    ctx.textAlign = 'right';
    ctx.fillText('Chứng từ được in từ chương trình BIDV iBank bởi user: ' + userIn, 868, 575);

    // Vẽ Logo BIDV chuẩn xác
    var logoImg = new Image();
    logoImg.onload = function () {
      ctx.drawImage(logoImg, 92, 58, 62, 58);
      canvas.toBlob(function (blob) {
        callback(blob, canvas.toDataURL('image/png'));
      }, 'image/png');
    };
    logoImg.src = LOGO_B64;
  }

  // Floating Control Panel
  var panel = document.createElement('div');
  panel.id = 'bidv-baoco-panel';
  panel.style.cssText = 'position:fixed;top:18px;right:20px;z-index:999999;width:480px;background:#0f172a;color:#f8fafc;padding:18px;border-radius:14px;box-shadow:0 25px 40px rgba(0,0,0,0.6);font-family:system-ui,-apple-system,sans-serif;font-size:13px;border:1px solid #334155;';

  var headerHtml = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid #334155;padding-bottom:10px;">' +
    '<div><strong style="font-size:15px;color:#38bdf8;display:flex;align-items:center;gap:6px;">⚡ CHECK TIỀN & XUẤT BÁO CÓ BIDV ➔ ZALO</strong>' +
    '<div id="baoco-keepalive-badge" style="font-size:11px;color:#10b981;font-weight:600;margin-top:4px;">🟢 Tự giữ đăng nhập: ĐANG BẬT (Chống văng phiên)</div></div>' +
    '<div style="display:flex;align-items:center;gap:6px;">' +
    '<button id="baoco-refresh-btn" style="background:#0284c7;color:#fff;border:none;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:3px;" title="Cập nhật giao dịch mới nhất">🔄 Làm mới</button>' +
    '<button id="close-baoco-btn" style="background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;line-height:1;">✕</button>' +
    '</div></div>';

  var searchHtml = '<div style="margin-bottom:12px;">' +
    '<input id="baoco-search-input" type="text" placeholder="🔍 Gõ tên khách (vd: Lý, Tuấn), số tiền (468, 20tr), HĐMB..." style="width:100%;box-sizing:border-box;padding:9px 12px;border-radius:8px;border:1px solid #475569;background:#1e293b;color:#ffffff;font-size:13px;outline:none;" />' +
    '</div>';

  var listContainer = '<div id="baoco-list" style="max-height:360px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;"></div>';

  var statusBox = '<div id="baoco-status" style="margin-top:12px;padding:10px;border-radius:8px;background:#090d16;border:1px solid #1e293b;font-size:12px;color:#94a3b8;display:none;"></div>';

  panel.innerHTML = headerHtml + searchHtml + listContainer + statusBox;
  document.body.appendChild(panel);

  document.getElementById('close-baoco-btn').onclick = function () {
    panel.remove();
  };

  document.getElementById('baoco-refresh-btn').onclick = function () {
    var b = this;
    b.innerText = '⏳ Đang quét...';
    transList = findTransactionRows();
    renderList(document.getElementById('baoco-search-input').value);
    setTimeout(function () {
      b.innerText = '🔄 Làm mới';
    }, 600);
  };

  var listEl = document.getElementById('baoco-list');
  var statusEl = document.getElementById('baoco-status');

  function renderList(query) {
    listEl.innerHTML = '';
    var q = (query || '').toLowerCase().trim();

    var filtered = transList.filter(function (it) {
      if (!q) return true;
      return it.desc.toLowerCase().includes(q) || it.amount.includes(q) || it.ref.toLowerCase().includes(q) || it.date.includes(q);
    });

    if (filtered.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;color:#64748b;padding:20px;">Không tìm thấy giao dịch nào khớp với "' + query + '"</div>';
      return;
    }

    filtered.forEach(function (it) {
      var card = document.createElement('div');
      card.style.cssText = 'background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:6px;';

      var shortDesc = it.desc;
      if (shortDesc.length > 95) shortDesc = shortDesc.substring(0, 95) + '...';

      card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<span style="font-weight:700;color:#22c55e;font-size:15px;">+' + it.amount + ' VND</span>' +
        '<span style="font-size:11px;color:#94a3b8;">' + it.date + '</span>' +
        '</div>' +
        '<div style="color:#e2e8f0;font-size:12px;line-height:1.4;">' + shortDesc + '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">' +
        '<span style="font-size:11px;color:#64748b;">Mã: ' + it.ref + '</span>' +
        '<button class="btn-send-zalo" style="background:#0284c7;color:#ffffff;border:none;padding:6px 14px;border-radius:6px;font-weight:600;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:5px;">⚡ Báo Có ➔ Zalo</button>' +
        '</div>';

      card.querySelector('.btn-send-zalo').onclick = function () {
        var btn = this;
        btn.innerText = '⏳ Đang tạo ảnh...';
        btn.disabled = true;

        generateBaocoImage(it, async function (blob, dataUrl) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);

            btn.innerText = '✅ Đã Copy Ảnh!';
            btn.style.background = '#16a34a';

            statusEl.style.display = 'block';
            statusEl.innerHTML = '<div style="color:#22c55e;font-weight:700;margin-bottom:4px;">🎉 ĐÃ COPY ẢNH GIẤY BÁO CÓ VÀO BỘ NHỚ TẠM!</div>' +
              '<div>👉 Mở Zalo nhóm <b>KT SR THUẬN AN check tiền</b> bấm <b>Ctrl + V</b> để gửi ngay!</div>' +
              '<div style="margin-top:8px;display:flex;gap:8px;">' +
              '<a href="zalo://" style="background:#0284c7;color:#fff;padding:4px 10px;border-radius:4px;text-decoration:none;font-weight:600;font-size:11px;">Mở Zalo Ngay</a>' +
              '<a href="' + dataUrl + '" download="GiayBaoCo_' + it.amount.replace(/,/g, '') + '.png" style="background:#475569;color:#fff;padding:4px 10px;border-radius:4px;text-decoration:none;font-size:11px;">Tải File Ảnh</a>' +
              '</div>';

            window.location.href = 'zalo://';
          } catch (err) {
            btn.innerText = '⚠️ Lỗi Copy';
            alert('Lỗi: ' + err);
          } finally {
            setTimeout(function () {
              btn.innerText = '⚡ Báo Có ➔ Zalo';
              btn.disabled = false;
              btn.style.background = '#0284c7';
            }, 3000);
          }
        });
      };

      listEl.appendChild(card);
    });
  }

  var searchInput = document.getElementById('baoco-search-input');
  searchInput.oninput = function () {
    renderList(this.value);
  };

  renderList('');
  searchInput.focus();

  transList.forEach(function (it) {
    var tr = it.tr;
    if (tr.querySelector('.td-baoco-btn')) return;

    var btnTd = document.createElement('td');
    btnTd.className = 'td-baoco-btn';
    btnTd.style.cssText = 'text-align:center;padding:4px;';
    btnTd.innerHTML = '<button style="background:#0284c7;color:#fff;border:none;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;">⚡ Báo Có</button>';

    btnTd.querySelector('button').onclick = function (e) {
      e.stopPropagation();
      var b = this;
      b.innerText = '⏳';
      generateBaocoImage(it, async function (blob, dataUrl) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          b.innerText = '✅ Xong!';
          b.style.background = '#16a34a';
          window.location.href = 'zalo://';
        } catch (err) {
          alert('Lỗi copy ảnh: ' + err);
        } finally {
          setTimeout(function () {
            b.innerText = '⚡ Báo Có';
            b.style.background = '#0284c7';
          }, 3000);
        }
      });
    };

    tr.appendChild(btnTd);
  });

  // Tự động giữ phiên đăng nhập BIDV iBank (Keep-Alive chống tự động đăng xuất)
  if (window._bidvKeepAliveTimer) {
    clearInterval(window._bidvKeepAliveTimer);
  }

  function pingBidvKeepAlive() {
    try {
      fetch(window.location.href, { method: 'HEAD', cache: 'no-store' }).catch(function () {});
      document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true }));
      var keepEl = document.getElementById('baoco-keepalive-badge');
      if (keepEl) {
        var now = new Date();
        var pad = function(n) { return n < 10 ? '0' + n : n; };
        var tStr = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
        keepEl.innerText = '🟢 Tự giữ đăng nhập: Đã duy trì lúc ' + tStr;
      }
    } catch (e) {}
  }

  pingBidvKeepAlive();
  window._bidvKeepAliveTimer = setInterval(pingBidvKeepAlive, 180 * 1000);

  function syncToLocalAssistant(list) {
    try {
      fetch('http://127.0.0.1:28888/sync', {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(list)
      }).catch(function () {});
    } catch (e) {}
  }

  syncToLocalAssistant(transList);

  // Tự động quét lại danh sách giao dịch mỗi 15 giây để nạp giao dịch mới
  if (window._bidvPollTimer) {
    clearInterval(window._bidvPollTimer);
  }
  window._bidvPollTimer = setInterval(function () {
    var newRows = findTransactionRows();
    if (newRows.length !== transList.length || (newRows[0] && transList[0] && newRows[0].ref !== transList[0].ref)) {
      transList = newRows;
      var sIn = document.getElementById('baoco-search-input');
      renderList(sIn ? sIn.value : '');
    }
    syncToLocalAssistant(transList);
  }, 15000);
})();
