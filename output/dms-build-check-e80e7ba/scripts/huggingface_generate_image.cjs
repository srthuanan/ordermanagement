const fs = require('fs');
const path = require('path');

const HF_API_TOKEN = process.env.HF_TOKEN || '';

const MODELS_TO_TRY = [
  'stabilityai/stable-diffusion-xl-base-1.0',
  'stabilityai/stable-diffusion-3.5-large',
  'runwayml/stable-diffusion-v1-5',
  'ByteDance/SDXL-Lightning'
];

async function tryModel(modelName) {
  console.log(`\n🔍 Đang thử mô hình: ${modelName}...`);
  const endpoint = `https://api-inference.huggingface.co/models/${modelName}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: 'photorealistic white dove spreading wings in flight on solid bright green screen background #00FF00'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.log(`❌ Lỗi (${response.status}): ${errText}`);
      return false;
    }

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    const savePath = path.join(__dirname, '../public/assets/hf_bird_success.png');
    fs.writeFileSync(savePath, imageBuffer);
    console.log(`🎉 THÀNH CÔNG VỚI MÔ HÌNH: ${modelName}! Kích thước: ${(imageBuffer.length / 1024).toFixed(1)} KB`);
    return true;
  } catch (error) {
    console.log(`❌ Ngoại lệ:`, error.message);
    return false;
  }
}

async function main() {
  for (const m of MODELS_TO_TRY) {
    const ok = await tryModel(m);
    if (ok) break;
  }
}

main().catch(console.error);
