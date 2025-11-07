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
}

const SortableHeaderCell: React.FC<{ columnKey: keyof Order; title: string; sortConfig: SortConfig | null; onSort: (key: keyof Order) => void; className?: string; }> = 
({ columnKey, title, sortConfig, onSort, className }) => {
    const isSorted = sortConfig?.key === columnKey;
    const directionIcon = sortConfig?.direction === 'asc' ? '▲' : '▼';

    return (
        <th scope="col" onClick={() => onSort(columnKey)} className={`py-2 px-2 text-left text-xs font-bold text-text-secondary cursor-pointer hover:bg-surface-hover transition-colors whitespace-nowrap uppercase tracking-wider ${className}`}>
          {title} {isSorted && <span className="text-xs ml-1">{directionIcon}</span>}
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
    // FIX: Added missing props for VinClub actions.
    onRequestVC?: (order: Order) => void; 
    onConfirmVC?: (order: Order) => void; 
    onRowClick?: (order: Order) => void; 
    selectedOrder?: Order | null;
    viewMode: 'full' | 'sold';
    processingOrder?: string | null;
}


const HistoryTableRow: React.FC<HistoryTableRowProps> = 
// FIX: Added missing props for VinClub actions to the function signature.
({ order, index, onViewDetails, onCancel, onRequestInvoice, onSupplement, onRequestVC, onConfirmVC, onRowClick, selectedOrder, viewMode, processingOrder }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const statusText = order["Trạng thái VC"] || order["Kết quả"] || "Chưa ghép";
    const isSelected = selectedOrder && selectedOrder["Số đơn hàng"] === order["Số đơn hàng"];
    const isProcessing = processingOrder === order["Số đơn hàng"];

    return (
        <tr 
            className={`hover:bg-surface-hover transition-colors duration-200 animate-fade-in-up ${onRowClick ? 'cursor-pointer' : ''} ${isSelected ? 'selected-row-highlight' : ''} ${isMenuOpen ? 'relative z-20' : ''}`} 
            style={{animationDelay: `${index * 20}ms`}} 
            onClick={() => onRowClick ? onRowClick(order) : onViewDetails?.(order)}
        >
            <td className="whitespace-nowrap py-2 pl-2 pr-2 text-sm text-center text-text-secondary font-medium sm:pl-3" data-label="#">{index + 1}</td>
            <td className="whitespace-nowrap px-2 py-2 text-sm" data-label="Khách hàng / SĐH">
                <div className="font-semibold text-text-primary">{order["Tên khách hàng"] || "N/A"}</div>
                <div className="text-text-secondary font-mono text-xs">{order["Số đơn hàng"]}</div>
            </td>
            <td className="whitespace-nowrap px-2 py-2 text-sm" data-label="Thông Tin Xe">
                <div className="text-text-primary">{order["Dòng xe"]} / {order["Phiên bản"]}</div>
                <div className="text-text-secondary text-xs" style={getExteriorColorStyle(order['Ngoại thất'])}>{order["Ngoại thất"]} / {order["Nội thất"]}</div>
            </td>
            {viewMode === 'full' && (
                 <td className="whitespace-nowrap px-2 py-2 text-sm" data-label="Ngày Yêu Cầu">
                    <div className="text-text-primary" title={moment(order["Thời gian nhập"]).format('DD/MM/YYYY HH:mm:ss')}>
                        {moment(order["Thời gian nhập"]).format('DD/MM/YY HH:mm')}
                    </div>
                    <div className="text-text-secondary text-xs">{moment(order["Thời gian nhập"]).fromNow()}</div>
                </td>
            )}
            <td className="whitespace-nowrap px-2 py-2 text-sm text-text-primary truncate" data-label="Tư vấn" title={order["Tên tư vấn bán hàng"]}>{order["Tên tư vấn bán hàng"] || "N/A"}</td>
            {viewMode === 'full' && (
                 <>
                    <td className="whitespace-nowrap px-2 py-2 text-sm text-text-primary" data-label="Trạng thái"><StatusBadge status={statusText} /></td>
                    <td className="relative whitespace-nowrap py-2 pl-2 pr-2 text-center text-sm font-medium sm:pr-3" data-label="Hành động" onClick={(e) => e.stopPropagation()}>
                        {isProcessing ? (
                            <div className="flex items-center justify-center h-9">
                                <i className="fas fa-spinner fa-spin text-accent-primary text-xl"></i>
                            </div>
                        ) : (
                            <ActionMenu 
                                order={order} 
                                onViewDetails={onViewDetails!} 
                                onCancel={onCancel!} 
                                onRequestInvoice={onRequestInvoice!} 
                                onSupplement={onSupplement!} 
                                // FIX: Pass VinClub action handlers to ActionMenu.
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
const HistoryTable: React.FC<HistoryTableProps> = ({ orders, onViewDetails, onCancel, onRequestInvoice, onSupplement, onRequestVC, onConfirmVC, sortConfig, onSort, startIndex, onRowClick, selectedOrder, viewMode = 'full', processingOrder }) => {
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
        <div className="min-w-full py-1 align-middle">
            <table className="min-w-full divide-y divide-border-primary responsive-table">
                <thead className="bg-surface-hover sticky top-0 z-10">
                    <tr>
                        <th scope="col" className="py-2 pl-2 pr-2 text-center text-xs font-bold text-text-secondary sm:pl-3 w-12 uppercase tracking-wider">#</th>
                        <SortableHeaderCell columnKey="Tên khách hàng" title="Khách hàng / SĐH" sortConfig={sortConfig} onSort={onSort} />
                        <SortableHeaderCell columnKey="Dòng xe" title="Thông Tin Xe" sortConfig={sortConfig} onSort={onSort} />
                        {viewMode === 'full' && <SortableHeaderCell columnKey="Thời gian nhập" title="Ngày Yêu Cầu" sortConfig={sortConfig} onSort={onSort} />}
                        <SortableHeaderCell columnKey="Tên tư vấn bán hàng" title="Tư vấn" sortConfig={sortConfig} onSort={onSort} />
                        {viewMode === 'full' && <SortableHeaderCell columnKey="Kết quả" title="Trạng thái" sortConfig={sortConfig} onSort={onSort} />}
                        {viewMode === 'full' && <th scope="col" className="relative py-2 pl-2 pr-2 sm:pr-3 text-center text-xs font-bold text-text-secondary uppercase tracking-wider">Hành động</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border-primary bg-surface-card">
                    {orders.map((order, index) => (
                        <HistoryTableRow 
                            key={order["Số đơn hàng"] || index} 
                            order={order} 
                            index={startIndex + index} 
                            onViewDetails={onViewDetails} 
                            onCancel={onCancel} 
                            onRequestInvoice={onRequestInvoice} 
                            onSupplement={onSupplement}
                            // FIX: Pass VinClub action handlers to HistoryTableRow.
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
  );
};

export default HistoryTable;