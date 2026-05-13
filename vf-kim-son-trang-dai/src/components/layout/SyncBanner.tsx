import React from 'react';
import { CheckCircle2, Clock3, AlertTriangle } from 'lucide-react';
import { SyncState } from '../../types';

interface SyncBannerProps {
  state: SyncState;
  message: string;
}

export const SyncBanner: React.FC<SyncBannerProps> = ({ state, message }) => {
  const Icon = state === 'live' ? CheckCircle2 : state === 'loading' ? Clock3 : AlertTriangle;

  return (
    <div className={`sync-banner sync-${state}`}>
      <Icon size={18} />
      <span>{message}</span>
    </div>
  );
};
