const fs = require('fs');
const path = require('path');

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';

// Mô hình tạo ảnh FLUX siêu thực của Cloudflare
const MODEL = '@cf/black-forest-labs/flux-1-schnell';

async function generateImageWithCloudflare(promptText, outputPath) {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`;
  console.log(`🚀 Đang gửi yêu cầu tới Cloudflare Workers AI (${MODEL})...`);
  console.log(`📝 Prompt: "${promptText}"`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: promptText,
        steps: 4
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Cloudflare API error (${response.status}): ${errText}`);
    }

    const contentType = response.headers.get('content-type');
    let imageBuffer;

    if (contentType && contentType.includes('application/json')) {
      const json = await response.json();
      if (json.result && json.result.image) {
        imageBuffer = Buffer.from(json.result.image, 'base64');
      } else {
        throw new Error('Không tìm thấy dữ liệu ảnh trong JSON: ' + JSON.stringify(json));
      }
    } else {
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    }

    fs.writeFileSync(outputPath, imageBuffer);
    console.log(`🎉 Tạo ảnh thành công! Đã lưu tại: ${outputPath} (${(imageBuffer.length / 1024).toFixed(1)} KB)`);
    return true;
  } catch (error) {
    console.error('❌ Thất bại:', error.message);
    return false;
  }
}

async function main() {
  const prompt = 'luxury birthday cream cake with fresh strawberries, glossy chocolate drip, glowing lit candle on solid bright green screen background #00FF00, professional product photography';
  const savePath = path.join(__dirname, '../public/assets/cloudflare_cake_preview.png');
  
  await generateImageWithCloudflare(prompt, savePath);
}

main().catch(console.error);
