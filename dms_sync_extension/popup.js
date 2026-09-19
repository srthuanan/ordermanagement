document.addEventListener('DOMContentLoaded', async () => {
  const btnSync = document.getElementById('btnSync');
  const selDealer = document.getElementById('selDealer');
  const statusDiv = document.getElementById('status');

  // Thử kết nối lấy danh sách đại lý từ App nếu App đang chạy
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

  btnSync.addEventListener('click', async () => {
    statusDiv.style.color = '#38bdf8';
    statusDiv.innerText = '⏳ Đang quét Cookie từ tab DMS...';

    try {
      // 1. Quét Cookie với nhiều phương án dự phòng
      let cookies = await chrome.cookies.getAll({ domain: 'dynamics.com' });
      if (!cookies || cookies.length === 0) {
        cookies = await chrome.cookies.getAll({ domain: 'crm5.dynamics.com' });
      }
      if (!cookies || cookies.length === 0) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs && tabs.length > 0 && tabs[0].url) {
          cookies = await chrome.cookies.getAll({ url: tabs[0].url });
        }
      }

      if (!cookies || cookies.length === 0) {
        statusDiv.style.color = '#ef4444';
        statusDiv.innerText = '❌ Không tìm thấy Cookie nào của VinFast DMS! Hãy đảm bảo bạn đã mở và đăng nhập tab VinFast DMS trên trình duyệt.';
        return;
      }

      // Ghép chuỗi Cookie
      const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      const dealerCode = selDealer.value || 'N31913';

      // 2. Tự động Copy vào Clipboard dự phòng
      try {
        await navigator.clipboard.writeText(cookieStr);
      } catch (e) {}

      // 3. Gửi sang App Desktop qua cổng 127.0.0.1:28888
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
        statusDiv.innerHTML = `⚠️ Chưa kết nối được App (Hãy mở bất kỳ App DMS nào trên máy tính).<br><br>📋 <b>Nhưng Cookie đã được tự động COPY vào bộ nhớ tạm!</b> Bạn chỉ cần mở App -> Bấm Cài đặt/Cookie -> Bấm <b>Ctrl + V</b> dán vào là xong!`;
      }
    } catch (err) {
      statusDiv.style.color = '#ef4444';
      statusDiv.innerText = `❌ Lỗi: ${err.message}`;
    }
  });
});

