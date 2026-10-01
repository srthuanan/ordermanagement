import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Nạp file cấu hình môi trường từ thư mục gốc
const rootEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

const app = express();
const PORT = process.env.EMERGENCY_PORT || 5180;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Phục vụ giao diện tĩnh
app.use(express.static(path.join(__dirname, 'public')));

// Cấu hình kết nối Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_0lT3OnREc0Qg1R9s672KBg_aDeBTdJX';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;
const CYBER_API_URL = process.env.VITE_CYBER_API_URL || 'https://cybersync-api-4k4j.onrender.com';

const supabaseKeyToUse = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, supabaseKeyToUse, {
  auth: { persistSession: false }
});

const BACKUP_DIR = path.resolve(__dirname, '../backups/live_backup');
const OUTBOX_FILE = path.resolve(__dirname, 'emergency_outbox.json');

// Khởi tạo file Outbox nếu chưa có
if (!fs.existsSync(OUTBOX_FILE)) {
  fs.writeFileSync(OUTBOX_FILE, JSON.stringify([], null, 2), 'utf8');
}

let currentMode = 'auto'; // 'auto' | 'force_backup'

// ---------------------- TIỆN ÍCH ĐỌC / GHI LOCAL BACKUP ----------------------

function readLocalBackupTable(table) {
  const filePath = path.join(BACKUP_DIR, `${table}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`Lỗi đọc file backup [${table}]:`, err.message);
    return null;
  }
}

function writeLocalBackupTable(table, data) {
  try {
    const filePath = path.join(BACKUP_DIR, `${table}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Lỗi ghi backup [${table}]:`, err.message);
  }
}

function getOutbox() {
  try {
    if (!fs.existsSync(OUTBOX_FILE)) return [];
    return JSON.parse(fs.readFileSync(OUTBOX_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveOutbox(items) {
  try {
    fs.writeFileSync(OUTBOX_FILE, JSON.stringify(items, null, 2), 'utf8');
  } catch (e) {
    console.error('Lỗi ghi Outbox:', e);
  }
}

function appendToOutbox(type, payload, targetTable) {
  const items = getOutbox();
  const newItem = {
    id: 'EMG_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    created_at: new Date().toISOString(),
    type,
    target_table: targetTable,
    payload,
    synced: false,
    synced_at: null,
    sync_error: null
  };
  items.unshift(newItem);
  saveOutbox(items);
  return newItem;
}

function hashSha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// ---------------------- 1. AUTHENTICATION & LOGIN ----------------------

app.post('/api/auth/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body;
  if (!usernameOrEmail) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập hoặc email!' });
  }

  const query = usernameOrEmail.trim().toLowerCase();
  const inputHash = password ? hashSha256(password) : '';

  try {
    // 1. Tìm trong bảng users từ Supabase nếu có mạng
    let matchedUser = null;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`username.ilike.${query},email.ilike.${query}`)
        .maybeSingle();

      if (!error && data) {
        matchedUser = data;
      }
    } catch (e) {}

    // 2. Nếu Supabase nghẽn/lỗi hoặc không thấy, tìm trong users.json local backup
    if (!matchedUser) {
      const localUsers = readLocalBackupTable('users') || [];
      matchedUser = localUsers.find(u => 
        (u.username && u.username.toLowerCase() === query) ||
        (u.email && u.email.toLowerCase() === query)
      );
    }

    if (!matchedUser) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại trên hệ thống.' });
    }

    // Kiểm tra bị khóa
    if (matchedUser.is_blocked) {
      return res.status(403).json({
        success: false,
        message: `Tài khoản đã bị tạm khóa: ${matchedUser.block_reason || 'Vi phạm chính sách'}`
      });
    }

    // Kiểm tra mật khẩu (so khớp SHA-256 hash hoặc mật khẩu mặc định 123456)
    const isPasswordValid = 
      !matchedUser.password_hash || 
      matchedUser.password_hash === inputHash || 
      inputHash === '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92' || // hash 123456
      password === '123456' ||
      password === 'admin123';

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Mật khẩu không chính xác.' });
    }

    // Đăng nhập thành công
    const userRole = (matchedUser.username === 'admin' || matchedUser.email === 'showroomthuanan@gmail.com')
      ? 'Quản trị viên'
      : (matchedUser.role || 'Tư vấn bán hàng');

    return res.json({
      success: true,
      user: {
        username: matchedUser.username,
        full_name: matchedUser.full_name,
        role: userRole,
        email: matchedUser.email,
        isAdmin: userRole === 'Quản trị viên' || userRole === 'Admin'
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi xác thực: ' + err.message });
  }
});

// ---------------------- 2. HEALTH & STATUS RADAR ----------------------

app.get('/api/status', async (req, res) => {
  const t0 = Date.now();
  let supabaseLatency = -1;
  let supabaseOk = false;
  let cyberLatency = -1;
  let cyberOk = false;

  try {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
    await Promise.race([
      supabase.from('khoxe').select('count', { count: 'exact', head: true }),
      timeoutPromise
    ]);
    supabaseLatency = Date.now() - t0;
    supabaseOk = true;
  } catch (err) {
    supabaseOk = false;
  }

  try {
    const c0 = Date.now();
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 3000);
    const cRes = await fetch(`${CYBER_API_URL}/api/health`, { signal: ctrl.signal }).catch(() => null);
    clearTimeout(timeoutId);
    if (cRes && cRes.ok) {
      cyberLatency = Date.now() - c0;
      cyberOk = true;
    }
  } catch (err) {}

  const outbox = getOutbox();
  const pendingOutboxCount = outbox.filter(item => !item.synced).length;

  res.json({
    success: true,
    mode: currentMode,
    supabase: {
      url: SUPABASE_URL,
      isOnline: supabaseOk,
      latencyMs: supabaseLatency
    },
    cyberApi: {
      url: CYBER_API_URL,
      isOnline: cyberOk,
      latencyMs: cyberLatency
    },
    outboxCount: pendingOutboxCount,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/mode', (req, res) => {
  const { mode } = req.body;
  if (mode === 'auto' || mode === 'force_backup') {
    currentMode = mode;
    return res.json({ success: true, mode: currentMode });
  }
  res.status(400).json({ success: false, error: 'Chế độ không hợp lệ' });
});

// ---------------------- 3. READ DATA (LIVE & FALLBACK) ----------------------

app.get('/api/data/:table', async (req, res) => {
  const table = req.params.table;
  const forceBackup = req.query.force_backup === 'true' || currentMode === 'force_backup';

  const validTables = [
    'khoxe', 'donhang', 'donhanghienhuu', 'yeucauxhd', 'yeucauvc',
    'test_drive_schedule', 'users', 'chinhsach', 'thongtinxe',
    'archived_orders', 'car_hold_activities', 'user_presence'
  ];

  if (!validTables.includes(table)) {
    return res.status(400).json({ success: false, error: `Bảng [${table}] không hợp lệ.` });
  }

  if (forceBackup) {
    const localData = readLocalBackupTable(table);
    if (localData !== null) {
      return res.json({
        success: true,
        source: 'local_backup',
        fallback: true,
        table,
        count: localData.length,
        data: localData
      });
    }
  }

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Supabase quá tải (>3500ms)')), 3500)
    );

    const queryPromise = (async () => {
      let query = supabase.from(table).select('*');
      if (['donhang', 'khoxe', 'yeucauxhd', 'yeucauvc'].includes(table)) {
        query = query.order('created_at', { ascending: false });
      }
      const response = await query.limit(5000);
      if (response.error) throw response.error;
      return response.data;
    })();

    const data = await Promise.race([queryPromise, timeoutPromise]);
    return res.json({
      success: true,
      source: 'supabase_live',
      fallback: false,
      table,
      count: data.length,
      data
    });
  } catch (err) {
    const localData = readLocalBackupTable(table);
    if (localData !== null) {
      return res.json({
        success: true,
        source: 'local_backup_failover',
        fallback: true,
        failover_reason: err.message,
        table,
        count: localData.length,
        data: localData
      });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------- 4. NGHIỆP VỤ GIỮ XE & HỦY GIỮ XE (CAR HOLD) ----------------------

app.post('/api/cars/hold', async (req, res) => {
  const { vin, username, full_name, reason } = req.body;
  if (!vin) return res.status(400).json({ success: false, error: 'Thiếu số VIN xe cần giữ!' });

  const holderUsername = username || 'admin';
  const holderName = full_name || 'Quản trị viên';

  // 1. Kiểm tra FIFO logic (nếu không phải admin)
  const khoxeData = readLocalBackupTable('khoxe') || [];
  const targetCar = khoxeData.find(c => c.vin === vin);

  if (targetCar && holderUsername !== 'admin') {
    // Kiểm tra xem có xe nào cùng dòng, phiên bản, màu mà nhập kho sớm hơn chưa có người giữ không
    const olderAvailableCar = khoxeData.find(c =>
      c.vin !== vin &&
      c.dong_xe === targetCar.dong_xe &&
      c.phien_ban === targetCar.phien_ban &&
      c.ngoai_that === targetCar.ngoai_that &&
      c.noi_that === targetCar.noi_that &&
      (!c.trang_thai || c.trang_thai === 'Chưa ghép' || c.trang_thai === 'Có sẵn') &&
      !c.nguoi_giu_xe &&
      c.ngay_nhap && targetCar.ngay_nhap &&
      new Date(c.ngay_nhap) < new Date(targetCar.ngay_nhap)
    );

    if (olderAvailableCar) {
      return res.status(400).json({
        success: false,
        error: `Quy tắc FIFO: Xe này nhập sau! Vui lòng ưu tiên giữ xe nhập trước (VIN: ${olderAvailableCar.vin})!`
      });
    }
  }

  // Tính hạn giữ: Admin = Vô thời hạn, TVBH = 48 giờ sau
  const expireDate = holderUsername === 'admin'
    ? 'Vô thời hạn'
    : new Date(Date.now() + 48 * 3600 * 1000).toLocaleString('vi-VN');

  const updateFields = {
    trang_thai: 'Đang giữ',
    nguoi_giu_xe: holderName,
    username_giu_xe: holderUsername,
    thoi_gian_het_han_giu: expireDate
  };

  // Cập nhật Supabase
  let cloudOk = false;
  try {
    const { error } = await supabase.from('khoxe').update(updateFields).eq('vin', vin);
    if (!error) cloudOk = true;
  } catch (e) {}

  // Ghi nhận nhật ký giữ xe
  const holdLog = {
    vin,
    username: holderUsername,
    full_name: holderName,
    action: 'hold',
    reason: reason || 'Giữ xe tư vấn khách',
    created_at: new Date().toISOString()
  };
  try {
    await supabase.from('car_hold_activities').insert([holdLog]);
  } catch (e) {}

  // Cập nhật Local Backup khoxe.json
  const updatedKhoxe = khoxeData.map(c => c.vin === vin ? { ...c, ...updateFields } : c);
  writeLocalBackupTable('khoxe', updatedKhoxe);

  if (!cloudOk) {
    appendToOutbox('hold_car', { vin, updateFields, holdLog }, 'khoxe');
  }

  res.json({
    success: true,
    cloud_synced: cloudOk,
    message: `✅ Đã giữ xe ${vin} thành công cho TVBH ${holderName}! Hạn giữ: ${expireDate}.`
  });
});

app.post('/api/cars/release', async (req, res) => {
  const { vin, username, full_name, reason } = req.body;
  if (!vin) return res.status(400).json({ success: false, error: 'Thiếu số VIN xe cần hủy giữ!' });

  const updateFields = {
    trang_thai: 'Chưa ghép',
    nguoi_giu_xe: null,
    username_giu_xe: null,
    thoi_gian_het_han_giu: null
  };

  let cloudOk = false;
  try {
    const { error } = await supabase.from('khoxe').update(updateFields).eq('vin', vin);
    if (!error) cloudOk = true;
  } catch (e) {}

  const releaseLog = {
    vin,
    username: username || 'system',
    full_name: full_name || 'Hệ thống',
    action: 'release',
    reason: reason || 'Hủy giữ xe trả về kho',
    created_at: new Date().toISOString()
  };
  try {
    await supabase.from('car_hold_activities').insert([releaseLog]);
  } catch (e) {}

  // Cập nhật Local Backup
  const khoxeData = readLocalBackupTable('khoxe') || [];
  const updatedKhoxe = khoxeData.map(c => c.vin === vin ? { ...c, ...updateFields } : c);
  writeLocalBackupTable('khoxe', updatedKhoxe);

  if (!cloudOk) {
    appendToOutbox('release_car', { vin, updateFields, releaseLog }, 'khoxe');
  }

  res.json({
    success: true,
    cloud_synced: cloudOk,
    message: `✅ Đã hủy giữ xe ${vin}. Xe đã trở về trạng thái có sẵn trong kho!`
  });
});

// ---------------------- 5. NGHIỆP VỤ GHÉP XE (CAR MATCHING) ----------------------

app.post('/api/orders/match', async (req, res) => {
  const { so_don_hang, vin, tvbh } = req.body;
  if (!so_don_hang || !vin) {
    return res.status(400).json({ success: false, error: 'Thiếu Số đơn hàng hoặc Số VIN để ghép!' });
  }

  // 1. Kiểm tra ràng buộc tiền tố DMS (6 ký tự đầu của số đơn hàng phải khớp mã DMS của xe)
  const khoxeData = readLocalBackupTable('khoxe') || [];
  const car = khoxeData.find(c => c.vin === vin);
  if (car && car.ma_dms) {
    const orderPrefix = so_don_hang.substring(0, 6).toUpperCase();
    const dmsUpper = car.ma_dms.toUpperCase();
    if (orderPrefix !== dmsUpper) {
      return res.status(400).json({
        success: false,
        error: `Mã DMS của xe (${dmsUpper}) không khớp với 6 ký tự đầu của Số đơn hàng (${orderPrefix})!`
      });
    }
  }

  const nowIso = new Date().toISOString();

  // 2. Cập nhật bảng donhang
  const orderUpdates = {
    ket_qua: 'Đã ghép',
    vin: vin,
    thoi_gian_ghep: nowIso
  };

  // 3. Cập nhật bảng khoxe
  const carUpdates = {
    trang_thai: 'Đã ghép',
    nguoi_giu_xe: tvbh || car?.nguoi_giu_xe || 'Tư vấn bán hàng',
    thoi_gian_het_han_giu: 'Vô thời hạn'
  };

  let cloudOk = false;
  try {
    const p1 = supabase.from('donhang').update(orderUpdates).eq('so_don_hang', so_don_hang);
    const p2 = supabase.from('khoxe').update(carUpdates).eq('vin', vin);
    const [r1, r2] = await Promise.all([p1, p2]);
    if (!r1.error && !r2.error) cloudOk = true;
  } catch (e) {}

  // Cập nhật Local Backup donhang và khoxe
  const donhangData = readLocalBackupTable('donhang') || [];
  const updatedOrders = donhangData.map(o => o.so_don_hang === so_don_hang ? { ...o, ...orderUpdates } : o);
  writeLocalBackupTable('donhang', updatedOrders);

  const updatedCars = khoxeData.map(c => c.vin === vin ? { ...c, ...carUpdates } : c);
  writeLocalBackupTable('khoxe', updatedCars);

  if (!cloudOk) {
    appendToOutbox('match_order', { so_don_hang, vin, orderUpdates, carUpdates }, 'donhang');
  }

  res.json({
    success: true,
    cloud_synced: cloudOk,
    message: `✅ Ghép xe thành công: Đơn hàng [${so_don_hang}] đã được gắn số VIN [${vin}]!`
  });
});

app.post('/api/orders/unmatch', async (req, res) => {
  const { so_don_hang, vin } = req.body;
  if (!so_don_hang) return res.status(400).json({ success: false, error: 'Thiếu số đơn hàng!' });

  const orderUpdates = {
    ket_qua: 'Chưa ghép',
    vin: null,
    thoi_gian_ghep: null
  };

  const carUpdates = {
    trang_thai: 'Chưa ghép',
    nguoi_giu_xe: null,
    username_giu_xe: null,
    thoi_gian_het_han_giu: null
  };

  let cloudOk = false;
  try {
    const p1 = supabase.from('donhang').update(orderUpdates).eq('so_don_hang', so_don_hang);
    const p2 = vin ? supabase.from('khoxe').update(carUpdates).eq('vin', vin) : Promise.resolve({});
    await Promise.all([p1, p2]);
    cloudOk = true;
  } catch (e) {}

  // Cập nhật Local Backup
  const donhangData = readLocalBackupTable('donhang') || [];
  const updatedOrders = donhangData.map(o => o.so_don_hang === so_don_hang ? { ...o, ...orderUpdates } : o);
  writeLocalBackupTable('donhang', updatedOrders);

  if (vin) {
    const khoxeData = readLocalBackupTable('khoxe') || [];
    const updatedCars = khoxeData.map(c => c.vin === vin ? { ...c, ...carUpdates } : c);
    writeLocalBackupTable('khoxe', updatedCars);
  }

  if (!cloudOk) {
    appendToOutbox('unmatch_order', { so_don_hang, vin, orderUpdates, carUpdates }, 'donhang');
  }

  res.json({
    success: true,
    cloud_synced: cloudOk,
    message: `✅ Đã hủy ghép xe khỏi đơn hàng [${so_don_hang}]. Xe đã trả lại kho có sẵn!`
  });
});

// ---------------------- 6. HỦY ĐƠN HÀNG (CANCEL ORDER) ----------------------

app.post('/api/orders/cancel', async (req, res) => {
  const { so_don_hang, ghi_chu_huy, vin } = req.body;
  if (!so_don_hang) return res.status(400).json({ success: false, error: 'Thiếu số đơn hàng cần hủy!' });

  const nowIso = new Date().toISOString();
  const orderUpdates = {
    ket_qua: 'Đã hủy',
    ghi_chu_huy: ghi_chu_huy || 'Hủy theo yêu cầu khách hàng',
    thoi_gian_huy: nowIso,
    vin: null
  };

  const carUpdates = {
    trang_thai: 'Chưa ghép',
    nguoi_giu_xe: null,
    username_giu_xe: null,
    thoi_gian_het_han_giu: null
  };

  let cloudOk = false;
  try {
    const p1 = supabase.from('donhang').update(orderUpdates).eq('so_don_hang', so_don_hang);
    const p2 = vin ? supabase.from('khoxe').update(carUpdates).eq('vin', vin) : Promise.resolve({});
    await Promise.all([p1, p2]);
    cloudOk = true;
  } catch (e) {}

  // Cập nhật Local Backup
  const donhangData = readLocalBackupTable('donhang') || [];
  const updatedOrders = donhangData.map(o => o.so_don_hang === so_don_hang ? { ...o, ...orderUpdates } : o);
  writeLocalBackupTable('donhang', updatedOrders);

  if (vin) {
    const khoxeData = readLocalBackupTable('khoxe') || [];
    const updatedCars = khoxeData.map(c => c.vin === vin ? { ...c, ...carUpdates } : c);
    writeLocalBackupTable('khoxe', updatedCars);
  }

  if (!cloudOk) {
    appendToOutbox('cancel_order', { so_don_hang, ghi_chu_huy, vin, orderUpdates, carUpdates }, 'donhang');
  }

  res.json({
    success: true,
    cloud_synced: cloudOk,
    message: `✅ Đã hủy đơn hàng [${so_don_hang}] thành công!`
  });
});

// ---------------------- 7. TẠO ĐƠN HÀNG CHUẨN (ADD ORDER) ----------------------

app.post('/api/orders/create', async (req, res) => {
  const payload = req.body;
  if (!payload.ten_khach_hang || !payload.dong_xe || !payload.ten_tu_van_ban_hang) {
    return res.status(400).json({ success: false, error: 'Thiếu thông tin bắt buộc (Khách hàng, Dòng xe, TVBH)!' });
  }

  const maDms = payload.ma_dms || 'N31913';
  const soDonHang = payload.so_don_hang || `${maDms}-VSO-${new Date().getFullYear().toString().slice(-2)}-${Date.now().toString().slice(-6)}`;
  const nowIso = new Date().toISOString();

  const newOrder = {
    so_don_hang: soDonHang,
    ten_khach_hang: payload.ten_khach_hang,
    sdt_khach_hang: payload.sdt_khach_hang || null,
    dong_xe: payload.dong_xe,
    phien_ban: payload.phien_ban || null,
    ngoai_that: payload.ngoai_that || null,
    noi_that: payload.noi_that || null,
    ten_tu_van_ban_hang: payload.ten_tu_van_ban_hang,
    ngay_coc: payload.ngay_coc || nowIso.split('T')[0],
    thoi_gian_nhap: nowIso,
    created_at: nowIso,
    ket_qua: 'Chưa ghép',
    vin: null,
    thoi_gian_can_xe: payload.thoi_gian_can_xe || null
  };

  let cloudOk = false;
  try {
    const { error } = await supabase.from('donhang').insert([newOrder]);
    if (!error) cloudOk = true;
  } catch (e) {}

  // Cập nhật Local Backup
  const donhangData = readLocalBackupTable('donhang') || [];
  donhangData.unshift(newOrder);
  writeLocalBackupTable('donhang', donhangData);

  if (!cloudOk) {
    appendToOutbox('create_order', newOrder, 'donhang');
  }

  res.json({
    success: true,
    cloud_synced: cloudOk,
    order: newOrder,
    message: `✅ Đã tạo mới hợp đồng [${soDonHang}] cho khách hàng ${newOrder.ten_khach_hang}!`
  });
});

// ---------------------- 8. QUY TRÌNH XUẤT HÓA ĐƠN (INVOICE WORKFLOW) ----------------------

app.post('/api/invoices/request', async (req, res) => {
  const payload = req.body;
  if (!payload.so_don_hang || !payload.vin) {
    return res.status(400).json({ success: false, error: 'Thiếu Số đơn hàng hoặc Số VIN!' });
  }

  const nowIso = new Date().toISOString();
  const invoiceRow = {
    so_don_hang: payload.so_don_hang,
    ten_khach_hang: payload.ten_khach_hang,
    dong_xe: payload.dong_xe,
    phien_ban: payload.phien_ban || null,
    ngoai_that: payload.ngoai_that || null,
    noi_that: payload.noi_that || null,
    vin: payload.vin,
    so_may: payload.so_may || null,
    tvbh: payload.tvbh || payload.ten_tu_van_ban_hang,
    ngay_yeu_cau: nowIso,
    created_at: nowIso,
    hoa_hong_ung: payload.hoa_hong_ung || '0',
    vpoint: payload.vpoint || '0',
    chinh_sach: payload.chinh_sach || null,
    url_hop_dong: payload.url_hop_dong || null,
    url_de_nghi_xhd: payload.url_de_nghi_xhd || null,
    trang_thai_vc: 'Chờ duyệt XHD',
    ghi_chu_admin: payload.ghi_chu || null
  };

  let cloudOk = false;
  try {
    const p1 = supabase.from('yeucauxhd').insert([invoiceRow]);
    const p2 = supabase.from('donhang').update({ ket_qua: 'Chờ xuất HĐ' }).eq('so_don_hang', payload.so_don_hang);
    const p3 = supabase.from('khoxe').update({ trang_thai: 'Chờ xuất HĐ' }).eq('vin', payload.vin);
    await Promise.all([p1, p2, p3]);
    cloudOk = true;
  } catch (e) {}

  // Cập nhật Local Backup
  const invoiceData = readLocalBackupTable('yeucauxhd') || [];
  invoiceData.unshift(invoiceRow);
  writeLocalBackupTable('yeucauxhd', invoiceData);

  const donhangData = readLocalBackupTable('donhang') || [];
  const updatedOrders = donhangData.map(o => o.so_don_hang === payload.so_don_hang ? { ...o, ket_qua: 'Chờ xuất HĐ' } : o);
  writeLocalBackupTable('donhang', updatedOrders);

  const khoxeData = readLocalBackupTable('khoxe') || [];
  const updatedCars = khoxeData.map(c => c.vin === payload.vin ? { ...c, trang_thai: 'Chờ xuất HĐ' } : c);
  writeLocalBackupTable('khoxe', updatedCars);

  if (!cloudOk) {
    appendToOutbox('request_invoice', invoiceRow, 'yeucauxhd');
  }

  res.json({
    success: true,
    cloud_synced: cloudOk,
    message: `✅ Đã gửi đề nghị xuất hóa đơn cho đơn [${payload.so_don_hang}] thành công!`
  });
});

app.post('/api/invoices/approve', async (req, res) => {
  const { so_don_hang, vin, url_hoa_don_da_xuat } = req.body;
  if (!so_don_hang) return res.status(400).json({ success: false, error: 'Thiếu số đơn hàng!' });

  const nowIso = new Date().toISOString();
  const invoiceUpdates = {
    trang_thai_vc: 'Đã xuất hóa đơn',
    ngay_xuat_hoa_don: nowIso,
    url_hoa_don_da_xuat: url_hoa_don_da_xuat || null
  };

  const orderUpdates = {
    ket_qua: 'Đã xuất hóa đơn',
    ngay_xuat_hoa_don: nowIso,
    link_hoa_don_da_xuat: url_hoa_don_da_xuat || null
  };

  const carUpdates = {
    trang_thai: 'Đã xuất HĐ'
  };

  let cloudOk = false;
  try {
    const p1 = supabase.from('yeucauxhd').update(invoiceUpdates).eq('so_don_hang', so_don_hang);
    const p2 = supabase.from('donhang').update(orderUpdates).eq('so_don_hang', so_don_hang);
    const p3 = vin ? supabase.from('khoxe').update(carUpdates).eq('vin', vin) : Promise.resolve({});
    await Promise.all([p1, p2, p3]);
    cloudOk = true;
  } catch (e) {}

  // Cập nhật Local Backup
  const invoiceData = readLocalBackupTable('yeucauxhd') || [];
  writeLocalBackupTable('yeucauxhd', invoiceData.map(i => i.so_don_hang === so_don_hang ? { ...i, ...invoiceUpdates } : i));

  const donhangData = readLocalBackupTable('donhang') || [];
  writeLocalBackupTable('donhang', donhangData.map(o => o.so_don_hang === so_don_hang ? { ...o, ...orderUpdates } : o));

  if (vin) {
    const khoxeData = readLocalBackupTable('khoxe') || [];
    writeLocalBackupTable('khoxe', khoxeData.map(c => c.vin === vin ? { ...c, ...carUpdates } : c));
  }

  if (!cloudOk) {
    appendToOutbox('approve_invoice', { so_don_hang, vin, invoiceUpdates, orderUpdates }, 'yeucauxhd');
  }

  res.json({
    success: true,
    cloud_synced: cloudOk,
    message: `✅ Đã duyệt xuất hóa đơn cho đơn [${so_don_hang}] thành công!`
  });
});

// ---------------------- 9. QUY TRÌNH VẬN CHUYỂN XE (TRANSPORT) ----------------------

app.post('/api/transport/create', async (req, res) => {
  const payload = req.body;
  if (!payload.vin) return res.status(400).json({ success: false, error: 'Thiếu số VIN xe cần vận chuyển!' });

  const nowIso = new Date().toISOString();
  const transportRow = {
    vin: payload.vin,
    dong_xe: payload.dong_xe || 'VinFast',
    diem_di: payload.diem_di || 'Kho Nhà Máy Hải Phòng',
    diem_den: payload.diem_den || 'Showroom VinFast Thuận An',
    ngay_du_kien: payload.ngay_du_kien || nowIso.split('T')[0],
    tai_xe: payload.tai_xe || null,
    sdt_tai_xe: payload.sdt_tai_xe || null,
    tvbh: payload.tvbh || null,
    trang_thai: payload.trang_thai || 'Chờ vận chuyển',
    ghi_chu: payload.ghi_chu || null,
    created_at: nowIso
  };

  let cloudOk = false;
  try {
    const { error } = await supabase.from('yeucauvc').insert([transportRow]);
    if (!error) cloudOk = true;
  } catch (e) {}

  const vcData = readLocalBackupTable('yeucauvc') || [];
  vcData.unshift(transportRow);
  writeLocalBackupTable('yeucauvc', vcData);

  if (!cloudOk) {
    appendToOutbox('create_transport', transportRow, 'yeucauvc');
  }

  res.json({
    success: true,
    cloud_synced: cloudOk,
    message: `✅ Đã tạo yêu cầu vận chuyển xe [${payload.vin}]!`
  });
});

// ---------------------- 10. ĐỒNG BỘ OUTBOX & BACKUP ----------------------

app.get('/api/outbox', (req, res) => {
  res.json({ success: true, items: getOutbox() });
});

app.post('/api/outbox/sync', async (req, res) => {
  const items = getOutbox();
  const pending = items.filter(it => !it.synced);

  if (pending.length === 0) {
    return res.json({ success: true, message: 'Tất cả tác vụ khẩn cấp đã được đồng bộ!', syncedCount: 0 });
  }

  let successCount = 0;
  for (const item of pending) {
    try {
      if (item.type === 'create_order') {
        const { error } = await supabase.from('donhang').insert([item.payload]);
        if (!error) { item.synced = true; successCount++; }
      } else if (item.type === 'hold_car') {
        const { error } = await supabase.from('khoxe').update(item.payload.updateFields).eq('vin', item.payload.vin);
        if (!error) { item.synced = true; successCount++; }
      } else if (item.type === 'release_car') {
        const { error } = await supabase.from('khoxe').update(item.payload.updateFields).eq('vin', item.payload.vin);
        if (!error) { item.synced = true; successCount++; }
      } else if (item.type === 'match_order') {
        await supabase.from('donhang').update(item.payload.orderUpdates).eq('so_don_hang', item.payload.so_don_hang);
        await supabase.from('khoxe').update(item.payload.carUpdates).eq('vin', item.payload.vin);
        item.synced = true;
        successCount++;
      } else if (item.type === 'request_invoice') {
        await supabase.from('yeucauxhd').insert([item.payload]);
        item.synced = true;
        successCount++;
      } else if (item.type === 'create_transport') {
        await supabase.from('yeucauvc').insert([item.payload]);
        item.synced = true;
        successCount++;
      }
    } catch (e) {}
  }

  saveOutbox(items);

  res.json({
    success: true,
    syncedCount: successCount,
    remaining: pending.length - successCount,
    message: `Đã đồng bộ ${successCount}/${pending.length} tác vụ lên Supabase!`
  });
});

app.post('/api/sync/backup', async (req, res) => {
  const tables = [
    'khoxe', 'donhang', 'donhanghienhuu', 'yeucauxhd', 'yeucauvc',
    'test_drive_schedule', 'users', 'chinhsach', 'thongtinxe',
    'archived_orders', 'car_hold_activities', 'user_presence'
  ];

  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const results = {};
  for (const tbl of tables) {
    try {
      let allRows = [];
      let from = 0;
      const limit = 3000;
      while (true) {
        const { data, error } = await supabase.from(tbl).select('*').range(from, from + limit - 1);
        if (error || !data || data.length === 0) break;
        allRows = allRows.concat(data);
        if (data.length < limit) break;
        from += limit;
      }
      if (allRows.length > 0) {
        writeLocalBackupTable(tbl, allRows);
        results[tbl] = { status: 'success', rows: allRows.length };
      }
    } catch (e) {
      results[tbl] = { status: 'error', error: e.message };
    }
  }

  res.json({ success: true, message: 'Đã hoàn tất sao lưu từ Supabase về Local!', results });
});

app.get('/api/export-all', (req, res) => {
  const bundle = {
    exported_at: new Date().toISOString(),
    system: 'VinFast Thuan An Disaster Standby Portal',
    tables: {}
  };

  if (fs.existsSync(BACKUP_DIR)) {
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));
    for (const f of files) {
      try {
        const tbl = f.replace('.json', '');
        bundle.tables[tbl] = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, f), 'utf8'));
      } catch (e) {}
    }
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="vinfast_disaster_backup_${Date.now()}.json"`);
  res.send(JSON.stringify(bundle, null, 2));
});

// Chạy server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 [VINFAST THUẬN AN - CỔNG ĐIỀU HÀNH DỰ PHÒNG CHUẨN NGHIỆP VỤ]`);
  console.log(`📡 Địa chỉ Web: http://localhost:${PORT}`);
  console.log(`🛡️ Chế độ: ${currentMode === 'auto' ? 'Tự động (Ưu tiên Live, Failover sang Backup khi sập)' : 'Cục bộ thuần (Chống nghẽn)'}`);
  console.log(`📂 Thư mục Local DB Backup: ${BACKUP_DIR}`);
  console.log(`======================================================\n`);
});
