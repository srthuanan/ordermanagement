import React from 'react';

import statusBgEmerald from '../../pictures/status_bg_emerald.webp';
import statusBgTeal from '../../pictures/status_bg_teal.webp';
import statusBgBlue from '../../pictures/status_bg_blue.webp';
import statusBgAmber from '../../pictures/status_bg_amber.webp';
import statusBgSlate from '../../pictures/status_bg_slate.webp';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
  className?: string;
}

/**
 * Ultra-Luxury Animated Frosted Glass Capsule
 * - Nền kính quang học hoạt cảnh chuyển động phát quang (Animated Aurora Capsule)
 * - Ánh phản xạ viền Hairline siêu mỏng tinh xảo
 * - Chấm quang học phát sáng (Optic Jewel Dot Glow)
 * - Kiểu chữ trầm sang trọng, đẳng cấp thượng lưu
 */
const getLuxuryTheme = (statusText: string): {
  dotGlow: string;
  dotColor: string;
  textColor: string;
  accentBorder: string;
  bgImg: string;
  pulse?: boolean;
} => {
  if (!statusText || typeof statusText !== 'string') {
    return {
      dotColor: 'bg-slate-400',
      dotGlow: 'shadow-[0_0_6px_rgba(148,163,184,0.4)]',
      textColor: 'text-slate-700',
      accentBorder: 'border-slate-300/80 hover:border-slate-400',
      bgImg: statusBgSlate,
    };
  }

  const lower = statusText.toLowerCase().trim().normalize('NFC');

  // 1. Đã xuất hóa đơn / Đã hoàn tất (Deep Emerald Lục Bảo)
  if (lower.includes('đã xuất hóa đơn') || lower.includes('đã hoàn tất') || lower.includes('đã cấp vc')) {
    return {
      dotColor: 'bg-emerald-500',
      dotGlow: 'shadow-[0_0_8px_rgba(16,185,129,0.85)]',
      textColor: 'text-emerald-900',
      accentBorder: 'border-emerald-200/90 hover:border-emerald-300',
      bgImg: statusBgEmerald,
    };
  }

  // 2. Đã ghép xe (Sapphire Blue Hoàng Gia)
  if (lower.includes('đã ghép') || lower.includes('đã tìm thấy') || lower.includes('đã bổ sung')) {
    return {
      dotColor: 'bg-blue-600',
      dotGlow: 'shadow-[0_0_8px_rgba(37,99,235,0.85)]',
      textColor: 'text-blue-950',
      accentBorder: 'border-blue-200/90 hover:border-blue-300',
      bgImg: statusBgBlue,
    };
  }

  // 3. Đang giữ xe (Warm Bronze Amber)
  if (lower.includes('đang giữ') || lower.includes('đã giữ xe') || lower.includes('đang lái thử')) {
    return {
      dotColor: 'bg-amber-500',
      dotGlow: 'shadow-[0_0_8px_rgba(245,158,11,0.9)]',
      textColor: 'text-amber-950',
      accentBorder: 'border-amber-200/90 hover:border-amber-300',
      bgImg: statusBgAmber,
      pulse: true,
    };
  }

  // 4. Chờ ký hóa đơn (Deep Aqua Teal)
  if (lower.includes('chờ ký') || lower.includes('chờ ký')) {
    return {
      dotColor: 'bg-teal-500',
      dotGlow: 'shadow-[0_0_8px_rgba(20,184,166,0.85)]',
      textColor: 'text-teal-950',
      accentBorder: 'border-teal-200/90 hover:border-teal-300',
      bgImg: statusBgTeal,
    };
  }

  // 5. Chờ duyệt / Phê duyệt (Royal Amber)
  if (lower.includes('chờ duyệt') || lower.includes('chờ phê duyệt') || lower.includes('chờ check-in') || lower.includes('đang chờ')) {
    return {
      dotColor: 'bg-amber-500',
      dotGlow: 'shadow-[0_0_8px_rgba(245,158,11,0.85)]',
      textColor: 'text-amber-950',
      accentBorder: 'border-amber-200/90 hover:border-amber-300',
      bgImg: statusBgAmber,
      pulse: true,
    };
  }

  // 6. Cần bổ sung / Xác thực (Vibrant Mandarin)
  if (lower.includes('yêu cầu bổ sung') || lower.includes('chờ xác thực')) {
    return {
      dotColor: 'bg-amber-500',
      dotGlow: 'shadow-[0_0_8px_rgba(245,158,11,0.85)]',
      textColor: 'text-amber-950',
      accentBorder: 'border-amber-200/90 hover:border-amber-300',
      bgImg: statusBgAmber,
      pulse: true,
    };
  }

  // 7. Đã hủy / Từ chối (Ruby Crimson)
  if (lower.includes('hủy') || lower.includes('từ chối')) {
    return {
      dotColor: 'bg-rose-500',
      dotGlow: 'shadow-[0_0_8px_rgba(244,63,94,0.85)]',
      textColor: 'text-rose-900',
      accentBorder: 'border-rose-200/90 hover:border-rose-300',
      bgImg: statusBgSlate,
    };
  }

  // 8. Chưa ghép (Titanium Slate)
  if (lower.includes('chưa ghép') || lower.includes('chưa tìm thấy')) {
    return {
      dotColor: 'bg-slate-400',
      dotGlow: 'shadow-[0_0_6px_rgba(148,163,184,0.6)]',
      textColor: 'text-slate-700',
      accentBorder: 'border-slate-200/90 hover:border-slate-300',
      bgImg: statusBgSlate,
    };
  }

  // Mặc định
  return {
    dotColor: 'bg-slate-400',
    dotGlow: 'shadow-[0_0_6px_rgba(148,163,184,0.6)]',
    textColor: 'text-slate-700',
    accentBorder: 'border-slate-200/90 hover:border-slate-300',
    bgImg: statusBgSlate,
  };
};

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  iconOnly = false,
  className = '',
}) => {
  const theme = getLuxuryTheme(status);

  if (iconOnly) {
    return (
      <div
        className={`relative w-6 h-6 rounded-full overflow-hidden flex items-center justify-center border border-slate-200/90 shadow-xs ${className}`}
        title={status}
      >
        <img
          src={theme.bgImg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover rounded-full pointer-events-none"
        />
        <span className={`relative z-10 w-1.5 h-1.5 rounded-full ${theme.dotColor} ${theme.dotGlow} ${theme.pulse ? 'animate-pulse' : ''}`} />
      </div>
    );
  }

  const sizeStyles = {
    sm: 'h-[23px] px-2.5 text-[10px]',
    md: 'h-[26px] px-3.5 text-[10.5px]',
    lg: 'h-[29px] px-4 text-[11.5px]',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-l-md rounded-r-xl overflow-hidden border shadow-[0_2px_8px_-1px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:shadow-md hover:scale-[1.03] select-none ${sizeStyles[size]} ${theme.textColor} ${theme.accentBorder} ${className}`}
      title={status}
    >
      {/* Animated Modern Aerodynamic Tag Background */}
      <img
        src={theme.bgImg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* Luxury Refined High-End Typography */}
      <span className="relative z-10 truncate tracking-tight font-extrabold text-center">{status}</span>
    </div>
  );
};

export default React.memo(StatusBadge);