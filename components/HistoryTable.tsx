import React from 'react';
import moment from 'moment';
import { Order, SortConfig } from '../types';
import StatusBadge from './ui/StatusBadge';
import ActionMenu from './ui/ActionMenu';
import { getExteriorColorStyle } from '../utils/styleUtils';

interface HistoryTableProps {
    orders: Order[];
    onViewDetails?: (order: Order) => void;
    onCancel?: (order: Order) => void;
    onRequestInvoice?: (order: Order) => void;
    onSupplement?: (order: Order) => void;
    onEdit?: (order: Order) => void;
    onRequestVC?: (order: Order) => void;
    onConfirmVC?: (order: Order) => void;
    sortConfig: SortConfig | null;
    onSort: (key: keyof Order) => void;
    startIndex: number;
    onRowClick?: (order: Order) => void;
    selectedOrder?: Order | null;
    viewMode?: 'full' | 'sold';
    processingOrder?: string | null;
}

const SortableHeaderCell: React.FC<{ columnKey: keyof Order; title: string; sortConfig: SortConfig | null; onSort: (key: keyof Order) => void; className?: string; }> =
    ({ columnKey, title, sortConfig, onSort, className }) => {
        const isSorted = sortConfig?.key === columnKey;
        const directionIcon = sortConfig?.direction === 'asc' ? '▲' : '▼';

        return (
            <th scope="col" onClick={() => onSort(columnKey)} className={`py-3.5 px-4 text-left text-[10px] font-black text-slate-500 cursor-pointer hover:text-accent-primary transition-all duration-300 whitespace-nowrap uppercase tracking-[0.15em] border-b border-r border-slate-200/80 ${className}`}>
                <div className="flex items-center gap-1.5">
                    {title} {isSorted && <span className="text-[10px] text-accent-primary animate-in fade-in zoom-in duration-300">{directionIcon}</span>}
                </div>
            </th>
        );
    };

interface HistoryTableRowProps {
    order: Order;
    index: number;
    onViewDetails?: (order: Order) => void;
    onCancel?: (order: Order) => void;
    onRequestInvoice?: (order: Order) => void;
    onSupplement?: (order: Order) => void;
    onEdit?: (order: Order) => void;
    onRequestVC?: (order: Order) => void;
    onConfirmVC?: (order: Order) => void;
    onRowClick?: (order: Order) => void;
    selectedOrder?: Order | null;
    viewMode: 'full' | 'sold';
    processingOrder?: string | null;
}


const HistoryTableRow: React.FC<HistoryTableRowProps> =
    ({ order, index, onViewDetails, onCancel, onRequestInvoice, onSupplement, onEdit, onRequestVC, onConfirmVC, onRowClick, selectedOrder, viewMode, processingOrder }) => {
        const statusText = order["Kết quả"] || order["Trạng thái VC"] || (viewMode === 'sold' ? "Đã xuất hóa đơn" : "Chưa ghép");
        const isSelected = selectedOrder && selectedOrder["Số đơn hàng"] === order["Số đơn hàng"];
        const isProcessing = processingOrder === order["Số đơn hàng"];

        return (
            <tr
                className={`group transition-all duration-200 ${onRowClick ? 'cursor-pointer' : ''} ${isSelected ? 'bg-blue-50/70 font-semibold' : 'hover:bg-slate-50'} animate-fade-in-up relative`}
                style={{ animationDelay: `${index * 15}ms` }}
                onClick={() => onRowClick ? onRowClick(order) : onViewDetails?.(order)}
            >
                {/* Left Accent for selected row */}
                <td className="w-1 p-0 relative border-b border-r border-slate-200/80">
                    <div className={`absolute inset-y-1.5 left-0 w-1 rounded-r-full transition-all duration-300 ${isSelected ? 'bg-accent-primary scale-y-100' : 'bg-transparent scale-y-0 group-hover:bg-slate-200 group-hover:scale-y-50'}`}></div>
                </td>
                
                <td className="whitespace-nowrap py-3.5 px-3 text-[11px] text-center text-slate-400 font-bold tabular-nums border-b border-r border-slate-200/80" data-label="#">{index + 1}</td>
                
                <td className="whitespace-nowrap px-4 py-3.5 border-b border-r border-slate-200/80" data-label="Khách hàng / SĐH">
                    <div className="font-black text-slate-800 text-[14px] tracking-tight leading-tight group-hover:text-accent-primary transition-colors uppercase">{order["Tên khách hàng"] || "N/A"}</div>
                    <div className="text-slate-400 font-mono text-[10px] mt-0.5 font-bold">{order["Số đơn hàng"]}</div>
                </td>
                
                <td className="whitespace-nowrap px-4 py-3.5 border-b border-r border-slate-200/80" data-label="Thông Tin Xe">
                    <div className="text-slate-800 text-[13px] font-bold tracking-tight">{order["Dòng xe"]} / {order["Phiên bản"]}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider" style={getExteriorColorStyle(order['Ngoại thất'])}>{order["Ngoại thất"]}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-slate-500 text-[10px] uppercase font-bold">{order["Nội thất"]}</span>
                    </div>
                </td>

                <td className="whitespace-nowrap px-4 py-3.5 border-b border-r border-slate-200/80" data-label="Tư vấn">
                    <div className="text-slate-700 text-[13px] font-bold group-hover:text-slate-900 transition-colors uppercase tracking-wide">{order["Tên tư vấn bán hàng"] || "N/A"}</div>
                </td>

                {viewMode === 'full' && (
                    <>
                        <td className="whitespace-nowrap px-4 py-3.5 border-b border-r border-slate-200/80" data-label="Ngày Yêu Cầu">
                            <div className="text-slate-700 text-[12px] font-bold" title={moment(order["Thời gian nhập"]).format('DD/MM/YYYY HH:mm:ss')}>
                                {moment(order["Thời gian nhập"]).format('DD/MM/YY HH:mm')}
                            </div>
                            <div className="text-slate-400 text-[10px] font-medium">{moment(order["Thời gian nhập"]).fromNow()}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 border-b border-r border-slate-200/80" data-label="Trạng thái">
                            <StatusBadge status={statusText} size="sm" />
                        </td>
                        <td className="relative whitespace-nowrap py-3 px-3 text-center border-b border-r border-slate-200/80" data-label="Hành động" onClick={(e) => e.stopPropagation()}>
                            {isProcessing ? (
                                <div className="flex items-center justify-center h-8">
                                    <i className="fas fa-spinner fa-spin text-accent-primary text-lg"></i>
                                </div>
                            ) : (
                                <ActionMenu
                                    order={order}
                                    onViewDetails={onViewDetails!}
                                    onCancel={onCancel!}
                                    onRequestInvoice={onRequestInvoice!}
                                    onSupplement={onSupplement!}
                                    onEdit={onEdit}
                                    onRequestVC={onRequestVC!}
                                    onConfirmVC={onConfirmVC!}
                                />
                            )}
                        </td>
                    </>
                )}
            </tr>
        );
    };

const HistoryTable: React.FC<HistoryTableProps> = ({ orders, onViewDetails, onCancel, onRequestInvoice, onSupplement, onEdit, onRequestVC, onConfirmVC, sortConfig, onSort, startIndex, onRowClick, selectedOrder, viewMode = 'full', processingOrder }) => {
    if (orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 m-4 animate-fade-in text-center">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-4">
                    <i className="fas fa-inbox text-slate-200 text-2xl"></i>
                </div>
                <h3 className="text-slate-500 font-black text-sm uppercase tracking-[0.2em] mb-1">Trống trải</h3>
                <p className="text-slate-300 text-xs max-w-xs">Không tìm thấy yêu cầu nào thỏa mãn các điều kiện lọc hiện tại.</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Mobile View: Cards */}
            <div className="md:hidden space-y-3 px-4 py-2">
                {orders.map((order, index) => (
                    <div
                        key={order["Số đơn hàng"] || index}
                        className={`relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300 cursor-pointer ${selectedOrder && selectedOrder["Số đơn hàng"] === order["Số đơn hàng"] ? 'ring-2 ring-accent-primary bg-accent-primary/5' : ''}`}
                        onClick={() => onRowClick ? onRowClick(order) : onViewDetails?.(order)}
                    >
                        {/* Mobile Status if available */}
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex flex-col gap-1">
                                <p className="text-slate-800 text-sm font-black tracking-tight uppercase" title={order["Tên khách hàng"]}>
                                    {order["Tên khách hàng"] || "N/A"}
                                </p>
                                <p className="text-slate-400 text-[10px] font-mono font-bold">
                                    {order["Số đơn hàng"]}
                                </p>
                            </div>
                            <StatusBadge status={order["Kết quả"] || order["Trạng thái VC"] || "Chưa ghép"} size="sm" />
                        </div>
                        
                        <div className="h-px bg-slate-100 w-full mb-3"></div>

                        <div className="flex justify-between items-end">
                            <div className="space-y-0.5">
                                <p className="text-slate-700 text-xs font-bold truncate">
                                    {order["Dòng xe"]} / {order["Phiên bản"]}
                                </p>
                                <p className="text-slate-400 text-[10px] uppercase font-bold">
                                    {order["Ngoại thất"]}
                                </p>
                            </div>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider">{order["Tên tư vấn bán hàng"] || "N/A"}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block min-w-full align-middle p-4 pt-0 h-full">
                <div className="bg-white rounded-2xl border border-slate-300 shadow-sm">
                    <table className="min-w-full border-separate border-spacing-0">
                        <thead className="sticky top-0 z-30">
                            <tr>
                                <th scope="col" className="w-1 border-b border-r border-slate-300 bg-slate-100 rounded-tl-2xl sticky top-0 z-30"></th>
                                <th scope="col" className="py-3 px-3 text-center text-[10px] font-black text-slate-500 w-12 uppercase tracking-widest border-b border-r border-slate-300 bg-slate-100 italic sticky top-0 z-30">REF</th>
                                <SortableHeaderCell columnKey="Tên khách hàng" title="Thông tin khách hàng" sortConfig={sortConfig} onSort={onSort} className="bg-slate-100 sticky top-0 z-30 border-b border-r border-slate-300" />
                                <SortableHeaderCell columnKey="Dòng xe" title="Phương tiện" sortConfig={sortConfig} onSort={onSort} className="bg-slate-100 sticky top-0 z-30 border-b border-r border-slate-300" />
                                <SortableHeaderCell columnKey="Tên tư vấn bán hàng" title="Người phụ trách" sortConfig={sortConfig} onSort={onSort} className="bg-slate-100 sticky top-0 z-30 border-b border-r border-slate-300" />
                                {viewMode === 'full' && <SortableHeaderCell columnKey="Thời gian nhập" title="Ngày tạo" sortConfig={sortConfig} onSort={onSort} className="bg-slate-100 sticky top-0 z-30 border-b border-r border-slate-300" />}
                                {viewMode === 'full' && <SortableHeaderCell columnKey="Kết quả" title="Trạng thái" sortConfig={sortConfig} onSort={onSort} className="bg-slate-100 sticky top-0 z-30 border-b border-r border-slate-300" />}
                                {viewMode === 'full' && <th scope="col" className="py-3 px-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-slate-300 bg-slate-100 rounded-tr-2xl sticky top-0 z-30">Lựa chọn</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order, index) => (
                                <HistoryTableRow
                                    key={order["Số đơn hàng"] || index}
                                    order={order}
                                    index={startIndex + index}
                                    onViewDetails={onViewDetails}
                                    onCancel={onCancel}
                                    onRequestInvoice={onRequestInvoice}
                                    onSupplement={onSupplement}
                                    onEdit={onEdit}
                                    onRequestVC={onRequestVC}
                                    onConfirmVC={onConfirmVC}
                                    onRowClick={onRowClick}
                                    selectedOrder={selectedOrder}
                                    viewMode={viewMode}
                                    processingOrder={processingOrder}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HistoryTable;