document.addEventListener('DOMContentLoaded', async () => {
  const btnSync = document.getElementById('btnSync');
  const selDealer = document.getElementById('selDealer');
  const statusDiv = document.getElementById('status');
  const titleEl = document.querySelector('h3');
  const descEl = document.querySelector('.desc');
  const labelDealer = document.querySelector('label[for="selDealer"]');

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
      }
    }
  } catch (e) {}

  // Thử kết nối lấy danh sách đại lý từ App nếu App đang chạy
  if (!activeTabUrl.includes('vnpt-invoice.com.vn')) {
    try {
      const res = await fetch('http://127.0.0.1:28888/dealers', { signal: AbortSignal.timeout(1000) });
      if (res.ok) {
        const dealers = await res.json();
        if (dealers && dealers.length > 0) {
          selDealer.innerHTML = '';
          dealers.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.dealer_code;
            opt.text = `${d.dealer_code} - ${d.name || ''}`;
            selDealer.appendChild(opt);
          });
        }
      }
    } catch (e) {
      // App chưa chạy hoặc chưa mở cổng
    }
  }

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

        // Copy vào Clipboard dự phòng
        try {
          await navigator.clipboard.writeText(cookieStr);
        } catch (e) {}

        // Gửi sang App VNPT qua cổng 28889 và 28888
        let sent = false;
        for (const port of [28889, 28888]) {
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
          statusDiv.innerHTML = '✅ ĐÃ ĐỒNG BỘ COOKIE VNPT VÀO APP THÀNH CÔNG!<br><small style="color:#94a3b8;">Sẵn sàng tra cứu số VIN trên App.</small>';
        } else {
          statusDiv.style.color = '#f59e0b';
          statusDiv.innerHTML = '⚠️ Chưa mở App (Hãy mở <b>Tim_Hoa_Don_VNPT.bat</b>).<br><br>📋 <b>Nhưng Cookie đã được copy vào bộ nhớ tạm!</b> Bạn chỉ cần mở App -> Bấm <b>Ctrl + V</b> dán vào ô Cookie là xong!';
        }
        return;
      }

      // ── TRƯỜNG HỢP 2: ĐANG Ở TRANG VINFAST DMS ──
      statusDiv.style.color = '#38bdf8';
      statusDiv.innerText = '⏳ Đang quét Cookie từ tab DMS...';

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
        statusDiv.innerText = '❌ Không tìm thấy Cookie nào của VinFast DMS! Hãy đảm bảo bạn đã mở và đăng nhập tab VinFast DMS trên trình duyệt.';
        return;
      }

      const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      const dealerCode = (selDealer && selDealer.value) ? selDealer.value : 'N31913';

      try {
        await navigator.clipboard.writeText(cookieStr);
      } catch (e) {}

      let sentSuccess = false;
      let errorDetail = '';

      for (const host of ['127.0.0.1', 'localhost']) {
        try {
          const syncRes = await fetch(`http://${host}:28888/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dealer_code: dealerCode,
              cookie: cookieStr
            }),
            signal: AbortSignal.timeout(3000)
          });

          if (syncRes.ok) {
            const json = await syncRes.json();
            if (json.status === 'ok') {
              sentSuccess = true;
              statusDiv.style.color = '#22c55e';
              statusDiv.innerText = `✅ ĐÃ ĐỒNG BỘ THÀNH CÔNG VÀO APP CHO [${dealerCode}]!`;
              break;
            } else {
              errorDetail = json.message || 'Lỗi không xác định';
            }
          }
        } catch (netErr) {
          errorDetail = netErr.message;
        }
      }

      if (!sentSuccess) {
        statusDiv.style.color = '#f59e0b';
        statusDiv.innerHTML = `⚠️ Chưa kết nối được App DMS.<br><br>📋 <b>Nhưng Cookie đã được tự động COPY vào bộ nhớ tạm!</b> Bạn chỉ cần mở App DMS -> Dán Ctrl + V vào ô Cookie là xong!`;
      }
    } catch (err) {
      statusDiv.style.color = '#ef4444';
      statusDiv.innerText = `❌ Lỗi: ${err.message}`;
    }
  });
});
