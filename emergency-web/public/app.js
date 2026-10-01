// VinFast Standby & Disaster Recovery Portal - Core Business Logic
// Standardized data mapping, Authentication, FIFO Hold/Release, Car Matching, Invoice Workflow

const STATE = {
  activeTab: 'stock',
  currentMode: 'auto', // 'auto' | 'force_backup'
  currentUser: null,
  datasets: {
    khoxe: [],
    donhang: [],
    donhanghienhuu: [],
    yeucauxhd: [],
    yeucauvc: [],
    test_drive_schedule: [],
    chinhsach: [],
    thongtinxe: [],
    archived_orders: [],
    users: [],
    outbox: []
  },
  systemStatus: null,
  selectedOrderForMatching: null
};

// ---------------------- UTILITIES & FORMATTING ----------------------

function initIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function formatVND(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 đ';
  return Number(amount).toLocaleString('vi-VN') + ' đ';
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
}

function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const bgColors = {
    success: 'bg-emerald-950 border-emerald-500/50 text-emerald-200',
    error: 'bg-rose-950 border-rose-500/50 text-rose-200',
    warning: 'bg-amber-950 border-amber-500/50 text-amber-200',
    info: 'bg-slate-900 border-cyan-500/50 text-cyan-200'
  };

  const icons = {
    success: 'check-circle-2',
    error: 'alert-circle',
    warning: 'alert-triangle',
    info: 'info'
  };

  toast.className = `toast-item border ${bgColors[type] || bgColors.info}`;
  toast.innerHTML = `
    <i data-lucide="${icons[type] || 'info'}" class="w-4 h-4 shrink-0 mt-0.5"></i>
    <div class="flex-1 font-medium leading-relaxed">${message}</div>
    <button class="text-slate-400 hover:text-white ml-1" onclick="this.parentElement.remove()">
      <i data-lucide="x" class="w-3.5 h-3.5"></i>
    </button>
  `;

  container.appendChild(toast);
  initIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ---------------------- 1. AUTHENTICATION & SESSION MANAGEMENT ----------------------

function loadSession() {
  try {
    const raw = localStorage.getItem('emergencyUser');
    if (raw) {
      STATE.currentUser = JSON.parse(raw);
    } else {
      // Default to guest or Admin for emergency ease
      STATE.currentUser = {
        username: 'admin',
        full_name: 'PHẠM THÀNH NHÂN',
        role: 'Quản trị viên',
        email: 'showroomthuanan@gmail.com',
        isAdmin: true
      };
      localStorage.setItem('emergencyUser', JSON.stringify(STATE.currentUser));
    }
  } catch (e) {
    STATE.currentUser = null;
  }
  updateUserUI();
}

function updateUserUI() {
  const avatarText = document.getElementById('userAvatarText');
  const fullName = document.getElementById('userFullName');
  const roleBadge = document.getElementById('userRoleBadge');
  const authIcon = document.getElementById('iconAuthAction');

  if (STATE.currentUser) {
    avatarText.textContent = (STATE.currentUser.full_name || STATE.currentUser.username || 'U').charAt(0).toUpperCase();
    fullName.textContent = STATE.currentUser.full_name || STATE.currentUser.username;
    roleBadge.textContent = STATE.currentUser.role || 'Tư vấn bán hàng';
    roleBadge.className = STATE.currentUser.isAdmin ? 'text-[10px] text-amber-300 font-mono font-bold' : 'text-[10px] text-cyan-300 font-mono';
    if (authIcon) authIcon.setAttribute('data-lucide', 'log-out');
  } else {
    avatarText.textContent = '?';
    fullName.textContent = 'Chưa Đăng Nhập';
    roleBadge.textContent = 'Khách';
    if (authIcon) authIcon.setAttribute('data-lucide', 'log-in');
  }
  initIcons();
}

async function handleLogin(usernameOrEmail, password) {
  showToast('Đang xác thực thông tin đăng nhập...', 'info');
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password })
    });
    const result = await res.json();
    if (result.success) {
      STATE.currentUser = result.user;
      localStorage.setItem('emergencyUser', JSON.stringify(result.user));
      updateUserUI();
      closeModal('modalLogin');
      showToast(`Xin chào ${result.user.full_name} (${result.user.role})!`, 'success');
      // Reload current tab to reflect permissions
      if (STATE.activeTab === 'stock') loadStockView();
      else if (STATE.activeTab === 'orders') loadOrdersView();
    } else {
      showToast(result.message || 'Đăng nhập thất bại!', 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối máy chủ: ' + err.message, 'error');
  }
}

// ---------------------- 2. CLOCK & RADAR ----------------------

function startHeaderClock() {
  const el = document.getElementById('headerClock');
  if (!el) return;
  const update = () => {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('vi-VN', { hour12: false }) + ' • ' + now.toLocaleDateString('vi-VN');
  };
  update();
  setInterval(update, 1000);
}

async function checkSystemRadar() {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error('Status failed');
    const data = await res.json();
    STATE.systemStatus = data;

    const sbDot = document.getElementById('sbPingDot');
    const sbRing = document.getElementById('sbPingRing');
    const sbText = document.getElementById('sbPingText');
    const cardSbBadge = document.getElementById('cardSbBadge');
    const radarSbLatency = document.getElementById('radarSbLatency');

    if (data.supabase && data.supabase.isOnline) {
      sbDot.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500';
      sbRing.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75';
      sbText.textContent = `${data.supabase.latencyMs} ms`;
      sbText.className = 'font-mono font-bold text-emerald-400';

      if (cardSbBadge) {
        cardSbBadge.textContent = 'ONLINE';
        cardSbBadge.className = 'px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      }
      if (radarSbLatency) radarSbLatency.textContent = `${data.supabase.latencyMs} ms`;
    } else {
      sbDot.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500';
      sbRing.className = 'hidden';
      sbText.textContent = 'NGHẼN / SẬP (Failover)';
      sbText.className = 'font-mono font-bold text-rose-400';

      if (cardSbBadge) {
        cardSbBadge.textContent = 'FAILOVER';
        cardSbBadge.className = 'px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30';
      }
      if (radarSbLatency) radarSbLatency.textContent = 'Congested (>3500ms)';
    }

    // Outbox count
    const outboxBadge = document.getElementById('outboxBadgeCount');
    if (outboxBadge) {
      if (data.outboxCount > 0) {
        outboxBadge.textContent = data.outboxCount;
        outboxBadge.classList.remove('hidden');
      } else {
        outboxBadge.classList.add('hidden');
      }
    }

    const alertBanner = document.getElementById('failoverAlertBanner');
    if (alertBanner) {
      if (STATE.currentMode === 'force_backup' || !data.supabase?.isOnline) {
        alertBanner.classList.remove('hidden');
      } else {
        alertBanner.classList.add('hidden');
      }
    }
  } catch (err) {}
}

// ---------------------- 3. DATA FETCHING ----------------------

async function fetchTableData(table, forceBackup = false) {
  const url = `/api/data/${table}?force_backup=${forceBackup || STATE.currentMode === 'force_backup'}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Lỗi tải dữ liệu ${table}`);
  const result = await res.json();

  if (result.fallback) {
    const banner = document.getElementById('failoverAlertBanner');
    if (banner) banner.classList.remove('hidden');
  }

  STATE.datasets[table] = result.data || [];
  return STATE.datasets[table];
}

// ---------------------- 4. KHO XE (STOCK) - GIỮ XE & HỦY GIỮ XE ----------------------

async function loadStockView() {
  const tbody = document.getElementById('tbodyStock');
  tbody.innerHTML = `
    <tr>
      <td colspan="10" class="text-center py-12 text-slate-400">
        <div class="flex flex-col items-center gap-2">
          <div class="loader-spinner"></div>
          <span>Đang truy vấn kho xe từ hệ thống...</span>
        </div>
      </td>
    </tr>
  `;

  try {
    const list = await fetchTableData('khoxe');
    document.getElementById('tabCountStock').textContent = list.length;
    renderStockKPI(list);
    renderStockTable(list);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-rose-400">⚠️ Lỗi: ${err.message}</td></tr>`;
  }
}

function renderStockKPI(list) {
  const total = list.length;
  const available = list.filter(c => !c.trang_thai || c.trang_thai.includes('Có sẵn') || c.trang_thai === 'Chưa ghép').length;
  const holding = list.filter(c => c.trang_thai && c.trang_thai.includes('giữ')).length;
  const matched = list.filter(c => c.trang_thai && c.trang_thai.includes('ghép')).length;
  const invoicing = list.filter(c => c.trang_thai && (c.trang_thai.includes('HĐ') || c.trang_thai.includes('hóa đơn'))).length;
  const expired = list.filter(c => c.thoi_gian_het_han_giu && c.thoi_gian_het_han_giu !== 'Vô thời hạn' && new Date(c.thoi_gian_het_han_giu) < new Date()).length;

  document.getElementById('statStockTotal').textContent = total;
  document.getElementById('statStockAvailable').textContent = available;
  document.getElementById('statStockHolding').textContent = holding;
  document.getElementById('statStockMatched').textContent = matched;
  document.getElementById('statStockInvoicing').textContent = invoicing;
  document.getElementById('statStockExpired').textContent = expired;
}

function renderStockTable(list) {
  const tbody = document.getElementById('tbodyStock');
  const search = (document.getElementById('inputStockSearch').value || '').trim().toLowerCase();
  const filterDongXe = document.getElementById('selectStockDongXe').value;
  const filterTrangThai = document.getElementById('selectStockTrangThai').value;
  const filterMaDms = document.getElementById('selectStockMaDms').value;

  const currentUser = STATE.currentUser;
  const currentUsername = currentUser?.username?.toLowerCase();
  const isAdmin = currentUser?.isAdmin;

  const filtered = list.filter(car => {
    if (filterDongXe !== 'ALL' && (!car.dong_xe || !car.dong_xe.toUpperCase().includes(filterDongXe.toUpperCase()))) return false;
    if (filterTrangThai !== 'ALL' && (!car.trang_thai || !car.trang_thai.toLowerCase().includes(filterTrangThai.toLowerCase()))) return false;
    if (filterMaDms !== 'ALL' && (!car.ma_dms || !car.ma_dms.includes(filterMaDms))) return false;
    if (search) {
      const vin = (car.vin || '').toLowerCase();
      const soMay = (car.so_may || '').toLowerCase();
      const nguoiGiu = (car.nguoi_giu_xe || '').toLowerCase();
      const dongXe = (car.dong_xe || '').toLowerCase();
      const phienBan = (car.phien_ban || '').toLowerCase();
      const maDms = (car.ma_dms || '').toLowerCase();
      return vin.includes(search) || soMay.includes(search) || nguoiGiu.includes(search) ||
             dongXe.includes(search) || phienBan.includes(search) || maDms.includes(search);
    }
    return true;
  });

  document.getElementById('lblStockCount').textContent = filtered.length;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-slate-500">Không tìm thấy xe nào khớp với điều kiện lọc.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((car, idx) => {
    let statusClass = 'badge-available';
    const st = car.trang_thai || 'Có sẵn';
    if (st.includes('giữ')) statusClass = 'badge-holding';
    else if (st.includes('ghép')) statusClass = 'badge-matched';
    else if (st.includes('HĐ')) statusClass = 'badge-invoicing';

    const isAvailable = !car.trang_thai || car.trang_thai === 'Có sẵn' || car.trang_thai === 'Chưa ghép';
    const isHolding = car.trang_thai && car.trang_thai.includes('giữ');
    const isMyHold = isHolding && (car.username_giu_xe?.toLowerCase() === currentUsername || isAdmin);

    let actionButtons = '';
    if (isAvailable) {
      actionButtons = `
        <button class="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow"
          onclick="handleHoldCar('${car.vin}')">
          Giữ Xe
        </button>
      `;
    } else if (isHolding) {
      if (isMyHold) {
        actionButtons = `
          <button class="px-2.5 py-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white font-semibold text-xs shadow"
            onclick="handleReleaseCar('${car.vin}')">
            Hủy Giữ
          </button>
        `;
      } else {
        actionButtons = `<span class="text-[11px] text-slate-500 italic">Đang giữ</span>`;
      }
    } else {
      actionButtons = `
        <button class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold"
          onclick='openDetailModal("Chi Tiết Kho Xe", ${JSON.stringify(car).replace(/'/g, "&#39;")})'>
          Xem
        </button>
      `;
    }

    const vinHighlight = car.vin ? `
      <div class="flex items-center gap-1 font-mono font-bold text-cyan-300">
        <span>${car.vin}</span>
        <button class="text-slate-500 hover:text-cyan-400 p-0.5" title="Sao chép VIN" onclick="navigator.clipboard.writeText('${car.vin}'); showToast('Đã chép số VIN: ${car.vin}', 'success');">
          <i data-lucide="copy" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    ` : '<span class="text-slate-600 font-mono">Chưa có VIN</span>';

    return `
      <tr>
        <td class="text-center font-mono text-slate-500">${idx + 1}</td>
        <td>
          <div class="font-bold text-white text-sm">${car.dong_xe || '-'}</div>
          <div class="text-xs text-slate-400">${car.phien_ban || ''}</div>
        </td>
        <td>${vinHighlight}</td>
        <td>
          <div class="text-xs font-medium text-slate-200">Ngoại: ${car.ngoai_that || '-'}</div>
          <div class="text-[11px] text-slate-400">Nội: ${car.noi_that || '-'}</div>
        </td>
        <td><span class="badge ${statusClass}">${st}</span></td>
        <td>
          <div class="font-semibold text-slate-200">${car.nguoi_giu_xe || '-'}</div>
          <div class="text-[10px] text-slate-500 font-mono">${car.username_giu_xe || ''}</div>
        </td>
        <td class="font-mono text-xs text-amber-300/90">${car.thoi_gian_het_han_giu || '-'}</td>
        <td>
          <span class="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs text-slate-300">
            ${car.ma_dms || '-'}
          </span>
        </td>
        <td class="font-mono text-xs text-slate-400">${car.so_may || '-'}</td>
        <td class="text-right whitespace-nowrap">${actionButtons}</td>
      </tr>
    `;
  }).join('');

  initIcons();
}

async function handleHoldCar(vin) {
  if (!STATE.currentUser) {
    openModal('modalLogin');
    return;
  }

  showToast(`Đang xử lý giữ xe [${vin}]...`, 'info');
  try {
    const res = await fetch('/api/cars/hold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vin,
        username: STATE.currentUser.username,
        full_name: STATE.currentUser.full_name
      })
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success', 5000);
      loadStockView();
      checkSystemRadar();
    } else {
      showToast(`⚠️ ${result.error}`, 'error', 6000);
    }
  } catch (err) {
    showToast('Lỗi khi giữ xe: ' + err.message, 'error');
  }
}

async function handleReleaseCar(vin) {
  if (!confirm(`Bạn có chắc chắn muốn HỦY GIỮ xe [${vin}] để trả về kho cho các TVBH khác?`)) {
    return;
  }

  showToast(`Đang hủy giữ xe [${vin}]...`, 'info');
  try {
    const res = await fetch('/api/cars/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vin,
        username: STATE.currentUser?.username,
        full_name: STATE.currentUser?.full_name
      })
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success');
      loadStockView();
      checkSystemRadar();
    } else {
      showToast('Lỗi hủy giữ xe: ' + result.error, 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối: ' + err.message, 'error');
  }
}

function exportStockToExcel() {
  const data = STATE.datasets.khoxe || [];
  if (data.length === 0) {
    showToast('Chưa có dữ liệu kho xe để xuất file!', 'warning');
    return;
  }
  const cleanRows = data.map((c, i) => ({
    'STT': i + 1,
    'Dòng Xe': c.dong_xe,
    'Phiên Bản': c.phien_ban,
    'Số VIN': c.vin,
    'Ngoại Thất': c.ngoai_that,
    'Nội Thất': c.noi_that,
    'Trạng Thái': c.trang_thai,
    'Người Giữ Xe': c.nguoi_giu_xe,
    'Hạn Giữ Xe': c.thoi_gian_het_han_giu,
    'Mã DMS': c.ma_dms,
    'Số Máy': c.so_may,
    'Ngày Nhập Kho': c.ngay_nhap
  }));

  const ws = XLSX.utils.json_to_sheet(cleanRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "KhoXe_VinFast");
  XLSX.writeFile(wb, `KhoXe_VinFast_ThuanAn_${Date.now()}.xlsx`);
  showToast('Đã xuất file Excel kho xe thành công!', 'success');
}

// ---------------------- 5. ĐƠN HÀNG (ORDERS) - GHÉP XE, HỦY GHÉP, HỦY ĐƠN ----------------------

async function loadOrdersView() {
  const tbody = document.getElementById('tbodyOrders');
  const datasetName = document.getElementById('selectOrderDataset').value;

  tbody.innerHTML = `<tr><td colspan="10" class="text-center py-12 text-slate-400"><div class="loader-spinner mx-auto mb-2"></div>Đang tải đơn hàng (${datasetName})...</td></tr>`;

  try {
    const list = await fetchTableData(datasetName);
    document.getElementById('tabCountOrders').textContent = list.length;
    renderOrdersTable(list);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-rose-400">⚠️ Lỗi tải đơn hàng: ${err.message}</td></tr>`;
  }
}

function renderOrdersTable(list) {
  const tbody = document.getElementById('tbodyOrders');
  const search = (document.getElementById('inputOrderSearch').value || '').trim().toLowerCase();
  const filterTrangThai = document.getElementById('selectOrderTrangThai').value;
  const filterDongXe = document.getElementById('selectOrderDongXe').value;

  const isAdmin = STATE.currentUser?.isAdmin;

  const filtered = list.filter(ord => {
    const soHĐ = (ord.so_don_hang || ord.so_don_hang_ban || '').toLowerCase();
    const tenKH = (ord.ten_khach_hang || ord.khach_hang_tiem_nang || '').toLowerCase();
    const tvbh = (ord.ten_tu_van_ban_hang || ord.tu_van_ban_hang || '').toLowerCase();
    const dongXe = (ord.dong_xe || ord.mo_ta_san_pham || '').toLowerCase();
    const vin = (ord.vin || ord.so_vin || '').toLowerCase();
    const status = (ord.ket_qua || ord.trang_thai || '').toLowerCase();

    if (filterTrangThai !== 'ALL' && !status.includes(filterTrangThai.toLowerCase())) return false;
    if (filterDongXe !== 'ALL' && !dongXe.includes(filterDongXe.toLowerCase())) return false;
    if (search) {
      return soHĐ.includes(search) || tenKH.includes(search) || tvbh.includes(search) ||
             dongXe.includes(search) || vin.includes(search);
    }
    return true;
  });

  document.getElementById('lblOrderCount').textContent = filtered.length;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-slate-500">Không tìm thấy đơn hàng nào phù hợp.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((ord, idx) => {
    const soHĐ = ord.so_don_hang || ord.so_don_hang_ban || '-';
    const tenKH = ord.ten_khach_hang || ord.khach_hang_tiem_nang || '-';
    const dongXe = ord.dong_xe || ord.mo_ta_san_pham || '-';
    const phienBan = ord.phien_ban || ord.ten_phien_ban || '';
    const ngoaiThat = ord.ngoai_that || ord.mau_ngoai_that || '-';
    const noiThat = ord.noi_that || ord.mau_noi_that || '-';
    const tvbh = ord.ten_tu_van_ban_hang || ord.tu_van_ban_hang || '-';
    const ngayCoc = ord.ngay_coc || ord.ngay_giao_dich || ord.created_at || '-';
    const status = ord.ket_qua || ord.trang_thai || 'Chưa ghép';
    const vin = ord.vin || ord.so_vin || '';

    let statusBadge = 'badge-available';
    if (status.includes('Đã ghép')) statusBadge = 'badge-matched';
    else if (status.includes('HĐ') || status.includes('hóa đơn')) statusBadge = 'badge-invoicing';
    else if (status.includes('Hủy')) statusBadge = 'badge-canceled';

    // Business action buttons for orders
    let actionButtons = '';
    if (status === 'Chưa ghép') {
      actionButtons = `
        <button class="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
          onclick='openMatchCarModal(${JSON.stringify(ord).replace(/'/g, "&#39;")})'>
          Ghép Xe
        </button>
        <button class="p-1 rounded bg-slate-800 hover:bg-rose-900/60 text-rose-400" title="Hủy đơn"
          onclick='openCancelOrderModal("${soHĐ}", "${vin}")'>
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      `;
    } else if (status === 'Đã ghép') {
      actionButtons = `
        <button class="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
          onclick='openRequestInvoiceModal(${JSON.stringify(ord).replace(/'/g, "&#39;")})'>
          Đề Nghị XHD
        </button>
        <button class="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs" title="Hủy ghép"
          onclick='handleUnmatchCar("${soHĐ}", "${vin}")'>
          Hủy Ghép
        </button>
      `;
    } else if (status.includes('Chờ') && (status.includes('HĐ') || status.includes('hóa đơn')) && isAdmin) {
      actionButtons = `
        <button class="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
          onclick='openApproveInvoiceModal("${soHĐ}", "${vin}")'>
          Duyệt XHD
        </button>
      `;
    } else {
      actionButtons = `
        <button class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold"
          onclick='openDetailModal("Chi Tiết Đơn Hàng", ${JSON.stringify(ord).replace(/'/g, "&#39;")})'>
          Xem
        </button>
      `;
    }

    return `
      <tr>
        <td class="text-center font-mono text-slate-500">${idx + 1}</td>
        <td>
          <div class="font-mono font-bold text-cyan-400 text-xs">${soHĐ}</div>
          <div class="text-[10px] text-slate-500 font-mono">${formatDate(ord.created_at)}</div>
        </td>
        <td>
          <div class="font-bold text-white text-sm">${tenKH}</div>
          <div class="text-xs text-slate-400">${ord.sdt_khach_hang || ''}</div>
        </td>
        <td>
          <div class="font-semibold text-slate-200">${dongXe}</div>
          <div class="text-xs text-slate-400">${phienBan}</div>
        </td>
        <td>
          <div class="text-xs">Ngoại: ${ngoaiThat}</div>
          <div class="text-[11px] text-slate-400">Nội: ${noiThat}</div>
        </td>
        <td class="font-medium text-slate-300">${tvbh}</td>
        <td class="font-mono text-xs text-slate-400">${formatDate(ngayCoc)}</td>
        <td><span class="badge ${statusBadge}">${status}</span></td>
        <td class="font-mono text-xs text-cyan-300 font-bold">${vin ? vin : '<span class="text-slate-600">Chưa ghép</span>'}</td>
        <td class="text-right whitespace-nowrap">
          <div class="flex items-center justify-end gap-1.5">${actionButtons}</div>
        </td>
      </tr>
    `;
  }).join('');

  initIcons();
}

function exportOrdersToExcel() {
  const datasetName = document.getElementById('selectOrderDataset').value;
  const data = STATE.datasets[datasetName] || [];
  if (data.length === 0) {
    showToast('Chưa có dữ liệu đơn hàng để xuất!', 'warning');
    return;
  }
  const clean = data.map((o, i) => ({
    'STT': i + 1,
    'Số Đơn Hàng': o.so_don_hang || o.so_don_hang_ban,
    'Khách Hàng': o.ten_khach_hang || o.khach_hang_tiem_nang,
    'Dòng Xe': o.dong_xe || o.mo_ta_san_pham,
    'Phiên Bản': o.phien_ban || o.ten_phien_ban,
    'Ngoại Thất': o.ngoai_that || o.mau_ngoai_that,
    'Nội Thất': o.noi_that || o.mau_noi_that,
    'Tư Vấn Bán Hàng': o.ten_tu_van_ban_hang || o.tu_van_ban_hang,
    'Ngày Cọc': o.ngay_coc || o.ngay_giao_dich,
    'Trạng Thái': o.ket_qua || o.trang_thai,
    'Số VIN': o.vin || o.so_vin
  }));
  const ws = XLSX.utils.json_to_sheet(clean);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DonHang");
  XLSX.writeFile(wb, `DonHang_${datasetName}_${Date.now()}.xlsx`);
  showToast('Đã xuất Excel đơn hàng thành công!', 'success');
}

// ---------------------- MODAL: GHÉP XE (CAR MATCHING) ----------------------

async function openMatchCarModal(order) {
  STATE.selectedOrderForMatching = order;
  const soHĐ = order.so_don_hang || order.so_don_hang_ban;
  const dongXe = order.dong_xe || order.mo_ta_san_pham;
  const phienBan = order.phien_ban || order.ten_phien_ban || '';
  const ngoaiThat = order.ngoai_that || order.mau_ngoai_that || '';
  const noiThat = order.noi_that || order.mau_noi_that || '';
  const orderDms = soHĐ.substring(0, 6).toUpperCase();

  const box = document.getElementById('matchOrderSummary');
  box.innerHTML = `
    <div><span class="text-slate-400">Số đơn hàng:</span><div class="font-bold text-cyan-400 font-mono">${soHĐ}</div></div>
    <div><span class="text-slate-400">Khách hàng:</span><div class="font-bold text-white">${order.ten_khach_hang || order.khach_hang_tiem_nang}</div></div>
    <div><span class="text-slate-400">Dòng xe:</span><div class="font-bold text-emerald-400">${dongXe} ${phienBan}</div></div>
    <div><span class="text-slate-400">Màu ngoại / nội:</span><div class="font-bold text-slate-200">${ngoaiThat} / ${noiThat}</div></div>
  `;

  // Make sure we have latest stock data
  let stock = STATE.datasets.khoxe;
  if (!stock || stock.length === 0) {
    stock = await fetchTableData('khoxe');
  }

  // Filter candidates matching Model and available or holding by same user
  const candidates = stock.filter(c => {
    const isAvail = (!c.trang_thai || c.trang_thai === 'Có sẵn' || c.trang_thai === 'Chưa ghép' || c.trang_thai === 'Đang giữ');
    const modelMatch = c.dong_xe && dongXe && c.dong_xe.toUpperCase().includes(dongXe.trim().toUpperCase());
    return isAvail && modelMatch;
  });

  // Sort by entry date (FIFO)
  candidates.sort((a, b) => new Date(a.ngay_nhap || 0) - new Date(b.ngay_nhap || 0));

  document.getElementById('matchCandidateCount').textContent = `${candidates.length} xe phù hợp`;
  const tbody = document.getElementById('tbodyMatchCandidates');

  if (candidates.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-8 text-amber-400">
          ⚠️ Hiện không có xe [${dongXe}] nào có sẵn trong kho để ghép. Vui lòng kiểm tra lại tồn kho hoặc tạo yêu cầu vận chuyển!
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = candidates.map((car, idx) => {
      const isDmsMatch = car.ma_dms && car.ma_dms.toUpperCase() === orderDms;
      const isColorMatch = (!ngoaiThat || (car.ngoai_that && car.ngoai_that.toLowerCase().includes(ngoaiThat.toLowerCase().trim())));

      return `
        <tr class="${!isDmsMatch ? 'opacity-60 bg-rose-950/20' : ''}">
          <td class="font-mono text-cyan-300 font-bold text-xs">${car.vin}</td>
          <td>
            <div class="font-bold text-white">${car.dong_xe}</div>
            <div class="text-xs text-slate-400">${car.phien_ban || ''}</div>
          </td>
          <td>
            <div class="text-xs ${isColorMatch ? 'text-emerald-300 font-semibold' : 'text-slate-300'}">Ngoại: ${car.ngoai_that || '-'}</div>
            <div class="text-[11px] text-slate-400">Nội: ${car.noi_that || '-'}</div>
          </td>
          <td>
            <span class="px-2 py-0.5 rounded font-mono text-xs ${isDmsMatch ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}">
              ${car.ma_dms || '-'}
            </span>
          </td>
          <td><span class="badge ${car.trang_thai?.includes('giữ') ? 'badge-holding' : 'badge-available'}">${car.trang_thai || 'Có sẵn'}</span></td>
          <td class="font-mono text-xs text-slate-400">${formatDate(car.ngay_nhap)}</td>
          <td class="text-right">
            <button class="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow"
              onclick="handleMatchCar('${soHĐ}', '${car.vin}')">
              Ghép Xe Này
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  openModal('modalMatchCar');
}

async function handleMatchCar(so_don_hang, vin) {
  showToast(`Đang thực hiện ghép xe [${vin}] vào hợp đồng [${so_don_hang}]...`, 'info');
  try {
    const res = await fetch('/api/orders/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        so_don_hang,
        vin,
        tvbh: STATE.currentUser?.full_name || 'Tư vấn bán hàng'
      })
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success', 5000);
      closeModal('modalMatchCar');
      loadOrdersView();
      loadStockView();
      checkSystemRadar();
    } else {
      showToast(`⚠️ ${result.error}`, 'error', 6000);
    }
  } catch (err) {
    showToast('Lỗi ghép xe: ' + err.message, 'error');
  }
}

async function handleUnmatchCar(so_don_hang, vin) {
  if (!confirm(`Bạn có chắc chắn muốn HỦY GHÉP số VIN [${vin}] khỏi đơn hàng [${so_don_hang}]?`)) return;

  showToast(`Đang hủy ghép xe...`, 'info');
  try {
    const res = await fetch('/api/orders/unmatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ so_don_hang, vin })
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success');
      loadOrdersView();
      loadStockView();
      checkSystemRadar();
    } else {
      showToast('Lỗi: ' + result.error, 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối: ' + err.message, 'error');
  }
}

function openCancelOrderModal(so_don_hang, vin) {
  document.getElementById('cancelOrderNo').value = so_don_hang;
  document.getElementById('cancelOrderVin').value = vin || '';
  document.getElementById('lblCancelOrderNo').textContent = so_don_hang;
  document.getElementById('cancelOrderReason').value = '';
  openModal('modalCancelOrder');
}

async function submitCancelOrder(e) {
  e.preventDefault();
  const so_don_hang = document.getElementById('cancelOrderNo').value;
  const vin = document.getElementById('cancelOrderVin').value;
  const ghi_chu_huy = document.getElementById('cancelOrderReason').value;

  showToast(`Đang hủy đơn hàng [${so_don_hang}]...`, 'info');
  try {
    const res = await fetch('/api/orders/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ so_don_hang, vin, ghi_chu_huy })
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success');
      closeModal('modalCancelOrder');
      loadOrdersView();
      loadStockView();
    } else {
      showToast('Lỗi hủy đơn: ' + result.error, 'error');
    }
  } catch (err) {
    showToast('Lỗi: ' + err.message, 'error');
  }
}

function openRequestInvoiceModal(order) {
  const form = document.getElementById('formEmergencyInvoice');
  form.elements['so_don_hang'].value = order.so_don_hang || order.so_don_hang_ban || '';
  form.elements['ten_khach_hang'].value = order.ten_khach_hang || order.khach_hang_tiem_nang || '';
  form.elements['dong_xe'].value = `${order.dong_xe || ''} ${order.phien_ban || ''}`.trim();
  form.elements['vin'].value = order.vin || order.so_vin || '';
  form.elements['tvbh'].value = order.ten_tu_van_ban_hang || order.tu_van_ban_hang || STATE.currentUser?.full_name || '';
  openModal('modalNewInvoice');
}

function openApproveInvoiceModal(so_don_hang, vin) {
  document.getElementById('approveInvoiceOrderNo').value = so_don_hang;
  document.getElementById('approveInvoiceVin').value = vin;
  document.getElementById('lblApproveOrderNo').textContent = so_don_hang;
  document.getElementById('lblApproveVin').textContent = vin;
  document.getElementById('approveInvoiceUrl').value = '';
  openModal('modalApproveInvoice');
}

async function submitApproveInvoice(e) {
  e.preventDefault();
  const so_don_hang = document.getElementById('approveInvoiceOrderNo').value;
  const vin = document.getElementById('approveInvoiceVin').value;
  const url_hoa_don_da_xuat = document.getElementById('approveInvoiceUrl').value;

  showToast('Đang phê duyệt xuất hóa đơn...', 'info');
  try {
    const res = await fetch('/api/invoices/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ so_don_hang, vin, url_hoa_don_da_xuat })
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success');
      closeModal('modalApproveInvoice');
      loadOrdersView();
      loadInvoicesView();
      loadStockView();
    } else {
      showToast('Lỗi: ' + result.error, 'error');
    }
  } catch (err) {
    showToast('Lỗi: ' + err.message, 'error');
  }
}

// ---------------------- 6. YÊU CẦU XUẤT HÓA ĐƠN & VẬN CHUYỂN ----------------------

async function loadInvoicesView() {
  const tbody = document.getElementById('tbodyInvoices');
  tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-slate-400"><div class="loader-spinner mx-auto mb-2"></div>Đang tải yêu cầu xuất HĐ...</td></tr>`;

  try {
    const list = await fetchTableData('yeucauxhd');
    document.getElementById('tabCountInvoices').textContent = list.length;
    renderInvoicesTable(list);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-rose-400">Lỗi tải dữ liệu: ${err.message}</td></tr>`;
  }
}

function renderInvoicesTable(list) {
  const tbody = document.getElementById('tbodyInvoices');
  const search = (document.getElementById('inputInvoiceSearch').value || '').trim().toLowerCase();
  const isAdmin = STATE.currentUser?.isAdmin;

  const filtered = list.filter(it => {
    if (!search) return true;
    return (it.so_don_hang || '').toLowerCase().includes(search) ||
           (it.ten_khach_hang || '').toLowerCase().includes(search) ||
           (it.vin || '').toLowerCase().includes(search) ||
           (it.tvbh || '').toLowerCase().includes(search);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-slate-500">Không có yêu cầu XHD nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((it, idx) => {
    const isApproved = it.trang_thai_vc === 'Đã xuất hóa đơn';
    return `
      <tr>
        <td class="text-center font-mono text-slate-500">${idx + 1}</td>
        <td>
          <div class="font-mono font-bold text-cyan-300 text-xs">${it.so_don_hang || '-'}</div>
          <div class="text-[10px] text-slate-500">${formatDate(it.ngay_coc)}</div>
        </td>
        <td class="font-bold text-white">${it.ten_khach_hang || '-'}</td>
        <td>
          <div class="font-semibold text-slate-200">${it.dong_xe || '-'} (${it.phien_ban || ''})</div>
          <div class="font-mono text-cyan-400 font-bold text-xs">${it.vin || '-'}</div>
        </td>
        <td class="text-slate-300 font-medium">${it.tvbh || '-'}</td>
        <td class="font-mono text-xs text-slate-400">${formatDate(it.ngay_yeu_cau)}</td>
        <td>
          <span class="badge ${isApproved ? 'badge-invoicing' : 'badge-matched'}">
            ${it.trang_thai_vc || 'Chờ duyệt'}
          </span>
        </td>
        <td>
          <div class="font-mono text-xs text-emerald-400">HH: ${formatVND(it.hoa_hong_ung)}</div>
          <div class="text-[10px] text-slate-400">VPoint: ${it.vpoint || 0}</div>
        </td>
        <td>
          <div class="flex items-center gap-1.5 flex-wrap">
            ${it.url_hop_dong ? `<a href="${it.url_hop_dong}" target="_blank" class="px-2 py-0.5 rounded bg-blue-900/60 border border-blue-600 text-blue-300 hover:text-white text-[10px]">Hợp Đồng</a>` : ''}
            ${it.url_de_nghi_xhd ? `<a href="${it.url_de_nghi_xhd}" target="_blank" class="px-2 py-0.5 rounded bg-indigo-900/60 border border-indigo-600 text-indigo-300 hover:text-white text-[10px]">Đề Nghị</a>` : ''}
            ${it.url_hoa_don_da_xuat ? `<a href="${it.url_hoa_don_da_xuat}" target="_blank" class="px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-600 text-emerald-300 hover:text-white text-[10px]">Hóa Đơn VAT</a>` : ''}
          </div>
        </td>
        <td class="text-right">
          ${!isApproved && isAdmin ? `
            <button class="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow"
              onclick='openApproveInvoiceModal("${it.so_don_hang}", "${it.vin}")'>
              Duyệt HĐ
            </button>
          ` : `<span class="text-xs text-slate-400">${it.ghi_chu_admin || '-'}</span>`}
        </td>
      </tr>
    `;
  }).join('');
}

async function loadTransportView() {
  const tbody = document.getElementById('tbodyTransport');
  tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-slate-400"><div class="loader-spinner mx-auto mb-2"></div>Đang tải dữ liệu vận chuyển...</td></tr>`;

  try {
    const list = await fetchTableData('yeucauvc');
    document.getElementById('tabCountTransport').textContent = list.length;
    renderTransportTable(list);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-rose-400">Lỗi tải: ${err.message}</td></tr>`;
  }
}

function renderTransportTable(list) {
  const tbody = document.getElementById('tbodyTransport');
  const search = (document.getElementById('inputTransportSearch').value || '').trim().toLowerCase();

  const filtered = list.filter(t => {
    if (!search) return true;
    return (t.vin || '').toLowerCase().includes(search) ||
           (t.diem_di || '').toLowerCase().includes(search) ||
           (t.diem_den || '').toLowerCase().includes(search) ||
           (t.tai_xe || '').toLowerCase().includes(search);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-slate-500">Không có yêu cầu vận chuyển nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((t, idx) => `
    <tr>
      <td class="text-center font-mono text-slate-500">${idx + 1}</td>
      <td>
        <div class="font-bold text-white text-xs">${t.dong_xe || 'VinFast'}</div>
        <div class="font-mono text-cyan-300 font-bold text-xs">${t.vin || '-'}</div>
      </td>
      <td class="text-slate-300 font-medium">${t.diem_di || '-'}</td>
      <td class="text-slate-300 font-medium">${t.diem_den || '-'}</td>
      <td><span class="badge badge-matched">${t.trang_thai || 'Chờ vận chuyển'}</span></td>
      <td class="font-mono text-xs text-slate-400">
        <div>Dự kiến: ${formatDate(t.ngay_du_kien)}</div>
      </td>
      <td>
        <div class="font-semibold text-slate-200">${t.tai_xe || '-'}</div>
        <div class="font-mono text-xs text-slate-400">${t.sdt_tai_xe || ''}</div>
      </td>
      <td class="text-slate-300">${t.tvbh || '-'}</td>
      <td class="text-xs text-slate-400 italic">${t.ghi_chu || '-'}</td>
    </tr>
  `).join('');
}

// ---------------------- 7. LỊCH LÁI THỬ, BẢNG GIÁ, LƯU TRỮ, DANH BẠ ----------------------

async function loadTestDriveView() {
  const tbody = document.getElementById('tbodyTestDrive');
  tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-slate-400"><div class="loader-spinner mx-auto mb-2"></div>Đang tải lịch lái thử...</td></tr>`;

  try {
    const list = await fetchTableData('test_drive_schedule');
    document.getElementById('tabCountTestDrive').textContent = list.length;
    renderTestDriveTable(list);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-rose-400">Lỗi tải: ${err.message}</td></tr>`;
  }
}

function renderTestDriveTable(list) {
  const tbody = document.getElementById('tbodyTestDrive');
  const search = (document.getElementById('inputTestDriveSearch').value || '').trim().toLowerCase();

  const filtered = list.filter(td => {
    if (!search) return true;
    return (td.ten_khach_hang || '').toLowerCase().includes(search) ||
           (td.so_dien_thoai || '').toLowerCase().includes(search) ||
           (td.dong_xe || '').toLowerCase().includes(search);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-slate-500">Không có lịch lái thử nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((td, idx) => `
    <tr>
      <td class="text-center font-mono text-slate-500">${idx + 1}</td>
      <td class="font-bold text-white">${td.ten_khach_hang || '-'}</td>
      <td class="font-mono text-cyan-300">${td.so_dien_thoai || '-'}</td>
      <td class="font-semibold text-emerald-400">${td.dong_xe || '-'}</td>
      <td class="font-mono text-xs text-slate-300">${formatDate(td.thoi_gian_lai_thu || td.created_at)}</td>
      <td class="text-slate-300 text-xs">${td.dia_diem || 'Tại Showroom'}</td>
      <td class="text-slate-200 font-medium">${td.tvbh || '-'}</td>
      <td><span class="badge badge-available">${td.trang_thai || 'Đã hẹn'}</span></td>
      <td class="text-xs text-slate-400 italic">${td.ghi_chu || '-'}</td>
    </tr>
  `).join('');
}

const CAR_PRICES = {
  vf3: { name: 'VinFast VF 3 Base', price: 322000000 },
  vf5: { name: 'VinFast VF 5 Plus', price: 468000000 },
  vf6s: { name: 'VinFast VF 6S', price: 675000000 },
  vf6plus: { name: 'VinFast VF 6 Plus', price: 765000000 },
  vf7s: { name: 'VinFast VF 7S', price: 850000000 },
  vf7plus: { name: 'VinFast VF 7 Plus', price: 999000000 },
  vf8eco: { name: 'VinFast VF 8 Eco', price: 1079000000 },
  vf8plus: { name: 'VinFast VF 8 Plus', price: 1259000000 },
  vf9plus: { name: 'VinFast VF 9 Plus', price: 1589000000 },
};

function calculateRollout() {
  const modelKey = document.getElementById('calcCarModel').value;
  const loc = document.getElementById('calcLocation').value;
  const discount = Number(document.getElementById('calcDiscount').value) || 0;
  const loanPct = Number(document.getElementById('calcLoanPercent').value) || 0;
  const loanYears = Number(document.getElementById('calcLoanYears').value) || 8;

  const car = CAR_PRICES[modelKey] || { price: 322000000 };
  const netCarPrice = Math.max(0, car.price - discount);

  const plateFee = (loc === 'hcm') ? 20000000 : 1000000;
  const otherFees = 3500000;
  const totalRollout = netCarPrice + plateFee + otherFees;

  const loanAmount = (netCarPrice * loanPct) / 100;
  const upfront = totalRollout - loanAmount;

  const totalMonths = loanYears * 12;
  const monthlyPrincipal = loanAmount / totalMonths;
  const monthlyInterest = (loanAmount * 0.08) / 12;
  const monthlyTotal = monthlyPrincipal + monthlyInterest;

  document.getElementById('resPrice').textContent = formatVND(car.price);
  document.getElementById('resFees').textContent = formatVND(plateFee + otherFees);
  document.getElementById('resTotalRollout').textContent = formatVND(totalRollout);
  document.getElementById('resUpfront').textContent = formatVND(upfront);
  document.getElementById('resMonthly').textContent = loanAmount > 0 ? `${formatVND(Math.round(monthlyTotal))} / tháng` : '0 đ (Trả thẳng)';
}

async function loadPricingView() {
  calculateRollout();
  try {
    const xeList = await fetchTableData('thongtinxe');
    const tbodyXe = document.getElementById('tbodyThongTinXe');
    if (xeList.length > 0) {
      tbodyXe.innerHTML = xeList.map(x => `
        <tr>
          <td class="font-bold text-white">${x.dong_xe || x.ten_xe || '-'}</td>
          <td class="text-cyan-300 font-semibold">${x.phien_ban || '-'}</td>
          <td class="font-mono text-emerald-400 font-bold">${formatVND(x.gia_kem_pin || x.gia_niem_yet)}</td>
          <td class="font-mono text-slate-300">${formatVND(x.gia_thue_pin)}</td>
          <td class="text-xs text-slate-400">${x.thong_so || x.ghi_chu || '-'}</td>
        </tr>
      `).join('');
    }
  } catch (e) {}

  try {
    const csList = await fetchTableData('chinhsach');
    const tbodyCS = document.getElementById('tbodyChinhSach');
    if (csList.length > 0) {
      tbodyCS.innerHTML = csList.map(c => `
        <tr>
          <td class="font-bold text-amber-400">${c.ten_chinh_sach || c.tieu_de || '-'}</td>
          <td class="text-xs text-cyan-300 font-semibold">${c.dong_xe_ap_dung || 'Toàn bộ dòng xe'}</td>
          <td class="text-xs text-slate-200">${c.noi_dung || c.mo_ta || '-'}</td>
          <td class="font-mono text-xs text-slate-400">${c.thoi_gian_ap_dung || 'Hiện hành'}</td>
        </tr>
      `).join('');
    }
  } catch (e) {}
}

async function loadArchivesView() {
  const tbody = document.getElementById('tbodyArchives');
  tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400"><div class="loader-spinner mx-auto mb-2"></div>Đang tải đơn lưu trữ...</td></tr>`;

  try {
    const list = await fetchTableData('archived_orders');
    renderArchivesTable(list);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-rose-400">Lỗi: ${err.message}</td></tr>`;
  }
}

function renderArchivesTable(list) {
  const tbody = document.getElementById('tbodyArchives');
  const search = (document.getElementById('inputArchiveSearch').value || '').trim().toLowerCase();

  const filtered = list.filter(a => {
    if (!search) return true;
    return (a.so_don_hang || a.so_don_hang_ban || '').toLowerCase().includes(search) ||
           (a.ten_khach_hang || a.khach_hang_tiem_nang || '').toLowerCase().includes(search) ||
           (a.vin || a.so_vin || '').toLowerCase().includes(search);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-500">Không tìm thấy đơn lưu trữ nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((a, idx) => `
    <tr>
      <td class="text-center font-mono text-slate-500">${idx + 1}</td>
      <td class="font-mono text-cyan-300 font-bold">${a.so_don_hang || a.so_don_hang_ban || '-'}</td>
      <td class="font-bold text-white">${a.ten_khach_hang || a.khach_hang_tiem_nang || '-'}</td>
      <td class="font-medium text-slate-300">${a.dong_xe || a.mo_ta_san_pham || '-'}</td>
      <td class="font-mono text-xs text-slate-400">${a.vin || a.so_vin || '-'}</td>
      <td class="text-slate-300">${a.ten_tu_van_ban_hang || a.tvbh || '-'}</td>
      <td class="font-mono text-xs text-slate-500">${formatDate(a.created_at || a.ngay_giao_dich)}</td>
      <td><span class="badge badge-invoicing">Đã Xuất Hóa Đơn</span></td>
    </tr>
  `).join('');
}

async function loadUsersView() {
  const grid = document.getElementById('gridUsers');
  grid.innerHTML = `<div class="col-span-full text-center py-8 text-slate-400"><div class="loader-spinner mx-auto mb-2"></div>Đang tải danh bạ nhân sự...</div>`;

  try {
    const list = await fetchTableData('users');
    renderUsersGrid(list);
  } catch (err) {
    grid.innerHTML = `<div class="col-span-full text-center py-8 text-rose-400">Lỗi tải danh bạ: ${err.message}</div>`;
  }
}

function renderUsersGrid(list) {
  const grid = document.getElementById('gridUsers');
  const search = (document.getElementById('inputUserSearch').value || '').trim().toLowerCase();

  const filtered = list.filter(u => {
    if (!search) return true;
    return (u.full_name || '').toLowerCase().includes(search) ||
           (u.username || '').toLowerCase().includes(search) ||
           (u.role || '').toLowerCase().includes(search);
  });

  grid.innerHTML = filtered.map(u => {
    const isAdmin = (u.role || '').toLowerCase().includes('admin') || (u.username || '').toLowerCase() === 'admin';
    return `
      <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-3 shadow-lg">
        <div class="flex items-center justify-between">
          <div class="w-10 h-10 rounded-xl ${isAdmin ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/30' : 'bg-slate-800 text-cyan-400'} flex items-center justify-center font-bold font-mono">
            ${(u.full_name || u.username || 'U').charAt(0).toUpperCase()}
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isAdmin ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-400'}">
            ${u.role || 'Tư Vấn Bán Hàng'}
          </span>
        </div>
        <div>
          <h4 class="font-bold text-white text-sm">${u.full_name || u.username}</h4>
          <p class="text-xs text-slate-400 font-mono">@${u.username}</p>
        </div>
        <div class="pt-2 border-t border-slate-800/80 text-xs space-y-1 text-slate-400">
          <div class="flex items-center gap-1.5 truncate">
            <i data-lucide="mail" class="w-3.5 h-3.5 text-slate-500"></i>
            <span class="truncate">${u.email || 'Chưa cập nhật'}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  initIcons();
}

// ---------------------- 8. DISASTER RADAR & OUTBOX ----------------------

async function loadDisasterHub() {
  await checkSystemRadar();
  await loadOutbox();
}

async function loadOutbox() {
  try {
    const res = await fetch('/api/outbox');
    const data = await res.json();
    STATE.datasets.outbox = data.items || [];
    renderOutboxTable(STATE.datasets.outbox);
  } catch (err) {}
}

function renderOutboxTable(items) {
  const tbody = document.getElementById('tbodyOutbox');
  const countLabel = document.getElementById('lblOutboxTotal');
  if (countLabel) countLabel.textContent = `${items.length} tác vụ`;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500 text-xs">Chưa có tác vụ khẩn cấp nào phát sinh trong phiên này.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map((it) => {
    const isSynced = it.synced;
    const badge = isSynced
      ? '<span class="badge badge-available">ĐÃ ĐỒNG BỘ CLOUD</span>'
      : '<span class="badge badge-holding animate-pulse">CHỜ ĐỒNG BỘ</span>';

    const p = it.payload || {};
    const info = `HĐ/Xe: <strong>${p.so_don_hang || p.vin || '-'}</strong> | ${p.ten_khach_hang || p.full_name || '-'}`;

    return `
      <tr>
        <td class="font-mono text-cyan-300 font-bold text-xs">${it.id}</td>
        <td class="font-mono text-xs text-slate-400">${formatDate(it.created_at)}</td>
        <td class="font-semibold text-slate-200 text-xs">${it.type}</td>
        <td class="font-mono text-xs text-amber-300">${it.target_table}</td>
        <td class="text-xs text-slate-300">${info}</td>
        <td>${badge}</td>
      </tr>
    `;
  }).join('');
}

async function syncOutboxNow() {
  showToast('Đang tiến hành đồng bộ các tác vụ khẩn cấp lên Supabase...', 'info');
  try {
    const res = await fetch('/api/outbox/sync', { method: 'POST' });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success');
      loadOutbox();
      checkSystemRadar();
    } else {
      showToast('Đồng bộ thất bại: ' + result.error, 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối: ' + err.message, 'error');
  }
}

async function triggerCloudBackup() {
  showToast('Đang quét và sao lưu toàn bộ cơ sở dữ liệu Supabase về Local...', 'info');
  try {
    const res = await fetch('/api/sync/backup', { method: 'POST' });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success', 5000);
      checkSystemRadar();
    } else {
      showToast('Lỗi: ' + result.error, 'error');
    }
  } catch (err) {
    showToast('Lỗi: ' + err.message, 'error');
  }
}

// ---------------------- 9. EMERGENCY ORDER CREATION ----------------------

async function submitEmergencyOrder(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  if (!payload.ten_tu_van_ban_hang && STATE.currentUser) {
    payload.ten_tu_van_ban_hang = STATE.currentUser.full_name;
  }

  showToast('Đang tạo đơn hàng theo chuẩn hệ thống...', 'info');
  try {
    const res = await fetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success', 5000);
      closeModal('modalNewOrder');
      form.reset();
      loadOrdersView();
      checkSystemRadar();
    } else {
      showToast('Lỗi: ' + result.error, 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối: ' + err.message, 'error');
  }
}

async function submitEmergencyInvoice(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  showToast('Đang gửi đề nghị xuất HĐ...', 'info');
  try {
    const res = await fetch('/api/invoices/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success');
      closeModal('modalNewInvoice');
      form.reset();
      loadOrdersView();
      loadInvoicesView();
    } else {
      showToast('Lỗi: ' + result.error, 'error');
    }
  } catch (err) {
    showToast('Lỗi: ' + err.message, 'error');
  }
}

// ---------------------- 10. GLOBAL SEARCH & MODALS ----------------------

function openGlobalSearch() {
  const modal = document.getElementById('modalGlobalSearch');
  modal.classList.remove('hidden');
  const input = document.getElementById('globalSearchInput');
  input.value = '';
  input.focus();
}

function handleGlobalSearch(e) {
  const q = e.target.value.trim().toLowerCase();
  const container = document.getElementById('globalSearchResults');

  if (!q) {
    container.innerHTML = `<p class="text-xs text-slate-500 text-center py-8">Nhập từ khóa bất kỳ để tra cứu tức thì trên Kho xe, Đơn hàng, Hóa đơn...</p>`;
    return;
  }

  const results = [];

  (STATE.datasets.khoxe || []).forEach(c => {
    if ((c.vin || '').toLowerCase().includes(q) || (c.nguoi_giu_xe || '').toLowerCase().includes(q) || (c.dong_xe || '').toLowerCase().includes(q)) {
      results.push({
        type: 'Kho Xe',
        title: `${c.dong_xe} - ${c.phien_ban || ''}`,
        sub: `VIN: ${c.vin || 'Chưa có'} | Màu: ${c.ngoai_that || '-'} | Trạng thái: ${c.trang_thai}`,
        raw: c
      });
    }
  });

  (STATE.datasets.donhang || []).forEach(o => {
    if ((o.so_don_hang || '').toLowerCase().includes(q) || (o.ten_khach_hang || '').toLowerCase().includes(q) || (o.vin || '').toLowerCase().includes(q)) {
      results.push({
        type: 'Đơn Hàng',
        title: `${o.so_don_hang} - ${o.ten_khach_hang}`,
        sub: `Xe: ${o.dong_xe} | TVBH: ${o.ten_tu_van_ban_hang} | Cọc: ${formatDate(o.ngay_coc)}`,
        raw: o
      });
    }
  });

  if (results.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-500 text-center py-6">Không tìm thấy kết quả nào khớp với "${q}".</p>`;
    return;
  }

  container.innerHTML = results.slice(0, 20).map(r => `
    <div class="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 cursor-pointer transition flex items-center justify-between"
      onclick='openDetailModal("${r.type}", ${JSON.stringify(r.raw).replace(/'/g, "&#39;")})'>
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${r.type === 'Kho Xe' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-emerald-500/20 text-emerald-300'}">${r.type}</span>
          <span class="font-bold text-white text-xs">${r.title}</span>
        </div>
        <p class="text-xs text-slate-400 mt-1">${r.sub}</p>
      </div>
      <i data-lucide="chevron-right" class="w-4 h-4 text-slate-500"></i>
    </div>
  `).join('');

  initIcons();
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('hidden');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('hidden');
}

function openDetailModal(title, dataObj) {
  document.getElementById('modalDetailTitle').textContent = title;
  const body = document.getElementById('modalDetailBody');

  const rows = Object.entries(dataObj).map(([k, v]) => `
    <div class="grid grid-cols-3 py-2 border-b border-slate-800">
      <span class="text-slate-400 font-mono">${k}</span>
      <span class="col-span-2 text-white font-medium break-all font-mono">${typeof v === 'object' ? JSON.stringify(v) : (v || '-')}</span>
    </div>
  `).join('');

  body.innerHTML = rows;
  openModal('modalDetailView');
}

// ---------------------- 11. INITIALIZATION ----------------------

document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  loadSession();
  startHeaderClock();
  checkSystemRadar();
  setInterval(checkSystemRadar, 12000);

  loadStockView();

  // Navigation tabs
  document.querySelectorAll('.nav-tab').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      const tabName = tabBtn.dataset.tab;
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));

      tabBtn.classList.add('active');
      const targetView = document.getElementById(`view-${tabName}`);
      if (targetView) targetView.classList.add('active');
      STATE.activeTab = tabName;

      if (tabName === 'stock') loadStockView();
      else if (tabName === 'orders') loadOrdersView();
      else if (tabName === 'invoices') loadInvoicesView();
      else if (tabName === 'transport') loadTransportView();
      else if (tabName === 'testdrive') loadTestDriveView();
      else if (tabName === 'pricing') loadPricingView();
      else if (tabName === 'archives') loadArchivesView();
      else if (tabName === 'users') loadUsersView();
      else if (tabName === 'disaster') loadDisasterHub();
    });
  });

  // Login action button in header
  document.getElementById('btnAuthAction').addEventListener('click', () => {
    openModal('modalLogin');
  });

  // Login form submit
  document.getElementById('formLogin').addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('loginUsername').value;
    const p = document.getElementById('loginPassword').value;
    handleLogin(u, p);
  });

  // Quick user buttons in login modal
  document.querySelectorAll('.btn-quick-user').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('loginUsername').value = btn.dataset.user;
      document.getElementById('loginPassword').value = btn.dataset.pass;
      handleLogin(btn.dataset.user, btn.dataset.pass);
    });
  });

  // Mode toggling
  const btnModeAuto = document.getElementById('btnModeAuto');
  const btnModeBackup = document.getElementById('btnModeBackup');

  const setAppMode = async (mode) => {
    STATE.currentMode = mode;
    if (mode === 'auto') {
      btnModeAuto.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-600 text-white shadow-sm flex items-center gap-1.5';
      btnModeBackup.className = 'px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1.5';
      showToast('Đã kích hoạt chế độ Tự động (Ưu tiên Live, Failover sang Backup nếu sập)', 'info');
    } else {
      btnModeBackup.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-600 text-slate-950 font-bold shadow-sm flex items-center gap-1.5';
      btnModeAuto.className = 'px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1.5';
      showToast('Đã chuyển sang chế độ Thuần Offline (Chống Sập 100% - Đọc Local Backup)', 'warning');
    }

    try {
      await fetch('/api/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
    } catch (e) {}

    checkSystemRadar();

    if (STATE.activeTab === 'stock') loadStockView();
    else if (STATE.activeTab === 'orders') loadOrdersView();
  };

  btnModeAuto.addEventListener('click', () => setAppMode('auto'));
  btnModeBackup.addEventListener('click', () => setAppMode('force_backup'));

  // Stock filters
  document.getElementById('inputStockSearch').addEventListener('input', () => renderStockTable(STATE.datasets.khoxe));
  document.getElementById('selectStockDongXe').addEventListener('change', () => renderStockTable(STATE.datasets.khoxe));
  document.getElementById('selectStockTrangThai').addEventListener('change', () => renderStockTable(STATE.datasets.khoxe));
  document.getElementById('selectStockMaDms').addEventListener('change', () => renderStockTable(STATE.datasets.khoxe));
  document.getElementById('btnReloadStock').addEventListener('click', loadStockView);
  document.getElementById('btnExportStockExcel').addEventListener('click', exportStockToExcel);

  // Order filters
  document.getElementById('inputOrderSearch').addEventListener('input', () => {
    const ds = document.getElementById('selectOrderDataset').value;
    renderOrdersTable(STATE.datasets[ds] || []);
  });
  document.getElementById('selectOrderDataset').addEventListener('change', loadOrdersView);
  document.getElementById('selectOrderTrangThai').addEventListener('change', () => {
    const ds = document.getElementById('selectOrderDataset').value;
    renderOrdersTable(STATE.datasets[ds] || []);
  });
  document.getElementById('selectOrderDongXe').addEventListener('change', () => {
    const ds = document.getElementById('selectOrderDataset').value;
    renderOrdersTable(STATE.datasets[ds] || []);
  });
  document.getElementById('btnReloadOrders').addEventListener('click', loadOrdersView);
  document.getElementById('btnExportOrderExcel').addEventListener('click', exportOrdersToExcel);

  // Invoices & Transport reloads
  document.getElementById('inputInvoiceSearch').addEventListener('input', () => renderInvoicesTable(STATE.datasets.yeucauxhd || []));
  document.getElementById('btnReloadInvoices').addEventListener('click', loadInvoicesView);
  document.getElementById('inputTransportSearch').addEventListener('input', () => renderTransportTable(STATE.datasets.yeucauvc || []));
  document.getElementById('btnReloadTransport').addEventListener('click', loadTransportView);

  // Pricing calculator inputs
  ['calcCarModel', 'calcLocation', 'calcDiscount', 'calcLoanPercent', 'calcLoanYears'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calculateRollout);
  });

  // Archives & Users
  document.getElementById('inputArchiveSearch').addEventListener('input', () => renderArchivesTable(STATE.datasets.archived_orders || []));
  document.getElementById('btnReloadArchives').addEventListener('click', loadArchivesView);
  document.getElementById('inputUserSearch').addEventListener('input', () => renderUsersGrid(STATE.datasets.users || []));

  // Disaster Hub Actions
  document.getElementById('btnTriggerCloudBackup').addEventListener('click', triggerCloudBackup);
  document.getElementById('btnSyncOutboxNow').addEventListener('click', syncOutboxNow);
  document.getElementById('btnOpenOutbox').addEventListener('click', () => {
    document.querySelector('[data-tab="disaster"]').click();
  });

  // Emergency Order modal & form
  document.getElementById('btnOpenNewOrderModal').addEventListener('click', () => {
    const form = document.getElementById('formEmergencyOrder');
    if (STATE.currentUser && form.elements['ten_tu_van_ban_hang']) {
      form.elements['ten_tu_van_ban_hang'].value = STATE.currentUser.full_name;
    }
    openModal('modalNewOrder');
  });
  document.getElementById('formEmergencyOrder').addEventListener('submit', submitEmergencyOrder);

  // Emergency Invoice modal & form
  document.getElementById('btnOpenNewInvoiceModal').addEventListener('click', () => openModal('modalNewInvoice'));
  document.getElementById('formEmergencyInvoice').addEventListener('submit', submitEmergencyInvoice);

  // Cancel Order form
  document.getElementById('formCancelOrder').addEventListener('submit', submitCancelOrder);

  // Approve Invoice form
  document.getElementById('formApproveInvoice').addEventListener('submit', submitApproveInvoice);

  // Global Search
  document.getElementById('btnGlobalSearch').addEventListener('click', openGlobalSearch);
  document.getElementById('globalSearchInput').addEventListener('input', handleGlobalSearch);

  // Close modals
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(btn.dataset.close);
    });
  });

  // Keyboard shortcut Ctrl + K & Escape
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openGlobalSearch();
    }
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
    }
  });
});
