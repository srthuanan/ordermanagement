import fetch from 'node-fetch';

const supabaseUrl = 'https://txcivsdgjkmlrjxramos.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Y2l2c2RnamttbHJqeHJhbW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY1MDYwOCwiZXhwIjoyMDk0MjI2NjA4fQ.zJhHCyEvpJQF3yKoxokYpJlY4dJY96sJBpB3IdQ5WcQ'; 

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
  console.log('Bắt đầu test gửi email...');
  for (const actionId of actionsToTest) {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          actionId,
          recipient_email: targetEmail,
          record: dummyRecord
        })
      });
      const text = await response.text();
      console.log(`Response cho ${actionId}: ${response.status} - ${text}`);
    } catch (err) {
      console.error(`❌ Exception:`, err);
    }
  }
}

testAll();
