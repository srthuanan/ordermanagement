import React from 'react';

interface VinFastAnimatedLogoProps {
  className?: string;
  size?: number; // Kích thước chiều rộng pixel (mặc định 125)
  showText?: boolean; // Hiển thị chữ VINFAST dưới logo (mặc định true để bảo toàn màn hình đăng nhập)
}

export const VinFastAnimatedLogo: React.FC<VinFastAnimatedLogoProps> = ({
  className = '',
  size = 125,
  showText = true,
}) => {
  const height = showText ? size * 1.15 : size * (145 / 220);
  const viewBox = showText ? '0 0 220 250' : '0 0 220 145';

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height }}
    >
      <svg
        viewBox={viewBox}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* 💎 1. Chrome Facet Gradients (Mặt cánh kim loại 3D mạ crom) */}
          <linearGradient id="chromeLeftOuter" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="20%" stopColor="#e2e8f0" />
            <stop offset="45%" stopColor="#cbd5e1" />
            <stop offset="75%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          <linearGradient id="chromeLeftInner" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="15%" stopColor="#f8fafc" />
            <stop offset="40%" stopColor="#94a3b8" />
            <stop offset="70%" stopColor="#475569" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          <linearGradient id="chromeRightOuter" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#cbd5e1" />
            <stop offset="80%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          <linearGradient id="chromeRightInner" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="20%" stopColor="#f8fafc" />
            <stop offset="50%" stopColor="#64748b" />
            <stop offset="80%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* 💙 2. VinFast Electric Blue Gradient (Cánh V xanh LED bên trong) */}
          <linearGradient id="electricBlueWing" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="25%" stopColor="#38bdf8" />
            <stop offset="60%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>

          {/* ✨ 3. Metallic Light Shimmer Sweep Gradient */}
          <linearGradient id="lightShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="40%" stopColor="white" stopOpacity="0" />
            <stop offset="50%" stopColor="white" stopOpacity="0.85" />
            <stop offset="60%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>

          {/* 💎 4. Text Chrome Gradient (Titanium Chrome siêu sắc nét, tương phản cao trên nền trắng) */}
          <linearGradient id="textChrome" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="30%" stopColor="#1e293b" />
            <stop offset="48%" stopColor="#0f172a" />
            <stop offset="52%" stopColor="#64748b" />
            <stop offset="70%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* 💡 5. Glow Filter for LED Wing */}
          <filter id="electricGlow" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#0284c7" floodOpacity="0.28" />
          </filter>

          {/* 🦅 KINEMATIC BIRD FLAPPING & SHIMMER CSS ANIMATIONS */}
          <style>{`
            /* Cánh trái vỗ: giương cánh lên đón gió rồi đập sâu xuống tạo lực bay */
            @keyframes vfLeftWingFlap {
              0%, 100% {
                transform: rotate(0deg) scale(1, 1);
              }
              22% {
                transform: rotate(-11.5deg) scale(0.95, 1.06);
              }
              48% {
                transform: rotate(6.5deg) scale(1.03, 0.96);
              }
              72% {
                transform: rotate(-3deg) scale(0.98, 1.02);
              }
            }

            /* Cánh phải vỗ: chuyển động đối xứng hoàn hảo với cánh trái */
            @keyframes vfRightWingFlap {
              0%, 100% {
                transform: rotate(0deg) scale(1, 1);
              }
              22% {
                transform: rotate(11.5deg) scale(0.95, 1.06);
              }
              48% {
                transform: rotate(-6.5deg) scale(1.03, 0.96);
              }
              72% {
                transform: rotate(3deg) scale(0.98, 1.02);
              }
            }

            /* Thân chữ V nhấp nhô theo lực nâng khí động học khi đập cánh */
            @keyframes vfBodyKinematics {
              0%, 100% {
                transform: translateY(0px);
              }
              22% {
                transform: translateY(2px);
              }
              48% {
                transform: translateY(-4.5px);
              }
              72% {
                transform: translateY(-1px);
              }
            }

            @keyframes vfBluePulse {
              0%, 100% { filter: drop-shadow(0 0 4px rgba(56, 189, 248, 0.4)); opacity: 0.92; }
              48% { filter: drop-shadow(0 0 14px rgba(2, 132, 199, 0.9)); opacity: 1; }
            }

            @keyframes vfStarRotate {
              0% { transform: scale(0.6) rotate(0deg); opacity: 0.2; }
              50% { transform: scale(1.2) rotate(90deg); opacity: 1; }
              100% { transform: scale(0.6) rotate(180deg); opacity: 0.2; }
            }

            @keyframes vfStarRotateDelay {
              0% { transform: scale(1.2) rotate(45deg); opacity: 1; }
              50% { transform: scale(0.6) rotate(135deg); opacity: 0.2; }
              100% { transform: scale(1.2) rotate(225deg); opacity: 1; }
            }

            /* Gán class animation */
            .vf-left-wing {
              transform-origin: 110px 135px;
              animation: vfLeftWingFlap 2.6s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
            }

            .vf-right-wing {
              transform-origin: 110px 135px;
              animation: vfRightWingFlap 2.6s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
            }

            .vf-body-flight {
              animation: vfBodyKinematics 2.6s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
            }

            .vf-blue-led {
              animation: vfBluePulse 2.6s ease-in-out infinite;
            }

            .vf-star-1 {
              transform-origin: 86px 8px;
              animation: vfStarRotate 2.6s ease-in-out infinite;
            }

            .vf-star-2 {
              transform-origin: 144px 8px;
              animation: vfStarRotateDelay 2.6s ease-in-out infinite;
            }
          `}</style>
        </defs>

        {/* 🦅 BIỂU TƯỢNG ĐẠI BÀNG CHỮ V VINFAST ĐẬP CÁNH BAY LƯỢN (FLAPPING WINGS) */}
        <g className="vf-body-flight" filter="url(#softShadow)">
          
          {/* 🪽 1. CÁNH TRÁI VỖ CÁNH (LEFT WING) - Tâm xoay (110px, 135px) */}
          <g className="vf-left-wing">
            {/* Cánh bạc ngoài trái - Mặt sáng */}
            <path
              d="M110 135 L42 22 L72 16 L110 102 Z"
              fill="url(#chromeLeftOuter)"
              stroke="#94a3b8"
              strokeWidth="0.6"
            />
            {/* Cánh bạc trong trái - Mặt bóng */}
            <path
              d="M110 135 L72 16 L88 12 L110 88 Z"
              fill="url(#chromeLeftInner)"
              stroke="#64748b"
              strokeWidth="0.6"
            />
            {/* Nhánh xanh VinFast LED trái */}
            <g className="vf-blue-led">
              <path
                d="M110 112 L76 34 L88 30 L110 88 Z"
                fill="url(#electricBlueWing)"
                stroke="#bae6fd"
                strokeWidth="0.75"
              />
              <path
                d="M82 32 L110 98"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.95"
              />
            </g>
            {/* Ngôi sao kim cương đỉnh cánh trái */}
            <g className="vf-star-1">
              <polygon
                points="86,2 88,7 93,8 88,9 86,14 84,9 79,8 84,7"
                fill="#ffffff"
                filter="url(#electricGlow)"
              />
              <circle cx="86" cy="8" r="1.5" fill="#38bdf8" />
            </g>
          </g>

          {/* 🪽 2. CÁNH PHẢI VỖ CÁNH (RIGHT WING) - Tâm xoay (110px, 135px) */}
          <g className="vf-right-wing">
            {/* Cánh bạc ngoài phải - Mặt sáng */}
            <path
              d="M110 135 L178 22 L148 16 L110 102 Z"
              fill="url(#chromeRightOuter)"
              stroke="#94a3b8"
              strokeWidth="0.6"
            />
            {/* Cánh bạc trong phải - Mặt bóng */}
            <path
              d="M110 135 L148 16 L132 12 L110 88 Z"
              fill="url(#chromeRightInner)"
              stroke="#64748b"
              strokeWidth="0.6"
            />
            {/* Nhánh xanh VinFast LED phải */}
            <g className="vf-blue-led">
              <path
                d="M110 112 L144 34 L132 30 L110 88 Z"
                fill="url(#electricBlueWing)"
                stroke="#bae6fd"
                strokeWidth="0.75"
              />
              <path
                d="M138 32 L110 98"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.95"
              />
            </g>
            {/* Ngôi sao kim cương đỉnh cánh phải */}
            <g className="vf-star-2">
              <polygon
                points="144,2 146,7 151,8 146,9 144,14 142,9 137,8 142,7"
                fill="#ffffff"
                filter="url(#electricGlow)"
              />
              <circle cx="144" cy="8" r="1.5" fill="#38bdf8" />
            </g>
          </g>

          {/* 💎 3. KHỐI TRUNG TÂM & CHÓP KIM CƯƠNG ĐÁY CHỮ V */}
          <g>
            {/* Khối chóp kim cương đáy */}
            <polygon
              points="110,138 102,118 110,105 118,118"
              fill="url(#chromeLeftInner)"
              stroke="#cbd5e1"
              strokeWidth="0.6"
            />
            <polygon
              points="110,138 110,105 118,118"
              fill="url(#chromeLeftOuter)"
            />
            <line
              x1="110"
              y1="105"
              x2="110"
              y2="138"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeLinecap="round"
            />

            {/* Viên kim cương phát sáng lõi năng lượng */}
            <polygon
              points="110,84 106,90 110,96 114,90"
              fill="#ffffff"
              filter="url(#electricGlow)"
            />
          </g>
        </g>

        {/* 🔤 4 & 5. CHỮ VINFAST THUẬN AN (Chỉ hiển thị khi showText = true) */}
        {showText && (
          <>
            <g transform="translate(110, 178)">
              <text
                x="0"
                y="0"
                textAnchor="middle"
                fontSize="26"
                fontWeight="900"
                letterSpacing="6.5"
                fill="#0f172a"
                opacity="0.2"
                transform="translate(0, 1.5)"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                VINFAST
              </text>
              <text
                x="0"
                y="0"
                textAnchor="middle"
                fontSize="26"
                fontWeight="900"
                letterSpacing="6.5"
                fill="url(#textChrome)"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                VINFAST
              </text>
            </g>

            <g transform="translate(110, 204)">
              <text
                x="0"
                y="0"
                textAnchor="middle"
                fontSize="10"
                fontWeight="800"
                letterSpacing="3"
                fill="#0284c7"
                fontFamily="system-ui, -apple-system, sans-serif"
                className="tracking-widest uppercase"
              >
                SHOWROOM THUẬN AN
              </text>
              <circle cx="0" cy="8" r="1.8" fill="#38bdf8" filter="url(#electricGlow)" />
            </g>
          </>
        )}
      </svg>
    </div>
  );
};
