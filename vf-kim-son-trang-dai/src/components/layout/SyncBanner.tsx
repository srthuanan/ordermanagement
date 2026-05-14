import React from 'react';
import { CheckCircle2, Clock3, AlertTriangle } from 'lucide-react';
import { SyncState } from '../../types';

interface SyncBannerProps {
  state: SyncState;
  message: string;
}

export const SyncBanner: React.FC<SyncBannerProps> = ({ state, message }) => {
  const Icon = state === 'live' || state === 'success'
    ? CheckCircle2
    : state === 'loading' || state === 'idle'
      ? Clock3
      : AlertTriangle;

  return (
    <div className={`sync-banner sync-${state}`}>
      <Icon size={18} />
      <span>{message}</span>
    </div>
  );
};
