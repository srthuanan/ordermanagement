import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://txcivsdgjkmlrjxramos.supabase.co';
const supabaseKey = 'sb_publishable_Tfm5RChLrn3OrFTyD5O81Q_HMf36QBc'; // Note: If this fails, we might need the anon key. 
// But let's try with this key first since it was in .env.local

const supabase = createClient(supabaseUrl, supabaseKey);

const targetEmail = 'ptnhan190697@gmail.com';
const dummyRecord = {
  so_don_hang: 'TEST-001',
  ten_khach_hang: 'Khách Hàng Test',
  dong_xe: 'VF 8',
  phien_ban: 'Eco',
  vin: 'VF8ECO1234567890',
  ten_ban_hang: 'Nhân Viên Test',
  email: targetEmail,
  full_name: 'Phan Trọng Nhân',
  redirectTo: 'https://ordermanagement-three.vercel.app'
};

const actionsToTest = [
  'match_success',
  'match_request_pending',
  'order_self_cancelled',
  'invoice_issued',
  'invoice_supplement_requested',
  'invoice_supplement_submitted',
  'invoice_request_submitted',
  'welcome_new_user',
  'forgot_password_secure',
  'vin_replaced'
];

async function testAll() {
  console.log('Bắt đầu test gửi 10 loại email đến:', targetEmail);
  for (const actionId of actionsToTest) {
    console.log(`\nĐang gửi: ${actionId}...`);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          actionId,
          recipient_email: targetEmail,
          record: dummyRecord
        }
      });
      if (error) {
        console.error(`❌ Lỗi khi gửi ${actionId}:`, error.message);
      } else {
        console.log(`✅ Thành công: ${actionId}`);
      }
    } catch (err) {
      console.error(`❌ Exception:`, err);
    }
  }
  console.log('\n🎉 Đã gửi xong tất cả lệnh test!');
}

testAll();
