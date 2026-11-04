const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function restoreLegacyPasswords() {
  console.log('🔄 Đang phục hồi mật khẩu mặc định cho tất cả nhân viên...');

  // Hash của mật khẩu '123456'
  const defaultPasswordHash = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';

  const { error } = await supabase
    .from('users')
    .update({ 
        password_hash: defaultPasswordHash
    })
    .neq('username', ''); 

  if (error) {
    console.error('❌ Lỗi khi phục hồi dữ liệu:', error.message);
  } else {
    console.log('✅ Đã phục hồi mật khẩu mặc định (123456) cho toàn bộ nhân viên.');
    console.log('💡 Bây giờ nhân viên có thể đăng nhập bằng cả 2 cách (Hệ thống mới & Cũ).');
  }
}

restoreLegacyPasswords();
