import React from 'react';

interface LeaderboardItem {
    key: string;
    count: number;
}

interface LeaderboardProps {
    title: string;
    icon: string;
    items: LeaderboardItem[];
    color: 'blue' | 'green';
}

const Leaderboard: React.FC<LeaderboardProps> = ({ title, icon, items, color }) => {
    const maxCount = items.length > 0 ? items[0].count : 0;
    const colorClasses = {
        blue: {
            icon: 'text-sky-500',
            progressStart: '#90CAF9', // light blue
            progressEnd: '#0D47A1',   // dark blue
        },
        green: {
            icon: 'text-emerald-500',
            progressStart: '#A5D6A7', // light green
            progressEnd: '#388E3C',   // dark green
        }
    };
    const selectedColor = colorClasses[color];

    const getRankDisplay = (index: number) => {
        switch (index) {
            case 0:
                return <i className="fas fa-crown text-amber-400 text-xl" title="Hạng 1"></i>;
            case 1:
                return <span className="font-bold text-slate-400 text-lg" title="Hạng 2">#2</span>;
            case 2:
                return <span className="font-bold text-amber-600 text-lg" title="Hạng 3">#3</span>;
            default:
                return <span className="font-semibold text-text-secondary text-sm" title={`Hạng ${index + 1}`}>{`#${index + 1}`}</span>;
        }
    };

    return (
        <div className="bg-surface-card p-4 rounded-xl border border-border-primary shadow-md flex flex-col h-96">
            <h3 className={`font-bold text-text-primary text-base mb-3 flex items-center gap-3`}>
                <i className={`fas ${icon} ${selectedColor.icon}`}></i>
                {title}
            </h3>
            <div className="flex-grow min-h-0 overflow-y-auto pr-2 space-y-1">
                {items.length > 0 ? items.map((item, index) => (
                    <div 
                        key={item.key} 
                        className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 p-2 rounded-lg transition-all duration-200 hover:bg-surface-hover animate-fade-in-up"
                        style={{animationDelay: `${index * 50}ms`}}
                    >
                        {/* Rank */}
                        <div className="flex items-center justify-center h-full w-full text-center">
                            {getRankDisplay(index)}
                        </div>

                        {/* Name and Progress Bar */}
                        <div className="min-w-0">
                            <p className="font-bold text-text-primary truncate text-sm" title={item.key}>
                                {item.key}
                            </p>
                            <div className="bg-surface-ground rounded-full h-2 mt-1.5 overflow-hidden shadow-inner-sm">
                                <div 
                                    className="h-full rounded-full transition-all duration-500 ease-out" 
                                    style={{ 
                                        width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%`,
                                        backgroundImage: `linear-gradient(to right, ${selectedColor.progressStart}, ${selectedColor.progressEnd})`
                                    }}
                                ></div>
                            </div>
                        </div>

                        {/* Count */}
                        <div className="text-base font-extrabold text-text-primary text-right tabular-nums pr-1">
                            {item.count}
                        </div>
                    </div>
                )) : (
                    <div className="text-center text-text-secondary py-8 flex flex-col items-center justify-center h-full">
                        <i className="fas fa-box-open fa-2x mb-2"></i>
                        <p>Không có dữ liệu</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;
