import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

async function test() {
  const payload = {
    type: 'test_notification',
    message: '🤖 Test Notification: Cảnh báo từ Antigravity! Tính năng chuông thông báo đang hoạt động mượt mà.',
    link: 'test-link'
  };

  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/admin_notifications`, {
    method: 'POST',
    headers: {
      'apikey': env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload)
  });
  
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);
}

test();
