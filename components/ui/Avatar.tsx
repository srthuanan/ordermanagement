import React from 'react';
import { generateColorFromName } from '../../utils/styleUtils';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
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

// Generate a random seed once per page load to ensure consistency across components
// but randomness on every visit/refresh.
const SESSION_SEED = Math.floor(Math.random() * 10000);

const Avatar: React.FC<AvatarProps> = ({ name, size = 'md', className = '' }) => {
  const [imageError, setImageError] = React.useState(false);

  const initials = getInitials(name);
  const bgColor = generateColorFromName(name);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-lg',
    lg: 'w-12 h-12 text-xl',
  };

  // Select avatar based on name hash + session seed
  const getAvatarUrl = () => {
    // Calculate deterministic hash from name
    let hash = 0;
    const safeName = name || 'default';
    for (let i = 0; i < safeName.length; i++) {
      hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Combine method: hash + seed
    // This ensures:
    // 1. Same user = Same hash
    // 2. Same session = Same seed
    // 3. Result = Consistent avatar everywhere for this user in this session
    const combinedIndex = (Math.abs(hash) + SESSION_SEED) % 40;

    const setIndex = Math.floor(combinedIndex / 10);
    const imgIndex = combinedIndex % 10;

    // Use import.meta.env.BASE_URL to respect the app's base path
    const baseUrl = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
    return `${baseUrl}avatars/avatar_set${setIndex}_${imgIndex}.webp?v=1`;
  };

  const avatarUrl = getAvatarUrl();

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden relative ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: !imageError ? 'transparent' : bgColor }}
      title={name}
    >
      {!imageError ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

export default Avatar;
