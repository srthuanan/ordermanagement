import React from 'react';

interface StatItemProps {
    icon: string;
    label: string;
    value: string | number;
    colorClass: string;
}

const StatItem: React.FC<StatItemProps> = ({ icon, label, value, colorClass }) => (
    <div className="flex items-center gap-4 py-3 border-b border-dashed border-border-primary/50 last:border-b-0">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-opacity-10 ${colorClass.replace('text-', 'bg-')}`}>
            <i className={`fas ${icon} ${colorClass} text-lg`}></i>
        </div>
        <div className="min-w-0">
            <p className="text-xs text-text-secondary font-medium truncate">{label}</p>
            <p className="text-base font-bold text-text-primary truncate" title={String(value)}>{value}</p>
        </div>
    </div>
);


interface StatsOverviewProps {
    stats: {
        total: number;
        topCar: string;
        topTvbh: string;
    };
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
    return (
        <div className="bg-surface-card p-4 rounded-xl border border-border-primary shadow-md">
            <h3 className="font-bold text-text-primary text-base mb-2 flex items-center gap-3">
                <i className="fas fa-chart-line text-accent-primary"></i>
                Số Liệu Tổng Quan
            </h3>
            <div className="space-y-1">
                <StatItem icon="fa-cars" label="Tổng Số Xe" value={stats.total} colorClass="text-sky-500" />
                <StatItem icon="fa-star" label="Dòng Xe Bán Chạy" value={stats.topCar} colorClass="text-amber-500" />
                <StatItem icon="fa-user-tie" label="TVBH Xuất Sắc" value={stats.topTvbh} colorClass="text-emerald-500" />
            </div>
        </div>
    );
};

export default StatsOverview;