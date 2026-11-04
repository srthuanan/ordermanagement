const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SIZE = 512;

// -----------------------------------------------------------------------------
// 🏢 QUY CHUẨN THIẾT KẾ NHẬN DIỆN THƯƠNG HIỆU CHÍNH THỨC: VINFAST THUẬN AN
// - 1. Biểu tượng Cánh Chim VinFast chữ "V" chuẩn quốc tế:
//      + Đôi cánh Chrome Bạc vát gương 3D sắc nét với đường chân trời phản quang
//      + Chữ "V" xanh Cyan Blue dạ quang công nghệ xe điện thông minh ở lõi trong
// - 2. Typography chuẩn Brand Guidelines:
//      + "VINFAST": Chữ dập nổi 3D Chrome kim loại mạ bạc vát cạnh
//      + "SHOWROOM THUẬN AN": Màu xanh dương VinFast Blue (#0066cc), giãn chữ chuẩn
// - 3. 100% Nền trong suốt (Transparent Background), siêu sắc nét và tinh tế
// -----------------------------------------------------------------------------
function renderOfficialVinFastThuanAnSvg() {
  return `
    <svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- 1. Authentic Automotive Mirror Chrome (Phản quang gương kim loại chuẩn VinFast) -->
        <linearGradient id="vfChromeUpper" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="35%" stop-color="#f8fafc" />
          <stop offset="70%" stop-color="#cbd5e1" />
          <stop offset="90%" stop-color="#94a3b8" />
          <stop offset="100%" stop-color="#64748b" />
        </linearGradient>

        <linearGradient id="vfChromeLower" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#1e293b" />
          <stop offset="25%" stop-color="#334155" />
          <stop offset="60%" stop-color="#94a3b8" />
          <stop offset="85%" stop-color="#e2e8f0" />
          <stop offset="100%" stop-color="#ffffff" />
        </linearGradient>

        <!-- 2. VinFast Signature Electric Cyan (Lõi chữ V công nghệ) -->
        <linearGradient id="vfElectricCyan" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#0284c7" />
          <stop offset="50%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#0284c7" />
        </linearGradient>

        <!-- 3. VinFast Showroom Brand Blue (Xanh thương hiệu Thuận An) -->
        <linearGradient id="vfBrandBlue" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#0369a1" />
          <stop offset="50%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#0369a1" />
        </linearGradient>

        <!-- 4. Crisp Automotive Shadows -->
        <filter id="vfCrispShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000000" flood-opacity="0.6"/>
        </filter>
        <filter id="textGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.4"/>
        </filter>
      </defs>

      <!-- ================= 1. BIỂU TƯỢNG CÁNH CHIM VINFAST CHUẨN 3D CHROME ================= -->
      <!-- Center Pivot: (256, 175) -->
      <g filter="url(#vfCrispShadow)" transform="translate(256, 175)">
        
        <!-- CÁNH CHIM TRÁI (LEFT CHROME WING) -->
        <!-- Mặt trên cánh trái -->
        <path d="M -180,-125 L -26,110 L -68,110 L -205,-98 Z" 
              fill="url(#vfChromeUpper)" stroke="#ffffff" stroke-width="1.5"/>
        <!-- Mặt dưới cánh trái (đổ bóng chân trời) -->
        <path d="M -205,-98 L -68,110 L -90,110 L -215,-90 Z" 
              fill="url(#vfChromeLower)"/>

        <!-- CÁNH CHIM PHẢI (RIGHT CHROME WING) -->
        <!-- Mặt trên cánh phải -->
        <path d="M 180,-125 L 26,110 L 68,110 L 205,-98 Z" 
              fill="url(#vfChromeUpper)" stroke="#ffffff" stroke-width="1.5"/>
        <!-- Mặt dưới cánh phải (đổ bóng chân trời) -->
        <path d="M 205,-98 L 68,110 L 90,110 L 215,-90 Z" 
              fill="url(#vfChromeLower)"/>

        <!-- ĐỈNH CHỮ V TRUNG TÂM -->
        <path d="M 0,145 L -26,110 L 26,110 Z" fill="url(#vfChromeUpper)" stroke="#ffffff" stroke-width="1.2"/>
        <path d="M 0,145 L 0,110 L 26,110 Z" fill="url(#vfChromeLower)"/>

        <!-- LÕI CHỮ V XANH CYAN ĐIỆN TỬ (SIGNATURE EV CHEVRON) -->
        <path d="M -150,-100 L -22,85 L 0,112 L 22,85 L 150,-100 L 138,-105 L 0,72 L -138,-105 Z" 
              fill="url(#vfElectricCyan)" filter="url(#textGlow)"/>

        <!-- Đèn LED chấm tròn định vị trung tâm -->
        <circle cx="0" cy="90" r="4.5" fill="#38bdf8" stroke="#ffffff" stroke-width="1"/>
      </g>

      <!-- ================= 2. TYPOGRAPHY: VINFAST (CHUẨN BRAND GUIDELINES) ================= -->
      <g filter="url(#textGlow)">
        <text x="256" y="375" 
              text-anchor="middle" dominant-baseline="central"
              font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" 
              font-size="64" font-weight="900" 
              letter-spacing="10"
              fill="url(#vfChromeUpper)"
              stroke="#475569" stroke-width="1">
          VINFAST
        </text>

        <!-- Lớp phủ ánh gương phản quang nửa trên chữ VINFAST -->
        <text x="256" y="375" 
              text-anchor="middle" dominant-baseline="central"
              font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" 
              font-size="64" font-weight="900" 
              letter-spacing="10"
              fill="none"
              stroke="#ffffff" stroke-width="1.8" opacity="0.8">
          VINFAST
        </text>
      </g>

      <!-- ================= 3. TYPOGRAPHY: SHOWROOM THUẬN AN (CHUẨN VINFAST BLUE) ================= -->
      <g filter="url(#textGlow)">
        <text x="256" y="440" 
              text-anchor="middle" dominant-baseline="central"
              font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" 
              font-size="20" font-weight="800" 
              letter-spacing="6"
              fill="url(#vfBrandBlue)">
          SHOWROOM THUẬN AN
        </text>
      </g>

      <!-- Đốm sáng kim cương ánh gương tinh tế -->
      <g transform="translate(180, 52)">
        <polygon points="0,-14 3.5,-3.5 14,0 3.5,3.5 0,14 -3.5,3.5 -14,0 -3.5,-3.5" fill="#ffffff"/>
        <circle cx="0" cy="0" r="2.5" fill="#38bdf8"/>
      </g>
      <g transform="translate(332, 52)">
        <polygon points="0,-14 3.5,-3.5 14,0 3.5,3.5 0,14 -3.5,3.5 -14,0 -3.5,-3.5" fill="#ffffff"/>
        <circle cx="0" cy="0" r="2.5" fill="#38bdf8"/>
      </g>
    </svg>
  `;
}

async function main() {
  console.log('🏢 Rendering Brand-Standard VinFast Thuận An Logo (public/logoweb.png)...');

  const svg = renderOfficialVinFastThuanAnSvg();
  const pngBuffer = await sharp(Buffer.from(svg))
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();

  const targetFile = path.join(__dirname, '../public/logoweb.png');
  fs.writeFileSync(targetFile, pngBuffer);

  // Xóa file tạm
  const tempExtract = path.join(__dirname, '../pictures/extracted_original_logo_frame.png');
  if (fs.existsSync(tempExtract)) fs.unlinkSync(tempExtract);

  console.log(`🎉 Brand-Standard VinFast Thuận An Logo rendered successfully: ${targetFile} (${(pngBuffer.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
