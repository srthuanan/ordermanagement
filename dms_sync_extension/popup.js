document.addEventListener('DOMContentLoaded', async () => {
  const tabBadge = document.getElementById('tabBadge');
  const statusCard = document.getElementById('statusCard');
  const statusTitle = document.getElementById('statusTitle');
  const statusDesc = document.getElementById('statusDesc');
  const btnRecheck = document.getElementById('btnRecheck');

  const selDealer = document.getElementById('selDealer');
  const customDealerWrap = document.getElementById('customDealerWrap');
  const txtCustomDealer = document.getElementById('txtCustomDealer');
  const btnSync = document.getElementById('btnSync');
  const syncMsg = document.getElementById('syncMsg');

  const dealerList = document.getElementById('dealerList');
  const btnReload = document.getElementById('btnReload');
  const btnTestAll = document.getElementById('btnTestAll');

  // Backend Endpoints
  const API_HOSTS = [
    'http://127.0.0.1:3001',
    'http://localhost:3001',
    'http://127.0.0.1:28888',
    'https://vinfastthuanan.vercel.app'
  ];

  async function apiFetch(path, options = {}, timeoutMs = 3000) {
    for (const host of API_HOSTS) {
      try {
        const fullUrl = `${host}${path}`;
        const res = await fetch(fullUrl, {
          ...options,
          signal: AbortSignal.timeout(timeoutMs)
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {}
    }
    return null;
  }

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
  let activeCookieStr = '';
  let isDmsTab = false;
  let isVnptTab = false;

  // ── 1. KIỂM TRA COOKIE CỦA TAB HIỆN TẠI (LIVE PING TRỰC TIẾP) ──
  async function checkCurrentTab() {
    statusCard.className = 'status-card';
    statusTitle.innerHTML = '⏳ Đang kiểm tra Cookie...';
    statusDesc.innerHTML = 'Đang kết nối tới máy chủ VinFast DMS để xác thực phiên đăng nhập...';

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs.length > 0 && tabs[0].url) {
        activeTabUrl = tabs[0].url;
      }
    } catch (e) {}

    isVnptTab = activeTabUrl.includes('vnpt-invoice.com.vn');
    isDmsTab = activeTabUrl.includes('dynamics.com');

    if (isVnptTab) {
      tabBadge.innerText = 'Hóa đơn VNPT';
      tabBadge.style.color = '#38bdf8';
    } else if (isDmsTab) {
      tabBadge.innerText = 'VinFast DMS';
      tabBadge.style.color = '#22c55e';
    } else {
      tabBadge.innerText = 'Ngoài DMS';
      tabBadge.style.color = '#94a3b8';
    }

    // Quét cookie từ trình duyệt
    let cookies = [];
    try {
      if (isVnptTab) {
        cookies = await chrome.cookies.getAll({ domain: 'vnpt-invoice.com.vn' });
        if (!cookies || cookies.length === 0) {
          cookies = await chrome.cookies.getAll({ url: activeTabUrl });
        }
      } else {
        cookies = await chrome.cookies.getAll({ domain: 'crm5.dynamics.com' });
        if (!cookies || cookies.length === 0) {
          cookies = await chrome.cookies.getAll({ domain: 'dynamics.com' });
        }
        if (!cookies || cookies.length === 0) {
          if (activeTabUrl) {
            cookies = await chrome.cookies.getAll({ url: activeTabUrl });
          }
        }
      }
    } catch (err) {}

    if (!cookies || cookies.length === 0) {
      statusCard.className = 'status-card warning';
      statusTitle.innerHTML = '⚪ Chưa Tìm Thấy Cookie';
      statusDesc.innerHTML = 'Vui lòng mở tab <b>vinfastdms.crm5.dynamics.com</b> đã đăng nhập tài khoản của bạn.';
      activeCookieStr = '';
      return;
    }

    activeCookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Nếu là VNPT
    if (isVnptTab) {
      statusCard.className = 'status-card active';
      statusTitle.innerHTML = '🟢 Đã Tìm Thấy Cookie VNPT TT78';
      statusDesc.innerHTML = 'Sẵn sàng nạp Cookie vào máy tính để tải hóa đơn.';
      return;
    }

    // Ping trực tiếp OData WhoAmI lên DMS
    try {
      const res = await fetch('https://vinfastdms.crm5.dynamics.com/api/data/v9.2/WhoAmI', {
        method: 'GET',
        headers: {
          'Cookie': activeCookieStr,
          'Accept': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0'
        },
        signal: AbortSignal.timeout(6000)
      });

      if (res.status === 200) {
        statusCard.className = 'status-card active';
        statusTitle.innerHTML = '🟢 Cookie Đang Hoạt Động Tốt';
        statusDesc.innerHTML = 'Phiên làm việc trên VinFast DMS <b>còn hạn 100%</b>.<br>✓ Bấm nút <b>Đồng bộ Cookie</b> bên dưới để nạp vào hệ thống.';
      } else if (res.status === 401) {
        statusCard.className = 'status-card expired';
        statusTitle.innerHTML = '🔴 Cookie Đã Hết Hạn (401)';
        statusDesc.innerHTML = 'Phiên đăng nhập trên VinFast DMS đã bị hết hạn.<br>⚠️ Hãy <b>F5 (tải lại) tab DMS</b> để đăng nhập lại rồi bấm kiểm tra lại.';
      } else {
        statusCard.className = 'status-card warning';
        statusTitle.innerHTML = `⚠️ Phản hồi từ DMS: HTTP ${res.status}`;
        statusDesc.innerHTML = 'Vui lòng kiểm tra lại trạng thái đăng nhập trên trang VinFast DMS.';
      }
    } catch (netErr) {
      statusCard.className = 'status-card active';
      statusTitle.innerHTML = '🟢 Đã Trích Xuất Cookie DMS';
      statusDesc.innerHTML = 'Đã lấy được Cookie từ trình duyệt. Bấm <b>Đồng bộ Cookie</b> bên dưới để nạp vào App.';
    }
  }

  if (btnRecheck) {
    btnRecheck.addEventListener('click', checkCurrentTab);
  }

  // ── 2. TẢI DANH SÁCH SHOWROOM VÀ TEST TRỰC TIẾP WHOAMI TỪNG SHOWROOM ──
  let loadedDealers = [];

  function formatTimeAgo(isoString) {
    if (!isoString) return 'Chưa có thông tin';
    try {
      const d = new Date(isoString);
      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);

      const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      if (diffMins < 5) return `Vừa nạp lúc ${timeStr}`;
      if (diffMins < 60) return `Nạp lúc ${timeStr} (${diffMins} phút trước)`;
      if (diffHours < 12) return `Nạp lúc ${timeStr} hôm nay (${diffHours}h trước)`;
      if (diffHours < 24) return `Nạp hôm qua lúc ${timeStr}`;
      const dayStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      return `Nạp ngày ${dayStr} lúc ${timeStr}`;
    } catch (e) {
      return '';
    }
  }

  async function loadDealers() {
    dealerList.innerHTML = '<div style="font-size:11px;color:#64748b;text-align:center;padding:10px;">Đang tải danh sách...</div>';
    const data = await apiFetch('/api/dms/dealers', { method: 'GET' }, 3000);

    if (!data || !Array.isArray(data) || data.length === 0) {
      dealerList.innerHTML = '<div style="font-size:11px;color:#94a3b8;text-align:center;padding:8px;">Chưa mở App CyberSync hoặc chưa có cấu hình.</div>';
      return;
    }

    loadedDealers = data;
    dealerList.innerHTML = '';

    loadedDealers.forEach(d => {
      const row = document.createElement('div');
      row.className = 'dealer-row';
      row.id = `row-${d.dealer_code}`;

      const hasCookie = Boolean(d.cookie && d.cookie.length > 20);
      const timeText = formatTimeAgo(d.last_sync_time);

      row.innerHTML = `
        <div class="dealer-info" title="Bấm để chọn Showroom ${d.dealer_code}">
          <div class="dealer-code-line">
            <span class="dealer-code">${d.dealer_code}</span>
            <span style="color:#64748b;font-size:11px;">${d.name || ''}</span>
          </div>
          <span class="dealer-time">${hasCookie ? timeText : 'Chưa có cookie'}</span>
        </div>
        <div class="dealer-actions">
          <span id="tag-${d.dealer_code}" class="tag-status ${hasCookie ? 'tag-unknown' : 'tag-unknown'}">
            ${hasCookie ? '⚪ Chưa test' : '⚪ Chưa có'}
          </span>
          ${hasCookie ? `<button class="btn-test-item" data-code="${d.dealer_code}">🔍 Test</button>` : ''}
        </div>
      `;

      // Bấm vào để chọn showroom
      row.querySelector('.dealer-info').addEventListener('click', () => {
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

      // Nút test từng showroom
      const btnTest = row.querySelector('.btn-test-item');
      if (btnTest) {
        btnTest.addEventListener('click', (ev) => {
          ev.stopPropagation();
          testDealerCookieDirect(d);
        });
      }

      dealerList.appendChild(row);
    });
  }

  // Hàm test trực tiếp OData WhoAmI bằng Cookie của từng Showroom
  async function testDealerCookieDirect(dealerObj) {
    const tagEl = document.getElementById(`tag-${dealerObj.dealer_code}`);
    if (tagEl) {
      tagEl.className = 'tag-status tag-checking';
      tagEl.innerText = '⏳ Đang test...';
    }

    if (!dealerObj.cookie) {
      if (tagEl) {
        tagEl.className = 'tag-status tag-dead';
        tagEl.innerText = '⚪ Chưa có cookie';
      }
      return;
    }

    try {
      const res = await fetch('https://vinfastdms.crm5.dynamics.com/api/data/v9.2/WhoAmI', {
        method: 'GET',
        headers: {
          'Cookie': dealerObj.cookie,
          'Accept': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0'
        },
        signal: AbortSignal.timeout(5000)
      });

      if (res.status === 200) {
        if (tagEl) {
          tagEl.className = 'tag-status tag-live';
          tagEl.innerText = '🟢 Còn hạn (200)';
        }
      } else if (res.status === 401) {
        if (tagEl) {
          tagEl.className = 'tag-status tag-dead';
          tagEl.innerText = '🔴 Đã hết hạn (401)';
        }
      } else {
        if (tagEl) {
          tagEl.className = 'tag-status tag-dead';
          tagEl.innerText = `🔴 Lỗi (${res.status})`;
        }
      }
    } catch (e) {
      // Nếu lỗi mạng khi fetch direct từ popup, thử gọi qua API backend
      try {
        const checkRes = await apiFetch(`/api/dms/check-cookie?dealer_code=${encodeURIComponent(dealerObj.dealer_code)}`, { method: 'GET' }, 4000);
        if (checkRes && checkRes.valid) {
          if (tagEl) {
            tagEl.className = 'tag-status tag-live';
            tagEl.innerText = '🟢 Còn hạn (200)';
          }
        } else if (checkRes && checkRes.statusCode === 401) {
          if (tagEl) {
            tagEl.className = 'tag-status tag-dead';
            tagEl.innerText = '🔴 Đã hết hạn (401)';
          }
        } else {
          if (tagEl) {
            tagEl.className = 'tag-status tag-dead';
            tagEl.innerText = '🔴 Hết hạn';
          }
        }
      } catch (err) {
        if (tagEl) {
          tagEl.className = 'tag-status tag-dead';
          tagEl.innerText = '🔴 Hết hạn';
        }
      }
    }
  }

  // Nút Test Tất Cả Showroom
  if (btnTestAll) {
    btnTestAll.addEventListener('click', async () => {
      btnTestAll.innerText = '⏳ Đang test...';
      btnTestAll.disabled = true;

      for (const d of loadedDealers) {
        if (d.cookie) {
          await testDealerCookieDirect(d);
        }
      }

      btnTestAll.innerText = '⚡ Test Tất Cả';
      btnTestAll.disabled = false;
    });
  }

  if (btnReload) {
    btnReload.addEventListener('click', loadDealers);
  }

  // ── 3. NÚT ĐỒNG BỘ COOKIE VÀO APP ──
  btnSync.addEventListener('click', async () => {
    if (!activeCookieStr) {
      syncMsg.style.color = '#ef4444';
      syncMsg.innerText = '❌ Không tìm thấy Cookie từ tab đang mở!';
      return;
    }

    let dealerCode = 'N31913';
    if (selDealer && selDealer.value === '__OTHER__') {
      dealerCode = (txtCustomDealer && txtCustomDealer.value ? txtCustomDealer.value.trim().toUpperCase() : '');
      if (!dealerCode) {
        syncMsg.style.color = '#ef4444';
        syncMsg.innerText = '❌ Vui lòng nhập mã Showroom!';
        txtCustomDealer.focus();
        return;
      }
    } else if (selDealer && selDealer.value) {
      dealerCode = selDealer.value.trim().toUpperCase();
    }

    syncMsg.style.color = '#38bdf8';
    syncMsg.innerText = `⏳ Đang nạp Cookie cho [${dealerCode}]...`;

    try {
      await navigator.clipboard.writeText(activeCookieStr);
    } catch (e) {}

    const res = await apiFetch('/api/dms/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealer_code: dealerCode, cookie: activeCookieStr })
    });

    if (res && (res.status === 'ok' || res.success)) {
      syncMsg.style.color = '#22c55e';
      syncMsg.innerHTML = `✅ ĐÃ NẠP COOKIE THÀNH CÔNG CHO [${dealerCode}]!`;
      await loadDealers();
      // Tự động test showroom vừa nạp
      const justDealer = loadedDealers.find(x => x.dealer_code === dealerCode);
      if (justDealer) {
        justDealer.cookie = activeCookieStr;
        testDealerCookieDirect(justDealer);
      }
    } else {
      syncMsg.style.color = '#f59e0b';
      syncMsg.innerHTML = `⚠️ Chưa kết nối được App nội bộ.<br>📋 <b>Cookie đã được COPY vào bộ nhớ tạm!</b>`;
    }
  });

  // Tự động chạy khi mở Extension
  await checkCurrentTab();
  await loadDealers();
});


