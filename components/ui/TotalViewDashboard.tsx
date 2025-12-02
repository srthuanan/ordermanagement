
import React, { useMemo } from 'react';
import moment from 'moment';
import 'moment/locale/vi';
import { Order, StockVehicle } from '../../types';
import Button from './Button';
import SummaryCard from './SummaryCard';
import { normalizeName } from '../../services/authService';

moment.locale('vi');

type ActiveView = 'orders' | 'stock' | 'sold' | 'admin' | 'laithu';
type AdminSubView = 'dashboard' | 'invoices' | 'pending' | 'paired' | 'vc' | 'phongkd';
type User = { name: string; role: string; username: string };

interface TotalViewDashboardProps {
    allOrders: Order[];
    stockData: StockVehicle[];
    soldData: Order[];
    teamData: Record<string, string[]>;
    allUsers: User[];
    onTabChange: (view: AdminSubView, filters?: any) => void;
    onNavigateTo?: (view: ActiveView) => void;
    onShowOrderDetails: (order: Order) => void;
}

const StatListCard: React.FC<{ title: string; icon: string; children: React.ReactNode; emptyText?: string; itemCount: number }> =
    ({ title, icon, children, emptyText = "Không có dữ liệu", itemCount }) => (
        <div className="bg-surface-card p-3 rounded-xl border border-border-primary shadow-md flex flex-col h-72">
            <h3 className="font-bold text-text-primary text-sm mb-2 flex items-center gap-2 flex-shrink-0">
                <i className={`fas ${icon} text - accent - primary`}></i>
                {title}
            </h3>
            <div className="flex-grow min-h-0 overflow-y-auto pr-2">
                {itemCount > 0 ? (
                    <div className="space-y-1">
                        {children}
                    </div>
                ) : (
                    <div className="text-center text-text-secondary py-8 flex flex-col items-center justify-center h-full">
                        <i className="fas fa-box-open fa-2x mb-2"></i>
                        <p>{emptyText}</p>
                    </div>
                )}
            </div>
        </div>
    );


const TotalViewDashboard: React.FC<TotalViewDashboardProps> = ({ allOrders, stockData, soldData, teamData, allUsers, onTabChange, onNavigateTo, onShowOrderDetails }) => {

    const stats = useMemo(() => {
        const pendingRequests = allOrders.filter(o => o['Kết quả']?.toLowerCase().includes('chưa'));
        const availableStock = stockData.filter(s => s['Trạng thái']?.toLowerCase() === 'chưa ghép').length;
        const totalSold = soldData.length;
        const totalTeams = Object.keys(teamData).length;
        const totalTVBH = allUsers.filter(u => u.role === 'Tư vấn bán hàng').length;

        const pipeline = {
            choGhep: pendingRequests.length,
            daGhep: allOrders.filter(o => o['Kết quả']?.toLowerCase() === 'đã ghép').length,
            choPheDuyet: allOrders.filter(o => o['Kết quả']?.toLowerCase() === 'chờ phê duyệt').length,
            choKyHD: allOrders.filter(o => o['Kết quả']?.toLowerCase() === 'chờ ký hóa đơn').length,
            daXuatHD: allOrders.filter(o => o['Kết quả']?.toLowerCase() === 'đã xuất hóa đơn').length,
        };

        const oldestPendingRequests = [...pendingRequests]
            .sort((a, b) => new Date(a['Thời gian nhập']).getTime() - new Date(b['Thời gian nhập']).getTime())
            .slice(0, 10);

        const pairedButNotSold: Order[] = allOrders
            .filter(o => ['đã ghép', 'chờ phê duyệt', 'đã phê duyệt', 'chờ ký hóa đơn', 'yêu cầu bổ sung'].includes(o['Kết quả']?.toLowerCase() ?? ''))
            .sort((a, b) => new Date(a['Thời gian ghép'] || a['Thời gian nhập']).getTime() - new Date(b['Thời gian ghép'] || b['Thời gian nhập']).getTime())
            .slice(0, 10);

        const pendingRequestGroups: Record<string, number> = {};
        pendingRequests.forEach(order => {
            const key = `${order['Dòng xe'] || 'N/A'}| ${order['Phiên bản'] || 'N/A'}| ${order['Ngoại thất'] || 'N/A'}| ${order['Nội thất'] || 'N/A'} `;
            pendingRequestGroups[key] = (pendingRequestGroups[key] || 0) + 1;
        });

        const pendingRequestsByModel = Object.entries(pendingRequestGroups)
            .map(([key, count]) => {
                const [dongXe, phienBan, ngoaiThat, noiThat] = key.split('|');
                return {
                    model: `${dongXe} - ${phienBan} `,
                    colors: `${ngoaiThat} / ${noiThat}`,
                    count
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Filter sold data for the current month
        const currentMonth = moment().month();
        const currentYear = moment().year();

        const soldDataCurrentMonth = soldData.filter(order => {
            if (!order['Thời gian nhập']) return false;
            const orderDate = moment(order['Thời gian nhập']);
            return orderDate.isValid() && orderDate.month() === currentMonth && orderDate.year() === currentYear;
        });

        const soldByTVBH: Record<string, number> = {};
        soldDataCurrentMonth.forEach(order => {
            const tvbh = order['Tên tư vấn bán hàng'];
            if (tvbh) {
                const normalizedTvbh = normalizeName(tvbh);
                soldByTVBH[normalizedTvbh] = (soldByTVBH[normalizedTvbh] || 0) + 1;
            }
        });

        const topSoldTVBH = Object.entries(soldByTVBH)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

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
            topSoldTVBH,
        };
    }, [allOrders, stockData, soldData, teamData, allUsers]);

    const PipelineStep: React.FC<{ title: string; count: number; isLast?: boolean; onClick?: () => void }> = ({ title, count, isLast, onClick }) => (
        <div className="flex items-center">
            <Button
                onClick={onClick}
                disabled={!onClick}
                variant="ghost"
                size="sm"
                className={`flex-shrink-0 text-center px-2 py-1 rounded-lg hover:bg-surface-accent transition-colors disabled:cursor-default group ${!onClick ? 'opacity-100' : ''}`}
            >
                <div className="flex items-baseline gap-1.5 text-xs text-text-secondary group-hover:text-text-primary transition-colors whitespace-nowrap">
                    <span>{title}</span>
                    <span className="font-bold text-accent-primary text-base tabular-nums">{count}</span>
                </div>
            </Button>
            {!isLast && <i className="fas fa-chevron-right text-xs text-border-secondary mx-1 sm:mx-2"></i>}
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <div onClick={() => onTabChange('pending')} className="cursor-pointer">
                    <SummaryCard icon="fa-hourglass-half" title="Yêu cầu chờ ghép" value={stats.pendingRequests} colorClass="text-amber-500" iconBgClass="bg-amber-500/10" size="compact" />
                </div>
                <div onClick={() => onNavigateTo?.('stock')} className="cursor-pointer">
                    <SummaryCard icon="fa-warehouse" title="Xe có sẵn trong kho" value={stats.availableStock} colorClass="text-sky-500" iconBgClass="bg-sky-500/10" size="compact" />
                </div>
                <SummaryCard icon="fa-receipt" title="Tổng xe đã bán (năm)" value={stats.totalSold} colorClass="text-emerald-500" iconBgClass="bg-emerald-500/10" size="compact" />
                <div onClick={() => onTabChange('phongkd')} className="cursor-pointer">
                    <SummaryCard icon="fa-users" title="Số Phòng Kinh Doanh" value={stats.totalTeams} colorClass="text-violet-500" iconBgClass="bg-violet-500/10" size="compact" />
                </div>
                <SummaryCard icon="fa-user-tie" title="Tổng số TVBH" value={stats.totalTVBH} colorClass="text-pink-500" iconBgClass="bg-pink-500/10" size="compact" />
            </div>

            {/* Order Pipeline */}
            <div className="bg-surface-card p-4 rounded-xl border border-border-primary shadow-md">
                <h3 className="font-bold text-text-primary text-base mb-3 flex items-center gap-3">
                    <i className="fas fa-stream text-accent-primary"></i>
                    Luồng Xử Lý Đơn Hàng
                </h3>
                <div className="overflow-x-auto pb-2 -mb-2">
                    <div className="flex items-center justify-start lg:justify-center">
                        <PipelineStep title="Chờ Ghép" count={stats.pipeline.choGhep} onClick={() => onTabChange('pending')} />
                        <PipelineStep title="Đã Ghép" count={stats.pipeline.daGhep} onClick={() => onTabChange('paired')} />
                        <PipelineStep title="Chờ Phê Duyệt" count={stats.pipeline.choPheDuyet} onClick={() => onTabChange('invoices', { trangThai: ['Chờ phê duyệt'] })} />
                        <PipelineStep title="Chờ Ký HĐ" count={stats.pipeline.choKyHD} onClick={() => onTabChange('invoices', { trangThai: ['Chờ ký hóa đơn'] })} />
                        <PipelineStep title="Đã Xuất HĐ" count={stats.pipeline.daXuatHD} isLast onClick={() => onTabChange('invoices', { trangThai: ['Đã xuất hóa đơn'] })} />
                    </div>
                </div>
            </div>

            {/* Detailed Stat Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StatListCard title="Yêu Cầu Chờ Lâu Nhất" icon="fa-hourglass-start" itemCount={stats.oldestPendingRequests.length}>
                    {stats.oldestPendingRequests.map(order => (
                        <Button
                            key={order.VIN || order['Số đơn hàng']}
                            onClick={() => onShowOrderDetails(order)}
                            variant="ghost"
                            className="w-full text-left p-1 rounded-md hover:bg-surface-hover transition-colors justify-start h-auto font-normal"
                        >
                            <div className="flex justify-between items-center w-full">
                                <span className="font-medium text-accent-primary">{order.VIN}</span>
                                <span className="text-xs text-text-secondary">{moment(order['Ngày tạo']).format('DD/MM')}</span>
                            </div>
                            <div className="text-xs text-text-primary truncate">{order['Dòng xe']}</div>
                            <div className="text-xs text-text-secondary truncate">{order['Kho xe']}</div>
                        </Button>
                    ))}
                </StatListCard>
                <StatListCard title="Xe 'Kẹt' Lâu Nhất (Chờ XHĐ)" icon="fa-hourglass-end" itemCount={stats.pairedButNotSold.length} emptyText="Không có xe nào đang chờ XHĐ.">
                    {stats.pairedButNotSold.map(order => {
                        const waitingSince = order['Thời gian ghép'] || order['Thời gian nhập'];
                        return (
                            <Button
                                key={order.VIN || order['Số đơn hàng']}
                                onClick={() => onShowOrderDetails(order)}
                                variant="ghost"
                                className="w-full text-left p-1 rounded-md hover:bg-surface-hover transition-colors justify-start h-auto font-normal"
                            >
                                <div className="flex justify-between items-center text-xs w-full">
                                    <span className="font-semibold font-mono text-text-primary truncate pr-2" title={order.VIN}>{order.VIN}</span>
                                    <span className="text-[11px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">{moment(waitingSince).fromNow(true)}</span>
                                </div>
                                <p className="text-[11px] text-text-secondary truncate mt-0.5">{order['Dòng xe']} - {order['Tên khách hàng']}</p>
                                <p className="text-[11px] font-medium text-amber-600 truncate">Trạng thái: {order['Kết quả']}</p>
                            </Button>
                        );
                    })}
                </StatListCard>
                <StatListCard title="Thống Kê Xe Chờ Ghép" icon="fa-car-side" itemCount={stats.pendingRequestsByModel.length} emptyText="Không có yêu cầu nào đang chờ.">
                    {stats.pendingRequestsByModel.map((item, index) => (
                        <div key={index} className="w-full text-left p-1 rounded-md hover:bg-surface-hover transition-colors">
                            <div className="flex justify-between items-start text-xs">
                                <span className="font-semibold text-text-primary truncate pr-2 leading-tight" title={item.model}>{item.model}</span>
                                <span className="flex-shrink-0 font-bold text-white bg-amber-500 px-1.5 py-0.5 rounded-full text-[11px]">{item.count}</span>
                            </div>
                            <p className="text-[11px] text-text-secondary truncate mt-0.5" title={item.colors}>{item.colors}</p>
                        </div>
                    ))}
                </StatListCard>
                <StatListCard title="Top TVBH Theo Doanh Số (Tháng Này)" icon="fa-crown" itemCount={stats.topSoldTVBH.length} emptyText="Chưa có dữ liệu doanh số tháng này.">
                    {stats.topSoldTVBH.map((tvbh, index) => (
                        <div key={index} className="w-full text-left p-1 rounded-md hover:bg-surface-hover transition-colors">
                            <div className="flex justify-between items-start text-xs">
                                <span className="font-semibold text-text-primary truncate pr-2 leading-tight" title={tvbh.name}>{tvbh.name}</span>
                                <span className="flex-shrink-0 font-bold text-white bg-emerald-500 px-1.5 py-0.5 rounded-full text-[11px]">{tvbh.count}</span>
                            </div>
                        </div>
                    ))}
                </StatListCard>
            </div>
        </div>
    );
};

export default TotalViewDashboard;