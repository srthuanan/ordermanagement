import React from 'react';

interface VinFastBrandTextSvgProps {
  className?: string;
  height?: number; // Chiều cao hiển thị (mặc định 28)
  variant?: 'stacked' | 'single'; // Dạng 2 dòng xếp chồng (mặc định) hoặc 1 dòng ngang
}

/**
 * 🌟 VinFastBrandTextSvg - Chữ VINFAST THUẬN AN vẽ bằng công nghệ SVG cao cấp:
 * - Dòng 1: VINFAST (Titanium Chrome 3D phản quang ánh kim, có vệt sáng quét qua)
 * - Dòng 2: THUẬN AN (Nằm dưới chữ VinFast, kích thước nhỏ hơn, màu xanh Royal Sapphire VinFast)
 * - Không có viền trắng, độ tương phản sắc nét tuyệt đối trên nền sáng
 */
export const VinFastBrandTextSvg: React.FC<VinFastBrandTextSvgProps> = ({
  className = '',
  height = 28,
  variant = 'stacked',
}) => {
  // MẶC ĐỊNH: Variant "stacked" - VINFAST trên, THUẬN AN nhỏ hơn ở dưới
  // Tỷ lệ chuẩn: 92 x 28
  if (variant === 'stacked') {
    const width = height * (92 / 28);

    return (
      <div
        className={`relative inline-flex items-center select-none ${className}`}
        style={{ height, width }}
      >
        <svg
          viewBox="0 0 92 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full overflow-visible"
        >
          <defs>
            {/* 💎 1. Gradient Crom 3D Titanium bóng mạ phản quang ánh kim */}
            <linearGradient id="textTitaniumChrome" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="28%" stopColor="#1e293b" />
              <stop offset="48%" stopColor="#0f172a" />
              <stop offset="52%" stopColor="#64748b" />
              <stop offset="72%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* 💙 2. Gradient Xanh Royal Sapphire cho chữ THUẬN AN */}
            <linearGradient id="textSapphireBlue" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="50%" stopColor="#0369a1" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* ✨ 3. Vệt sáng kim loại quét chéo siêu tốc */}
            <linearGradient id="textShimmerRay" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="45%" stopColor="white" stopOpacity="0" />
              <stop offset="50%" stopColor="white" stopOpacity="0.95" />
              <stop offset="55%" stopColor="white" stopOpacity="0" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>

            {/* 🌫️ 4. Bộ lọc đổ bóng dập nổi 3D */}
            <filter id="textShadow3D" x="-10%" y="-15%" width="120%" height="130%">
              <feDropShadow dx="0" dy="1" stdDeviation="0.6" floodColor="#0f172a" floodOpacity="0.2" />
            </filter>

            <style>{`
              @keyframes vfShimmerSweepStacked {
                0% { transform: translateX(-80px) skewX(-25deg); opacity: 0; }
                20% { opacity: 0.95; }
                50% { transform: translateX(130px) skewX(-25deg); opacity: 0; }
                100% { transform: translateX(130px) skewX(-25deg); opacity: 0; }
              }
              .vf-shimmer-sweep-stacked {
                animation: vfShimmerSweepStacked 4.2s ease-in-out infinite;
              }
            `}</style>
          </defs>

          {/* ==================================================== */}
          {/* DÒNG 1: CHỮ "VINFAST" LỚN, TITANIUM CHROME 3D        */}
          {/* ==================================================== */}
          <g filter="url(#textShadow3D)">
            {/* Mask bao phủ chữ VINFAST để vệt sáng quét qua */}
            <mask id="vinfastMaskOnly">
              <text
                x="0"
                y="13"
                fontSize="14"
                fontWeight="900"
                letterSpacing="2.2"
                fill="#ffffff"
                fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              >
                VINFAST
              </text>
            </mask>

            {/* Lớp bóng dập nổi phía dưới */}
            <text
              x="0"
              y="14"
              fontSize="14"
              fontWeight="900"
              letterSpacing="2.2"
              fill="#0f172a"
              opacity="0.18"
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            >
              VINFAST
            </text>

            {/* Mặt chữ chính mạ Titanium Chrome sắc nét */}
            <text
              x="0"
              y="13"
              fontSize="14"
              fontWeight="900"
              letterSpacing="2.2"
              fill="url(#textTitaniumChrome)"
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            >
              VINFAST
            </text>

            {/* Vệt sáng kim loại quét qua chữ VINFAST */}
            <g mask="url(#vinfastMaskOnly)">
              <rect
                className="vf-shimmer-sweep-stacked"
                x="0"
                y="-5"
                width="35"
                height="22"
                fill="url(#textShimmerRay)"
              />
            </g>
          </g>

          {/* Dải phân cách vi mô mỏng nhẹ */}
          <line
            x1="0"
            y1="16.5"
            x2="88"
            y2="16.5"
            stroke="#cbd5e1"
            strokeWidth="0.5"
            opacity="0.5"
          />

          {/* ==================================================== */}
          {/* DÒNG 2: CHỮ "THUẬN AN" NẰM DƯỚI, KÍCH THƯỚC NHỎ HƠN  */}
          {/* ==================================================== */}
          <g>
            <text
              x="0.5"
              y="25.5"
              fontSize="7.8"
              fontWeight="800"
              letterSpacing="3.4"
              fill="url(#textSapphireBlue)"
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            >
              THUẬN AN
            </text>
          </g>
        </svg>
      </div>
    );
  }

  // Variant "single": VINFAST | THUẬN AN trên cùng 1 hàng
  const width = height * (178 / 22);

  return (
    <div
      className={`relative inline-flex items-center select-none ${className}`}
      style={{ height, width }}
    >
      <svg
        viewBox="0 0 178 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          <linearGradient id="hdrChrome3DSingle" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="28%" stopColor="#1e293b" />
            <stop offset="48%" stopColor="#0f172a" />
            <stop offset="52%" stopColor="#64748b" />
            <stop offset="72%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="hdrSapphireTextSingle" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#0369a1" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>

          <linearGradient id="hdrShimmerRaySingle" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="45%" stopColor="white" stopOpacity="0" />
            <stop offset="50%" stopColor="white" stopOpacity="0.95" />
            <stop offset="55%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <filter id="hdrEmbossShadowSingle" x="-10%" y="-20%" width="120%" height="140%">
            <feDropShadow dx="0" dy="1.2" stdDeviation="0.8" floodColor="#0f172a" floodOpacity="0.22" />
          </filter>

          <style>{`
            @keyframes vfShimmerSweepSingle {
              0% { transform: translateX(-140px) skewX(-25deg); opacity: 0; }
              20% { opacity: 0.95; }
              50% { transform: translateX(230px) skewX(-25deg); opacity: 0; }
              100% { transform: translateX(230px) skewX(-25deg); opacity: 0; }
            }
            .vf-shimmer-sweep-single {
              animation: vfShimmerSweepSingle 4.2s ease-in-out infinite;
            }
          `}</style>
        </defs>

        <g filter="url(#hdrEmbossShadowSingle)">
          <mask id="brandTextFullMaskSingle">
            <text
              x="0"
              y="16"
              fontSize="14.5"
              fontWeight="900"
              letterSpacing="2.2"
              fill="#ffffff"
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            >
              VINFAST
            </text>
            <text
              x="96"
              y="16"
              fontSize="12.5"
              fontWeight="800"
              letterSpacing="1.8"
              fill="#ffffff"
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            >
              THUẬN AN
            </text>
          </mask>

          <text
            x="0"
            y="17"
            fontSize="14.5"
            fontWeight="900"
            letterSpacing="2.2"
            fill="#0f172a"
            opacity="0.2"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          >
            VINFAST
          </text>
          <text
            x="96"
            y="17"
            fontSize="12.5"
            fontWeight="800"
            letterSpacing="1.8"
            fill="#0f172a"
            opacity="0.2"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          >
            THUẬN AN
          </text>

          <text
            x="0"
            y="16"
            fontSize="14.5"
            fontWeight="900"
            letterSpacing="2.2"
            fill="url(#hdrChrome3DSingle)"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          >
            VINFAST
          </text>

          <line
            x1="89"
            y1="5"
            x2="89"
            y2="16"
            stroke="#94a3b8"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.6"
          />

          <text
            x="96"
            y="16"
            fontSize="12.5"
            fontWeight="800"
            letterSpacing="1.8"
            fill="url(#hdrSapphireTextSingle)"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          >
            THUẬN AN
          </text>

          <g mask="url(#brandTextFullMaskSingle)">
            <rect
              className="vf-shimmer-sweep-single"
              x="0"
              y="-10"
              width="50"
              height="35"
              fill="url(#hdrShimmerRaySingle)"
            />
          </g>
        </g>
      </svg>
    </div>
  );
};
