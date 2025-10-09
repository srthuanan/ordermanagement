import React from 'react';
import SummaryCard from './SummaryCard';
import Leaderboard from './Leaderboard';

interface YearlyStats {
    total: number;
    topCar: string;
    // FIX: Renamed string property `topTvbh` to `topTvbhSummary` to avoid duplication.
    topTvbhSummary: string;
    monthlySales: { month: string; count: number }[];
    carDistribution: { key: string; count: number }[];
    topCars: { key: string; count: number }[];
    // FIX: Kept array property `topTvbh` for the leaderboard data.
    topTvbh: { key: string; count: number }[];
}

interface TotalViewDashboardProps {
    yearlyStats: YearlyStats;
}

const TotalViewDashboard: React.FC<TotalViewDashboardProps> = ({ yearlyStats }) => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <SummaryCard icon="fa-car" title="Tổng Số Xe (Năm)" value={yearlyStats.total} />
                <SummaryCard icon="fa-star" title="Dòng Xe Bán Chạy (Năm)" value={yearlyStats.topCar} />
                <SummaryCard icon="fa-user-tie" title="TVBH Xuất Sắc (Năm)" value={yearlyStats.topTvbhSummary} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Leaderboard 
                    title="Bảng Xếp Hạng Dòng Xe"
                    icon="fa-trophy"
                    items={yearlyStats.topCars}
                    color="blue"
                />
                <Leaderboard
                    title="Bảng Xếp Hạng TVBH"
                    icon="fa-crown"
                    items={yearlyStats.topTvbh}
                    color="green"
                />
            </div>
        </div>
    );
};

export default TotalViewDashboard;