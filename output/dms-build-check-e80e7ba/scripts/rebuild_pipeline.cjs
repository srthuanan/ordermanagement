const fs = require('fs');
const readline = require('readline');
const { execSync } = require('child_process');

async function main() {
  console.log('1. Extracting base MidAutumnSvgBackdrop.tsx at step 464...');
  const path = 'C:/Users/USER/.gemini/antigravity-ide/brain/7bb94944-7be5-403f-8dd9-f6197abeb2ec/.system_generated/logs/transcript_full.jsonl';
  const stream = fs.createReadStream(path);
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
    console.error('Failed to get step 464 content!');
    return;
  }
  fs.writeFileSync('components/login/MidAutumnSvgBackdrop.tsx', baseContent, 'utf8');
  console.log('Step 464 written, size:', baseContent.length);

  const scripts = [
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
    'scripts/polish_promenade_and_houses.cjs'
  ];

  for (const s of scripts) {
    console.log(`Running ${s}...`);
    try {
      execSync(`node ${s}`, { stdio: 'inherit' });
    } catch (err) {
      console.error(`Error in ${s}:`, err.message);
      return;
    }
  }

  console.log('Validating with esbuild...');
  execSync('npx esbuild components/login/MidAutumnSvgBackdrop.tsx --outfile=NUL', { stdio: 'inherit' });
  const finalContent = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');
  console.log('ALL DONE! Total lines:', finalContent.split('\n').length);
}

main();
