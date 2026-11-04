const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function migrateAllUsers() {
  console.log('🚀 Bắt đầu quá trình chuyển đổi toàn bộ nhân viên...');

  // 1. Lấy danh sách nhân viên chưa có UID
  const { data: users, error } = await supabase
    .from('users')
    .select('username, email, full_name, role')
    .is('uid', null)
    .not('email', 'is', null);

  if (error) {
    console.error('Lỗi khi lấy danh sách nhân viên:', error);
    return;
  }

  console.log(`Tìm thấy ${users.length} nhân viên cần chuyển đổi.`);

  const tempPassword = 'VinFast@2026';

  for (const user of users) {
    console.log(`-----------------------------------`);
    console.log(`Đang chuyển đổi: ${user.full_name} (${user.email})...`);

    try {
      // 2. Tạo tài khoản trong Supabase Auth
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: user.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { 
            full_name: user.full_name,
            role: user.role,
            username: user.username
        }
      });

      if (authErr) {
        if (authErr.message.includes('User already registered')) {
            console.log(`⚠️ User ${user.email} đã tồn tại trong Auth. Đang tìm UID để liên kết...`);
            const { data: list } = await supabase.auth.admin.listUsers();
            const existing = list.users.find(u => u.email === user.email);
            if (existing) {
                await linkUser(user.username, existing.id);
            }
        } else {
            console.error(`❌ Lỗi Auth cho ${user.username}:`, authErr.message);
        }
        continue;
      }

      // 3. Cập nhật UID vào bảng public.users
      await linkUser(user.username, authUser.user.id);
      
      console.log(`✅ Hoàn tất chuyển đổi cho ${user.username}`);

    } catch (err) {
      console.error(`🚨 Lỗi hệ thống khi xử lý ${user.username}:`, err);
    }
  }

  console.log(`\n🎉 TẤT CẢ NHÂN VIÊN ĐÃ ĐƯỢC CHUYỂN ĐỔI THÀNH CÔNG!`);
}

async function linkUser(username, uid) {
    const { error: linkErr } = await supabase
        .from('users')
        .update({ uid: uid })
        .eq('username', username);

    if (linkErr) {
        console.error(`❌ Lỗi liên kết UID cho ${username}:`, linkErr.message);
    } else {
        console.log(`🔗 Đã liên kết UID: ${uid}`);
    }
}

migrateAllUsers();
