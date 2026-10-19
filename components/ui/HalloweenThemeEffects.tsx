import React, { useState, useEffect, useRef } from 'react';
import { isHalloweenSeason } from './HolidayThemeDecorator';

// ==========================================
// 1. SVG GRAPHICS CHUẨN VECTOR HALLOWEEN
// ==========================================

// Quả bí ngô Jack-o'-lantern phát sáng
export const PumpkinIcon: React.FC<{ className?: string; isGlow?: boolean; size?: number }> = ({ 
  className = '', 
  isGlow = true, 
  size = 28 
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 64 64" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block select-none transition-transform duration-300 ${isGlow ? 'filter drop-shadow-[0_0_8px_rgba(249,115,22,0.85)]' : ''} ${className}`}
  >
    {/* Cuống bí ngô */}
    <path d="M32 14C32 9 35 4 40 3C38 7 36 10 35 14" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" />
    <path d="M34 10C36 10 39 11 41 8" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />

    {/* Thân quả bí ngô */}
    <ellipse cx="32" cy="38" rx="26" ry="20" fill="#ea580c" />
    <ellipse cx="24" cy="38" rx="16" ry="19" fill="#f97316" />
    <ellipse cx="40" cy="38" rx="16" ry="19" fill="#f97316" />
    <ellipse cx="32" cy="38" rx="10" ry="18" fill="#fb923c" />

    {/* Mắt bí ngô (phát sáng vàng neon) */}
    <polygon points="21,31 27,33 25,27" fill={isGlow ? "#fef08a" : "#7c2d12"} />
    <polygon points="43,31 37,33 39,27" fill={isGlow ? "#fef08a" : "#7c2d12"} />

    {/* Mũi bí ngô */}
    <polygon points="32,34 30,38 34,38" fill={isGlow ? "#fef08a" : "#7c2d12"} />

    {/* Miệng cười ma mị răng cưa */}
    <path 
      d="M19 42 Q32 54 45 42 Q39 48 32 46 Q25 48 19 42 Z" 
      fill={isGlow ? "#fef08a" : "#7c2d12"} 
    />
    <polygon points="26,43 28,46 30,43" fill="#ea580c" />
    <polygon points="34,43 36,46 38,43" fill="#ea580c" />
    <polygon points="31,48 33,45 35,48" fill="#ea580c" />
  </svg>
);

// Mạng nhện tinh tế 2 góc màn hình
const SpiderWebCorner: React.FC<{ position: 'top-left' | 'top-right' }> = ({ position }) => {
  const isLeft = position === 'top-left';
  return (
    <div 
      className={`fixed top-0 ${isLeft ? 'left-0' : 'right-0'} pointer-events-none z-30 select-none opacity-40 hover:opacity-80 transition-opacity duration-700`}
      style={{ transform: isLeft ? 'none' : 'scaleX(-1)' }}
      aria-hidden="true"
    >
      <svg width="130" height="130" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 0 L140 0" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
        <path d="M0 0 L0 140" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
        <path d="M0 0 L120 120" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
        <path d="M0 0 L135 60" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <path d="M0 0 L60 135" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        {/* Vòng cung tơ nhện */}
        <path d="M30 0 Q25 25 0 30" stroke="rgba(255,255,255,0.3)" strokeWidth="0.9" fill="none" />
        <path d="M60 0 Q50 50 0 60" stroke="rgba(255,255,255,0.3)" strokeWidth="0.9" fill="none" />
        <path d="M95 0 Q80 80 0 95" stroke="rgba(255,255,255,0.3)" strokeWidth="0.9" fill="none" />
        <path d="M130 0 Q110 110 0 130" stroke="rgba(255,255,255,0.25)" strokeWidth="0.9" fill="none" />
        {/* Chú nhện nhỏ thả tơ */}
        <line x1="85" y1="85" x2="85" y2="120" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" strokeDasharray="2 2" />
        <ellipse cx="85" cy="122" rx="4" ry="5" fill="#f97316" />
        <circle cx="85" cy="118" r="2.5" fill="#c2410c" />
        <path d="M82 120 Q78 118 76 122 M88 120 Q92 118 94 122" stroke="#ea580c" strokeWidth="0.8" fill="none" />
        <path d="M82 123 Q77 124 76 128 M88 123 Q93 124 94 128" stroke="#ea580c" strokeWidth="0.8" fill="none" />
      </svg>
    </div>
  );
};

// ==========================================
// 2. HIỆU ỨNG CON TRỎ CHUỘT MA QUÁI (GHOST TRAIL)
// ==========================================
interface Sparkle {
  x: number;
  y: number;
  size: number;
  color: string;
  id: number;
}

const HalloweenCursorTrail: React.FC = () => {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const lastTimeRef = useRef<number>(0);
  const colors = ['#f97316', '#fbbf24', '#c084fc', '#f43f5e'];

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      // Giới hạn tần suất tạo hạt (throttle 45ms) để bảo đảm 60FPS
      if (now - lastTimeRef.current < 45) return;
      lastTimeRef.current = now;

      const newSparkle: Sparkle = {
        x: e.clientX,
        y: e.clientY,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        id: now + Math.random()
      };

      setSparkles((prev) => [...prev.slice(-12), newSparkle]);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Tự tiêu hủy hạt sau 550ms
  useEffect(() => {
    if (sparkles.length === 0) return;
    const timer = setTimeout(() => {
      setSparkles((prev) => prev.slice(1));
    }, 120);
    return () => clearTimeout(timer);
  }, [sparkles]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      {sparkles.map((sp) => (
        <span
          key={sp.id}
          className="absolute rounded-full transition-opacity duration-300"
          style={{
            left: `${sp.x}px`,
            top: `${sp.y}px`,
            width: `${sp.size}px`,
            height: `${sp.size}px`,
            backgroundColor: sp.color,
            boxShadow: `0 0 10px ${sp.color}, 0 0 18px ${sp.color}`,
            transform: 'translate(-50%, -50%)',
            animation: 'sparkleFade 0.55s ease-out forwards'
          }}
        />
      ))}
    </div>
  );
};

// ==========================================
// 3. TỰ ĐỘNG KÍCH HOẠT THEO MÙA (TỰ TẮT KHI HẾT HALLOWEEN)
// ==========================================
export const HalloweenThemeWidget: React.FC = () => {
  const isSeasonActive = isHalloweenSeason();

  // Tự động thêm class viền phát sáng khi trong mùa Halloween, tự xóa khi hết mùa
  useEffect(() => {
    if (isSeasonActive) {
      document.body.classList.add('halloween-theme-active');
    } else {
      document.body.classList.remove('halloween-theme-active');
    }
    return () => {
      document.body.classList.remove('halloween-theme-active');
    };
  }, [isSeasonActive]);

  // Nếu đã hết mùa lễ hội Halloween (sau ngày 02/11), trả về null -> hoàn toàn về giao diện gốc
  if (!isSeasonActive) {
    return null;
  }

  return (
    <>
      {/* Styles hiệu ứng Halloween tinh tế */}
      <style>{`
        @keyframes sparkleFade {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -65%) scale(0.2); opacity: 0; }
        }
        /* Viền sáng ma mị cho các Thẻ Card & Bảng biểu khi rê chuột */
        body.halloween-theme-active .shadow-sm,
        body.halloween-theme-active .shadow-md,
        body.halloween-theme-active .shadow-lg,
        body.halloween-theme-active .rounded-xl {
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        body.halloween-theme-active .shadow-sm:hover,
        body.halloween-theme-active .shadow-md:hover,
        body.halloween-theme-active .shadow-lg:hover {
          box-shadow: 0 0 16px rgba(249, 115, 22, 0.25) !important;
          border-color: rgba(249, 115, 22, 0.35) !important;
        }
      `}</style>

      {/* 2. Vệt chuột ma quái nhẹ nhàng */}
      <HalloweenCursorTrail />
    </>
  );
};

export default HalloweenThemeWidget;
