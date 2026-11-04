import React, { useMemo, useState } from 'react';
import { ALL_DICEBEAR_STYLES } from '../ui/Avatar';

interface VinFastWelcomeBannerSvgProps {
  displayName: string;
  formattedName: string;
  roleBadgeLabel?: string;
  timeGreeting?: string;
  showroomName?: string;
  ordersCount?: number;
  className?: string;
  onAvatarClick?: () => void;
}

/**
 * Thẻ nhận diện ca làm việc trên mobile.
 * Giữ tên export cũ để không ảnh hưởng các màn hình đang sử dụng component.
 */
export const VinFastWelcomeBannerSvg: React.FC<VinFastWelcomeBannerSvgProps> = ({
  displayName,
  formattedName,
  roleBadgeLabel = '',
  timeGreeting = '',
  className = '',
  onAvatarClick,
}) => {
  const [avatarSeed, setAvatarSeed] = useState(() => Math.floor(Math.random() * 10000));
  const initials = useMemo(() => {
    const words = formattedName.trim().split(/\s+/).filter(Boolean);
    return (words.length > 1
      ? `${words[words.length - 2][0]}${words[words.length - 1][0]}`
      : formattedName.slice(0, 2)
    ).toUpperCase();
  }, [formattedName]);

  const avatarUrl = useMemo(() => {
    const key = `${displayName || formattedName || 'vinfast-user'}-${avatarSeed}`;
    let hash = 0;
    for (let index = 0; index < key.length; index += 1) {
      hash = key.charCodeAt(index) + ((hash << 5) - hash);
    }
    const style = ALL_DICEBEAR_STYLES[Math.abs(hash) % ALL_DICEBEAR_STYLES.length];
    return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(key)}&radius=28`;
  }, [avatarSeed, displayName, formattedName]);

  const changeAvatar = () => {
    setAvatarSeed((current) => current + 1);
    onAvatarClick?.();
  };

  return (
    <section
      className={`relative w-full overflow-hidden rounded-[22px] border border-white/70 bg-white/55 px-4 py-3 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.42),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl ${className}`}
      aria-label="Thông tin ca làm việc"
    >
      <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-sky-200/20 blur-2xl" />

      <div className="relative flex min-w-0 items-center gap-3.5">
        <button
          type="button"
          onClick={changeAvatar}
          title="Chạm để đổi avatar"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-visible rounded-full bg-white/90 p-[3px] shadow-[0_5px_14px_-8px_rgba(15,23,42,0.4)] ring-1 ring-black/[0.06] transition-transform active:scale-95"
        >
          <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
            {avatarUrl ? (
              <img src={avatarUrl} alt={formattedName} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </span>
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 shadow-[0_1px_4px_rgba(16,185,129,0.35)]" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[9px] font-semibold uppercase tracking-[0.13em] text-[#8E8E93]">
            {timeGreeting || 'Ca làm việc hôm nay'}
          </p>
          <p className="mt-1 truncate text-[15px] font-semibold tracking-[-0.02em] text-[#1C1C1E]">
            {formattedName}
          </p>
        </div>

        {roleBadgeLabel && (
          <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-[9px] font-medium tracking-wide text-[#636366] shadow-[0_2px_10px_-6px_rgba(15,23,42,0.35)] ring-1 ring-black/[0.045] backdrop-blur-xl">
            {roleBadgeLabel}
          </span>
        )}
      </div>
    </section>
  );
};
