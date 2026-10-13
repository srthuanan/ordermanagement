import React from 'react';

/**
 * Hàm băm chuỗi VIN để chọn 1 trong 20 mẫu nền cố định cho từng xe
 */
const getMascotIndex = (vin: string = ''): number => {
  if (!vin) return 0;
  let hash = 0;
  for (let i = 0; i < vin.length; i++) {
    hash = (hash * 41 + vin.charCodeAt(i)) % 1000000;
  }
  return hash % 20; // 20 mẫu nền đa dạng hoàn toàn
};

interface HalloweenCarBackdropProps {
  className?: string;
  vin?: string;
}

/**
 * Danh sách 20 cấu hình phối màu trăng và sương mù
 */
const THEME_CONFIGS = [
  // 0: Bí ngô Jack-o'-lantern (Vàng cam ấm áp)
  { moonColor: '#fef08a', glowColor: '#f59e0b', fogColor: '#ea580c' },
  // 1: Bóng ma bồng bềnh (Xanh ngọc ma mị)
  { moonColor: '#e0f2fe', glowColor: '#38bdf8', fogColor: '#0284c7' },
  // 2: Nón phù thủy (Tím ma mị)
  { moonColor: '#f3e8ff', glowColor: '#c084fc', fogColor: '#7e22ce' },
  // 3: Kẹo Halloween (Cam hồng ngọt ngào)
  { moonColor: '#fef3c7', glowColor: '#fb923c', fogColor: '#e11d48' },
  // 4: Dơi đêm (Đen tím huyền bí)
  { moonColor: '#ede9fe', glowColor: '#a855f7', fogColor: '#4338ca' },
  // 5: Chú nhện tơ (Xanh lục ma quái)
  { moonColor: '#ecfdf5', glowColor: '#34d399', fogColor: '#059669' },
  // 6: Bia mộ R.I.P (Xám bạc rêu phong)
  { moonColor: '#f1f5f9', glowColor: '#94a3b8', fogColor: '#334155' },
  // 7: Vạc thuốc phù thủy (Xanh neon sủi bọt)
  { moonColor: '#dcfce7', glowColor: '#22c55e', fogColor: '#15803d' },
  // 8: Lâu đài ma quái (Hoàng hôn cam tím)
  { moonColor: '#ffedd5', glowColor: '#fb923c', fogColor: '#c2410c' },
  // 9: Mèo đen huyền bí (Ánh vàng mắt mèo)
  { moonColor: '#fef9c3', glowColor: '#facc15', fogColor: '#ca8a04' },
  // 10: Đầu lâu cười (Xám trắng lạnh)
  { moonColor: '#f8fafc', glowColor: '#cbd5e1', fogColor: '#475569' },
  // 11: Cây nến ma quái (Lửa nến ấm cúng)
  { moonColor: '#fef3c7', glowColor: '#f59e0b', fogColor: '#d97706' },
  // 12: Kẹo mút xoắn tròn (Hồng tím kẹo ngọt)
  { moonColor: '#fdf2f8', glowColor: '#f472b6', fogColor: '#db2777' },
  // 13: Chổi bay phù thủy (Nâu cam vintage)
  { moonColor: '#fefce8', glowColor: '#fde047', fogColor: '#b45309' },
  // 14: Nhãn cầu ma quái (Huyết sắc ma mị)
  { moonColor: '#fee2e2', glowColor: '#f87171', fogColor: '#dc2626' },
  // 15: Cú mèo đêm (Đêm trăng xanh thẳm)
  { moonColor: '#e0e7ff', glowColor: '#818cf8', fogColor: '#3730a3' },
  // 16: Bàn tay Zombie nhô lên (Xanh rêu đầm lầy)
  { moonColor: '#ecfccb', glowColor: '#a3e635', fogColor: '#4d7c0f' },
  // 17: Quan tài Dracula (Đỏ rượu gothic)
  { moonColor: '#ffe4e6', glowColor: '#fb7185', fogColor: '#9f1239' },
  // 18: Quả cầu pha lê (Tím neon huyền diệu)
  { moonColor: '#fae8ff', glowColor: '#e879f9', fogColor: '#a21caf' },
  // 19: Bộ đôi Bí ngô & Ma (Cam vàng lễ hội)
  { moonColor: '#fffbeb', glowColor: '#fbbf24', fogColor: '#b45309' }
];

export const HalloweenCarBackdrop: React.FC<HalloweenCarBackdropProps> = ({ 
  className = '', 
  vin = '' 
}) => {
  const type = getMascotIndex(vin);
  const config = THEME_CONFIGS[type];

  return (
    <div 
      className={`absolute inset-0 pointer-events-none select-none z-0 overflow-hidden rounded-lg transition-all duration-300 opacity-90 group-hover:opacity-100 ${className}`}
      aria-hidden="true"
    >
      <svg
        className="w-full h-full object-cover"
        viewBox="0 0 240 100"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Hào quang mặt trăng */}
          <radialGradient id={`moonGlow-${type}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={config.moonColor} stopOpacity="0.95" />
            <stop offset="50%" stopColor={config.glowColor} stopOpacity="0.5" />
            <stop offset="85%" stopColor={config.glowColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>

          {/* Sương mù dưới gầm xe */}
          <linearGradient id={`groundFog-${type}`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={config.fogColor} stopOpacity="0.18" />
            <stop offset="50%" stopColor="#1e1b4b" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </linearGradient>

          {/* Glow riêng cho linh vật */}
          <radialGradient id={`mascotGlow-${type}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={config.glowColor} stopOpacity="0.85" />
            <stop offset="100%" stopColor={config.glowColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Nền sương mù huyền ảo */}
        <rect width="240" height="100" fill={`url(#groundFog-${type})`} />

        {/* 2. Vầng trăng tròn chìm phía sau xe */}
        <g 
          className="transition-transform duration-700 ease-out group-hover:scale-105" 
          style={{ transformOrigin: '120px 38px' }}
        >
          <circle cx="120" cy="38" r="30" fill={`url(#moonGlow-${type})`} />
          <circle cx="120" cy="38" r="16" fill={config.moonColor} />
          <circle cx="114" cy="34" r="3" fill={config.glowColor} opacity="0.3" />
          <circle cx="125" cy="42" r="3.5" fill={config.glowColor} opacity="0.2" />
        </g>

        {/* 3. Đàn dơi nhỏ lượn qua mặt trăng */}
        <path
          d="M98 25 C95 21 90 22 86 24 C89 26 92 28 95 28 C97 28 100 26 103 24 C100 22 96 21 98 25 Z"
          fill="#1e1b4b"
          opacity="0.75"
        />
        <path
          d="M138 20 C135 17 131 18 128 19 C130 20 132 22 135 22 C137 22 139 20 141 19 C139 18 136 17 138 20 Z"
          fill="#1e1b4b"
          opacity="0.6"
        />

        {/* ======================================================== */}
        {/* 4. CÁC KIỂU MẠNG NHỆN ĐA DẠNG (XOAY VÒNG THEO 8 KIỂU KHÁC BIỆT) */}
        {/* ======================================================== */}
        
        {/* Kiểu Web A (loại 0, 8, 16): Mạng nhện góc kinh điển dày 4 tầng cung võng */}
        {(type % 8 === 0) && (
          <g opacity="0.75">
            <line x1="0" y1="0" x2="65" y2="0" stroke="#64748b" strokeWidth="1" />
            <line x1="0" y1="0" x2="0" y2="58" stroke="#64748b" strokeWidth="1" />
            <line x1="0" y1="0" x2="56" y2="52" stroke="#64748b" strokeWidth="1" />
            <line x1="0" y1="0" x2="62" y2="28" stroke="#64748b" strokeWidth="0.8" />
            <line x1="0" y1="0" x2="30" y2="58" stroke="#64748b" strokeWidth="0.8" />
            <path d="M15 0 Q13 6 12 7 Q7 12 0 15" stroke="#64748b" strokeWidth="0.9" fill="none" />
            <path d="M30 0 Q26 12 25 14 Q14 25 0 30" stroke="#64748b" strokeWidth="0.9" fill="none" />
            <path d="M45 0 Q40 18 38 21 Q21 38 0 45" stroke="#64748b" strokeWidth="0.9" fill="none" />
            <path d="M60 0 Q53 25 50 28 Q28 50 0 60" stroke="#64748b" strokeWidth="0.8" fill="none" />
          </g>
        )}

        {/* Kiểu Web B (loại 1, 9, 17): Mạng nhện rủ từ trần xuống + nhện treo đung đưa */}
        {(type % 8 === 1) && (
          <g opacity="0.8">
            <line x1="5" y1="0" x2="32" y2="35" stroke="#64748b" strokeWidth="0.9" />
            <line x1="22" y1="0" x2="32" y2="35" stroke="#64748b" strokeWidth="0.9" />
            <line x1="42" y1="0" x2="32" y2="35" stroke="#64748b" strokeWidth="0.9" />
            <line x1="58" y1="0" x2="32" y2="35" stroke="#64748b" strokeWidth="0.9" />
            <path d="M10 7 Q22 14 36 7 Q47 13 54 7" stroke="#64748b" strokeWidth="0.9" fill="none" />
            <path d="M16 16 Q26 23 35 16 Q43 22 49 16" stroke="#64748b" strokeWidth="0.9" fill="none" />
            <path d="M22 25 Q28 31 34 25 Q39 30 43 25" stroke="#64748b" strokeWidth="0.9" fill="none" />
            <line x1="32" y1="35" x2="32" y2="46" stroke="#64748b" strokeWidth="0.9" strokeDasharray="1.5 1.5" />
            <ellipse cx="32" cy="48" rx="2.8" ry="3.2" fill="#ea580c" />
            <circle cx="32" cy="45" r="1.8" fill="#c2410c" />
          </g>
        )}

        {/* Kiểu Web C (loại 2, 10, 18): Mạng nhện xòe quạt đa nan tơ */}
        {(type % 8 === 2) && (
          <g opacity="0.75">
            <line x1="0" y1="0" x2="70" y2="0" stroke="#64748b" strokeWidth="1" />
            <line x1="0" y1="0" x2="0" y2="60" stroke="#64748b" strokeWidth="1" />
            <line x1="0" y1="0" x2="68" y2="24" stroke="#64748b" strokeWidth="0.8" />
            <line x1="0" y1="0" x2="58" y2="45" stroke="#64748b" strokeWidth="0.9" />
            <line x1="0" y1="0" x2="35" y2="58" stroke="#64748b" strokeWidth="0.8" />
            <path d="M18 0 Q15 9 12 11 Q6 17 0 18" stroke="#64748b" strokeWidth="0.85" fill="none" />
            <path d="M35 0 Q30 18 25 21 Q12 33 0 35" stroke="#64748b" strokeWidth="0.85" fill="none" />
            <path d="M52 0 Q44 26 38 31 Q18 49 0 52" stroke="#64748b" strokeWidth="0.85" fill="none" />
            <path d="M68 0 Q58 35 50 42 Q24 64 0 68" stroke="#64748b" strokeWidth="0.8" fill="none" />
          </g>
        )}

        {/* Kiểu Web D (loại 3, 11, 19): Mạng nhện góc trên bên phải đối xứng */}
        {(type % 8 === 3) && (
          <g opacity="0.75" transform="translate(175, 0)">
            <line x1="65" y1="0" x2="0" y2="0" stroke="#64748b" strokeWidth="1" />
            <line x1="65" y1="0" x2="65" y2="58" stroke="#64748b" strokeWidth="1" />
            <line x1="65" y1="0" x2="8" y2="52" stroke="#64748b" strokeWidth="1" />
            <line x1="65" y1="0" x2="2" y2="28" stroke="#64748b" strokeWidth="0.8" />
            <line x1="65" y1="0" x2="35" y2="58" stroke="#64748b" strokeWidth="0.8" />
            <path d="M50 0 Q52 6 53 7 Q58 12 65 15" stroke="#64748b" strokeWidth="0.9" fill="none" />
            <path d="M35 0 Q39 12 40 14 Q51 25 65 30" stroke="#64748b" strokeWidth="0.9" fill="none" />
            <path d="M20 0 Q25 18 27 21 Q44 38 65 45" stroke="#64748b" strokeWidth="0.9" fill="none" />
            <path d="M5 0 Q12 25 15 28 Q37 50 65 60" stroke="#64748b" strokeWidth="0.8" fill="none" />
          </g>
        )}

        {/* Kiểu Web E (loại 4, 12): Mạng nhện tròn tỏa tâm giăng giữa trời */}
        {(type % 8 === 4) && (
          <g opacity="0.8" transform="translate(6, 6)">
            <line x1="0" y1="26" x2="52" y2="26" stroke="#64748b" strokeWidth="0.8" />
            <line x1="26" y1="0" x2="26" y2="52" stroke="#64748b" strokeWidth="0.8" />
            <line x1="8" y1="8" x2="44" y2="44" stroke="#64748b" strokeWidth="0.8" />
            <line x1="8" y1="44" x2="44" y2="8" stroke="#64748b" strokeWidth="0.8" />
            <path d="M26 17 Q21 21 17 26 Q21 31 26 35 Q31 31 35 26 Q31 21 26 17" stroke="#64748b" strokeWidth="0.9" fill="none" />
            <path d="M26 9 Q18 17 9 26 Q18 35 26 43 Q34 35 43 26 Q34 17 26 9" stroke="#64748b" strokeWidth="0.85" fill="none" />
            <path d="M26 2 Q13 13 2 26 Q13 39 26 50 Q39 39 50 26 Q39 13 26 2" stroke="#64748b" strokeWidth="0.8" fill="none" />
          </g>
        )}

        {/* Kiểu Web F (loại 5, 13): Mạng nhện rủ góc sâu với giọt sương mai */}
        {(type % 8 === 5) && (
          <g opacity="0.75">
            <line x1="0" y1="0" x2="62" y2="0" stroke="#64748b" strokeWidth="1" />
            <line x1="0" y1="0" x2="0" y2="52" stroke="#64748b" strokeWidth="1" />
            <line x1="0" y1="0" x2="54" y2="46" stroke="#64748b" strokeWidth="0.9" />
            <line x1="0" y1="0" x2="60" y2="22" stroke="#64748b" strokeWidth="0.8" />
            <line x1="0" y1="0" x2="28" y2="52" stroke="#64748b" strokeWidth="0.8" />
            <path d="M16 0 C14 12 12 14 0 16" stroke="#64748b" strokeWidth="0.9" fill="none" />
            <path d="M32 0 C27 24 24 27 0 32" stroke="#64748b" strokeWidth="0.9" fill="none" />
            <path d="M48 0 C40 36 36 40 0 48" stroke="#64748b" strokeWidth="0.85" fill="none" />
            <circle cx="28" cy="27" r="1.6" fill="#f97316" />
          </g>
        )}

        {/* Kiểu Web G (loại 6, 14): Tơ nhện giăng võng kép giữa nóc */}
        {(type % 8 === 6) && (
          <g opacity="0.8">
            <line x1="0" y1="12" x2="45" y2="0" stroke="#64748b" strokeWidth="0.9" />
            <line x1="0" y1="35" x2="55" y2="10" stroke="#64748b" strokeWidth="0.9" />
            <line x1="10" y1="0" x2="35" y2="35" stroke="#64748b" strokeWidth="0.8" />
            <path d="M5 20 Q22 28 35 15" stroke="#64748b" strokeWidth="0.9" fill="none" />
            <path d="M12 30 Q30 38 45 22" stroke="#64748b" strokeWidth="0.9" fill="none" />
          </g>
        )}

        {/* Kiểu Web H (loại 7, 15): Mạng nhện góc đôi (Cả góc trái lẫn góc phải) */}
        {(type % 8 === 7) && (
          <g opacity="0.7">
            {/* Góc trái nhỏ */}
            <path d="M25 0 Q18 18 0 25" stroke="#64748b" strokeWidth="0.85" fill="none" />
            <line x1="0" y1="0" x2="28" y2="28" stroke="#64748b" strokeWidth="0.8" />
            {/* Góc phải nhỏ */}
            <g transform="translate(200, 0)">
              <path d="M15 0 Q22 18 40 25" stroke="#64748b" strokeWidth="0.85" fill="none" />
              <line x1="40" y1="0" x2="12" y2="28" stroke="#64748b" strokeWidth="0.8" />
            </g>
          </g>
        )}

        {/* ======================================================== */}
        {/* 5. 20 MẪU LINH VẬT HALLOWEEN ĐỘC ĐÁO CHO TỪNG XE */}
        {/* ======================================================== */}

        {/* 0: 🎃 Quả bí ngô Jack-o'-lantern */}
        {type === 0 && (
          <g transform="translate(198, 62)" className="transition-transform duration-300 group-hover:scale-110">
            <circle cx="20" cy="20" r="17" fill={`url(#mascotGlow-${type})`} opacity="0.6" />
            <ellipse cx="20" cy="20" rx="16" ry="13" fill="#ea580c" />
            <ellipse cx="14" cy="20" rx="10" ry="12" fill="#f97316" />
            <ellipse cx="26" cy="20" rx="10" ry="12" fill="#f97316" />
            <ellipse cx="20" cy="20" rx="6" ry="11.5" fill="#fb923c" />
            <path d="M20 8 Q21 3 24 2" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <polygon points="13,16 17,17 15,13" fill="#fef08a" />
            <polygon points="27,16 23,17 25,13" fill="#fef08a" />
            <polygon points="20,18 18.5,20.5 21.5,20.5" fill="#fef08a" />
            <path d="M12 23 Q20 30 28 23 Q24 26.5 20 25.5 Q16 26.5 12 23 Z" fill="#fef08a" />
          </g>
        )}

        {/* 1: 👻 Bóng ma bồng bềnh má hồng */}
        {type === 1 && (
          <g transform="translate(198, 58)" className="transition-transform duration-500 group-hover:-translate-y-1.5">
            <circle cx="18" cy="18" r="16" fill={`url(#mascotGlow-${type})`} opacity="0.6" />
            <path d="M10 18 C10 10 26 10 26 18 C26 26 24 28 26 31 C24 30 21 32 18 30 C15 32 12 30 10 31 C12 28 10 26 10 18 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
            <ellipse cx="15" cy="16" rx="2" ry="2.6" fill="#0f172a" />
            <ellipse cx="21" cy="16" rx="2" ry="2.6" fill="#0f172a" />
            <circle cx="14.5" cy="15" r="0.7" fill="#ffffff" />
            <circle cx="20.5" cy="15" r="0.7" fill="#ffffff" />
            <circle cx="13" cy="19" r="1.5" fill="#f472b6" opacity="0.75" />
            <circle cx="23" cy="19" r="1.5" fill="#f472b6" opacity="0.75" />
            <ellipse cx="18" cy="20" rx="1.5" ry="1.8" fill="#0f172a" />
          </g>
        )}

        {/* 2: 🧙 Nón phù thủy tím đai cam */}
        {type === 2 && (
          <g transform="translate(198, 62)" className="transition-transform duration-300 group-hover:rotate-6 origin-bottom">
            <circle cx="18" cy="18" r="16" fill={`url(#mascotGlow-${type})`} opacity="0.5" />
            <ellipse cx="18" cy="24" rx="17" ry="4.5" fill="#3b0764" />
            <path d="M7 23 C12 18 16 9 24 3 C22 11 26 19 29 23 Z" fill="#581c87" />
            <path d="M10 21 Q18 19 26 21 L27 23 Q18 21 9 23 Z" fill="#ea580c" />
            <rect x="16" y="20.5" width="4" height="3" fill="#facc15" rx="0.5" />
          </g>
        )}

        {/* 3: 🍬 Kẹo Halloween sọc cam tím */}
        {type === 3 && (
          <g transform="translate(196, 64)" className="transition-transform duration-300 group-hover:scale-115">
            <circle cx="20" cy="18" r="15" fill={`url(#mascotGlow-${type})`} opacity="0.55" />
            <polygon points="6,13 11,18 6,23" fill="#ea580c" />
            <polygon points="34,13 29,18 34,23" fill="#ea580c" />
            <circle cx="20" cy="18" r="9.5" fill="#f97316" />
            <path d="M13 14 Q20 22 27 14" stroke="#fef08a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M13 22 Q20 14 27 22" stroke="#7e22ce" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </g>
        )}

        {/* 4: 🦇 Dơi đêm dang cánh mắt đỏ */}
        {type === 4 && (
          <g transform="translate(196, 62)" className="transition-transform duration-300 group-hover:scale-115">
            <circle cx="20" cy="18" r="16" fill={`url(#mascotGlow-${type})`} opacity="0.5" />
            <path d="M20 13 C16 7 8 6 2 10 C9 15 12 21 15 23 C17 19 18 14 20 13 C22 14 23 19 25 23 C28 21 31 15 38 10 C32 6 24 7 20 13 Z" fill="#1e1b4b" stroke="#c084fc" strokeWidth="1.2" />
            <circle cx="18" cy="16" r="1.3" fill="#ef4444" />
            <circle cx="22" cy="16" r="1.3" fill="#ef4444" />
          </g>
        )}

        {/* 5: 🕷️ Chú nhện cam đu tơ */}
        {type === 5 && (
          <g transform="translate(200, 52)" className="transition-transform duration-500 group-hover:translate-y-2">
            <circle cx="16" cy="24" r="15" fill={`url(#mascotGlow-${type})`} opacity="0.5" />
            <line x1="16" y1="0" x2="16" y2="18" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="2 2" />
            <circle cx="16" cy="26" r="6.5" fill="#ea580c" />
            <circle cx="16" cy="20" r="4.2" fill="#c2410c" />
            <circle cx="14.5" cy="19.5" r="1.1" fill="#fef08a" />
            <circle cx="17.5" cy="19.5" r="1.1" fill="#fef08a" />
            <path d="M11 22 Q7 20 5 25 M21 22 Q25 20 27 25" stroke="#ea580c" strokeWidth="1.2" fill="none" />
            <path d="M10 26 Q6 28 5 32 M22 26 Q26 28 27 32" stroke="#ea580c" strokeWidth="1.2" fill="none" />
          </g>
        )}

        {/* 6: 🪦 Bia mộ R.I.P cổ kính */}
        {type === 6 && (
          <g transform="translate(200, 58)" className="transition-transform duration-300 group-hover:scale-110">
            <circle cx="16" cy="20" r="16" fill={`url(#mascotGlow-${type})`} opacity="0.5" />
            <path d="M8 32 L8 12 C8 6 24 6 24 12 L24 32 Z" fill="#64748b" />
            <text x="16" y="18" fontSize="6" fontWeight="bold" fill="#f1f5f9" textAnchor="middle" fontFamily="sans-serif">R.I.P</text>
            <line x1="16" y1="21" x2="16" y2="28" stroke="#cbd5e1" strokeWidth="1" />
            <line x1="13" y1="24" x2="19" y2="24" stroke="#cbd5e1" strokeWidth="1" />
            <ellipse cx="16" cy="32" rx="10" ry="2" fill="#334155" />
          </g>
        )}

        {/* 7: 🧪 Vạc thuốc phù thủy sủi bọt xanh */}
        {type === 7 && (
          <g transform="translate(198, 60)" className="transition-transform duration-300 group-hover:scale-110">
            <circle cx="18" cy="20" r="16" fill={`url(#mascotGlow-${type})`} opacity="0.6" />
            <ellipse cx="18" cy="16" rx="12" ry="4" fill="#22c55e" />
            <path d="M7 16 C7 28 29 28 29 16 Z" fill="#0f172a" />
            <ellipse cx="18" cy="16" rx="10" ry="2.5" fill="#4ade80" />
            <circle cx="14" cy="13" r="2" fill="#22c55e" opacity="0.8" />
            <circle cx="21" cy="11" r="1.5" fill="#86efac" opacity="0.8" />
            <line x1="10" y1="28" x2="8" y2="33" stroke="#0f172a" strokeWidth="1.5" />
            <line x1="26" y1="28" x2="28" y2="33" stroke="#0f172a" strokeWidth="1.5" />
          </g>
        )}

        {/* 8: 🏰 Lâu đài ma quái chóp nhọn */}
        {type === 8 && (
          <g transform="translate(200, 56)" className="transition-transform duration-300 group-hover:scale-110">
            <circle cx="16" cy="20" r="16" fill={`url(#mascotGlow-${type})`} opacity="0.5" />
            {/* Tháp chính */}
            <rect x="12" y="16" width="8" height="18" fill="#1e1b4b" />
            <polygon points="12,16 16,8 20,16" fill="#4338ca" />
            {/* 2 tháp phụ */}
            <rect x="6" y="20" width="5" height="14" fill="#0f172a" />
            <polygon points="6,20 8.5,14 11,20" fill="#312e81" />
            <rect x="21" y="20" width="5" height="14" fill="#0f172a" />
            <polygon points="21,20 23.5,14 26,20" fill="#312e81" />
            {/* Cửa sổ phát sáng vàng */}
            <rect x="15" y="22" width="2" height="3" fill="#facc15" />
          </g>
        )}

        {/* 9: 🐱 Mèo đen Halloween mắt vàng */}
        {type === 9 && (
          <g transform="translate(202, 60)" className="transition-transform duration-300 group-hover:scale-115">
            <circle cx="16" cy="18" r="15" fill={`url(#mascotGlow-${type})`} opacity="0.5" />
            {/* Đầu và tai */}
            <circle cx="16" cy="16" r="8" fill="#0f172a" />
            <polygon points="10,13 9,6 14,10" fill="#0f172a" />
            <polygon points="22,13 23,6 18,10" fill="#0f172a" />
            {/* Mắt vàng phát sáng */}
            <ellipse cx="13" cy="16" rx="1.8" ry="2.2" fill="#facc15" />
            <ellipse cx="19" cy="16" rx="1.8" ry="2.2" fill="#facc15" />
            <line x1="13" y1="14.5" x2="13" y2="17.5" stroke="#000" strokeWidth="0.8" />
            <line x1="19" y1="14.5" x2="19" y2="17.5" stroke="#000" strokeWidth="0.8" />
            {/* Thân & đuôi */}
            <ellipse cx="16" cy="27" rx="6" ry="7" fill="#0f172a" />
            <path d="M20 30 Q26 28 25 22" stroke="#0f172a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </g>
        )}

        {/* 10: 💀 Đầu lâu Halloween ngộ nghĩnh */}
        {type === 10 && (
          <g transform="translate(202, 60)" className="transition-transform duration-300 group-hover:scale-115">
            <circle cx="15" cy="18" r="15" fill={`url(#mascotGlow-${type})`} opacity="0.5" />
            <path d="M8 16 C8 8 22 8 22 16 C22 20 20 22 20 25 L10 25 C10 22 8 20 8 16 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
            <circle cx="12" cy="16" r="2.2" fill="#0f172a" />
            <circle cx="18" cy="16" r="2.2" fill="#0f172a" />
            <polygon points="15,18 14,20 16,20" fill="#0f172a" />
            <line x1="13" y1="23" x2="13" y2="25" stroke="#0f172a" strokeWidth="0.8" />
            <line x1="15" y1="23" x2="15" y2="25" stroke="#0f172a" strokeWidth="0.8" />
            <line x1="17" y1="23" x2="17" y2="25" stroke="#0f172a" strokeWidth="0.8" />
          </g>
        )}

        {/* 11: 🕯️ Cây nến ma quái thắp sáng */}
        {type === 11 && (
          <g transform="translate(204, 58)" className="transition-transform duration-300 group-hover:scale-115">
            <circle cx="14" cy="18" r="15" fill={`url(#mascotGlow-${type})`} opacity="0.6" />
            {/* Thân nến */}
            <rect x="10" y="16" width="8" height="18" fill="#fef08a" rx="1" />
            {/* Sáp chảy */}
            <path d="M10 18 Q12 22 13 18 Q15 24 16 18 Q18 21 18 18" stroke="#fef08a" strokeWidth="1" fill="#fef08a" />
            {/* Bấc nến & ngọn lửa vàng cam */}
            <line x1="14" y1="16" x2="14" y2="12" stroke="#78350f" strokeWidth="1" />
            <path d="M14 6 C12 10 12 12 14 13 C16 12 16 10 14 6 Z" fill="#f97316" />
            <ellipse cx="14" cy="10" rx="1.2" ry="2" fill="#fef08a" />
          </g>
        )}

        {/* 12: 🍭 Kẹo mút xoắn tròn Halloween */}
        {type === 12 && (
          <g transform="translate(202, 58)" className="transition-transform duration-300 group-hover:rotate-12 origin-bottom">
            <circle cx="16" cy="16" r="15" fill={`url(#mascotGlow-${type})`} opacity="0.55" />
            {/* Que kẹo */}
            <line x1="16" y1="24" x2="16" y2="38" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
            {/* Kẹo xoắn tròn */}
            <circle cx="16" cy="16" r="10" fill="#f43f5e" />
            <path d="M16 16 M16 9 A7 7 0 0 1 23 16 A5 5 0 0 1 18 21 A3 3 0 0 1 15 18" stroke="#fef08a" strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        )}

        {/* 13: 🧹 Chổi bay phù thủy */}
        {type === 13 && (
          <g transform="translate(196, 62)" className="transition-transform duration-300 group-hover:rotate-6 origin-center">
            <circle cx="20" cy="18" r="16" fill={`url(#mascotGlow-${type})`} opacity="0.5" />
            {/* Cán chổi gỗ */}
            <line x1="6" y1="10" x2="28" y2="28" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
            {/* Bó chổi rơm */}
            <polygon points="26,26 38,30 32,38" fill="#eab308" />
            <line x1="26" y1="26" x2="32" y2="38" stroke="#ca8a04" strokeWidth="1.5" />
            <line x1="25" y1="28" x2="29" y2="26" stroke="#ea580c" strokeWidth="1.5" />
          </g>
        )}

        {/* 14: 👁️ Nhãn cầu phù thủy ma quái */}
        {type === 14 && (
          <g transform="translate(202, 60)" className="transition-transform duration-300 group-hover:scale-120">
            <circle cx="16" cy="16" r="15" fill={`url(#mascotGlow-${type})`} opacity="0.6" />
            <circle cx="16" cy="16" r="9" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
            {/* Mống mắt đỏ & đồng tử đen */}
            <circle cx="16" cy="16" r="4.5" fill="#ef4444" />
            <circle cx="16" cy="16" r="2" fill="#0f172a" />
            <circle cx="15" cy="15" r="0.8" fill="#ffffff" />
            {/* Tia máu ma mị */}
            <path d="M8 16 Q11 15 12 16 M24 16 Q21 17 20 16 M16 8 Q15 11 16 12" stroke="#f87171" strokeWidth="0.8" fill="none" />
          </g>
        )}

        {/* 15: 🦉 Cú mèo đêm mắt tròn */}
        {type === 15 && (
          <g transform="translate(202, 58)" className="transition-transform duration-300 group-hover:scale-115">
            <circle cx="16" cy="18" r="16" fill={`url(#mascotGlow-${type})`} opacity="0.5" />
            {/* Thân cú */}
            <ellipse cx="16" cy="20" rx="8" ry="11" fill="#475569" />
            <polygon points="9,12 8,6 13,10" fill="#334155" />
            <polygon points="23,12 24,6 19,10" fill="#334155" />
            {/* Mắt to tròn */}
            <circle cx="12.5" cy="16" r="3.2" fill="#fef08a" />
            <circle cx="19.5" cy="16" r="3.2" fill="#fef08a" />
            <circle cx="12.5" cy="16" r="1.6" fill="#0f172a" />
            <circle cx="19.5" cy="16" r="1.6" fill="#0f172a" />
            {/* Mỏ cú */}
            <polygon points="16,18 14.5,21 17.5,21" fill="#f97316" />
          </g>
        )}

        {/* 16: 🧟 Bàn tay Zombie nhô lên */}
        {type === 16 && (
          <g transform="translate(204, 60)" className="transition-transform duration-300 group-hover:-translate-y-1">
            <circle cx="14" cy="18" r="15" fill={`url(#mascotGlow-${type})`} opacity="0.5" />
            {/* Cánh tay xanh nhô lên */}
            <rect x="11" y="22" width="6" height="12" fill="#65a30d" rx="1" />
            {/* Bàn tay và ngón tay */}
            <polygon points="9,22 11,15 13,13 15,15 17,13 19,16 19,22" fill="#84cc16" />
            <ellipse cx="14" cy="33" rx="9" ry="2" fill="#3f6212" />
          </g>
        )}

        {/* 17: ⚰️ Quan tài Dracula gothic */}
        {type === 17 && (
          <g transform="translate(204, 58)" className="transition-transform duration-300 group-hover:scale-115">
            <circle cx="14" cy="18" r="15" fill={`url(#mascotGlow-${type})`} opacity="0.5" />
            <polygon points="10,6 18,6 22,14 18,34 10,34 6,14" fill="#3f3f46" stroke="#18181b" strokeWidth="1" />
            {/* Chữ thập vàng */}
            <line x1="14" y1="12" x2="14" y2="24" stroke="#facc15" strokeWidth="1.2" />
            <line x1="10" y1="16" x2="18" y2="16" stroke="#facc15" strokeWidth="1.2" />
          </g>
        )}

        {/* 18: 🔮 Quả cầu pha lê tiên tri */}
        {type === 18 && (
          <g transform="translate(202, 60)" className="transition-transform duration-300 group-hover:scale-115">
            <circle cx="16" cy="16" r="16" fill={`url(#mascotGlow-${type})`} opacity="0.7" />
            {/* Đế quả cầu */}
            <polygon points="10,30 22,30 20,25 12,25" fill="#ca8a04" />
            {/* Quả cầu pha lê phát sáng tím */}
            <circle cx="16" cy="16" r="10" fill="#c084fc" opacity="0.85" />
            <ellipse cx="14" cy="13" rx="4" ry="2" fill="#ffffff" opacity="0.6" />
            <circle cx="18" cy="18" r="1.5" fill="#fdf4ff" />
          </g>
        )}

        {/* 19: 🎃 Cặp đôi Bí ngô & Bóng ma mini */}
        {type === 19 && (
          <g transform="translate(194, 60)" className="transition-transform duration-300 group-hover:scale-110">
            <circle cx="20" cy="18" r="16" fill={`url(#mascotGlow-${type})`} opacity="0.6" />
            {/* Bí ngô mini */}
            <ellipse cx="14" cy="22" rx="10" ry="8" fill="#ea580c" />
            <polygon points="11,20 13,21 12,18" fill="#fef08a" />
            <polygon points="17,20 15,21 16,18" fill="#fef08a" />
            <path d="M10,24 Q14,27 18,24" stroke="#fef08a" strokeWidth="1" fill="none" />
            {/* Ma nhỏ bay bên cạnh */}
            <path d="M22 14 C22 8 32 8 32 14 C32 19 30 21 32 23 C30 22 28 24 26 22 C24 24 22 23 22 14 Z" fill="#f8fafc" />
            <circle cx="25" cy="13" r="1" fill="#0f172a" />
            <circle cx="29" cy="13" r="1" fill="#0f172a" />
          </g>
        )}
      </svg>

      {/* Ánh đèn tỏa dưới gầm xe khi rê chuột */}
      <div 
        className="absolute inset-x-8 bottom-0 h-4 bg-gradient-to-t from-orange-500/20 via-orange-400/10 to-transparent blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
      />
    </div>
  );
};

export default HalloweenCarBackdrop;
