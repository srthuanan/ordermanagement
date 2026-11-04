const fs = require('fs');
const readline = require('readline');
const { execSync } = require('child_process');

async function main() {
  console.log('=== BẮT ĐẦU CHẠY LẠI CÁC CJS CHO GIAO DIỆN ĐĂNG NHẬP TRUNG THU ===');
  console.log('1. Khôi phục nền gốc MidAutumnSvgBackdrop.tsx từ checkpoint step 464...');
  const logPath = 'C:/Users/USER/.gemini/antigravity-ide/brain/7bb94944-7be5-403f-8dd9-f6197abeb2ec/.system_generated/logs/transcript_full.jsonl';
  const stream = fs.createReadStream(logPath);
  const rl = readline.createInterface({ input: stream });
  let count = 0;
  let baseContent = null;
  for await (const line of rl) {
    count++;
    if (count === 464) {
      const obj = JSON.parse(line);
      for (const tc of (obj.tool_calls || [])) {
        if (tc.name === 'write_to_file' && tc.args.CodeContent) {
          baseContent = tc.args.CodeContent;
        }
      }
    }
  }

  if (!baseContent) {
    console.error('Không tìm thấy nội dung step 464!');
    process.exit(1);
  }
  fs.writeFileSync('components/login/MidAutumnSvgBackdrop.tsx', baseContent, 'utf8');
  console.log('Đã nạp file gốc, dung lượng:', baseContent.length, 'bytes');

  const scripts = [
    // Giai đoạn 1: Dựng nền phố cổ Hội An bên sông Hoài
    'scripts/inject_hoian_backdrop.cjs',
    'scripts/update_backdrop_master_hoian.cjs',
    'scripts/apply_rowing_boats.cjs',
    'scripts/replace_with_flowing_boats.cjs',
    'scripts/fix_boats_on_river.cjs',
    'scripts/build_bustling_hoian_scene.cjs',
    'scripts/fix_closing_tag.cjs',
    'scripts/build_super_bustling_hoian.cjs',
    'scripts/polish_screen_fit_and_figures.cjs',
    'scripts/update_promenade_motion.cjs',
    'scripts/fix_promenade_walking.cjs',
    'scripts/apply_authentic_shops_and_lanterns.cjs',
    'scripts/apply_artistic_unique_signs.cjs',
    'scripts/insert_hoi_quan.cjs',
    'scripts/polish_promenade_and_houses.cjs',

    // Giai đoạn 2: Cập nhật các yêu cầu nâng cấp giao diện đăng nhập
    'scripts/restore_16_unique_lanterns_safe.cjs',
    'scripts/add_3_missing_shops.cjs',
    'scripts/add_sign_lanterns.cjs',
    'scripts/add_multistory_stars_and_trees.cjs',
    'scripts/rework_hoian_trees.cjs',
    'scripts/make_willows_still_and_elegant.cjs',
    'scripts/add_lively_house_activities.cjs',
    'scripts/enhance_flowing_water_and_lanterns.cjs',
    'scripts/fix_roof_and_signboard.cjs',
    'scripts/add_railings_and_shop_activities.cjs',
    'scripts/replace_chua_cau_with_vinfast_showroom.cjs',
    'scripts/rework_docking_at_tam_cap.cjs',
    'scripts/add_surreal_fireworks.cjs',
    'scripts/rework_sky_lanterns_behind_houses.cjs',
    'scripts/optimize_backdrop_performance.cjs'
  ];

  for (const s of scripts) {
    console.log(`\n---> Đang thực thi: ${s}...`);
    try {
      execSync(`node ${s}`, { stdio: 'inherit' });
    } catch (err) {
      console.error(`Lỗi khi chạy ${s}:`, err.message);
      process.exit(1);
    }
  }

  console.log('\n2. Kiểm tra tính toàn vẹn cú pháp TSX bằng esbuild...');
  execSync('node -e "require(\'esbuild\').buildSync({ entryPoints: [\'components/login/MidAutumnSvgBackdrop.tsx\'], bundle: false, write: false })"', { stdio: 'inherit' });
  console.log('Cú pháp TSX hoàn toàn chuẩn xác!');

  const finalContent = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');
  console.log('\n=== HOÀN TẤT THÀNH CÔNG TOÀN BỘ PIPELINE CJS ===');
  console.log('Tổng số dòng code MidAutumnSvgBackdrop.tsx:', finalContent.split('\n').length);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
