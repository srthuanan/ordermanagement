import React, { useState } from 'react';
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
    // FIX: Added missing props for VinClub actions.
    onRequestVC?: (order: Order) => void;
    onConfirmVC?: (order: Order) => void;
    sortConfig: SortConfig | null;
    onSort: (key: keyof Order) => void;
    startIndex: number;
    onRowClick?: (order: Order) => void;
    selectedOrder?: Order | null;
    viewMode?: 'full' | 'sold';
    processingOrder?: string | null;
    showOrderInAdmin?: (order: Order, targetTab: any) => void;
}

const SortableHeaderCell: React.FC<{ columnKey: keyof Order; title: string; sortConfig: SortConfig | null; onSort: (key: keyof Order) => void; className?: string; }> =
    ({ columnKey, title, sortConfig, onSort, className }) => {
        const isSorted = sortConfig?.key === columnKey;
        const directionIcon = sortConfig?.direction === 'asc' ? '▲' : '▼';

        return (
            <th scope="col" onClick={() => onSort(columnKey)} className={`py-3 px-3 text-left text-[11px] font-bold text-gray-500 cursor-pointer hover:bg-black/5 transition-colors whitespace-nowrap uppercase tracking-widest ${className}`}>
                {title} {isSorted && <span className="text-[11px] ml-1">{directionIcon}</span>}
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
    // FIX: Added missing props for VinClub actions.
    onRequestVC?: (order: Order) => void;
    onConfirmVC?: (order: Order) => void;
    onRowClick?: (order: Order) => void;
    selectedOrder?: Order | null;
    viewMode: 'full' | 'sold';
    processingOrder?: string | null;
    showOrderInAdmin?: (order: Order, targetTab: any) => void;
}


const HistoryTableRow: React.FC<HistoryTableRowProps> =
    // FIX: Added missing props for VinClub actions to the function signature.
    ({ order, index, onViewDetails, onCancel, onRequestInvoice, onSupplement, onEdit, onRequestVC, onConfirmVC, onRowClick, selectedOrder, viewMode, processingOrder, showOrderInAdmin }) => {
        const [isMenuOpen, setIsMenuOpen] = useState(false);
        const statusText = order["Trạng thái VC"] || order["Kết quả"] || "Chưa ghép";
        const isSelected = selectedOrder && selectedOrder["Số đơn hàng"] === order["Số đơn hàng"];
        const isProcessing = processingOrder === order["Số đơn hàng"];

        return (
            <tr
                className={`hover:bg-slate-50 transition-colors duration-200 animate-fade-in-up ${onRowClick ? 'cursor-pointer' : ''} ${isSelected ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] ring-1 ring-blue-100 relative z-10' : ''} ${isMenuOpen ? 'relative z-20' : ''}`}
                style={{ animationDelay: `${index * 15}ms` }}
                onClick={() => onRowClick ? onRowClick(order) : onViewDetails?.(order)}
            >
                <td className="whitespace-nowrap py-3 px-2 text-xs text-center text-gray-400 font-medium border-r border-gray-100/80" data-label="#">{index + 1}</td>
                <td className="whitespace-nowrap px-3 py-3 text-sm border-r border-gray-100/80" data-label="Khách hàng / SĐH">
                    <div className="font-bold text-gray-800 text-sm tracking-tight">{order["Tên khách hàng"] || "N/A"}</div>
                    <div className="text-gray-400 font-mono text-[11px]">{order["Số đơn hàng"]}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-sm border-r border-gray-100/80" data-label="Thông Tin Xe">
                    <div className="text-gray-700 text-[13px] font-medium">{order["Dòng xe"]} / {order["Phiên bản"]}</div>
                    <div className="text-gray-400 text-[11px]" style={getExteriorColorStyle(order['Ngoại thất'])}>{order["Ngoại thất"]} / {order["Nội thất"]}</div>
                </td>
                {viewMode === 'full' && (
                    <td className="whitespace-nowrap px-3 py-3 text-sm border-r border-gray-100/80" data-label="Ngày Yêu Cầu">
                        <div className="text-gray-700 text-[13px] font-medium" title={moment(order["Thời gian nhập"]).format('DD/MM/YYYY HH:mm:ss')}>
                            {moment(order["Thời gian nhập"]).format('DD/MM/YY HH:mm')}
                        </div>
                        <div className="text-gray-400 text-[11px]">{moment(order["Thời gian nhập"]).fromNow()}</div>
                    </td>
                )}
                <td className="whitespace-nowrap px-3 py-3 text-[13px] text-gray-600 font-medium truncate border-r border-gray-100/80" data-label="Tư vấn" title={order["Tên tư vấn bán hàng"]}>{order["Tên tư vấn bán hàng"] || "N/A"}</td>
                <td className="whitespace-nowrap px-2 py-3 border-r border-gray-100/80" data-label="Truy nguyên">
                    {(() => {
                        if (!showOrderInAdmin) return <span className="text-gray-300 text-xs px-2">—</span>;
                        const ketQua = (order["Kết quả"] || '').toLowerCase();
                        const INVOICE_STATUSES = ['chờ phê duyệt', 'đã phê duyệt', 'yêu cầu bổ sung', 'đã bổ sung', 'chờ ký hóa đơn', 'đã xuất hóa đơn'];
                        const hasInvoiceData = !!order.LinkHoaDonDaXuat || INVOICE_STATUSES.includes(ketQua);
                        const vcStatus = (order["Trạng thái VC"] || '').toLowerCase();
                        const hasVC = hasInvoiceData && (
                            vcStatus === 'chờ duyệt ycvc' || vcStatus.includes('đã duyệt') ||
                            vcStatus.includes('hoàn thành') || vcStatus.includes('đã phê duyệt') ||
                            vcStatus.includes('từ chối') || vcStatus.includes('hủy') ||
                            vcStatus.includes('đã cấp') || vcStatus.includes('đã có vc')
                        );
                        // Chỉ ghép xe, chưa xuất hóa đơn
                        if (!hasInvoiceData && !!order.VIN) return (
                            <div onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => showOrderInAdmin(order, 'matching')} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-accent-primary hover:text-white text-slate-400 transition-all border border-slate-200/50" title="Đến Ghép Xe"><i className="fas fa-car text-[10px]"></i></button>
                            </div>
                        );
                        // Đã xuất hóa đơn (⭐ có thể có thêm VC)
                        if (hasInvoiceData) return (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => showOrderInAdmin(order, 'invoices')} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-accent-primary hover:text-white text-slate-400 transition-all border border-slate-200/50" title="Đến Hóa Đơn"><i className="fas fa-file-invoice-dollar text-[10px]"></i></button>
                                {hasVC && <button onClick={() => showOrderInAdmin(order, 'vc')} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-accent-primary hover:text-white text-slate-400 transition-all border border-slate-200/50" title="Đến Xử Lý VC"><i className="fas fa-id-card text-[10px]"></i></button>}
                            </div>
                        );
                        return <span className="text-gray-300 text-xs px-2">—</span>;
                    })()}
                </td>
                {viewMode === 'full' && (
                    <>
                        <td className="whitespace-nowrap px-3 py-3 text-sm text-text-primary border-r border-gray-100/80" data-label="Trạng thái"><StatusBadge status={statusText} size="sm" /></td>
                        <td className="relative whitespace-nowrap py-2 px-2 text-center text-sm font-medium" data-label="Hành động" onClick={(e) => e.stopPropagation()}>
                            {isProcessing ? (
                                <div className="flex items-center justify-center h-8">
                                    <i className="fas fa-spinner fa-spin text-blue-500 text-lg"></i>
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
                                    onToggle={setIsMenuOpen}
                                />
                            )}
                        </td>
                    </>
                )}
            </tr>
        );
    };

// FIX: Added missing props for VinClub actions to the function signature.
const HistoryTable: React.FC<HistoryTableProps> = ({ orders, onViewDetails, onCancel, onRequestInvoice, onSupplement, onEdit, onRequestVC, onConfirmVC, sortConfig, onSort, startIndex, onRowClick, selectedOrder, viewMode = 'full', processingOrder, showOrderInAdmin }) => {
    if (orders.length === 0) {
        return (
            <div className="text-center py-8 text-text-secondary">
                <i className="fas fa-folder-open fa-3x mb-4 text-text-placeholder"></i>
                <p className="font-semibold text-text-primary">Không tìm thấy yêu cầu nào.</p>
                <p className="text-sm">Hãy thử thay đổi bộ lọc hoặc tạo yêu cầu mới.</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Mobile View: Cards */}
            <div className="md:hidden space-y-3">
                {orders.map((order, index) => (
                    <div
                        key={order["Số đơn hàng"] || index}
                        className={`relative overflow-hidden rounded-xl bg-slate-50 p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 ease-out active:scale-[0.98] cursor-pointer flex flex-col group ${selectedOrder && selectedOrder["Số đơn hàng"] === order["Số đơn hàng"] ? 'ring-2 ring-accent-primary' : ''}`}
                        onClick={() => onRowClick ? onRowClick(order) : onViewDetails?.(order)}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                                <p className="text-slate-800 text-sm font-bold uppercase leading-tight truncate" title={order["Tên khách hàng"]}>
                                    {order["Tên khách hàng"] || "N/A"}
                                </p>
                                <p className="text-gray-500 text-[10px] font-mono truncate mt-0.5" title={order["Số đơn hàng"]}>
                                    {order["Số đơn hàng"]}
                                </p>
                            </div>
                            <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                {processingOrder === order["Số đơn hàng"] ? (
                                    <div className="flex items-center justify-center w-8 h-8">
                                        <i className="fas fa-spinner fa-spin text-accent-primary text-lg"></i>
                                    </div>
                                ) : (
                                    viewMode === 'full' && (
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
                                    )
                                )}
                            </div>
                        </div>

                        <div className="my-2 border-t border-dashed border-gray-300"></div>

                        <div className="space-y-0.5">
                            <p className="text-slate-800 text-sm font-medium truncate" title={`${order["Dòng xe"]} / ${order["Phiên bản"]}`}>
                                {order["Dòng xe"]} / {order["Phiên bản"]}
                            </p>
                            <p className="text-slate-500 text-xs truncate" title={`${order["Ngoại thất"]} / ${order["Nội thất"]}`}>
                                <span style={getExteriorColorStyle(order['Ngoại thất'])}>{order["Ngoại thất"]}</span>
                                <span className="text-gray-400"> / </span>
                                <span>{order["Nội thất"]}</span>
                            </p>
                        </div>

                        <div className="my-2 border-t border-dashed border-gray-300"></div>

                        <div className="flex items-center justify-between text-xs text-slate-500 mt-auto">
                            {showOrderInAdmin && (() => {
                                const ketQua = (order["Kết quả"] || '').toLowerCase();
                                const INVOICE_STATUSES = ['chờ phê duyệt', 'đã phê duyệt', 'yêu cầu bổ sung', 'đã bổ sung', 'chờ ký hóa đơn', 'đã xuất hóa đơn'];
                                const hasInvoiceData = !!order.LinkHoaDonDaXuat || INVOICE_STATUSES.includes(ketQua);
                                const vcStatus = (order["Trạng thái VC"] || '').toLowerCase();
                                const hasVC = hasInvoiceData && (
                                    vcStatus === 'chờ duyệt ycvc' || vcStatus.includes('đã duyệt') ||
                                    vcStatus.includes('hoàn thành') || vcStatus.includes('đã phê duyệt') ||
                                    vcStatus.includes('từ chối') || vcStatus.includes('hủy') ||
                                    vcStatus.includes('đã cấp') || vcStatus.includes('đã có vc')
                                );
                                // Chỉ ghép xe, chưa xuất hóa đơn
                                if (!hasInvoiceData && !!order.VIN) return (
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => showOrderInAdmin?.(order, 'matching')} className="h-7 px-2 bg-slate-100 hover:bg-accent-primary hover:text-white text-slate-400 transition-all border border-slate-200/50 rounded-lg flex items-center gap-1 font-bold text-[8px] uppercase"><i className="fas fa-car"></i><span>Ghép Xe</span></button>
                                    </div>
                                );
                                // Đã xuất hóa đơn (⭐ có thể có thêm VC)
                                if (hasInvoiceData) return (
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => showOrderInAdmin?.(order, 'invoices')} className="h-7 px-2 bg-slate-100 hover:bg-accent-primary hover:text-white text-slate-400 transition-all border border-slate-200/50 rounded-lg flex items-center gap-1 font-bold text-[8px] uppercase"><i className="fas fa-file-invoice-dollar"></i><span>Hóa Đơn</span></button>
                                        {hasVC && <button onClick={() => showOrderInAdmin?.(order, 'vc')} className="h-7 px-2 bg-slate-100 hover:bg-accent-primary hover:text-white text-slate-400 transition-all border border-slate-200/50 rounded-lg flex items-center gap-1 font-bold text-[8px] uppercase"><i className="fas fa-id-card"></i><span>VC</span></button>}
                                    </div>
                                );
                                return null;
                            })()}
                            <span className="font-medium uppercase text-slate-700 truncate ml-2">{order["Tên tư vấn bán hàng"] || "N/A"}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block min-w-full align-middle">
                <div className="rounded-xl border border-gray-200 shadow-sm overflow-visible">
                    <table className="min-w-full border-separate border-spacing-0">
                        <thead>
                            <tr>
                                <th scope="col" className="sticky top-0 z-20 bg-slate-100 py-3 px-3 text-center text-[11px] font-bold text-gray-500 w-12 uppercase tracking-widest border-b border-r border-gray-200 first:rounded-tl-xl">#</th>
                                <SortableHeaderCell columnKey="Tên khách hàng" title="Khách hàng / SĐH" sortConfig={sortConfig} onSort={onSort} className="sticky top-0 z-20 bg-slate-100 border-b border-r border-gray-200" />
                                <SortableHeaderCell columnKey="Dòng xe" title="Thông Tin Xe" sortConfig={sortConfig} onSort={onSort} className="sticky top-0 z-20 bg-slate-100 border-b border-r border-gray-200" />
                                <SortableHeaderCell columnKey="Tên tư vấn bán hàng" title="Tư vấn" sortConfig={sortConfig} onSort={onSort} className="sticky top-0 z-20 bg-slate-100 border-b border-r border-gray-200" />
                                <th scope="col" className="sticky top-0 z-20 bg-slate-100 py-3 px-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest border-b border-r border-gray-200">Truy nguyên</th>
                                {viewMode === 'full' && <SortableHeaderCell columnKey="Thời gian nhập" title="Ngày Yêu Cầu" sortConfig={sortConfig} onSort={onSort} className="sticky top-0 z-20 bg-slate-100 border-b border-r border-gray-200" />}
                                {viewMode === 'full' && <SortableHeaderCell columnKey="Kết quả" title="Trạng thái" sortConfig={sortConfig} onSort={onSort} className="sticky top-0 z-20 bg-slate-100 border-b border-r border-gray-200" />}
                                {viewMode === 'full' && <th scope="col" className="sticky top-0 z-20 bg-slate-100 relative py-3 px-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 last:rounded-tr-xl">Hành động</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white/40">
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
                                    // FIX: Pass VinClub action handlers to HistoryTableRow.
                                    onRequestVC={onRequestVC}
                                    onConfirmVC={onConfirmVC}
                                    onRowClick={onRowClick}
                                    selectedOrder={selectedOrder}
                                    viewMode={viewMode}
                                    processingOrder={processingOrder}
                                    showOrderInAdmin={showOrderInAdmin}
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