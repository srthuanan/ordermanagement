import React from 'react';

interface SummaryCardProps {
  icon: string;
  title: string;
  value: string | number;
  iconBgClass?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, title, value, iconBgClass = 'bg-accent-primary/10' }) => (
    <div className="bg-surface-card p-4 rounded-lg border border-border-primary flex items-center gap-4 transition-all hover:shadow-md hover:-translate-y-1">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconBgClass}`}>
            <i className={`fas ${icon} text-accent-primary text-xl`}></i>
        </div>
        <div>
            <p className="text-sm text-text-secondary font-medium">{title}</p>
            <p className="text-2xl font-bold text-text-primary truncate">{value}</p>
        </div>
    </div>
);

export default SummaryCard;
