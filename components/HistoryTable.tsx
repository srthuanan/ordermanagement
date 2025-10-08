import React, { useState } from 'react';
import moment from 'moment';
import { Order, SortConfig } from '../types';
import StatusBadge from './ui/StatusBadge';
import ActionMenu from './ui/ActionMenu';

interface HistoryTableProps {
  orders: Order[];
  onViewDetails: (order: Order) => void;
  onCancel: (order: Order) => void;
  onRequestInvoice: (order: Order) => void;
  onSupplement: (order: Order) => void;
  onRequestVC: (order: Order) => void;
  onConfirmVC: (order: Order) => void;
  sortConfig: SortConfig | null;
  // FIX: Changed the type of onSort to be a function that accepts a key of Order.
  onSort: (key: keyof Order) => void;
  startIndex: number;
}

const getExteriorColorStyle = (exteriorValue: string | undefined): React.CSSProperties => {
    // The application does not have a dark mode feature, so isDarkMode is hardcoded to false.
    const isDarkMode = false;
    const specificFontWeight = 500;
    const outlineStyle: React.CSSProperties = {
        textShadow: '0 0 4px rgba(0,0,0,0.8)',
    };

    if (!exteriorValue) return {};
    const lowerExteriorValue = exteriorValue.toLowerCase().trim();

    if (lowerExteriorValue === "brahminy white (ce18)") return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'white', ...outlineStyle, fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("sunset orb (ce1a)")) return { color: 'var(--exterior-orange-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("crimson red (ce1m)")) return { color: 'var(--exterior-red-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("vinfast blue (ce1n)")) return { color: 'var(--exterior-blue-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("neptune grey (ce14)")) return isDarkMode ? { color: '#aebcc5', fontWeight: specificFontWeight } : { color: '#778899', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("jet black (ce11)")) return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'black', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("electric blue (ce1j)")) return { color: 'var(--exterior-blue-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("zenith grey (ce1v)")) return isDarkMode ? { color: '#d4e0f2', fontWeight: specificFontWeight } : { color: '#B0C4DE', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("jet black roof- summer yellow body (111u)")) return { color: 'var(--exterior-yellow-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("brahminy white roof- aquatic azure body (181y)")) return { color: 'var(--exterior-blue-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("brahminy white roof- rose pink body (1821)")) return { color: 'var(--exterior-pink-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("brahminy white roof - iris berry body (181x)")) return { color: 'var(--exterior-pink-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("urbant mint (ce1w)")) return isDarkMode ? { color: '#6ee6a0', fontWeight: specificFontWeight } : { color: '#3CB371', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("vinbus green (ce2b)")) return { color: 'var(--exterior-green-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("deep ocean (ce1h)")) return isDarkMode ? { color: '#2e8b57', fontWeight: specificFontWeight } : { color: '#006400', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("iris berry (ce1x)")) return { color: 'var(--exterior-pink-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("zenith grey-desat silver roof (171v)")) return { color: 'var(--exterior-grey-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("urbant mint green - desat silv (171w)")) return { color: 'var(--exterior-green-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("ivy green-desat silver roof (1722)")) return { color: 'var(--exterior-green-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("atlantic blue-aquatic azure ro (1y26)")) return { color: 'var(--exterior-blue-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("jet black-champagne creme roof (2311)")) return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'white', ...outlineStyle, fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("infinity blanc _ silky white r (2418)")) return { color: 'var(--exterior-white-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("champagne creme - matte champa (2523)")) return { color: 'var(--exterior-yellow-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("jet black - graphite roof (2811)")) return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'white', ...outlineStyle, fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("crimson velvet - mystery bronz (2927)")) return { color: 'var(--exterior-red-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("ivy_green_gne (ce22)")) return { color: 'var(--exterior-green-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("champagne_creme_ylg (ce23)")) return { color: 'var(--exterior-yellow-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("crimson red - jet black roof (111m)")) return { color: 'var(--exterior-red-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("infinity blanc_zenith grey roof (1v18)")) return { color: 'var(--exterior-white-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("deep ocean_jet black roof (111h)")) return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'white', ...outlineStyle, fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("alantic blue_denim blue roof (2a26)")) return { color: 'var(--exterior-blue-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("jet black_mystery bronze roof (2911)")) return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'white', ...outlineStyle, fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("champagne creme_infinity blanc roof (1823)")) return { color: 'var(--exterior-yellow-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("de sat silver ind12007 (ce17)")) return { color: 'var(--exterior-grey-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("crimson red") || lowerExteriorValue.includes("crimson velvet")) return { color: 'var(--exterior-red-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("rose pink") || lowerExteriorValue.includes("iris berry")) return { color: 'var(--exterior-pink-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("vinfast blue") || lowerExteriorValue.includes("electric blue") || lowerExteriorValue.includes("atlantic blue") || lowerExteriorValue.includes("aquatic azure") || lowerExteriorValue.includes("alantic blue")) return { color: 'var(--exterior-blue-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("deep ocean")) return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'white', ...outlineStyle, fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("sunset orb")) return { color: 'var(--exterior-orange-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("summer yellow") || lowerExteriorValue.includes("champagne creme") || lowerExteriorValue.includes("champagne_creme_ylg")) return { color: 'var(--exterior-yellow-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("urbant mint") || lowerExteriorValue.includes("vinbus green") || lowerExteriorValue.includes("ivy green") || lowerExteriorValue.includes("ivy_green_gne")) return { color: 'var(--exterior-green-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("jet black")) return isDarkMode ? { color: 'white', fontWeight: specificFontWeight } : { color: 'white', ...outlineStyle, fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("brahminy white") || lowerExteriorValue.includes("infinity blanc")) return { color: 'var(--exterior-white-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("neptune grey") || lowerExteriorValue.includes("zenith grey") || lowerExteriorValue.includes("de sat silver") || lowerExteriorValue.includes("graphite")) return { color: 'var(--exterior-grey-text)', fontWeight: specificFontWeight };
    if (lowerExteriorValue.includes("mystery bronz")) return { color: 'var(--exterior-bronze-text)', fontWeight: specificFontWeight };

    return {};
};

const SortableHeaderCell: React.FC<{ columnKey: keyof Order; title: string; sortConfig: SortConfig | null; onSort: (key: keyof Order) => void; className?: string; }> = 
({ columnKey, title, sortConfig, onSort, className }) => {
    const isSorted = sortConfig?.key === columnKey;
    const directionIcon = sortConfig?.direction === 'asc' ? '▲' : '▼';

    return (
        <th scope="col" onClick={() => onSort(columnKey)} className={`py-3.5 px-3 text-left text-xs font-bold text-text-secondary cursor-pointer hover:bg-surface-hover transition-colors whitespace-nowrap uppercase tracking-wider ${className}`}>
          {title} {isSorted && <span className="text-xs ml-1">{directionIcon}</span>}
        </th>
    );
};

const HistoryTableRow: React.FC<{ order: Order; index: number; onViewDetails: (order: Order) => void; onCancel: (order: Order) => void; onRequestInvoice: (order: Order) => void; onSupplement: (order: Order) => void; onRequestVC: (order: Order) => void; onConfirmVC: (order: Order) => void; }> = 
({ order, index, onViewDetails, onCancel, onRequestInvoice, onSupplement, onRequestVC, onConfirmVC }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const statusText = order["Trạng thái VC"] || order["Kết quả"] || "Chưa ghép";

    return (
        <tr className={`hover:bg-surface-hover transition-colors duration-200 animate-fade-in-up cursor-pointer ${isMenuOpen ? 'relative z-20' : ''}`} style={{animationDelay: `${index * 20}ms`}} onClick={() => onViewDetails(order)}>
            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-center text-text-secondary font-medium sm:pl-6">{index + 1}</td>
            <td className="whitespace-nowrap px-3 py-4 text-sm">
                <div className="font-semibold text-text-primary">{order["Tên khách hàng"] || "N/A"}</div>
                <div className="text-text-secondary font-mono text-xs">{order["Số đơn hàng"]}</div>
            </td>
            <td className="whitespace-nowrap px-3 py-4 text-sm">
                <div className="text-text-primary">{order["Dòng xe"]} / {order["Phiên bản"]}</div>
                <div className="text-text-secondary text-xs" style={getExteriorColorStyle(order['Ngoại thất'])}>{order["Ngoại thất"]} / {order["Nội thất"]}</div>
            </td>
            <td className="whitespace-nowrap px-3 py-4 text-sm">
                <div className="text-text-primary" title={moment(order["Thời gian nhập"]).format('DD/MM/YYYY HH:mm:ss')}>
                    {moment(order["Thời gian nhập"]).format('DD/MM/YY HH:mm')}
                </div>
                <div className="text-text-secondary text-xs">{moment(order["Thời gian nhập"]).fromNow()}</div>
            </td>
            <td className="whitespace-nowrap px-3 py-4 text-sm text-text-primary truncate" title={order["Tên tư vấn bán hàng"]}>{order["Tên tư vấn bán hàng"] || "N/A"}</td>
            <td className="whitespace-nowrap px-3 py-4 text-sm text-text-primary"><StatusBadge status={statusText} /></td>
            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-6" onClick={(e) => e.stopPropagation()}>
                <ActionMenu order={order} onViewDetails={onViewDetails} onCancel={onCancel} onRequestInvoice={onRequestInvoice} onSupplement={onSupplement} onRequestVC={onRequestVC} onConfirmVC={onConfirmVC} onToggle={setIsMenuOpen} />
            </td>
        </tr>
    );
};

const HistoryTable: React.FC<HistoryTableProps> = ({ orders, onViewDetails, onCancel, onRequestInvoice, onSupplement, onRequestVC, onConfirmVC, sortConfig, onSort, startIndex }) => {
  if (orders.length === 0) {
    return (
      <div className="text-center py-16 text-text-secondary">
        <i className="fas fa-folder-open fa-3x mb-4 text-text-placeholder"></i>
        <p className="font-semibold text-text-primary">Không tìm thấy yêu cầu nào.</p>
        <p className="text-sm">Hãy thử thay đổi bộ lọc hoặc tạo yêu cầu mới.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
        <div className="min-w-full py-2 align-middle">
            <table className="min-w-full divide-y divide-border-primary">
                <thead className="bg-surface-hover sticky top-0 z-10">
                    <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-center text-xs font-bold text-text-secondary sm:pl-6 w-12 uppercase tracking-wider">#</th>
                        <SortableHeaderCell columnKey="Tên khách hàng" title="Khách hàng / SĐH" sortConfig={sortConfig} onSort={onSort} />
                        <SortableHeaderCell columnKey="Dòng xe" title="Thông Tin Xe" sortConfig={sortConfig} onSort={onSort} />
                        <SortableHeaderCell columnKey="Thời gian nhập" title="Ngày Yêu Cầu" sortConfig={sortConfig} onSort={onSort} />
                        <SortableHeaderCell columnKey="Tên tư vấn bán hàng" title="Tư vấn" sortConfig={sortConfig} onSort={onSort} />
                        <SortableHeaderCell columnKey="Kết quả" title="Trạng thái" sortConfig={sortConfig} onSort={onSort} />
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-center text-xs font-bold text-text-secondary uppercase tracking-wider">Hành động</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border-primary bg-surface-card">
                    {orders.map((order, index) => (
                        <HistoryTableRow key={order["Số đơn hàng"] || index} order={order} index={startIndex + index} onViewDetails={onViewDetails} onCancel={onCancel} onRequestInvoice={onRequestInvoice} onSupplement={onSupplement} onRequestVC={onRequestVC} onConfirmVC={onConfirmVC}/>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default HistoryTable;