const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function cleanupLegacyColumns() {
  console.log('🧹 Đang làm sạch bảng users, gỡ bỏ thông tin mật khẩu cũ...');

  const { error } = await supabase
    .from('users')
    .update({ 
        password_hash: 'SUPABASE_AUTH_ONLY', 
        otp_code: null, 
        otp_expiry: null 
    })
    .neq('username', ''); // Cập nhật tất cả các dòng

  if (error) {
    console.error('❌ Lỗi khi làm sạch dữ liệu:', error.message);
  } else {
    console.log('✅ Đã xóa toàn bộ mật khẩu cũ và mã OTP khỏi bảng users thành công!');
    console.log('🛡️ Từ bây giờ, bảo mật của nhân viên được quản lý 100% bởi Supabase Auth.');
  }
}

cleanupLegacyColumns();
