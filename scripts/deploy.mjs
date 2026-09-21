import fs from 'fs';
import { execSync } from 'child_process';

const TARGET_PROJECT = 'ordermanagement';
const EXPECTED_PROJECT_ID = 'prj_TK2WuN1eTUVM7K1oVOSeNZFMTih4';
const PROJECT_JSON_PATH = '.vercel/project.json';

console.log('--- [VERCEL DEPLOY GUARD] KIỂM TRA DỰ ÁN TRƯỚC KHI DEPLOY ---');

let needRelink = false;

if (!fs.existsSync(PROJECT_JSON_PATH)) {
  console.log(`[Guard] Chưa có file cấu hình Vercel, cần liên kết tới: ${TARGET_PROJECT}`);
  needRelink = true;
} else {
  try {
    const config = JSON.parse(fs.readFileSync(PROJECT_JSON_PATH, 'utf8'));
    if (config.projectName !== TARGET_PROJECT || (EXPECTED_PROJECT_ID && config.projectId !== EXPECTED_PROJECT_ID)) {
      console.warn(`\n[Guard] ⚠️ PHÁT HIỆN LIÊN KẾT NHẦM DỰ ÁN: '${config.projectName}' (ID: ${config.projectId})`);
      console.log(`[Guard] Đang tự động sửa lại về đúng '${TARGET_PROJECT}'...\n`);
      needRelink = true;
    } else {
      console.log(`[Guard] ✓ Dự án chính xác: ${config.projectName} (${config.projectId})`);
    }
  } catch (err) {
    console.error('[Guard] Lỗi đọc .vercel/project.json:', err);
    needRelink = true;
  }
}

if (needRelink) {
  execSync(`npx vercel link --project ${TARGET_PROJECT} --yes`, { stdio: 'inherit' });
  console.log(`[Guard] ✓ Đã khôi phục liên kết chuẩn tới ${TARGET_PROJECT}.`);
}

console.log(`[Guard] Bắt đầu deploy Production cho ${TARGET_PROJECT}...`);
execSync('npx vercel --prod --yes', { stdio: 'inherit' });
