import React from 'react';

interface SummaryCardProps {
  icon: string;
  title: string;
  value: string | number;
  iconBgClass?: string;
  valueClassName?: string;
  className?: string;
  colorClass?: string;
  size?: 'default' | 'compact';
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, title, value, iconBgClass = 'bg-accent-primary/10', valueClassName = '', className = '', colorClass = 'text-accent-primary', size = 'default' }) => {
    if (size === 'compact') {
        return (
            <div className={`bg-surface-card p-3 rounded-xl border border-border-primary flex items-center gap-3 transition-all duration-300 hover:shadow-glow-accent hover:-translate-y-1 ${className}`}>
                <div className={`flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center ${iconBgClass}`}>
                    <i className={`fas ${icon} ${colorClass} text-lg`}></i>
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-text-secondary font-medium truncate">{title}</p>
                    <p className={`font-bold text-text-primary truncate text-xl ${valueClassName}`}>{value}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-surface-card p-4 rounded-xl border border-border-primary flex items-center gap-4 transition-all duration-300 hover:shadow-glow-accent hover:-translate-y-1 ${className}`}>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconBgClass}`}>
                <i className={`fas ${icon} ${colorClass} text-xl`}></i>
            </div>
            <div className="min-w-0">
                <p className="text-sm text-text-secondary font-medium truncate">{title}</p>
                <p className={`font-bold text-text-primary truncate text-2xl ${valueClassName}`}>{value}</p>
            </div>
        </div>
    );
};

export default SummaryCard;