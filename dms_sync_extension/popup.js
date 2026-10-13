document.addEventListener('DOMContentLoaded', async () => {
  const btnSync = document.getElementById('btnSync');
  const selDealer = document.getElementById('selDealer');
  const customDealerWrap = document.getElementById('customDealerWrap');
  const txtCustomDealer = document.getElementById('txtCustomDealer');
  const statusDiv = document.getElementById('status');
  const dealerTags = document.getElementById('dealerTags');
  const btnReloadDealers = document.getElementById('btnReloadDealers');
  const titleEl = document.querySelector('h3');
  const descEl = document.querySelector('.desc');
  const labelDealer = document.querySelector('label[for="selDealer"]');

  // Xử lý chọn Showroom khác
  if (selDealer) {
    selDealer.addEventListener('change', () => {
      if (selDealer.value === '__OTHER__') {
        customDealerWrap.style.display = 'block';
        txtCustomDealer.focus();
      } else {
        customDealerWrap.style.display = 'none';
      }
    });
  }

  let activeTabUrl = '';
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0 && tabs[0].url) {
      activeTabUrl = tabs[0].url;
      if (activeTabUrl.includes('vnpt-invoice.com.vn')) {
        if (titleEl) titleEl.innerHTML = '⚡ Đồng Bộ Hóa Đơn VNPT';
        if (descEl) descEl.innerHTML = 'Phát hiện tab: <b>Hóa Đơn Điện Tử VNPT (TT78)</b>.<br>Bấm nút bên dưới để nạp Cookie vào App Desktop!';
        if (selDealer) selDealer.style.display = 'none';
        if (labelDealer) labelDealer.style.display = 'none';
        if (customDealerWrap) customDealerWrap.style.display = 'none';
      }
    }
  } catch (e) {}

  // Hàm tải danh sách Showroom và trạng thái cookie
  async function loadDealersStatus() {
    if (!dealerTags) return;
    dealerTags.innerHTML = '<div style="font-size:11px;color:#64748b;text-align:center;padding:10px;">Đang tải trạng thái...</div>';
    
    let dealers = null;
    const endpoints = [
      'http://127.0.0.1:3001/api/dms/dealers',
      'http://127.0.0.1:28888/dealers',
      'http://localhost:3001/api/dms/dealers'
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          dealers = await res.json();
          if (Array.isArray(dealers) && dealers.length > 0) break;
        }
      } catch (err) {}
    }

    if (!dealers || !Array.isArray(dealers) || dealers.length === 0) {
      dealerTags.innerHTML = '<div style="font-size:11px;color:#94a3b8;text-align:center;padding:8px;">Chưa mở App CyberSync hoặc chưa có cấu hình.</div>';
      return;
    }

    dealerTags.innerHTML = '';
    dealers.forEach(d => {
      const itemEl = document.createElement('div');
      itemEl.className = 'dealer-item';
      
      const hasCookie = Boolean(d.cookie && d.cookie.length > 20);
      const syncTime = d.last_sync_time ? String(d.last_sync_time).substring(11, 19) : '';
      
      itemEl.innerHTML = `
        <span class="dealer-code">${d.dealer_code}</span>
        <span class="${hasCookie ? 'badge-ok' : 'badge-none'}">
          ${hasCookie ? `🟢 Đã có cookie ${syncTime ? `(${syncTime})` : ''}` : '⚪ Chưa có'}
        </span>
      `;
      
      // Cho phép bấm vào để chọn ngay showroom đó
      itemEl.style.cursor = 'pointer';
      itemEl.title = `Chọn Showroom ${d.dealer_code}`;
      itemEl.addEventListener('click', () => {
        let exists = false;
        for (let i = 0; i < selDealer.options.length; i++) {
          if (selDealer.options[i].value === d.dealer_code) {
            selDealer.selectedIndex = i;
            exists = true;
            break;
          }
        }
        if (!exists) {
          selDealer.value = '__OTHER__';
          customDealerWrap.style.display = 'block';
          txtCustomDealer.value = d.dealer_code;
        } else {
          customDealerWrap.style.display = 'none';
        }
      });

      dealerTags.appendChild(itemEl);
    });
  }

  loadDealersStatus();
  if (btnReloadDealers) {
    btnReloadDealers.addEventListener('click', loadDealersStatus);
  }

  // Xử lý bấm nút Đồng Bộ
  btnSync.addEventListener('click', async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentUrl = (tabs && tabs.length > 0 && tabs[0].url) ? tabs[0].url : activeTabUrl;

      // ── TRƯỜNG HỢP 1: ĐANG Ở TRANG HÓA ĐƠN VNPT ──
      if (currentUrl.includes('vnpt-invoice.com.vn')) {
        statusDiv.style.color = '#38bdf8';
        statusDiv.innerText = '⏳ Đang quét Cookie VNPT TT78...';

        let cookies = await chrome.cookies.getAll({ domain: 'vnpt-invoice.com.vn' });
        if (!cookies || cookies.length === 0) {
          cookies = await chrome.cookies.getAll({ url: currentUrl });
        }

        if (!cookies || cookies.length === 0) {
          statusDiv.style.color = '#ef4444';
          statusDiv.innerText = '❌ Không tìm thấy Cookie VNPT! Hãy đảm bảo bạn đã đăng nhập tài khoản gsmd1000002358 trên web.';
          return;
        }

        const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        try {
          await navigator.clipboard.writeText(cookieStr);
        } catch (e) {}

        let sent = false;
        for (const port of [28889, 28888, 3001]) {
          for (const host of ['127.0.0.1', 'localhost']) {
            try {
              const res = await fetch(`http://${host}:${port}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cookie: cookieStr }),
                signal: AbortSignal.timeout(2000)
              });
              if (res.ok) {
                sent = true;
                break;
              }
            } catch (err) {}
          }
          if (sent) break;
        }

        if (sent) {
          statusDiv.style.color = '#22c55e';
          statusDiv.innerHTML = '✅ ĐÃ ĐỒNG BỘ COOKIE VNPT THÀNH CÔNG!';
        } else {
          statusDiv.style.color = '#f59e0b';
          statusDiv.innerHTML = '📋 Cookie đã được copy vào bộ nhớ tạm!';
        }
        return;
      }

      // ── TRƯỜNG HỢP 2: ĐANG Ở TRANG VINFAST DMS ──
      statusDiv.style.color = '#38bdf8';
      statusDiv.innerText = '⏳ Đang quét Cookie từ tab VinFast DMS...';

      let cookies = await chrome.cookies.getAll({ domain: 'dynamics.com' });
      if (!cookies || cookies.length === 0) {
        cookies = await chrome.cookies.getAll({ domain: 'crm5.dynamics.com' });
      }
      if (!cookies || cookies.length === 0) {
        if (currentUrl) {
          cookies = await chrome.cookies.getAll({ url: currentUrl });
        }
      }

      if (!cookies || cookies.length === 0) {
        statusDiv.style.color = '#ef4444';
        statusDiv.innerText = '❌ Không tìm thấy Cookie nào của VinFast DMS! Hãy đảm bảo bạn đang mở tab VinFast DMS đã đăng nhập.';
        return;
      }

      const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      
      let dealerCode = 'N31913';
      if (selDealer && selDealer.value === '__OTHER__') {
        dealerCode = (txtCustomDealer && txtCustomDealer.value ? txtCustomDealer.value.trim().toUpperCase() : '');
        if (!dealerCode) {
          statusDiv.style.color = '#ef4444';
          statusDiv.innerText = '❌ Vui lòng nhập mã Showroom (VD: N31923)!';
          txtCustomDealer.focus();
          return;
        }
      } else if (selDealer && selDealer.value) {
        dealerCode = selDealer.value.trim().toUpperCase();
      }

      try {
        await navigator.clipboard.writeText(cookieStr);
      } catch (e) {}

      let sentSuccess = false;
      const syncTargets = [
        { url: 'http://127.0.0.1:3001/api/dms/sync', payload: { dealer_code: dealerCode, cookie: cookieStr } },
        { url: 'http://127.0.0.1:28888/sync', payload: { dealer_code: dealerCode, cookie: cookieStr } },
        { url: 'http://localhost:3001/api/dms/sync', payload: { dealer_code: dealerCode, cookie: cookieStr } }
      ];

      for (const target of syncTargets) {
        try {
          const syncRes = await fetch(target.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(target.payload),
            signal: AbortSignal.timeout(3000)
          });

          if (syncRes.ok) {
            const json = await syncRes.json();
            if (json.status === 'ok' || json.success) {
              sentSuccess = true;
              break;
            }
          }
        } catch (netErr) {}
      }

      if (sentSuccess) {
        statusDiv.style.color = '#22c55e';
        statusDiv.innerText = `✅ ĐÃ NẠP COOKIE THÀNH CÔNG CHO [${dealerCode}]!`;
        // Tải lại bảng trạng thái sau 500ms
        setTimeout(loadDealersStatus, 500);
      } else {
        statusDiv.style.color = '#f59e0b';
        statusDiv.innerHTML = `⚠️ Chưa kết nối được App CyberSync/DMS.<br>📋 <b>Cookie đã được COPY vào bộ nhớ tạm!</b>`;
      }
    } catch (err) {
      statusDiv.style.color = '#ef4444';
      statusDiv.innerText = `❌ Lỗi: ${err.message}`;
    }
  });
});
