const fs = require('fs');
const sharp = require('sharp');

function calcY(x) {
  if (x <= 885) {
    const u = 1 - x / 885;
    return +(78 - 52 * u * u).toFixed(1);
  } else {
    const u = 1 - (1920 - x) / 885;
    return +(78 - 52 * u * u).toFixed(1);
  }
}

// 16 Unique Lantern Definitions
const LANTERNS = [
  // CÁNH TRÁI (8 lồng đèn từ biên vào trăng)
  {
    id: 'dai_dang',
    name: 'Đại Đăng Gấm Đỏ Cung Đình',
    x: 80,
    cordLen: 32,
    anim: 'sw-hook-1',
    render: () => `
      {/* 1. ĐẠI ĐĂNG GẤM ĐỎ CUNG ĐÌNH 3D */}
      <rect x="-16" y="2" width="32" height="7" rx="2" fill="url(#maGold24k)" filter="url(#maDropShadow)" />
      <ellipse cx="0" cy="38" rx="28" ry="34" fill="url(#maRuby3D)" filter="url(#maDropShadow)" />
      <!-- Nan múi lụa 3D cong theo mặt cầu -->
      <path d="M 0,5 C -18,15 -18,61 0,71" fill="none" stroke="#fef08a" strokeWidth="1.4" opacity="0.85" />
      <path d="M 0,5 C 18,15 18,61 0,71" fill="none" stroke="#fef08a" strokeWidth="1.4" opacity="0.85" />
      <path d="M 0,5 C -9,15 -9,61 0,71" fill="none" stroke="#fde047" strokeWidth="1" opacity="0.6" />
      <path d="M 0,5 C 9,15 9,61 0,71" fill="none" stroke="#fde047" strokeWidth="1" opacity="0.6" />
      <line x1="0" y1="5" x2="0" y2="71" stroke="#ffffff" strokeWidth="1.2" opacity="0.5" />
      <!-- Nến sáng & phản quang 3D -->
      <ellipse cx="-6" cy="28" rx="10" ry="12" fill="#ffffff" opacity="0.25" filter="url(#maSoftGlow)" />
      <ellipse cx="0" cy="38" rx="13" ry="16" fill="url(#maFlame)" className="animate-candle-flicker" filter="url(#maBloom)" />
      <rect x="-16" y="71" width="32" height="7" rx="2" fill="url(#maGold24k)" />
      <!-- Tua rua gấm ngũ sắc & hạt ngọc -->
      <circle cx="0" cy="82" r="3.5" fill="#10b981" stroke="#fef08a" strokeWidth="0.8" />
      <line x1="0" y1="85" x2="0" y2="142" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round" />
      <line x1="-5" y1="85" x2="-6" y2="132" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="5" y1="85" x2="6" y2="132" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="0" cy="138" r="3.5" fill="#fef08a" />
    `
  },
  {
    id: 'ong_sao',
    name: 'Đèn Ông Sao 5 Cánh Cổ Truyền',
    x: 185,
    cordLen: 26,
    anim: 'sw-hook-2',
    render: () => `
      {/* 2. ĐÈN ÔNG SAO 5 CÁNH 3D TRUYỀN THỐNG */}
      <circle cx="0" cy="36" r="23" fill="none" stroke="#fef08a" strokeWidth="2.2" filter="url(#maSoftGlow)" />
      <circle cx="0" cy="36" r="24.5" fill="none" stroke="#78350f" strokeWidth="0.8" strokeDasharray="2,3" />
      <!-- 5 cánh sao 10 diện 3D ánh sáng đa chiều -->
      <polygon points="0,36 0,2 -9,23" fill="#dc2626" />
      <polygon points="0,36 0,2 9,23" fill="#f59e0b" />
      <polygon points="0,36 34,23 9,23" fill="#991b1b" />
      <polygon points="0,36 34,23 15,39" fill="#f59e0b" />
      <polygon points="0,36 21,66 15,39" fill="#ef4444" />
      <polygon points="0,36 21,66 0,51" fill="#d97706" />
      <polygon points="0,36 -21,66 0,51" fill="#b45309" />
      <polygon points="0,36 -21,66 -15,39" fill="#dc2626" />
      <polygon points="0,36 -34,23 -15,39" fill="#f59e0b" />
      <polygon points="0,36 -34,23 -9,23" fill="#991b1b" />
      <!-- Khung viền chỉ vàng 24K óng ả -->
      <polygon points="0,2 9,23 34,23 15,39 21,66 0,51 -21,66 -15,39 -34,23 -9,23" fill="none" stroke="#fef08a" strokeWidth="1.8" strokeLinejoin="round" />
      <!-- Tâm ngọc bích & ngọn nến trung tâm -->
      <circle cx="0" cy="36" r="12" fill="#065f46" opacity="0.9" stroke="#fef08a" strokeWidth="1.5" />
      <circle cx="0" cy="36" r="7.5" fill="url(#maFlame)" className="animate-candle-flicker" filter="url(#maBloom)" />
      <!-- Tua rua truyền thống hai bên cánh và đuôi -->
      <line x1="0" y1="51" x2="0" y2="112" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="-9" y1="55" x2="-12" y2="98" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="9" y1="55" x2="12" y2="98" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="0" cy="106" r="3.2" fill="#fef08a" />
    `
  },
  {
    id: 'ca_chep',
    name: 'Đèn Cá Chép Trông Trăng',
    x: 295,
    cordLen: 28,
    anim: 'sw-hook-3',
    render: () => `
      {/* 3. ĐÈN CÁ CHÉP TRÔNG TRĂNG UỐN LƯỢN 3D */}
      <path d="M 0,2 C 18,14 24,36 12,56 C 4,70 -5,82 -2,94 C -7,78 -17,62 -15,40 C -14,19 -10,4 0,2 Z" fill="url(#maCarpGoldRuby)" stroke="#fef08a" strokeWidth="1.6" filter="url(#maDropShadow)" />
      <!-- Hàng vảy cá rồng dát vàng 3D -->
      <path d="M 0,22 Q 6,28 12,24 M -6,32 Q 0,38 6,34 M -2,44 Q 4,50 10,46" fill="none" stroke="#fef08a" strokeWidth="1.1" opacity="0.8" />
      <!-- Vây cá bơi lượn -->
      <path d="M 13,30 Q 25,26 23,40 Q 13,40 13,30 Z" fill="#ea580c" stroke="#fef08a" strokeWidth="1" />
      <path d="M -15,32 Q -25,30 -22,42 Q -13,42 -15,32 Z" fill="#ea580c" stroke="#fef08a" strokeWidth="1" />
      <!-- Mắt cá ngọc minh châu & râu rồng -->
      <circle cx="3" cy="13" r="3.6" fill="#fef08a" />
      <circle cx="3" cy="13" r="2.2" fill="#030712" />
      <circle cx="2" cy="12" r="1" fill="#ffffff" />
      <path d="M 0,2 Q 7,-5 13,-2" fill="none" stroke="#fef08a" strokeWidth="1.4" strokeLinecap="round" />
      <!-- Nến sáng trong bụng cá -->
      <ellipse cx="0" cy="40" rx="8.5" ry="11" fill="url(#maFlame)" className="animate-candle-flicker" filter="url(#maBloom)" />
      <!-- Đuôi xòe rực rỡ & tua rua -->
      <path d="M -2,94 Q 15,115 8,135 Q -2,120 -2,94" fill="#ef4444" stroke="#fef08a" strokeWidth="1.4" />
      <path d="M -2,94 Q -17,115 -11,135 Q -2,120 -2,94" fill="#d97706" stroke="#fef08a" strokeWidth="1.2" />
      <line x1="-2" y1="122" x2="-2" y2="155" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="-2" cy="150" r="3" fill="#fef08a" />
    `
  },
  {
    id: 'keo_quan',
    name: 'Đèn Kéo Quân Lục Giác Cung Đình',
    x: 410,
    cordLen: 26,
    anim: 'sw-hook-4',
    render: () => `
      {/* 4. ĐÈN KÉO QUÂN LỤC GIÁC 3D HOÀNG CUNG */}
      <!-- Mái đình lục giác 3D đầu đao cong vút -->
      <path d="M -22,12 L -26,4 Q -14,6 0,0 Q 14,6 26,4 L 22,12 Z" fill="url(#maGold24k)" stroke="#fef08a" strokeWidth="1" filter="url(#maDropShadow)" />
      <!-- Thân lồng đèn giấy lụa kéo quân -->
      <rect x="-17" y="12" width="34" height="44" rx="2" fill="url(#maKeoQuanPaper)" stroke="#fef08a" strokeWidth="1.5" />
      <!-- Trụ gỗ mun cung đình tạo độ sâu 3D -->
      <line x1="-8" y1="12" x2="-8" y2="56" stroke="#451a03" strokeWidth="1.8" />
      <line x1="8" y1="12" x2="8" y2="56" stroke="#451a03" strokeWidth="1.8" />
      <!-- Hình bóng đoàn người rước đèn mờ ảo bên trong trục quay -->
      <circle cx="-8" cy="32" r="3.2" fill="#78350f" opacity="0.45" />
      <circle cx="8" cy="36" r="3.2" fill="#78350f" opacity="0.45" />
      <path d="M -9,38 L -7,44 M 7,42 L 9,48" stroke="#78350f" strokeWidth="1.2" opacity="0.4" />
      <!-- Nến sáng ấm tỏa sáng lụa mờ -->
      <ellipse cx="0" cy="34" rx="8" ry="11" fill="url(#maFlame)" className="animate-candle-flicker" filter="url(#maBloom)" />
      <!-- Chân đế nẹp vàng & chuông gió cung đình -->
      <path d="M -22,56 L 22,56 L 17,65 L -17,65 Z" fill="url(#maGold24k)" stroke="#fef08a" strokeWidth="1" />
      <line x1="0" y1="65" x2="0" y2="120" stroke="#f59e0b" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="-12" y1="65" x2="-14" y2="102" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="12" y1="65" x2="14" y2="102" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="0" cy="115" r="3.2" fill="#fef08a" />
    `
  },
  {
    id: 'tho_ngoc',
    name: 'Đèn Thỏ Ngọc Cung Trăng',
    x: 525,
    cordLen: 27,
    anim: 'sw-hook-5',
    render: () => `
      {/* 5. ĐÈN THỎ NGỌC CUNG TRĂNG 3D */}
      <!-- Đôi tai thỏ dựng đứng thanh thoát -->
      <ellipse cx="-7" cy="6" rx="4.5" ry="12" fill="#fffbeb" stroke="#fef08a" strokeWidth="1.2" transform="rotate(-15, -7, 6)" />
      <ellipse cx="-7" cy="6" rx="2.5" ry="8" fill="#fbcfe8" transform="rotate(-15, -7, 6)" />
      <ellipse cx="7" cy="6" rx="4.5" ry="12" fill="#fffbeb" stroke="#fef08a" strokeWidth="1.2" transform="rotate(15, 7, 6)" />
      <ellipse cx="7" cy="6" rx="2.5" ry="8" fill="#fbcfe8" transform="rotate(15, 7, 6)" />
      <!-- Đầu và thân thỏ ngọc phát sáng 3D -->
      <circle cx="0" cy="22" r="13" fill="url(#maMoonBody)" stroke="#fef08a" strokeWidth="1.2" filter="url(#maDropShadow)" />
      <ellipse cx="0" cy="42" rx="16" ry="18" fill="url(#maMoonBody)" stroke="#fef08a" strokeWidth="1.2" />
      <!-- Mắt hồng ngọc bích lung linh -->
      <circle cx="-5" cy="20" r="2.2" fill="#dc2626" />
      <circle cx="-5.5" cy="19.5" r="0.8" fill="#ffffff" />
      <circle cx="5" cy="20" r="2.2" fill="#dc2626" />
      <circle cx="4.5" cy="19.5" r="0.8" fill="#ffffff" />
      <!-- Mũi hồng & râu thỏ vàng óng -->
      <polygon points="0,23 -1.8,25 1.8,25" fill="#f43f5e" />
      <path d="M -2,25 Q -8,24 -12,26 M -2,26 Q -8,27 -11,30" fill="none" stroke="#fef08a" strokeWidth="0.9" />
      <path d="M 2,25 Q 8,24 12,26 M 2,26 Q 8,27 11,30" fill="none" stroke="#fef08a" strokeWidth="0.9" />
      <!-- Chuông vàng đeo cổ thỏ -->
      <circle cx="0" cy="32" r="3" fill="url(#maGold24k)" />
      <!-- Nến sáng trong bụng thỏ -->
      <ellipse cx="0" cy="42" rx="8" ry="10" fill="url(#maFlame)" className="animate-candle-flicker" filter="url(#maBloom)" />
      <!-- Đuôi thỏ tròn bồng bềnh -->
      <circle cx="15" cy="48" r="5" fill="#ffffff" stroke="#fef08a" strokeWidth="1" />
      <!-- Tua rua ngọc bích -->
      <line x1="0" y1="60" x2="0" y2="105" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="0" cy="75" r="2.5" fill="#ef4444" />
      <circle cx="0" cy="100" r="3" fill="#fef08a" />
    `
  },
  {
    id: 'con_buom',
    name: 'Đèn Cánh Bướm Dạ Quang',
    x: 640,
    cordLen: 25,
    anim: 'sw-hook-6',
    render: () => `
      {/* 6. ĐÈN CÁNH BƯỚM DẠ QUANG 3D */}
      <!-- Râu bướm uốn lượn hạt ngọc -->
      <path d="M 0,8 Q -8,-2 -10,2" fill="none" stroke="#fef08a" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="-10" cy="2" r="1.5" fill="#ef4444" />
      <path d="M 0,8 Q 8,-2 10,2" fill="none" stroke="#fef08a" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="10" cy="2" r="1.5" fill="#ef4444" />
      <!-- Cánh bướm trên (Trái & Phải) dạng kính màu 3D -->
      <path d="M 0,16 C -18,0 -32,10 -26,30 C -20,42 -6,34 0,26 Z" fill="url(#maLotusPink)" stroke="#fef08a" strokeWidth="1.4" filter="url(#maDropShadow)" />
      <path d="M 0,16 C 18,0 32,10 26,30 C 20,42 6,34 0,26 Z" fill="url(#maLotusPink)" stroke="#fef08a" strokeWidth="1.4" filter="url(#maDropShadow)" />
      <!-- Cánh bướm dưới -->
      <path d="M 0,26 C -16,34 -20,52 -10,58 C -2,62 -2,42 0,34 Z" fill="url(#maCarpGoldRuby)" stroke="#fef08a" strokeWidth="1.2" />
      <path d="M 0,26 C 16,34 20,52 10,58 C 2,62 2,42 0,34 Z" fill="url(#maCarpGoldRuby)" stroke="#fef08a" strokeWidth="1.2" />
      <!-- Hoa văn mắt bướm dạ quang phát sáng -->
      <circle cx="-16" cy="22" r="4.5" fill="#047857" stroke="#fef08a" strokeWidth="1" />
      <circle cx="-16" cy="22" r="2.2" fill="#fef08a" />
      <circle cx="16" cy="22" r="4.5" fill="#047857" stroke="#fef08a" strokeWidth="1" />
      <circle cx="16" cy="22" r="2.2" fill="#fef08a" />
      <!-- Thân bướm ngọc & ngọn nến -->
      <ellipse cx="0" cy="26" rx="4" ry="14" fill="url(#maGold24k)" />
      <ellipse cx="0" cy="26" rx="6" ry="8" fill="url(#maFlame)" className="animate-candle-flicker" filter="url(#maBloom)" />
      <!-- Tua rua rủ đuôi -->
      <line x1="0" y1="40" x2="0" y2="92" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="0" cy="88" r="2.8" fill="#fef08a" />
    `
  },
  {
    id: 'hoa_sen',
    name: 'Đèn Hoa Sen Bách Diệp',
    x: 745,
    cordLen: 22,
    anim: 'sw-hook-7',
    render: () => `
      {/* 7. ĐÈN HOA SEN BÁCH DIỆP 3D */}
      <!-- Đài lá sen xanh ngọc bích nâng đỡ -->
      <path d="M -18,40 Q 0,52 18,40 Q 9,50 -9,50 Z" fill="url(#maJadeGreen)" stroke="#fef08a" strokeWidth="1.3" filter="url(#maDropShadow)" />
      <!-- Cánh sen hồng ngọc 3 lớp xếp tầng 3D -->
      <path d="M 0,10 C -18,14 -24,34 -14,42 C -4,38 -2,22 0,10 Z" fill="url(#maLotusPink)" stroke="#fef08a" strokeWidth="1.3" />
      <path d="M 0,10 C 18,14 24,34 14,42 C 4,38 2,22 0,10 Z" fill="url(#maLotusPink)" stroke="#fef08a" strokeWidth="1.3" />
      <path d="M 0,4 C -8,16 -9,34 0,42 C 9,34 8,16 0,4 Z" fill="url(#maLotusPink)" stroke="#ffffff" strokeWidth="1.4" />
      <!-- Nhụy hoa nến sáng tỏa hương hào quang -->
      <ellipse cx="0" cy="28" rx="6.5" ry="9" fill="url(#maFlame)" className="animate-candle-flicker" filter="url(#maBloom)" />
      <!-- Dây thả ngọc bích & tua rua đỏ -->
      <line x1="0" y1="48" x2="0" y2="102" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="0" cy="68" r="2.8" fill="#10b981" stroke="#fef08a" strokeWidth="0.8" />
      <circle cx="0" cy="98" r="3.2" fill="#fef08a" />
    `
  },
  {
    id: 'trai_dao',
    name: 'Đèn Trái Đào Trường Thọ',
    x: 835,
    cordLen: 20,
    anim: 'sw-hook-8',
    render: () => `
      {/* 8. ĐÈN TRÁI ĐÀO TRƯỜNG THỌ CẬN TRĂNG 3D */}
      <rect x="-8" y="2" width="16" height="4" rx="1.5" fill="url(#maGold24k)" />
      <!-- Cặp lá đào ngọc bích trên cuống -->
      <path d="M -2,4 Q -10,0 -12,6 Q -6,8 -2,4 Z" fill="url(#maJadeGreen)" stroke="#fef08a" strokeWidth="0.8" />
      <path d="M 2,4 Q 10,0 12,6 Q 6,8 2,4 Z" fill="url(#maJadeGreen)" stroke="#fef08a" strokeWidth="0.8" />
      <!-- Thân trái đào căng mọng 3D đầu nhọn cong nhẹ -->
      <path d="M 0,6 C -18,14 -18,34 0,46 C 18,34 18,14 0,6 Z" fill="url(#maRuby3D)" stroke="#fef08a" strokeWidth="1.4" filter="url(#maDropShadow)" />
      <path d="M 0,6 C -6,16 -6,36 0,46" fill="none" stroke="#fef08a" strokeWidth="0.9" opacity="0.6" />
      <path d="M 0,6 C 6,16 6,36 0,46" fill="none" stroke="#fef08a" strokeWidth="0.9" opacity="0.6" />
      <!-- Điểm sáng ngọc & ngọn nến -->
      <ellipse cx="-4" cy="20" rx="4" ry="7" fill="#ffffff" opacity="0.3" />
      <ellipse cx="0" cy="25" rx="7.5" ry="9.5" fill="url(#maFlame)" className="animate-candle-flicker" filter="url(#maBloom)" />
      <rect x="-8" y="46" width="16" height="4" rx="1.5" fill="url(#maGold24k)" />
      <line x1="0" y1="50" x2="0" y2="88" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <circle cx="0" cy="84" r="2.8" fill="#fef08a" />
    `
  },

  // CÁNH PHẢI (8 lồng đèn hoàn toàn mới, độc nhất từ trăng ra biên)
  {
    id: 'qua_khe',
    name: 'Đèn Quả Khế 5 Khía',
    x: 1085,
    cordLen: 20,
    anim: 'sw-hook-7',
    render: () => `
      {/* 9. ĐÈN QUẢ KHẾ 5 KHÍA DÂN GIAN 3D */}
      <rect x="-7" y="2" width="14" height="4" rx="1.5" fill="url(#maGold24k)" />
      <!-- 5 múi khế vàng rực rỡ xếp cạnh 3D -->
      <path d="M 0,6 C -16,14 -16,34 0,44 C 16,34 16,14 0,6 Z" fill="url(#maAmber3D)" stroke="#fef08a" strokeWidth="1.3" filter="url(#maDropShadow)" />
      <!-- Các múi khế gân xanh ngọc nhạt dân gian -->
      <path d="M 0,6 L -14,24 L 0,44" fill="none" stroke="#a3e635" strokeWidth="1.4" />
      <path d="M 0,6 L 14,24 L 0,44" fill="none" stroke="#a3e635" strokeWidth="1.4" />
      <line x1="0" y1="6" x2="0" y2="44" stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />
      <!-- Ánh sáng lõi khế -->
      <ellipse cx="0" cy="24" rx="6.5" ry="8.5" fill="url(#maFlame)" className="animate-candle-flicker" filter="url(#maBloom)" />
      <rect x="-7" y="44" width="14" height="4" rx="1.5" fill="url(#maGold24k)" />
      <line x1="0" y1="48" x2="0" y2="86" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <circle cx="0" cy="82" r="2.6" fill="#fef08a" />
    `
  },
  {
    id: 'hoa_cuc',
    name: 'Đèn Hoa Cúc Hoàng Kim',
    x: 1175,
    cordLen: 22,
    anim: 'sw-hook-6',
    render: () => `
      {/* 10. ĐÈN HOA CÚC HOÀNG KIM (BÁNH DẺO) 3D */}
      <!-- Vòng tròn cánh cúc xếp nan hoa mặt trời 3D -->
      <circle cx="0" cy="26" r="22" fill="url(#maAmber3D)" stroke="#fef08a" strokeWidth="1.5" filter="url(#maDropShadow)" />
      <!-- 12 cánh hoa cúc xòe tròn truyền thống -->
      ${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => `
        <ellipse cx="0" cy="26" rx="4" ry="18" fill="none" stroke="#fef08a" strokeWidth="1" transform="rotate(${deg}, 0, 26)" opacity="0.75" />
      `).join('')}
      <!-- Tâm nhụy cúc đỏ cam rực rỡ -->
      <circle cx="0" cy="26" r="9" fill="#dc2626" stroke="#fef08a" strokeWidth="1.4" />
      <circle cx="0" cy="26" r="6" fill="url(#maFlame)" className="animate-candle-flicker" filter="url(#maBloom)" />
      <!-- Tua rua rủ -->
      <line x1="0" y1="48" x2="0" y2="94" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="0" cy="68" r="2.4" fill="#ef4444" />
      <circle cx="0" cy="90" r="3" fill="#fef08a" />
    `
  },
  {
    id: 'bo_cau',
    name: 'Đèn Chim Bồ Câu Hòa Bình',
    x: 1280,
    cordLen: 26,
    anim: 'sw-hook-5',
    render: () => `
      {/* 11. ĐÈN CHIM BỒ CÂU TRẮNG 3D */}
      <!-- Cánh chim dang rộng đón gió trăng -->
      <path d="M 0,16 C 14,-2 32,2 26,20 C 18,28 6,24 0,20 Z" fill="#ffffff" stroke="#fef08a" strokeWidth="1.3" filter="url(#maDropShadow)" />
      <path d="M 0,16 C -14,-2 -32,2 -26,20 C -18,28 -6,24 0,20 Z" fill="#f8fafc" stroke="#fef08a" strokeWidth="1.3" filter="url(#maDropShadow)" />
      <!-- Thân chim bồ câu trắng muốt phát sáng -->
      <ellipse cx="0" cy="24" rx="8" ry="16" fill="url(#maMoonBody)" stroke="#fef08a" strokeWidth="1.3" />
      <!-- Đầu chim, mỏ ngậm cành đào/ô-liu vàng -->
      <circle cx="-3" cy="10" r="6" fill="#ffffff" stroke="#fef08a" strokeWidth="1" />
      <polygon points="-7,10 -14,12 -7,13" fill="#f59e0b" />
      <circle cx="-4" cy="8.5" r="1.4" fill="#0f172a" />
      <!-- Đuôi chim xòe nan quạt -->
      <path d="M -4,38 L 0,54 L 4,38 Z" fill="#ffffff" stroke="#fef08a" strokeWidth="1.2" />
      <!-- Nến sáng trong ức chim -->
      <ellipse cx="0" cy="24" rx="5.5" ry="8" fill="url(#maFlame)" className="animate-candle-flicker" filter="url(#maBloom)" />
      <!-- Dây tua rua đỏ may mắn -->
      <line x1="0" y1="54" x2="0" y2="104" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="0" cy="74" r="2.5" fill="#ef4444" />
      <circle cx="0" cy="100" r="3" fill="#fef08a" />
    `
  },
  {
    id: 'giay_xep',
    name: 'Đèn Giấy Xếp Nhún Tròn',
    x: 1395,
    cordLen: 27,
    anim: 'sw-hook-4',
    render: () => `
      {/* 12. ĐÈN GIẤY XẾP NHÚN NAN TRÒN (LÒ XO) 3D */}
      <rect x="-14" y="2" width="28" height="5" rx="1.5" fill="url(#maGold24k)" />
      <!-- Các nếp gấp giấy xếp tầng 3D (Accordian Pleats) -->
      <ellipse cx="0" cy="12" rx="18" ry="5" fill="#ea580c" stroke="#fef08a" strokeWidth="1" />
      <ellipse cx="0" cy="20" rx="23" ry="6" fill="#f97316" stroke="#fef08a" strokeWidth="1.1" />
      <ellipse cx="0" cy="30" rx="26" ry="7" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.2" />
      <ellipse cx="0" cy="40" rx="26" ry="7" fill="#fbbf24" stroke="#fef08a" strokeWidth="1.2" />
      <ellipse cx="0" cy="50" rx="23" ry="6" fill="#f97316" stroke="#fef08a" strokeWidth="1.1" />
      <ellipse cx="0" cy="58" rx="18" ry="5" fill="#ea580c" stroke="#fef08a" strokeWidth="1" />
      <!-- Nến sáng thấu quang xuyên qua các nếp giấy nhún -->
      <ellipse cx="0" cy="35" rx="10" ry="14" fill="url(#maFlame)" className="animate-candle-flicker" filter="url(#maBloom)" />
      <rect x="-14" y="63" width="28" height="5" rx="1.5" fill="url(#maGold24k)" />
      <line x1="0" y1="68" x2="0" y2="118" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="0" cy="114" r="3.2" fill="#fef08a" />
    `
  },
  {
    id: 'tu_giac',
    name: 'Đèn Tứ Giác Cung Đình',
    x: 1510,
    cordLen: 25,
    anim: 'sw-hook-3',
    render: () => `
      {/* 13. ĐÈN TỨ GIÁC CUNG ĐÌNH TRẠM TRỔ 3D */}
      <path d="M -18,10 L -22,2 L 22,2 L 18,10 Z" fill="url(#maGold24k)" stroke="#fef08a" strokeWidth="1" />
      <!-- Khung lụa tứ giác đỏ ruby -->
      <rect x="-16" y="10" width="32" height="38" rx="2" fill="url(#maRuby3D)" stroke="#fef08a" strokeWidth="1.4" filter="url(#maDropShadow)" />
      <!-- Hoa văn chấn song cửa sổ cung đình chạm trổ chữ Thọ -->
      <rect x="-11" y="15" width="22" height="28" fill="none" stroke="#fde047" strokeWidth="1" />
      <line x1="0" y1="15" x2="0" y2="43" stroke="#fde047" strokeWidth="1" />
      <line x1="-11" y1="29" x2="11" y2="29" stroke="#fde047" strokeWidth="1" />
      <circle cx="0" cy="29" r="4.5" fill="none" stroke="#fef08a" strokeWidth="1" />
      <!-- Nến sáng ấm bên trong -->
      <ellipse cx="0" cy="29" rx="6.5" ry="9" fill="url(#maFlame)" className="animate-candle-flicker" filter="url(#maBloom)" />
      <!-- Đế vàng và 4 chùm tua rua góc -->
      <path d="M -18,48 L 18,48 L 15,55 L -15,55 Z" fill="url(#maGold24k)" stroke="#fef08a" strokeWidth="1" />
      <line x1="0" y1="55" x2="0" y2="108" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="-12" y1="55" x2="-14" y2="88" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="55" x2="14" y2="88" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="0" cy="104" r="3" fill="#fef08a" />
    `
  },
  {
    id: 'con_rong',
    name: 'Đèn Rồng Vàng Hoàng Kim',
    x: 1625,
    cordLen: 28,
    anim: 'sw-hook-2',
    render: () => `
      {/* 14. ĐÈN RỒNG VÀNG HOÀNG KIM UỐN LƯỢN 3D */}
      <!-- Thân rồng uốn 3 khúc nhấp nhô uy dũng -->
      <path d="M -18,48 Q -28,26 -12,18 Q 8,10 6,34 Q 4,56 22,48 Q 28,42 22,26" fill="none" stroke="url(#maGold24k)" strokeWidth="11" strokeLinecap="round" filter="url(#maDropShadow)" />
      <path d="M -18,48 Q -28,26 -12,18 Q 8,10 6,34 Q 4,56 22,48 Q 28,42 22,26" fill="none" stroke="#ea580c" strokeWidth="8" strokeLinecap="round" />
      <path d="M -18,48 Q -28,26 -12,18 Q 8,10 6,34 Q 4,56 22,48 Q 28,42 22,26" fill="none" stroke="#fef08a" strokeWidth="2" strokeDasharray="3,4" />
      <!-- Đầu rồng ngoảnh lại trông trăng -->
      <circle cx="-16" cy="16" r="9" fill="url(#maCarpGoldRuby)" stroke="#fef08a" strokeWidth="1.2" />
      <!-- Sừng rồng & bờm lửa -->
      <path d="M -18,8 Q -22,-2 -26,2 M -14,8 Q -16,-4 -18,-2" fill="none" stroke="#fef08a" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M -10,12 Q -2,6 -4,14" fill="none" stroke="#ef4444" strokeWidth="2" />
      <!-- Mắt rồng minh châu phát sáng -->
      <circle cx="-19" cy="14" r="2.6" fill="#fef08a" />
      <circle cx="-19" cy="14" r="1.4" fill="#000000" />
      <circle cx="-20" cy="13.5" r="0.7" fill="#ffffff" />
      <!-- Ngọc rồng tỏa sáng giữa thân -->
      <circle cx="6" cy="34" r="7" fill="url(#maFlame)" className="animate-candle-flicker" filter="url(#maBloom)" />
      <!-- Đuôi rồng xòe lửa & tua rua -->
      <path d="M 22,26 Q 28,16 32,24 Q 28,32 22,26" fill="#ef4444" stroke="#fef08a" strokeWidth="1" />
      <line x1="6" y1="56" x2="6" y2="125" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="6" cy="120" r="3.2" fill="#fef08a" />
    `
  },
  {
    id: 'ga_trong',
    name: 'Đèn Gà Trống Nghinh Xuân',
    x: 1735,
    cordLen: 26,
    anim: 'sw-hook-1',
    render: () => `
      {/* 15. ĐÈN GÀ TRỐNG OAI VỆ DÂN GIAN 3D */}
      <!-- Mào gà đỏ thắm 3 múi dựng cao -->
      <path d="M -8,12 C -12,2 -2,2 -4,12 C 0,4 8,4 6,14 Z" fill="#dc2626" stroke="#fef08a" strokeWidth="1" filter="url(#maDropShadow)" />
      <!-- Đầu và ức gà nở nang kiêu hãnh -->
      <circle cx="-4" cy="18" r="9" fill="url(#maAmber3D)" stroke="#fef08a" strokeWidth="1.2" />
      <polygon points="-12,18 -20,20 -12,22" fill="#f59e0b" stroke="#78350f" strokeWidth="0.8" />
      <circle cx="-6" cy="16" r="2" fill="#000000" />
      <circle cx="-6.5" cy="15.5" r="0.8" fill="#ffffff" />
      <path d="M -12,22 Q -15,28 -10,28 Z" fill="#ef4444" />
      <!-- Thân gà trống tròn căng phát quang -->
      <ellipse cx="4" cy="32" rx="16" ry="14" fill="url(#maCarpGoldRuby)" stroke="#fef08a" strokeWidth="1.3" />
      <path d="M 0,26 Q 10,24 8,36 Q 0,34 0,26 Z" fill="#10b981" stroke="#fef08a" strokeWidth="1" />
      <!-- Đuôi gà trống 7 màu uốn cong vút lên -->
      <path d="M 18,28 Q 32,8 26,4 M 18,32 Q 36,18 28,12 M 18,36 Q 34,28 26,22" fill="none" stroke="#fef08a" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M 18,28 Q 32,8 26,4 M 18,32 Q 36,18 28,12 M 18,36 Q 34,28 26,22" fill="none" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" />
      <!-- Nến sáng trong bụng gà -->
      <ellipse cx="4" cy="32" rx="7.5" ry="9.5" fill="url(#maFlame)" className="animate-candle-flicker" filter="url(#maBloom)" />
      <!-- Chân gà vàng & tua rua -->
      <line x1="4" y1="46" x2="4" y2="108" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="4" cy="104" r="3" fill="#fef08a" />
    `
  },
  {
    id: 'qua_bau',
    name: 'Đèn Quả Bầu Hồ Lô Cung Hỷ',
    x: 1840,
    cordLen: 30,
    anim: 'sw-hook-4',
    render: () => `
      {/* 16. ĐÈN QUẢ BẦU HỒ LÔ TÀI LỘC 3D */}
      <rect x="-8" y="2" width="16" height="5" rx="1.5" fill="url(#maGold24k)" />
      <path d="M 0,2 Q 6,-5 10,-2" fill="none" stroke="#fef08a" strokeWidth="1.4" strokeLinecap="round" />
      <!-- Bầu trên (Nhỏ) -->
      <circle cx="0" cy="18" r="14" fill="url(#maAmber3D)" stroke="#fef08a" strokeWidth="1.4" filter="url(#maDropShadow)" />
      <!-- Dải ruy băng lụa đỏ thắt eo hồ lô mang lại may mắn -->
      <rect x="-10" y="28" width="20" height="4.5" rx="1.5" fill="#dc2626" stroke="#fef08a" strokeWidth="1" />
      <!-- Bầu dưới (Lớn) chứa đầy vượng khí hoàng kim -->
      <circle cx="0" cy="48" r="22" fill="url(#maAmber3D)" stroke="#fef08a" strokeWidth="1.5" filter="url(#maDropShadow)" />
      <!-- Nan hoa văn mây lành cát tường uốn quanh bầu -->
      <path d="M -14,46 Q 0,40 14,46" fill="none" stroke="#fef08a" strokeWidth="1.2" opacity="0.8" />
      <path d="M -16,54 Q 0,48 16,54" fill="none" stroke="#fef08a" strokeWidth="1.2" opacity="0.8" />
      <circle cx="0" cy="48" r="4.5" fill="#fef08a" opacity="0.6" />
      <!-- Nến sáng ấm 3D bên trong hai tầng hồ lô -->
      <ellipse cx="0" cy="18" rx="5.5" ry="7" fill="url(#maFlame)" className="animate-candle-flicker" filter="url(#maBloom)" />
      <ellipse cx="0" cy="48" rx="11" ry="14" fill="url(#maFlame)" className="animate-candle-flicker" filter="url(#maBloom)" />
      <rect x="-10" y="70" width="20" height="5" rx="1.5" fill="url(#maGold24k)" />
      <!-- Chuỗi ngọc bích và tua rua dài thướt tha -->
      <line x1="0" y1="75" x2="0" y2="140" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="0" cy="95" r="3.2" fill="#10b981" stroke="#fef08a" strokeWidth="0.8" />
      <circle cx="0" cy="135" r="3.6" fill="#fef08a" />
    `
  }
];

console.log('Processed all 16 lanterns.');
