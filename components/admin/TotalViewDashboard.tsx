import React, { useMemo, useState } from 'react';
import moment from 'moment';
import 'moment/locale/vi';
import { Order, StockVehicle, AdminSubView } from '../../types';
import { normalizeName } from '../../services/authService';


moment.locale('vi');

type ActiveView = 'orders' | 'stock' | 'sold' | 'admin' | 'laithu';
type User = { name: string; role: string; username: string };

interface TotalViewDashboardProps {
    allOrders: Order[];
    stockData: StockVehicle[];
    soldData: Order[];
    invoiceData: Order[];
    teamData: Record<string, string[]>;
    allUsers: User[];
    onTabChange: (view: AdminSubView, filters?: any) => void;
    onNavigateTo?: (view: ActiveView) => void;
    onShowOrderDetails: (order: Order) => void;
}

// --- Enhanced Components ---

const SectionHeader: React.FC<{ title: string; icon?: string; color?: string; action?: React.ReactNode }> = ({ title, icon, color = 'text-gray-800', action }) => (
    <div className="flex justify-between items-center mb-0 p-3 bg-gray-100 border-b border-gray-200 rounded-t-xl">
        <div className="flex items-center gap-2">
            {icon && <i className={`fas ${icon} ${color} text-sm`}></i>}
            <h3 className={`font-bold text-sm tracking-widest uppercase ${color}`}>{title}</h3>
        </div>
        {action}
    </div>
);

const StatRow: React.FC<{ label: string; value: number; icon: string; color: string; onClick?: () => void }> = ({ label, value, icon, color, onClick }) => (
    <div
        onClick={onClick}
        className={`flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group cursor-pointer`}
    >
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${color} bg-opacity-10 flex items-center justify-center`}>
                <i className={`fas ${icon} ${color} text-sm`}></i>
            </div>
            <span className="text-sm text-gray-600 font-medium group-hover:text-gray-900 transition-colors">{label}</span>
        </div>
        <span className="text-xl font-bold text-gray-900">{value}</span>
    </div>
);

const PipelineRow: React.FC<{ title: string; count: number; icon: string; color: string; onClick?: () => void }> = ({ title, count, icon, color, onClick }) => (
    <div
        onClick={onClick}
        className="flex items-center justify-between py-2.5 px-3 rounded-lg cursor-pointer hover:bg-white hover:shadow-sm transition-all group"
    >
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${count > 0 ? `${color} text-white shadow-md` : 'bg-gray-200 text-gray-400'}`}>
                <i className={`fas ${icon} text-xs`}></i>
            </div>
            <span className={`text-sm font-bold ${count > 0 ? 'text-gray-800' : 'text-gray-400'}`}>{title}</span>
        </div>
        <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded-md ${count > 0 ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-300'}`}>{count}</span>
    </div>
);

// --- Main Component ---

const TotalViewDashboard: React.FC<TotalViewDashboardProps> = ({ allOrders, stockData, soldData, invoiceData, teamData, allUsers, onTabChange, onNavigateTo, onShowOrderDetails }) => {
    const [activeAlertTab, setActiveAlertTab] = useState<'pending' | 'stuck'>('pending');

    const stats = useMemo(() => {
        const pendingRequests = allOrders.filter(o => o['Kết quả']?.toLowerCase().includes('chưa'));
        const availableStock = stockData.filter(s => s['Trạng thái']?.toLowerCase() === 'chưa ghép').length;
        const totalSold = soldData.length;
        const totalTeams = Object.keys(teamData).length;
        const totalTVBH = allUsers.filter(u => u.role === 'Tư vấn bán hàng').length;

        const pipeline = [
            { title: 'Chờ Ghép', count: pendingRequests.length, icon: 'fa-hourglass-start', color: 'bg-amber-500', action: () => onTabChange('pending') },
            { title: 'Đã Ghép', count: allOrders.filter(o => o['Kết quả']?.toLowerCase() === 'đã ghép').length, icon: 'fa-link', color: 'bg-blue-500', action: () => onTabChange('paired') },
            { title: 'Chờ Duyệt', count: allOrders.filter(o => o['Kết quả']?.toLowerCase() === 'chờ phê duyệt').length, icon: 'fa-user-check', color: 'bg-indigo-500', action: () => onTabChange('invoices', { trangThai: ['Chờ phê duyệt'] }) },
            { title: 'Chờ Ký', count: allOrders.filter(o => o['Kết quả']?.toLowerCase() === 'chờ ký hóa đơn').length, icon: 'fa-file-signature', color: 'bg-purple-500', action: () => onTabChange('invoices', { trangThai: ['Chờ ký hóa đơn'] }) },
            { title: 'Đã Xuất', count: allOrders.filter(o => o['Kết quả']?.toLowerCase() === 'đã xuất hóa đơn').length, icon: 'fa-check-circle', color: 'bg-emerald-500', action: () => onTabChange('invoices', { trangThai: ['Đã xuất hóa đơn'] }) },
        ];

        const oldestPendingRequests = [...pendingRequests]
            .sort((a, b) => new Date(a['Thời gian nhập']).getTime() - new Date(b['Thời gian nhập']).getTime())
            .slice(0, 10);

        const pairedButNotSold: Order[] = allOrders
            .filter(o => ['đã ghép', 'chờ phê duyệt', 'đã phê duyệt', 'chờ ký hóa đơn', 'yêu cầu bổ sung'].includes(o['Kết quả']?.toLowerCase() ?? ''))
            .sort((a, b) => new Date(a['Thời gian ghép'] || a['Thời gian nhập']).getTime() - new Date(b['Thời gian ghép'] || b['Thời gian nhập']).getTime())
            .slice(0, 10);

        const pendingRequestGroups: Record<string, number> = {};
        pendingRequests.forEach(order => {
            const key = `${order['Dòng xe'] || 'N/A'}|${order['Phiên bản'] || 'N/A'}|${order['Ngoại thất'] || 'N/A'}|${order['Nội thất'] || 'N/A'}`;
            pendingRequestGroups[key] = (pendingRequestGroups[key] || 0) + 1;
        });

        const pendingRequestsByModel = Object.entries(pendingRequestGroups)
            .map(([key, count]) => {
                const [dongXe, phienBan, ngoaiThat, noiThat] = key.split('|');
                return {
                    model: `${dongXe} - ${phienBan}`,
                    colors: `${ngoaiThat} / ${noiThat}`,
                    count
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const maxPendingCount = Math.max(...pendingRequestsByModel.map(i => i.count), 1);

        const currentMonth = moment().month();
        const currentYear = moment().year();

        const invoicedDataCurrentMonth = invoiceData.filter(order => {
            if (!order['Ngày xuất hóa đơn']) return false;
            // Support multiple date formats including ISO and Vietnamese format
            const orderDate = moment(order['Ngày xuất hóa đơn'], ['YYYY-MM-DD', 'DD/MM/YYYY', 'D/M/YYYY', moment.ISO_8601]);
            return orderDate.isValid() && orderDate.month() === currentMonth && orderDate.year() === currentYear;
        });

        const soldByTVBH: Record<string, number> = {};
        invoicedDataCurrentMonth.forEach(order => {
            const tvbh = order['Tên tư vấn bán hàng'];
            if (tvbh) {
                const normalizedTvbh = normalizeName(tvbh);
                soldByTVBH[normalizedTvbh] = (soldByTVBH[normalizedTvbh] || 0) + 1;
            }
        });

        const allTVBHUsers = allUsers.filter(u => u.role === 'Tư vấn bán hàng');

        const monthlySalesData = allTVBHUsers.map(user => {
            const normalizedName = normalizeName(user.name);
            return {
                name: user.name,
                count: soldByTVBH[normalizedName] || 0,
            };
        }).sort((a, b) => {
            if (b.count !== a.count) {
                return b.count - a.count;
            }
            return a.name.localeCompare(b.name);
        });

        return {
            pendingRequests: pendingRequests.length,
            availableStock,
            totalSold,
            totalTeams,
            totalTVBH,
            pipeline,
            oldestPendingRequests,
            pairedButNotSold,
            pendingRequestsByModel,
            maxPendingCount,
            monthlySalesData,
        };
    }, [allOrders, stockData, soldData, teamData, allUsers, invoiceData]);

    return (
        <div className="h-auto md:h-[calc(100vh-140px)] min-h-[500px] animate-fade-in flex flex-col md:flex-row gap-4 p-4 rounded-xl shadow-xl overflow-y-auto md:overflow-hidden relative bg-white"

        >
            {/* Overlay for better text readability if needed, though cards are white */}
            {/* Overlay removed for pure white background */}

            {/* LEFT PANEL: Status Rail (30%) */}
            <div className="w-full md:w-[280px] h-auto md:h-full flex-shrink-0 !bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col relative overflow-hidden z-20" style={{ backgroundColor: '#ffffff' }}>

                {/* Section 1: Pipeline */}
                <div className="relative z-10">
                    <SectionHeader title="Quy Trình" icon="fa-stream" color="text-blue-600" />
                    <div className="space-y-1 p-4 pt-2">
                        {stats.pipeline.map((step, index) => (
                            <PipelineRow
                                key={index}
                                title={step.title}
                                count={step.count}
                                icon={step.icon}
                                color={step.color}
                                onClick={step.action}
                            />
                        ))}
                    </div>
                </div>

                {/* Section 2: Quick Stats */}
                <div className="flex-grow relative z-10">
                    <SectionHeader title="Chỉ Số" icon="fa-chart-pie" color="text-purple-600" />
                    <div className="space-y-2 p-4 pt-2">
                        <StatRow label="Kho Xe" value={stats.availableStock} icon="fa-warehouse" color="text-indigo-600" onClick={() => onNavigateTo?.('stock')} />
                        <StatRow label="Đã Bán (Năm)" value={stats.totalSold} icon="fa-hand-holding-dollar" color="text-emerald-600" />
                        <StatRow label="Nhân Sự" value={stats.totalTVBH} icon="fa-users" color="text-blue-600" />
                        <StatRow label="Phòng KD" value={stats.totalTeams} icon="fa-briefcase" color="text-amber-600" onClick={() => onTabChange('phongkd')} />
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-auto pt-4 border-t border-gray-100 relative z-10">
                    <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
                        <i className="fas fa-clock"></i>
                        Cập nhật: {moment().format('HH:mm')}
                    </p>
                </div>
            </div>

            {/* RIGHT PANEL: Workspace (70%) */}
            <div className="flex-grow flex flex-col min-w-0 gap-4 relative z-10">

                {/* TOP: Attention Area */}
                <div className="h-auto min-h-[250px] md:h-[45%] !bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col z-20 relative" style={{ backgroundColor: '#ffffff' }}>
                    <SectionHeader
                        title="Cần Xử Lý"
                        icon="fa-bell"
                        color="text-red-500"
                        action={
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setActiveAlertTab('pending')}
                                    className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-2 ${activeAlertTab === 'pending' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <i className="fas fa-clock"></i> Chờ Lâu
                                </button>
                                <button
                                    onClick={() => setActiveAlertTab('stuck')}
                                    className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-2 ${activeAlertTab === 'stuck' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <i className="fas fa-exclamation-triangle"></i> Kẹt Xe
                                </button>
                            </div>
                        }
                    />

                    <div className="flex-grow overflow-x-auto hidden-scrollbar pb-2 p-4">
                        <div className="flex gap-3 h-full">
                            {activeAlertTab === 'pending' ? (
                                <>
                                    {stats.oldestPendingRequests.map(order => (
                                        <div key={order['Số đơn hàng']} onClick={() => onShowOrderDetails(order)} className="min-w-[200px] w-[200px] bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group flex flex-col relative overflow-hidden">

                                            <div className="p-3 flex-grow flex flex-col relative z-10">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wider">{order['Số đơn hàng']}</span>
                                                    <i className="fas fa-clock text-red-400 text-sm"></i>
                                                </div>

                                                <h4 className="text-sm font-bold text-gray-900 line-clamp-2 mb-1" title={order['Tên khách hàng']}>{order['Tên khách hàng']}</h4>
                                                <p className="text-xs text-gray-500 mb-2">{order['Dòng xe']}</p>

                                                <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between">
                                                    <span className="text-[10px] text-gray-400">Chờ đợi</span>
                                                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                                        {moment(order['Thời gian nhập']).fromNow(true)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {stats.oldestPendingRequests.length === 0 && (
                                        <div className="w-full flex flex-col items-center justify-center text-gray-400">
                                            <i className="fas fa-check-circle text-3xl text-green-100 mb-2"></i>
                                            <span className="text-xs">Không có yêu cầu chờ lâu</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {stats.pairedButNotSold.map(order => (
                                        <div key={order.VIN || order['Số đơn hàng']} onClick={() => onShowOrderDetails(order)} className="min-w-[200px] w-[200px] bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group flex flex-col relative overflow-hidden">

                                            <div className="p-3 flex-grow flex flex-col relative z-10">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-mono">{order.VIN || 'N/A'}</span>
                                                    <i className="fas fa-car-crash text-orange-400 text-sm"></i>
                                                </div>

                                                <h4 className="text-sm font-bold text-gray-900 line-clamp-2 mb-1" title={order['Kết quả']}>{order['Kết quả']}</h4>
                                                <p className="text-xs text-gray-500 mb-2">{order['Dòng xe']}</p>

                                                <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between">
                                                    <span className="text-[10px] text-gray-400">Tồn đọng</span>
                                                    <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                                                        {moment(order['Thời gian ghép'] || order['Thời gian nhập']).fromNow(true)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {stats.pairedButNotSold.length === 0 && (
                                        <div className="w-full flex flex-col items-center justify-center text-gray-400">
                                            <i className="fas fa-check-circle text-3xl text-green-100 mb-2"></i>
                                            <span className="text-xs">Không có xe bị kẹt</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* BOTTOM: Insights Area (Split 50/50) */}
                <div className="flex-grow flex flex-col md:flex-row min-h-0 gap-4">

                    {/* Demand (Grid Layout) */}
                    <div className="w-full md:w-1/2 !bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col z-20 relative" style={{ backgroundColor: '#ffffff' }}>
                        <SectionHeader title="Nhu Cầu" icon="fa-chart-bar" color="text-teal-600" />
                        <div className="flex-grow overflow-y-auto hidden-scrollbar pr-1 p-4">
                            <div className="grid grid-cols-2 gap-3">
                                {stats.pendingRequestsByModel.map((item, index) => (
                                    <div key={index} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                                        <div className="relative z-10">
                                            <h4 className="font-bold text-gray-800 text-xs uppercase truncate pr-2" title={item.model}>{item.model}</h4>
                                            <p className="text-[10px] text-gray-400 mt-0.5 truncate" title={item.colors}>{item.colors}</p>
                                            <div className="mt-3 flex items-end justify-between">
                                                <div className="h-1 w-12 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-teal-500" style={{ width: `${(item.count / stats.maxPendingCount) * 100}%` }}></div>
                                                </div>
                                                <span className="text-xl font-bold text-teal-600 leading-none">{item.count}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {stats.pendingRequestsByModel.length === 0 && <div className="text-center text-gray-400 text-xs py-8">Chưa có yêu cầu</div>}
                        </div>
                    </div>

                    {/* Leaderboard (Podium + List) */}
                    <div className="w-full md:w-1/2 !bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col z-20 relative" style={{ backgroundColor: '#ffffff' }}>
                        <SectionHeader title="Top Sales" icon="fa-trophy" color="text-yellow-500" />
                        <div className="flex-grow overflow-y-auto hidden-scrollbar pr-2 p-4">

                            {/* Podium for Top 3 */}
                            {stats.monthlySalesData.length > 0 && (
                                <div className="flex items-end justify-center gap-2 mb-6 mt-2">
                                    {/* Rank 2 */}
                                    {stats.monthlySalesData[1] && (
                                        <div className="flex flex-col items-center w-1/3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center mb-2 shadow-sm relative z-10">
                                                <span className="font-bold text-gray-500 text-xs">2</span>
                                            </div>
                                            <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100 text-center w-full relative -mt-4 pt-5">
                                                <p className="text-[10px] font-bold truncate text-gray-700">{stats.monthlySalesData[1].name}</p>
                                                <p className="text-sm font-bold text-gray-900 mt-0.5">{stats.monthlySalesData[1].count}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Rank 1 */}
                                    {stats.monthlySalesData[0] && (
                                        <div className="flex flex-col items-center w-1/3 -mb-1">
                                            <div className="w-10 h-10 rounded-full bg-yellow-100 border-2 border-yellow-400 flex items-center justify-center mb-2 shadow-md relative z-10">
                                                <i className="fas fa-crown text-yellow-500 text-sm"></i>
                                            </div>
                                            <div className="bg-white p-2 rounded-lg shadow-md border border-yellow-200 text-center w-full relative -mt-4 pt-6">
                                                <p className="text-[10px] font-bold truncate text-yellow-900">{stats.monthlySalesData[0].name}</p>
                                                <p className="text-base font-bold text-yellow-600 mt-0.5">{stats.monthlySalesData[0].count}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Rank 3 */}
                                    {stats.monthlySalesData[2] && (
                                        <div className="flex flex-col items-center w-1/3">
                                            <div className="w-8 h-8 rounded-full bg-orange-50 border-2 border-orange-200 flex items-center justify-center mb-2 shadow-sm relative z-10">
                                                <span className="font-bold text-orange-400 text-xs">3</span>
                                            </div>
                                            <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100 text-center w-full relative -mt-4 pt-5">
                                                <p className="text-[10px] font-bold truncate text-gray-700">{stats.monthlySalesData[2].name}</p>
                                                <p className="text-sm font-bold text-gray-900 mt-0.5">{stats.monthlySalesData[2].count}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* List for Rank 4+ */}
                            <div className="space-y-1.5">
                                {stats.monthlySalesData.slice(3).map((tvbh, index) => (
                                    <div key={tvbh.name} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                        <span className="text-xs font-bold text-gray-400 w-4 text-center">{index + 4}</span>
                                        <div className="flex-grow min-w-0">
                                            <p className="text-xs font-medium text-gray-700 truncate">{tvbh.name}</p>
                                        </div>
                                        <span className="text-xs font-mono font-bold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">{tvbh.count}</span>
                                    </div>
                                ))}
                            </div>

                            {stats.monthlySalesData.length === 0 && <div className="text-center text-gray-400 text-xs py-8">Chưa có dữ liệu</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TotalViewDashboard;