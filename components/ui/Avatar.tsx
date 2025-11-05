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

const Avatar: React.FC<AvatarProps> = ({ name, size = 'md', className = '' }) => {
  const initials = getInitials(name);
  const bgColor = generateColorFromName(name);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-lg',
    lg: 'w-12 h-12 text-xl',
  };

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: bgColor }}
      title={name}
    >
      {initials}
    </div>
  );
};

export default Avatar;
