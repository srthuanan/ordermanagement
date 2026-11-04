import React, { useState, useEffect } from 'react';
import { generateColorFromName } from '../../utils/styleUtils';
import { fetchCountryInfo, CountryInfo } from '../../services/countryService';

export type DiceBearStyle =
  | 'adventurer'
  | 'lorelei'
  | 'avataaars'
  | 'bottts'
  | 'micah'
  | 'notionists'
  | 'fun-emoji'
  | 'thumbs'
  | 'pixel-art'
  | 'open-peeps'
  | 'croodles';

export const ALL_DICEBEAR_STYLES: DiceBearStyle[] = [
  'adventurer',
  'lorelei',
  'avataaars',
  'bottts',
  'micah',
  'notionists',
  'fun-emoji',
  'thumbs',
  'pixel-art',
  'open-peeps',
  'croodles'
];

interface AvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  styleType?: DiceBearStyle;
  countryCode?: string;
  showCountryBadge?: boolean;
  className?: string;
}

const getInitials = (name: string): string => {
  if (!name) return '?';
  const nameParts = name.trim().split(' ').filter(Boolean);
  if (nameParts.length === 0) return '?';
  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase();
  }
  const firstInitial = nameParts[0].charAt(0);
  const lastInitial = nameParts[nameParts.length - 1].charAt(0);
  return `${firstInitial}${lastInitial}`.toUpperCase();
};

// Generate a random seed per visit/session so each visit brings a fresh random avatar
const getVisitSeed = (): string => {
  try {
    let seed = sessionStorage.getItem('dicebear_visit_seed');
    if (!seed) {
      seed = `v_${Math.floor(Math.random() * 1000000)}_${Date.now() % 100000}`;
      sessionStorage.setItem('dicebear_visit_seed', seed);
    }
    return seed;
  } catch (e) {
    return `v_${Math.floor(Math.random() * 1000000)}`;
  }
};

const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 'md',
  styleType,
  countryCode = 'VN',
  showCountryBadge = true,
  className = ''
}) => {
  const safeName = (name || 'anonymous').trim();
  const initials = getInitials(name);
  const bgColor = generateColorFromName(name);

  const [country, setCountry] = useState<CountryInfo | null>(null);

  // Load country info from REST Countries v5 API
  useEffect(() => {
    if (showCountryBadge && countryCode) {
      fetchCountryInfo(countryCode).then(info => {
        if (info) setCountry(info);
      });
    }
  }, [countryCode, showCountryBadge]);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const badgeSizeClasses = {
    xs: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5 text-[8px]',
    sm: 'w-3.5 h-3.5 -bottom-0.5 -right-0.5 text-[10px]',
    md: 'w-4 h-4 -bottom-0.5 -right-0.5 text-[11px]',
    lg: 'w-5 h-5 -bottom-1 -right-1 text-xs',
    xl: 'w-6 h-6 -bottom-1 -right-1 text-sm',
  };

  // Generate dynamic URL for this visit
  const generateDynamicUrl = (): string => {
    const visitSeed = getVisitSeed();
    const combinedKey = `${safeName}_${visitSeed}`;

    // Hash to randomly pick style for this session
    let hash = 0;
    for (let i = 0; i < combinedKey.length; i++) {
      hash = combinedKey.charCodeAt(i) + ((hash << 5) - hash);
    }
    const absHash = Math.abs(hash);

    const selectedStyle = styleType || ALL_DICEBEAR_STYLES[absHash % ALL_DICEBEAR_STYLES.length];
    return `https://api.dicebear.com/9.x/${selectedStyle}/svg?seed=${encodeURIComponent(combinedKey)}&radius=50`;
  };

  const [currentSrc, setCurrentSrc] = useState<string>(generateDynamicUrl);
  const [hasFallbackToLastKnown, setHasFallbackToLastKnown] = useState<boolean>(false);
  const [imageFailed, setImageFailed] = useState<boolean>(false);

  useEffect(() => {
    setCurrentSrc(generateDynamicUrl());
    setHasFallbackToLastKnown(false);
    setImageFailed(false);
  }, [name, styleType]);

  const handleImageSuccess = () => {
    try {
      if (currentSrc) {
        localStorage.setItem(`last_avatar_${safeName}`, currentSrc);
      }
    } catch (e) {}
  };

  const handleImageError = () => {
    if (!hasFallbackToLastKnown) {
      try {
        const lastKnown = localStorage.getItem(`last_avatar_${safeName}`);
        if (lastKnown && lastKnown !== currentSrc) {
          setHasFallbackToLastKnown(true);
          setCurrentSrc(lastKnown);
          return;
        }
      } catch (e) {}
    }
    setImageFailed(true);
  };

  const countryTooltip = country
    ? `${name}\n📍 ${country.name} (${country.cca2})\n🏛️ Thủ đô: ${country.capital}\n⏰ Múi giờ: ${country.timezone}\n💰 Tiền tệ: ${country.currency}`
    : name;

  return (
    <div className={`relative inline-flex flex-shrink-0 group ${className}`} title={countryTooltip}>
      {/* Main Avatar Circle */}
      <div
        className={`rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden relative shadow-2xs select-none bg-slate-100 ${sizeClasses[size]}`}
        style={{ backgroundColor: imageFailed ? bgColor : undefined }}
      >
        {!imageFailed ? (
          <img
            src={currentSrc}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            onLoad={handleImageSuccess}
            onError={handleImageError}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {/* REST Countries National Flag Badge */}
      {showCountryBadge && country && size !== 'xs' && (
        <span
          className={`absolute rounded-full border-1.5 border-white shadow-xs overflow-hidden flex items-center justify-center bg-white pointer-events-none transition-transform duration-200 group-hover:scale-115 ${badgeSizeClasses[size]}`}
          title={`${country.name} (${country.cca2})`}
        >
          <img
            src={country.flagSvgUrl}
            alt={country.name}
            className="w-full h-full object-cover rounded-full"
            loading="lazy"
          />
        </span>
      )}
    </div>
  );
};

export default Avatar;
