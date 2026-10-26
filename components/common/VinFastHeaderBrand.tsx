import React from 'react';

interface VinFastHeaderBrandProps {
  className?: string;
  height?: number; // Chiều cao pixel (mặc định 38)
}

export const VinFastHeaderBrand: React.FC<VinFastHeaderBrandProps> = ({
  className = '',
  height = 38,
}) => {
  // Tỷ lệ khung hình chuẩn ngang 240 x 44
  const width = height * (240 / 44);

  return (
    <div
      className={`relative inline-flex items-center select-none ${className}`}
      style={{ height, width }}
    >
      <svg
        viewBox="0 0 240 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* 💎 1. Chrome Facet Gradients for Wings & Text */}
          <linearGradient id="hdrChromeOuter" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#cbd5e1" />
            <stop offset="75%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          <linearGradient id="hdrChromeInner" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="20%" stopColor="#f8fafc" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="80%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* 💙 2. VinFast Electric Blue Gradient */}
          <linearGradient id="hdrBlueWing" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="30%" stopColor="#38bdf8" />
            <stop offset="70%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>

          {/* 💎 3. Chữ VINFAST 3D Chrome Gradient */}
          <linearGradient id="hdrTextChrome" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#f1f5f9" />
            <stop offset="45%" stopColor="#cbd5e1" />
            <stop offset="52%" stopColor="#ffffff" />
            <stop offset="58%" stopColor="#64748b" />
            <stop offset="85%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* 🏷️ 4. Chữ THUẬN AN Royal Sapphire Gradient */}
          <linearGradient id="hdrThuanAnBlue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#0369a1" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          {/* ✨ 5. Metallic Shimmer Sweep Light Ray */}
          <linearGradient id="hdrShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="40%" stopColor="white" stopOpacity="0" />
            <stop offset="50%" stopColor="white" stopOpacity="0.9" />
            <stop offset="60%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>

          {/* 💡 6. Glow Filters */}
          <filter id="hdrElectricGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="hdrTextShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#0f172a" floodOpacity="0.18" />
          </filter>

          <style>{`
            /* 🦅 Cánh trái vỗ cánh */
            @keyframes hdrLeftFlap {
              0%, 100% { transform: rotate(0deg) scale(1, 1); }
              22% { transform: rotate(-11deg) scale(0.96, 1.05); }
              48% { transform: rotate(6°); scale(1.02, 0.97); }
              72% { transform: rotate(-3deg); }
            }
            /* 🦅 Cánh phải vỗ cánh */
            @keyframes hdrRightFlap {
              0%, 100% { transform: rotate(0deg) scale(1, 1); }
              22% { transform: rotate(11deg) scale(0.96, 1.05); }
              48% { transform: rotate(-6deg); scale(1.02, 0.97); }
              72% { transform: rotate(3deg); }
            }
            @keyframes hdrBodyLift {
              0%, 100% { transform: translateY(0px); }
              22% { transform: translateY(1.5px); }
              48% { transform: translateY(-3px); }
              72% { transform: translateY(-0.8px); }
            }
            @keyframes hdrTextShimmer {
              0% { transform: translateX(-120px) rotate(20deg); opacity: 0; }
              25% { opacity: 0.8; }
              50% { transform: translateX(200px) rotate(20deg); opacity: 0; }
              100% { transform: translateX(200px) rotate(20deg); opacity: 0; }
            }
            @keyframes hdrStarTwinkle {
              0%, 100% { transform: scale(0.6) rotate(0deg); opacity: 0.2; }
              50% { transform: scale(1.2) rotate(90deg); opacity: 1; }
            }
            .hdr-left-wing {
              transform-origin: 20px 34px;
              animation: hdrLeftFlap 2.6s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
            }
            .hdr-right-wing {
              transform-origin: 20px 34px;
              animation: hdrRightFlap 2.6s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
            }
            .hdr-body-lift {
              animation: hdrBodyLift 2.6s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
            }
            .hdr-shimmer-sweep {
              animation: hdrTextShimmer 4s ease-in-out infinite;
            }
            .hdr-star {
              transform-origin: 14px 7px;
              animation: hdrStarTwinkle 2.6s ease-in-out infinite;
            }
          `}</style>
        </defs>

        {/* ========================================================= */}
        {/* 🦅 PHẦN 1: BIỂU TƯỢNG CHỮ V ĐẠI BÀNG VỖ CÁNH (X: 0 -> 40) */}
        {/* ========================================================= */}
        <g className="hdr-body-lift" transform="translate(2, 0)">
          {/* Cánh trái */}
          <g className="hdr-left-wing">
            <path
              d="M20 34 L6 6 L12 4 L20 26 Z"
              fill="url(#hdrChromeOuter)"
              stroke="#94a3b8"
              strokeWidth="0.4"
            />
            <path
              d="M20 34 L12 4 L16 3 L20 22 Z"
              fill="url(#hdrChromeInner)"
              stroke="#64748b"
              strokeWidth="0.4"
            />
            <path
              d="M20 28 L14 8 L16 7 L20 22 Z"
              fill="url(#hdrBlueWing)"
              stroke="#bae6fd"
              strokeWidth="0.5"
            />
            {/* Ngôi sao lấp lánh cánh trái */}
            <g className="hdr-star">
              <polygon
                points="14,4 15,6 17,7 15,8 14,10 13,8 11,7 13,6"
                fill="#ffffff"
                filter="url(#hdrElectricGlow)"
              />
            </g>
          </g>

          {/* Cánh phải */}
          <g className="hdr-right-wing">
            <path
              d="M20 34 L34 6 L28 4 L20 26 Z"
              fill="url(#hdrChromeOuter)"
              stroke="#94a3b8"
              strokeWidth="0.4"
            />
            <path
              d="M20 34 L28 4 L24 3 L20 22 Z"
              fill="url(#hdrChromeInner)"
              stroke="#64748b"
              strokeWidth="0.4"
            />
            <path
              d="M20 28 L26 8 L24 7 L20 22 Z"
              fill="url(#hdrBlueWing)"
              stroke="#bae6fd"
              strokeWidth="0.5"
            />
          </g>

          {/* Chóp kim cương đáy chữ V */}
          <polygon
            points="20,35 18,30 20,27 22,30"
            fill="url(#hdrChromeInner)"
            stroke="#cbd5e1"
            strokeWidth="0.5"
          />
          <polygon
            points="20,35 20,27 22,30"
            fill="url(#hdrChromeOuter)"
          />
          <circle cx="20" cy="23" r="1.2" fill="#38bdf8" filter="url(#hdrElectricGlow)" />
        </g>

        {/* ========================================================= */}
        {/* 💎 PHẦN 2: CHỮ "VINFAST" VẼ BẰNG SVG 3D MẠ CROM CAO CẤP */}
        {/* ========================================================= */}
        <g transform="translate(48, 22)" filter="url(#hdrTextShadow)">
          {/* Mask cho vệt sáng quét qua chữ VINFAST */}
          <mask id="vinfastTextMask">
            <text
              x="0"
              y="0"
              fontSize="19"
              fontWeight="900"
              letterSpacing="3.5"
              fill="#ffffff"
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            >
              VINFAST
            </text>
          </mask>

          {/* Lớp nền đổ bóng dập nổi sâu */}
          <text
            x="0"
            y="1"
            fontSize="19"
            fontWeight="900"
            letterSpacing="3.5"
            fill="#475569"
            opacity="0.25"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          >
            VINFAST
          </text>

          {/* Mặt chữ chính mạ Crom sáng bóng */}
          <text
            x="0"
            y="0"
            fontSize="19"
            fontWeight="900"
            letterSpacing="3.5"
            fill="url(#hdrTextChrome)"
            stroke="#ffffff"
            strokeWidth="0.5"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          >
            VINFAST
          </text>

          {/* Tia sáng kim loại lướt qua chữ VINFAST */}
          <g mask="url(#vinfastTextMask)">
            <rect
              className="hdr-shimmer-sweep"
              x="0"
              y="-20"
              width="45"
              height="35"
              fill="url(#hdrShimmer)"
            />
          </g>
        </g>

        {/* ========================================================= */}
        {/* 🏷️ PHẦN 3: CHỮ "THUẬN AN" SVG XANH SAPPHIRE VINFAST CAO CẤP */}
        {/* ========================================================= */}
        <g transform="translate(49, 36)">
          {/* Dải phân cách vi mô mạ crom */}
          <line
            x1="0"
            y1="-11"
            x2="182"
            y2="-11"
            stroke="url(#hdrChromeOuter)"
            strokeWidth="0.5"
            opacity="0.55"
          />

          {/* Chữ SHOWROOM THUẬN AN dập nổi sắc sảo */}
          <text
            x="0"
            y="0"
            fontSize="8.5"
            fontWeight="800"
            letterSpacing="2.6"
            fill="url(#hdrThuanAnBlue)"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          >
            SHOWROOM THUẬN AN
          </text>

          {/* Điểm sáng LED xanh ngọc bích cuối chữ */}
          <circle
            cx="178"
            cy="-3"
            r="1.6"
            fill="#38bdf8"
            filter="url(#hdrElectricGlow)"
          />
        </g>
      </svg>
    </div>
  );
};
